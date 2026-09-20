// 문법 (文法): 레슨 목록과 레슨 본문 + 확인 퀴즈
import { h, clear, ruby, rich, shuffle } from '../util.js';
import { db, sentenceCardIds, weekMeta, dayMeta, isSoundLesson } from '../data.js';
import * as store from '../store.js';
import { pageHead, exampleBlock, stamp, emptyState } from '../ui.js';
import { runQuiz, resultView, grammarQuestion } from '../quiz.js';
import { checkDayComplete } from './day.js';

const PASS = 75;

export function grammarList() {
  if (!db.grammar.length) return h('div', { class: 'page' }, pageHead({ back: '#/lib', title: '문법', tate: '文法' }), emptyState('文', '레슨을 불러오지 못했습니다', '데이터 파일을 확인해 주세요.'));
  const byWeek = new Map();
  for (const g of db.grammar) {
    const w = dayMeta(g.day)?.week || 0;
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(g);
  }
  return h('div', { class: 'page' },
    pageHead({ back: '#/lib', kicker: `${db.grammar.length} LESSONS`, title: '문법', tate: '文法', lead: '한국어와 같은 점은 짧게, 다른 점은 확실하게. 모든 레슨은 언제든 다시 읽을 수 있습니다.' }),
    [...byWeek.entries()].map(([w, list]) => h('section', { class: 'card' },
      h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, `${w}주차 · ${weekMeta(w)?.title || ''}`)),
      h('ul', { class: 'rows' }, list.map(g => {
        const done = store.isLessonDone(g.id);
        return h('li', null, h('a', { class: 'row', href: `#/grammar/${g.id}` },
          h('span', { class: 'row__num' }, isSoundLesson(g) ? '音' : g.id.slice(1)),
          h('span', { class: 'row__text' }, h('span', { class: 'row__title jp', html: ruby(g.title) }), h('span', { class: 'row__sub' }, g.titleKo)),
          done ? stamp('済', { size: 'xs' }) : h('span', { class: 'row__aside' }, `Day ${g.day}`)));
      })))));
}

function tableEl(t) {
  return h('figure', { class: 'tblwrap' },
    h('figcaption', { html: ruby(t.caption) }),
    h('div', { class: 'tblscroll' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, t.head.map(c => h('th', { html: ruby(c) })))),
      h('tbody', null, t.rows.map(r => h('tr', null, r.map((c, i) => h(i === 0 ? 'th' : 'td', { class: 'jp', html: rich(c || '') }))))))));
}

export function grammarLesson([id], query = {}) {
  const g = db.items.get(id);
  if (!g) { location.hash = '#/grammar'; return h('div'); }
  const dayCtx = query.day ? Number(query.day) : null;
  const back = dayCtx ? `#/day/${dayCtx}` : '#/grammar';
  const root = h('div');
  const idx = db.grammar.indexOf(g);
  const tables = g.table ? (Array.isArray(g.table) ? g.table : [g.table]) : [];

  function lesson() {
    document.body.classList.remove('is-focus');
    clear(root).append(h('div', { class: 'page page--lesson' },
      pageHead({ back, kicker: `${isSoundLesson(g) ? '発音' : '文法'} ${g.id.slice(1)} · Day ${g.day}`, title: g.title, tate: isSoundLesson(g) ? '発音' : '文法', lead: g.titleKo }),
      h('p', { class: 'lesson__summary', html: rich(g.summary) }),
      g.points.map((pt, i) => h('section', { class: 'point' },
        h('div', { class: 'point__head' }, h('span', { class: 'point__num' }, String(i + 1)),
          h('div', null, h('p', { class: 'pattern jp', html: ruby(pt.pattern) }), h('p', { class: 'point__meaning' }, pt.meaning))),
        h('p', { class: 'point__explain', html: rich(pt.explain) }),
        h('div', { class: 'examples' }, pt.examples.map(ex => exampleBlock(ex))))),
      tables.map(tableEl),
      g.compare ? h('section', { class: 'callout callout--compare' }, h('h3', null, '🇰🇷 한국어와 비교'), h('p', { html: rich(g.compare) })) : null,
      g.pitfalls?.length ? h('section', { class: 'callout callout--warn' }, h('h3', null, '자주 틀리는 포인트'), h('ul', null, g.pitfalls.map(p => h('li', { html: rich(p) })))) : null,
      h('div', { class: 'lesson__cta' },
        h('button', { class: 'btn btn--primary btn--lg btn--block', onclick: quiz }, `확인 퀴즈 풀기 (${g.quiz.length}문항)`)),
      h('div', { class: 'day-nav' },
        idx > 0 ? h('a', { class: 'btn btn--ghost', href: `#/grammar/${db.grammar[idx - 1].id}` }, '← 이전 레슨') : h('span'),
        idx + 1 < db.grammar.length ? h('a', { class: 'btn btn--ghost', href: `#/grammar/${db.grammar[idx + 1].id}` }, '다음 레슨 →') : h('span'))));
    window.scrollTo(0, 0);
  }

  function quiz() {
    document.body.classList.add('is-focus');
    const holder = h('div', { class: 'session' });
    clear(root).append(holder);
    window.scrollTo(0, 0);
    runQuiz(holder, shuffle(g.quiz.map(q => grammarQuestion(q, g))), {
      onExit: lesson,
      onDone: ({ right, total }) => {
        const score = Math.round((right / total) * 100);
        const pass = score >= PASS;
        let completed = false;
        if (pass) {
          store.markLesson(g.id, score);
          store.addCards(sentenceCardIds(g));
          if (dayCtx) { store.markStep(dayCtx, `grammar:${g.id}`, { score }); completed = checkDayComplete(dayCtx); }
        }
        clear(holder).append(resultView({
          right, total, passMark: PASS, title: g.titleKo,
          note: pass ? (isSoundLesson(g) ? '규칙을 이해했으니 이제 글자를 익힐 차례입니다.' : '이 레슨의 대표 예문이 복습 카드에 추가되었습니다.') : '레슨을 다시 읽고 도전해 보세요. 75점 이상이면 통과입니다.',
          onRetry: pass ? quiz : lesson,
          onContinue: () => { document.body.classList.remove('is-focus'); location.hash = back; },
          continueText: completed ? 'Day 완료! 돌아가기' : dayCtx ? '다음 단계로' : '목록으로'
        }));
        if (!pass) holder.querySelector('.result__actions .btn')?.replaceChildren('레슨 다시 읽기');
      }
    });
    root._cleanup = () => { holder._cleanup?.(); document.body.classList.remove('is-focus'); };
  }

  lesson();
  return root;
}
