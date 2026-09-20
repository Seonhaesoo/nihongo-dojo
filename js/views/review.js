// 복습 (復習): SRS 플래시카드 세션
import { h, clear, ruby, esc, shuffle, dayNum, fmtInterval, hasKanji, pct } from '../util.js';
import { db, cardKind, sentenceOf, item } from '../data.js';
import * as store from '../store.js';
import { nextInterval, GRADE } from '../srs.js';
import { speak, autoSpeak } from '../tts.js';
import { speakBtn, exampleBlock, wordRuby, emptyState, pageHead } from '../ui.js';

const GRADES = [
  { g: GRADE.AGAIN, label: '다시', ja: 'もう一度', cls: 'again' },
  { g: GRADE.HARD, label: '어려움', ja: '難しい', cls: 'hard' },
  { g: GRADE.GOOD, label: '알맞음', ja: 'できた', cls: 'good' },
  { g: GRADE.EASY, label: '쉬움', ja: '簡単', cls: 'easy' }
];

function faces(cardId) {
  const kind = cardKind(cardId);
  const it = item(cardId);
  if (!kind || !it) return null;
  if (kind === 'kana') return {
    tag: it.script === 'hiragana' ? '히라가나' : '가타카나', speak: it.kana,
    front: h('span', { class: 'glyph glyph--hero' }, it.kana),
    back: h('div', { class: 'flash__answer' }, h('p', { class: 'flash__read' }, h('b', null, it.romaji), ` · ${it.ko}`),
      it.word ? h('p', { class: 'flash__extra jp' }, it.word.kana, h('small', null, ` ${it.word.ko}`)) : null)
  };
  if (kind === 'kanji') return {
    tag: '한자', speak: it.words[0]?.kana,
    front: h('span', { class: 'glyph glyph--hero' }, it.kanji),
    back: h('div', { class: 'flash__answer' }, h('p', { class: 'flash__read' }, h('b', null, it.hun)),
      h('p', { class: 'flash__extra jp' }, `음 ${it.on.join('、') || '—'}　훈 ${it.kun.map(r => r.replace('.', '·')).join('、') || '—'}`),
      h('ul', { class: 'wordlist wordlist--compact' }, it.words.slice(0, 3).map(w => h('li', null, h('span', { class: 'jp wordlist__jp', html: wordRuby(w) }), h('span', { class: 'wordlist__ko' }, w.ko)))))
  };
  if (kind === 'sentence') {
    const s = sentenceOf(cardId);
    if (!s) return null;
    return {
      tag: `문법 · ${s.lesson.titleKo}`, speak: s.ex.jp,
      front: h('p', { class: 'flash__sentence jp no-furi', html: ruby(s.ex.jp) }),
      back: h('div', { class: 'flash__answer' }, h('p', { class: 'flash__sentence jp', html: ruby(s.ex.jp) }), h('p', { class: 'flash__read' }, s.ex.ko),
        h('p', { class: 'flash__extra', html: `<span class="chip">${ruby(s.point.pattern)}</span> ${esc(s.point.meaning)}` }))
    };
  }
  if (kind === 'vocab-rev') return {
    tag: '한 → 일', speak: it.kana,
    front: h('p', { class: 'flash__ko' }, it.ko),
    back: h('div', { class: 'flash__answer' }, h('p', { class: 'flash__word jp', html: wordRuby(it) }), exampleBlock(it.ex, { speakable: false }))
  };
  return {
    tag: it.set || it.pos, speak: it.kana,
    front: h('p', { class: 'flash__word jp' }, it.jp),
    back: h('div', { class: 'flash__answer' },
      hasKanji(it.jp) ? h('p', { class: 'flash__kana jp' }, it.kana) : null,
      h('p', { class: 'flash__read' }, h('b', null, it.ko)),
      it.cog ? h('p', { class: 'flash__extra' }, `한자어 ${it.cog}`) : null,
      exampleBlock(it.ex, { speakable: false }))
  };
}

export default function review() {
  const today = dayNum();
  const all = store.dueCards(today).filter(id => cardKind(id));
  const root = h('div', { class: 'session' });

  if (!all.length) {
    const tomorrow = store.forecast(2)[1];
    root.classList.remove('session');
    document.body.classList.remove('is-focus');
    root.append(h('div', { class: 'page' },
      pageHead({ title: '복습', tate: '復習', kicker: 'SPACED REPETITION' }),
      emptyState('済', '복습할 카드가 없습니다', Object.keys(store.getState().cards).length ? `오늘 몫은 끝났습니다. 내일 ${tomorrow}장이 돌아옵니다.` : '새 학습을 마치면 다음 날부터 카드가 복습으로 돌아옵니다. 잊어버릴 때쯤 다시 보여 주는 것이 이 코스의 핵심입니다.',
        h('a', { class: 'btn btn--primary btn--lg', href: `#/day/${store.currentDay()}` }, '오늘의 수련으로'))));
    return root;
  }

  const limit = store.settings().sessionSize || 60;
  const cards = store.getState().cards;
  const queue = shuffle(all).sort((a, b) => cards[a].due - cards[b].due).slice(0, limit);
  const total = queue.length;
  let seen = 0, good = 0, flipped = false, cur = null, face = null;
  const firstTry = new Set(queue);

  const fill = h('div', { class: 'progress__fill' });
  const count = h('span', { class: 'quiz__count' });
  const body = h('div', { class: 'quiz__body' });
  const foot = h('footer', { class: 'quiz__foot' });
  root.append(h('div', { class: 'quiz quiz--flash' },
    h('header', { class: 'quiz__bar' }, h('a', { class: 'quiz__exit', href: '#/', 'aria-label': '그만두기' }, '×'), h('div', { class: 'progress' }, fill), count), body, foot));

  function show() {
    cur = queue.shift();
    if (!cur) return finish();
    face = faces(cur);
    if (!face) return show();
    flipped = false;
    fill.style.width = `${(seen / total) * 100}%`;
    count.textContent = `남은 카드 ${queue.length + 1}`;
    clear(body).append(h('div', { class: 'flash is-in', onclick: () => { if (!flipped) flip(); } },
      h('span', { class: 'chip chip--soft flash__tag' }, face.tag),
      h('div', { class: 'flash__main' }, face.front),
      h('div', { class: 'flash__back', hidden: true }, face.back, face.speak ? speakBtn(face.speak) : null)));
    clear(foot).append(h('button', { class: 'btn btn--ink btn--lg btn--block', onclick: flip }, '정답 보기', h('kbd', null, 'Space')));
  }

  function flip() {
    if (flipped) return;
    flipped = true;
    body.querySelector('.flash__back').hidden = false;
    body.querySelector('.flash').classList.add('is-flipped');
    autoSpeak(face.speak);
    const card = store.getCard(cur);
    clear(foot).append(h('div', { class: 'grade-row' }, GRADES.map((gr, i) =>
      h('button', { class: `grade grade--${gr.cls}`, onclick: () => answer(gr.g) },
        h('span', { class: 'grade__ja jp' }, gr.ja), h('span', { class: 'grade__label' }, gr.label),
        h('span', { class: 'grade__ivl' }, nextInterval(card, gr.g) === 0 ? '잠시 후' : fmtInterval(nextInterval(card, gr.g))), h('kbd', null, String(i + 1))))));
  }

  function answer(g) {
    const again = store.gradeCard(cur, g);
    if (firstTry.has(cur)) { firstTry.delete(cur); seen++; if (g >= GRADE.GOOD) good++; }
    if (again) queue.splice(Math.min(queue.length, 4), 0, cur);
    show();
  }

  function finish() {
    document.removeEventListener('keydown', onKey);
    const rest = store.dueCards(today).length;
    const fc = store.forecast(2);
    clear(root).append(h('div', { class: 'result' },
      h('p', { class: 'kicker' }, '복습 완료'),
      h('div', { class: 'result__score is-pass' }, h('span', { class: 'result__num' }, String(seen)), h('span', { class: 'result__unit' }, '枚')),
      h('p', { class: 'result__detail' }, `${seen}장 복습 · 한 번에 떠올린 비율 ${pct(good, seen)}%`),
      h('p', { class: 'result__note' }, rest ? `아직 ${rest}장이 남았습니다.` : `오늘 복습을 모두 비웠습니다. 내일은 ${fc[1]}장이 기다립니다.`),
      h('div', { class: 'result__actions' },
        rest ? h('button', { class: 'btn btn--primary btn--lg', onclick: () => { location.hash = '#/'; setTimeout(() => { location.hash = '#/review'; }, 0); } }, '이어서 복습') : null,
        h('a', { class: `btn ${rest ? 'btn--ghost' : 'btn--primary'} btn--lg`, href: `#/day/${store.currentDay()}` }, '오늘의 수련으로'))));
  }

  const onKey = e => {
    if (!cur) return;
    if (!flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); flip(); }
    else if (flipped && ['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); answer(GRADES[Number(e.key) - 1].g); }
    else if (flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); answer(GRADE.GOOD); }
    else if (e.key === 'r' || e.key === 'R') speak(face?.speak);
  };
  document.addEventListener('keydown', onKey);
  root._cleanup = () => document.removeEventListener('keydown', onKey);

  show();
  return root;
}
