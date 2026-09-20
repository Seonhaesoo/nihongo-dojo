// 학습 데이터 로딩과 색인
const FILES = {
  kana: 'data/kana.json',
  curriculum: 'data/curriculum.json',
  vocab: ['data/vocab/00-basics.json', 'data/vocab/v1-d12-d25.json', 'data/vocab/v2-d26-d39.json', 'data/vocab/v3-d40-d53.json', 'data/vocab/v4-d54-d67.json', 'data/vocab/v5-d68-d81.json'],
  kanji: 'data/kanji.json',
  grammar: ['data/grammar/g01-g11.json', 'data/grammar/g12-g22.json', 'data/grammar/g23-g33.json', 'data/grammar/g34-g43.json', 'data/grammar/g44-g53.json'],
  reading: 'data/reading/reading.json',
  listening: 'data/reading/listening.json'
};

export const db = {
  kana: [], vocab: [], kanji: [], grammar: [], reading: [], listening: [],
  curriculum: { totalDays: 84, weeks: [], days: [] },
  items: new Map(),   // id → item (type 필드 포함)
  byDay: new Map()    // day → { kana, vocab, kanji, grammar, reading, listening }
};

async function getJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn(`데이터를 불러오지 못했습니다: ${url}`, e);
    return null;
  }
}

function bucket(day) {
  if (!db.byDay.has(day)) db.byDay.set(day, { kana: [], vocab: [], kanji: [], grammar: [], reading: [], listening: [] });
  return db.byDay.get(day);
}

function register(type, list) {
  for (const it of list) {
    it.type = type;
    db.items.set(it.id, it);
    if (Number.isInteger(it.day)) bucket(it.day)[type].push(it);
  }
  db[type].push(...list);
}

export async function loadAll() {
  const many = async urls => (await Promise.all(urls.map(getJson))).filter(Boolean).flat();
  const [kana, curriculum, vocab, kanji, grammar, reading, listening] = await Promise.all([
    getJson(FILES.kana), getJson(FILES.curriculum), many(FILES.vocab), getJson(FILES.kanji),
    many(FILES.grammar), getJson(FILES.reading), getJson(FILES.listening)
  ]);
  if (curriculum) db.curriculum = curriculum;
  register('kana', kana || []);
  register('vocab', vocab || []);
  register('kanji', kanji || []);
  register('grammar', grammar || []);
  register('reading', reading || []);
  register('listening', listening || []);
  db.grammar.sort((a, b) => a.id.localeCompare(b.id));
  for (const b of db.byDay.values()) b.vocab.sort((x, y) => (x.id[0] === 's') - (y.id[0] === 's'));
  return db;
}

export const item = id => db.items.get(id.split('#')[0]);
export const dayMeta = n => db.curriculum.days.find(d => d.day === n);
export const weekMeta = w => db.curriculum.weeks.find(x => x.week === w);
export const dayItems = n => db.byDay.get(n) || { kana: [], vocab: [], kanji: [], grammar: [], reading: [], listening: [] };
export const totalDays = () => db.curriculum.totalDays || 84;

/** 문법 레슨에서 SRS에 넣을 예문 카드 id (포인트별 첫 예문, 최대 3개) */
export function sentenceCardIds(g) {
  return g.points.slice(0, 3).map((_, i) => `${g.id}#${i}`);
}
export function sentenceOf(cardId) {
  const [gid, idx] = cardId.split('#');
  const g = db.items.get(gid);
  const pt = g?.points?.[Number(idx)];
  return pt ? { lesson: g, point: pt, ex: pt.examples[0] } : null;
}

/** SRS 카드 id → 카드 종류 */
export function cardKind(cardId) {
  if (cardId.includes('#')) return cardId.endsWith('#r') ? 'vocab-rev' : 'sentence';
  const it = db.items.get(cardId);
  return it ? it.type : null;
}

/** 하루의 학습 단계 목록 */
export function daySteps(n) {
  const meta = dayMeta(n) || { kind: 'learn' };
  const it = dayItems(n);
  const steps = [];
  if (it.kana.length) steps.push({ key: 'kana', kind: 'learn', label: `새 글자 ${it.kana.length}자`, sub: [...new Set(it.kana.map(k => k.script === 'hiragana' ? '히라가나' : '가타카나'))].join('·'), icon: 'あ', href: `#/learn/${n}/kana` });
  if (n === 6) steps.push({ key: 'readwords', kind: 'drill', label: '히라가나 단어 읽기 연습', sub: '배운 글자로 실제 단어를 읽어 봅니다', icon: '読', href: `#/readwords/${n}` });
  if (it.vocab.length) steps.push({ key: 'vocab', kind: 'learn', label: `새 단어 ${it.vocab.length}개`, sub: [...new Set(it.vocab.map(v => v.set).filter(Boolean)), meta.theme].filter(Boolean).join(' · '), icon: '語', href: `#/learn/${n}/vocab` });
  for (const g of it.grammar) steps.push({ key: `grammar:${g.id}`, kind: 'grammar', label: `문법 · ${g.titleKo}`, sub: '레슨 읽기 → 확인 퀴즈', icon: '文', href: `#/grammar/${g.id}?day=${n}` });
  if (it.kanji.length) steps.push({ key: 'kanji', kind: 'learn', label: `새 한자 ${it.kanji.length}자`, sub: it.kanji.map(k => k.kanji).join(' '), icon: '漢', href: `#/learn/${n}/kanji` });
  for (const r of it.reading) steps.push({ key: `reading:${r.id}`, kind: 'reading', label: `독해 · ${r.titleKo}`, sub: '지문 읽고 문제 풀기', icon: '読', href: `#/reading/${r.id}?day=${n}` });
  for (const l of it.listening) steps.push({ key: `listening:${l.id}`, kind: 'listening', label: `청해 · ${l.title}`, sub: '듣고 문제 풀기', icon: '聴', href: `#/listening/${l.id}?day=${n}` });
  if (meta.kind === 'final') steps.push({ key: 'final', kind: 'final', label: '수료식', sub: '12주의 기록을 돌아봅니다', icon: '祝', href: `#/final` });
  else {
    const label = meta.kind === 'mock' ? '모의고사 (50문항)' : meta.kind === 'review' ? '주간 테스트' : '오늘의 마무리 테스트';
    steps.push({ key: 'test', kind: 'test', label, sub: '80% 이상이면 도장을 받습니다', icon: '試', href: `#/test/${n}` });
  }
  return steps;
}

/** n일까지 배운(배웠어야 할) 항목 */
export function itemsUpTo(n, type) { return db[type].filter(x => Number.isInteger(x.day) && x.day <= n); }
export function weekDays(w) { return db.curriculum.days.filter(d => d.week === w).map(d => d.day); }
