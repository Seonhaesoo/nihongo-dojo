// 자료실 (書庫): 가나 표 · 단어장 · 한자 · 그 밖의 연습 메뉴
import { h, clear, modal, esc, kataToHira } from '../util.js';
import { db } from '../data.js';
import * as store from '../store.js';
import { isMature } from '../srs.js';
import { pageHead, segmented, wordRuby, emptyState } from '../ui.js';
import { kanaDetail, vocabDetail, kanjiDetail } from '../cards.js';
import { speak } from '../tts.js';
import { toHiragana } from '../romaji.js';

export function library() {
  const tiles = [
    ['#/kana', 'あ', '가나 표', '히라가나·가타카나 전체 표, 획순, 발음'],
    ['#/vocab', '語', '단어장', `${db.vocab.length}개 단어 검색·필터`],
    ['#/kanji', '漢', '한자', `N5 한자 ${db.kanji.length}자, 훈음과 획순`],
    ['#/grammar', '文', '문법', `${db.grammar.length}개 레슨 다시 읽기`],
    ['#/drill', '活', '활용 연습', 'ます형·て형·ない형… 동사·형용사 변환 훈련'],
    ['#/quiz', '試', '자유 퀴즈', '범위를 골라 풀기, 약점 공략'],
    ['#/reading', '読', '독해·청해', '실전 지문과 듣기 문제'],
    ['#/stats', '録', '학습 기록', '복습 예측, 정답률, 출석']
  ];
  return h('div', { class: 'page' },
    pageHead({ kicker: 'LIBRARY', title: '자료실', tate: '書庫', lead: '배운 것을 찾아보고, 원하는 만큼 더 연습하는 곳.' }),
    h('div', { class: 'libgrid' }, tiles.map(([href, glyph, title, sub]) =>
      h('a', { class: 'libtile', href }, h('span', { class: 'libtile__glyph' }, glyph), h('span', { class: 'libtile__title' }, title), h('span', { class: 'libtile__sub' }, sub)))));
}

function statusClass(id) {
  const c = store.getCard(id);
  if (!c) return 'is-new';
  return isMature(c) ? 'is-mature' : c.state === 'learn' ? 'is-learning' : 'is-young';
}

const legend = () => h('p', { class: 'legend' },
  h('span', { class: 'legend__dot is-new' }), '아직', h('span', { class: 'legend__dot is-young' }), '익히는 중', h('span', { class: 'legend__dot is-mature' }), '완전히 외움');

// ───────── 가나 표 ─────────
const ROWS = ['a', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w', 'nn'];
const DAKU_ROWS = ['g', 'z', 'd', 'b', 'p'];
const YOON_ROWS = ['ky', 'sh', 'ch', 'ny', 'hy', 'my', 'ry', 'gy', 'j', 'by', 'py'];

export function kanaChart() {
  let script = 'hiragana';
  const body = h('div');
  const open = k => { modal(kanaDetail(k, { withSrs: true })); speak(k.kana); };
  const cell = k => k ? h('button', { class: `kcell ${statusClass(k.id)}`, onclick: () => open(k) }, h('span', { class: 'glyph' }, k.kana), h('span', { class: 'kcell__rom' }, k.romaji)) : h('span', { class: 'kcell kcell--empty' });
  const grid = (rows, cols) => h('div', { class: `kgrid kgrid--${cols}` }, rows.flatMap(r => {
    const list = db.kana.filter(k => k.script === script && k.row === r);
    return Array.from({ length: cols }, (_, c) => cell(list.find(k => k.col === c)));
  }));
  function draw() {
    const ext = db.kana.filter(k => k.script === script && k.group === 'ext');
    clear(body).append(
      h('h2', { class: 'h2' }, '청음 (기본 46자)'), grid(ROWS, 5),
      h('h2', { class: 'h2' }, '탁음·반탁음'), grid(DAKU_ROWS, 5),
      h('h2', { class: 'h2' }, '요음'), grid(YOON_ROWS, 3),
      ext.length ? h('h2', { class: 'h2' }, '외래어 특수음') : null,
      ext.length ? h('div', { class: 'kgrid kgrid--3' }, ext.map(cell)) : null);
  }
  draw();
  return h('div', { class: 'page' },
    pageHead({ back: '#/lib', kicker: '五十音図', title: '가나 표', tate: '仮名', lead: '글자를 누르면 발음·획순·따라 쓰기가 열립니다.' }),
    segmented([{ value: 'hiragana', label: 'ひらがな 히라가나' }, { value: 'katakana', label: 'カタカナ 가타카나' }], script, v => { script = v; draw(); }),
    legend(), body);
}

// ───────── 단어장 ─────────
export function vocabList() {
  let q = '', pos = '', scope = 'all';
  const list = h('ul', { class: 'rows' });
  const info = h('p', { class: 'listinfo' });
  const POS_GROUPS = [['', '전체 품사'], ['명사', '명사'], ['동사', '동사'], ['い형용사', 'い형용사'], ['な형용사', 'な형용사'], ['부사', '부사'], ['표현', '표현']];
  function draw() {
    const needle = q.trim().toLowerCase();
    const hira = needle ? kataToHira(toHiragana(needle)) : '';
    const found = db.vocab.filter(v => {
      if (pos && !v.pos.startsWith(pos)) return false;
      if (scope === 'learned' && !store.hasCard(v.id)) return false;
      if (scope === 'weak' && !((store.getState().itemStats[v.id]?.w || 0) > 0)) return false;
      if (!needle) return true;
      return v.jp.includes(needle) || v.ko.toLowerCase().includes(needle) || kataToHira(v.kana).includes(hira) || v.kana.includes(needle);
    });
    info.textContent = `${found.length}개`;
    clear(list).append(...found.slice(0, 300).map(v => h('li', null, h('button', { class: 'row', onclick: () => { modal(vocabDetail(v, { withSrs: true })); speak(v.kana); } },
      h('span', { class: `row__dot ${statusClass(v.id)}` }),
      h('span', { class: 'row__text' }, h('span', { class: 'row__title jp', html: wordRuby(v) }), h('span', { class: 'row__sub' }, v.ko)),
      h('span', { class: 'row__aside' }, `${v.pos} · D${v.day}`)))));
    if (found.length > 300) list.append(h('li', { class: 'listinfo' }, `…외 ${found.length - 300}개. 검색어로 좁혀 보세요.`));
    if (!found.length) list.append(h('li', null, emptyState('無', '찾는 단어가 없습니다', '다른 검색어를 시도해 보세요.')));
  }
  draw();
  return h('div', { class: 'page' },
    pageHead({ back: '#/lib', kicker: `${db.vocab.length} WORDS`, title: '단어장', tate: '単語' }),
    h('div', { class: 'filters' },
      h('input', { class: 'input', type: 'search', placeholder: '일본어·한국어·로마자로 검색 (예: gakusei, 학생)', oninput: e => { q = e.target.value; draw(); } }),
      h('select', { class: 'input input--select', onchange: e => { pos = e.target.value; draw(); } }, POS_GROUPS.map(([v, l]) => h('option', { value: v }, l))),
      segmented([{ value: 'all', label: '전체' }, { value: 'learned', label: '배운 것' }, { value: 'weak', label: '틀렸던 것' }], scope, v => { scope = v; draw(); })),
    legend(), info, list);
}

// ───────── 한자 ─────────
export function kanjiGrid() {
  if (!db.kanji.length) return h('div', { class: 'page' }, pageHead({ back: '#/lib', title: '한자', tate: '漢字' }), emptyState('漢', '한자 데이터를 불러오지 못했습니다', ''));
  return h('div', { class: 'page' },
    pageHead({ back: '#/lib', kicker: `JLPT N5 · ${db.kanji.length}字`, title: '한자', tate: '漢字', lead: '한국 한자음을 알면 일본어 음독이 보입니다. 글자를 눌러 요령을 확인하세요.' }),
    legend(),
    h('div', { class: 'kgrid kgrid--kanji' }, db.kanji.map(k => h('button', { class: `kcell ${statusClass(k.id)}`, onclick: () => modal(kanjiDetail(k, { withSrs: true })) },
      h('span', { class: 'glyph' }, k.kanji), h('span', { class: 'kcell__rom', html: esc(k.hun) })))));
}
