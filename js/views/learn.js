// 새 학습 세션: 소개(한 장씩) → 확인 퀴즈(틀리면 다시) 를 작은 묶음 단위로 반복
import { h, clear, chunk, shuffle, confirmDialog } from '../util.js';
import { db, dayItems, itemsUpTo } from '../data.js';
import * as store from '../store.js';
import { detailFor, speechOf } from '../cards.js';
import { autoSpeak } from '../tts.js';
import { runQuiz, kanaQuestion, vocabQuestion, kanjiQuestion } from '../quiz.js';
import { checkDayComplete } from './day.js';

const KIND_KO = { kana: '글자', vocab: '단어', kanji: '한자' };

function practiceQuestions(items, kind, n) {
  const upTo = itemsUpTo(n, kind);
  if (kind === 'kana') {
    const pool = upTo.length >= 8 ? upTo : db.kana;
    // 탁음·요음처럼 규칙으로 읽는 글자는 한 번씩만 확인하고 넘어간다 (지루함 방지)
    const second = items.every(k => k.group !== 'basic') ? shuffle(items).slice(0, Math.ceil(items.length / 2)) : shuffle(items);
    return [...items.map(k => kanaQuestion(k, 'k2r', pool)), ...second.map(k => kanaQuestion(k, Math.random() < 0.5 ? 'listen' : 'r2k', pool))];
  }
  if (kind === 'kanji') {
    const pool = upTo.length >= 8 ? upTo : db.kanji;
    return [...items.map(k => kanjiQuestion(k, 'k2m', pool)), ...shuffle(items).map(k => kanjiQuestion(k, 'word', pool))];
  }
  const pool = upTo.length >= 12 ? upTo : db.vocab;
  return [...items.map(v => vocabQuestion(v, 'j2k', pool)), ...shuffle(items).map(v => vocabQuestion(v, 'k2j', pool))];
}

export default function learn([nStr, kind]) {
  const n = Number(nStr);
  const items = dayItems(n)[kind] || [];
  const root = h('div', { class: 'session' });
  const back = `#/day/${n}`;
  if (!items.length) { location.hash = back; return root; }

  const groups = chunk(items, kind !== 'kana' ? 6 : items.every(k => k.group !== 'basic') ? 9 : 5);
  let gi = 0;

  function intro(idx) {
    const group = groups[gi];
    const it = group[idx];
    const seen = groups.slice(0, gi).reduce((a, g) => a + g.length, 0) + idx;
    const exit = h('button', { class: 'quiz__exit', 'aria-label': '그만두기', onclick: async () => {
      if (await confirmDialog('학습을 그만둘까요? 이 단계는 처음부터 다시 하게 됩니다.', { okText: '그만두기', cancelText: '계속하기' })) location.hash = back;
    } }, '×');
    const next = () => (idx + 1 < group.length ? intro(idx + 1) : practice());
    const onKey = e => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' && idx > 0) intro(idx - 1);
    };
    root._cleanup?.();
    document.addEventListener('keydown', onKey);
    root._cleanup = () => document.removeEventListener('keydown', onKey);
    clear(root).append(h('div', { class: 'quiz' },
      h('header', { class: 'quiz__bar' }, exit,
        h('div', { class: 'progress' }, h('div', { class: 'progress__fill', style: { width: `${(seen / items.length) * 100}%` } })),
        h('span', { class: 'quiz__count' }, `새 ${KIND_KO[kind]} ${seen + 1} / ${items.length}`)),
      h('div', { class: 'quiz__body is-in' }, detailFor(it)),
      h('footer', { class: 'quiz__foot quiz__foot--split' },
        h('button', { class: 'btn btn--ghost btn--lg', disabled: idx === 0 || undefined, onclick: () => intro(idx - 1) }, '이전'),
        h('button', { class: 'btn btn--primary btn--lg', onclick: next }, idx + 1 < group.length ? '다음' : '확인 퀴즈 →'))));
    autoSpeak(speechOf(it));
    window.scrollTo(0, 0);
  }

  function practice() {
    root._cleanup?.(); root._cleanup = null;
    runQuiz(root, practiceQuestions(groups[gi], kind, n), {
      requeue: true,
      onExit: () => { location.hash = back; },
      onDone: () => { gi++; if (gi < groups.length) interlude(); else finish(); }
    });
  }

  function interlude() {
    clear(root).append(h('div', { class: 'result' },
      h('p', { class: 'kicker' }, `${gi} / ${groups.length} 묶음 완료`),
      h('p', { class: 'result__big jp' }, 'その調子！'),
      h('p', { class: 'result__detail' }, `좋아요, 그 기세로! 다음 ${KIND_KO[kind]} ${groups[gi].length}개로 넘어갑니다.`),
      h('div', { class: 'result__actions' }, h('button', { class: 'btn btn--primary btn--lg', onclick: () => intro(0) }, '계속'))));
  }

  function finish() {
    const ids = items.map(x => x.id);
    const added = store.addCards(ids);
    if (kind === 'vocab' && store.settings().reverseCards) store.addCards(ids.map(id => `${id}#r`));
    store.markStep(n, kind);
    const completed = checkDayComplete(n);
    clear(root).append(h('div', { class: 'result' },
      h('p', { class: 'kicker' }, '새 학습 완료'),
      h('p', { class: 'result__big jp' }, 'よくできました'),
      h('p', { class: 'result__detail' }, `${KIND_KO[kind]} ${items.length}개를 익혔습니다.${added ? ` 내일부터 복습 카드 ${added}장이 돌아옵니다.` : ''}`),
      h('div', { class: 'result__actions' },
        h('a', { class: 'btn btn--primary btn--lg', href: back }, completed ? 'Day 완료! 돌아가기' : '다음 단계로'))));
  }

  intro(0);
  return root;
}
