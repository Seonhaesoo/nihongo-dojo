// 독해 (読解) · 청해 (聴解)
import { h, clear, ruby, rich, esc } from '../util.js';
import { db } from '../data.js';
import * as store from '../store.js';
import { pageHead, speakBtn, emptyState, stamp } from '../ui.js';
import { speak, stop } from '../tts.js';
import { checkDayComplete } from './day.js';

export function readingList() {
  const row = (href, num, title, sub, done) => h('li', null, h('a', { class: 'row', href },
    h('span', { class: 'row__num' }, num), h('span', { class: 'row__text' }, h('span', { class: 'row__title jp', html: title }), h('span', { class: 'row__sub' }, sub)),
    done ? stamp('済', { size: 'xs' }) : null));
  const isDone = (day, key) => store.isStepDone(day, key);
  if (!db.reading.length && !db.listening.length) return h('div', { class: 'page' }, pageHead({ back: '#/lib', title: '독해·청해', tate: '読解' }), emptyState('読', '자료를 불러오지 못했습니다', ''));
  return h('div', { class: 'page' },
    pageHead({ back: '#/lib', kicker: 'READING · LISTENING', title: '독해·청해', tate: '読解', lead: '11~12주차의 실전 연습입니다. 문법과 어휘가 어느 정도 쌓인 뒤에 도전하세요.' }),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '독해')),
      h('ul', { class: 'rows' }, db.reading.map(r => row(`#/reading/${r.id}`, r.id.slice(1), ruby(r.title), r.titleKo, isDone(r.day, `reading:${r.id}`))))),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '청해')),
      h('ul', { class: 'rows' }, db.listening.map(l => row(`#/listening/${l.id}`, l.id.slice(1), esc(l.title), l.situation, isDone(l.day, `listening:${l.id}`))))));
}

/** 문제 묶음: 모두 답하면 onAllAnswered(정답 수) */
function questionBlock(questions, { jp = true, onAllAnswered }) {
  let answered = 0, right = 0;
  return h('section', { class: 'qblock' }, questions.map((q, qi) => {
    const explain = h('p', { class: 'quiz__explain', hidden: true, html: rich(q.explain) });
    const btns = q.choices.map((c, i) => h('button', { class: 'choice', onclick: () => {
      if (btns[0].disabled) return;
      btns.forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('is-correct'); });
      if (i !== q.answer) btns[i].classList.add('is-wrong'); else right++;
      explain.hidden = false;
      answered++;
      if (answered === questions.length) onAllAnswered(right);
    } }, h('span', { class: 'choice__key' }, String(i + 1)), h('span', { class: 'choice__text jp', html: ruby(c) })));
    return h('div', { class: 'qblock__item' },
      h('p', { class: 'qblock__q' }, h('span', { class: 'qblock__num' }, `問${qi + 1}`), jp && q.q ? h('span', { class: 'jp', html: ruby(q.q) }) : null),
      h('p', { class: 'qblock__ko' }, q.qKo),
      h('div', { class: 'quiz__choices' }, btns), explain);
  }));
}

function finishPanel(dayCtx, key, right, total, back) {
  let completed = false;
  if (dayCtx) { store.markStep(dayCtx, key, { score: Math.round((right / total) * 100) }); completed = checkDayComplete(dayCtx); }
  return h('div', { class: 'card card--note finish-panel' },
    h('p', null, h('b', null, `${total}문항 중 ${right}문항 정답. `), right === total ? '완벽합니다!' : '틀린 문제는 해설과 본문을 다시 확인하세요.'),
    h('a', { class: 'btn btn--primary', href: back }, completed ? 'Day 완료! 돌아가기' : dayCtx ? '다음 단계로' : '목록으로'));
}

export function readingView([id], query = {}) {
  const r = db.items.get(id);
  if (!r) { location.hash = '#/reading'; return h('div'); }
  const dayCtx = query.day ? Number(query.day) : null;
  const back = dayCtx ? `#/day/${dayCtx}` : '#/reading';
  const after = h('div');
  const koBlocks = r.ko.map(t => h('p', { class: 'passage__ko', hidden: true }, t));
  const toggle = h('button', { class: 'btn btn--ghost btn--sm', onclick: () => { const show = koBlocks[0].hidden; koBlocks.forEach(b => { b.hidden = !show; }); toggle.textContent = show ? '해석 숨기기' : '해석 보기'; } }, '해석 보기');
  return h('div', { class: 'page page--lesson' },
    pageHead({ back, kicker: `読解 ${r.id.slice(1)} · Day ${r.day}`, title: r.title, tate: '読解', lead: r.titleKo }),
    h('article', { class: 'passage card' },
      h('div', { class: 'passage__tools' }, speakBtn(r.text.join(''), { label: '전체 듣기' }), toggle),
      r.text.map((t, i) => [h('p', { class: 'passage__jp jp', html: ruby(t) }), koBlocks[i]])),
    r.vocab?.length ? h('details', { class: 'fold' }, h('summary', null, `핵심 어휘 ${r.vocab.length}개`),
      h('ul', { class: 'wordlist' }, r.vocab.map(w => h('li', null, h('span', { class: 'jp wordlist__jp', html: `<ruby>${esc(w.jp)}<rt>${esc(w.kana)}</rt></ruby>` }), h('span', { class: 'wordlist__ko' }, w.ko))))) : null,
    questionBlock(r.questions, { onAllAnswered: right => { clear(after).append(finishPanel(dayCtx, `reading:${r.id}`, right, r.questions.length, back)); after.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }),
    after);
}

export function listeningView([id], query = {}) {
  const l = db.items.get(id);
  if (!l) { location.hash = '#/reading'; return h('div'); }
  const dayCtx = query.day ? Number(query.day) : null;
  const back = dayCtx ? `#/day/${dayCtx}` : '#/reading';
  const after = h('div');
  let playing = false, plays = 0;
  const status = h('span', { class: 'listen__status' }, '아직 듣지 않았습니다');
  const script = h('div', { class: 'script', hidden: true }, l.lines.map(ln => h('div', { class: `script__line script__line--${ln.sp}` },
    h('span', { class: 'script__sp' }, ln.sp === 'N' ? '—' : ln.sp),
    h('div', null, h('p', { class: 'jp', html: ruby(ln.jp) }, speakBtn(ln.jp, { small: true })), h('p', { class: 'script__ko' }, ln.ko)))));
  const scriptBtn = h('button', { class: 'btn btn--ghost btn--sm', onclick: () => { script.hidden = !script.hidden; scriptBtn.textContent = script.hidden ? '스크립트 보기' : '스크립트 숨기기'; } }, '스크립트 보기');

  async function playAll() {
    if (playing) { playing = false; stop(); return; }
    playing = true; plays++;
    playBtn.textContent = '■ 정지';
    for (const ln of l.lines) {
      if (!playing) break;
      await speak(ln.jp, { voice: ln.sp === 'B' ? 1 : 0, pitch: ln.sp === 'B' ? 0.82 : ln.sp === 'N' ? 1 : 1.08 });
      await new Promise(r => setTimeout(r, 350));
    }
    playing = false;
    playBtn.textContent = '▶ 다시 듣기';
    status.textContent = `${plays}번 들었습니다`;
  }
  const playBtn = h('button', { class: 'btn btn--ink btn--lg', onclick: playAll }, '▶ 대화 듣기');

  const root = h('div', { class: 'page page--lesson' },
    pageHead({ back, kicker: `聴解 ${l.id.slice(1)} · Day ${l.day}`, title: l.title, tate: '聴解', lead: l.situation }),
    h('section', { class: 'card listen' }, h('div', { class: 'listen__big', 'aria-hidden': 'true' }, '聴'), playBtn, status,
      h('p', { class: 'listen__tip' }, '스크립트를 보지 말고 먼저 2~3번 들어 보세요. 문제를 풀고 나서 스크립트를 보며 따라 읽으면 효과가 큽니다.')),
    questionBlock(l.questions, { jp: false, onAllAnswered: right => {
      script.hidden = false; scriptBtn.textContent = '스크립트 숨기기';
      clear(after).append(finishPanel(dayCtx, `listening:${l.id}`, right, l.questions.length, back));
    } }),
    h('div', { class: 'script__tools' }, scriptBtn), script, after);
  root._cleanup = () => { playing = false; stop(); };
  return root;
}
