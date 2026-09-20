// Day 상세: 그날의 학습 단계와 팁
import { h, ruby, rich, toast, confirmDialog } from '../util.js';
import { dayMeta, weekMeta, daySteps, dayItems, totalDays, sentenceCardIds } from '../data.js';
import * as store from '../store.js';
import { pageHead, stamp } from '../ui.js';

/** 모든 단계가 끝났으면 Day를 완료 처리하고 도장 연출을 띄운다 */
export function checkDayComplete(n) {
  const steps = daySteps(n);
  if (!steps.every(s => store.isStepDone(n, s.key))) return false;
  if (store.completeDay(n)) { celebrate(n); return true; }
  return false;
}

function celebrate(n) {
  const el = h('div', { class: 'celebrate', onclick: () => el.remove() },
    h('div', { class: 'celebrate__inner' },
      stamp('済', { size: 'xl', animate: true }),
      h('p', { class: 'celebrate__title' }, `Day ${n} 완료`),
      h('p', { class: 'celebrate__sub jp', html: ruby('お{疲|つか}れ{様|さま}でした！') }),
      h('p', { class: 'celebrate__hint' }, '화면을 누르면 닫힙니다')));
  document.body.append(el);
  setTimeout(() => el.remove(), 4200);
}

export default function day([nStr]) {
  const n = Number(nStr);
  const total = totalDays();
  const meta = dayMeta(n);
  if (!meta) { location.hash = '#/plan'; return h('div'); }
  const week = weekMeta(meta.week) || {};
  const steps = daySteps(n);
  const due = store.dueCards().length;
  const done = store.isDayDone(n);
  const cur = store.currentDay(total);

  const reviewRow = h('a', { class: `step${due ? '' : ' is-done'}`, href: due ? '#/review' : null },
    h('span', { class: 'step__icon' }, '復'),
    h('span', { class: 'step__text' }, h('span', { class: 'step__label' }, due ? `복습 ${due}장` : '복습 완료'), h('span', { class: 'step__sub' }, due ? '새 학습 전에 먼저 비우는 것을 권합니다' : '밀린 카드가 없습니다')),
    h('span', { class: 'step__state' }, due ? '시작 →' : '✓'));

  const rows = steps.map(s => {
    const info = store.stepInfo(n, s.key);
    const isDone = !!info?.done;
    return h('a', { class: `step${isDone ? ' is-done' : ''}`, href: s.href },
      h('span', { class: 'step__icon' }, s.icon),
      h('span', { class: 'step__text' }, h('span', { class: 'step__label' }, s.label), s.sub ? h('span', { class: 'step__sub' }, s.sub) : null),
      h('span', { class: 'step__state' }, isDone ? (info.best ? `${info.best}点 ✓` : '✓') : '시작 →'));
  });

  const skip = async () => {
    if (!(await confirmDialog(`Day ${n}을(를) 이미 아는 내용으로 보고 완료 처리할까요? 이날의 글자·단어·한자가 복습 카드에 추가됩니다.`, { okText: '완료 처리' }))) return;
    const it = dayItems(n);
    store.addCards([...it.kana, ...it.vocab, ...it.kanji].map(x => x.id));
    it.grammar.forEach(g => store.addCards(sentenceCardIds(g)));
    steps.forEach(s => store.markStep(n, s.key, { skipped: true }));
    store.completeDay(n);
    toast(`Day ${n} 완료 처리했습니다`);
    location.hash = n < total ? `#/day/${n + 1}` : '#/';
  };

  return h('div', { class: 'page' },
    pageHead({ back: '#/plan', kicker: `${meta.week}주차 · ${week.title || ''}`, title: meta.title || `Day ${n}`, tate: `第${n}日`, lead: meta.desc,
      right: done ? stamp('済', { size: 'lg' }) : null }),
    n > cur && !done ? h('p', { class: 'notice' }, `지금 순서는 Day ${cur}입니다. 앞의 Day를 건너뛰면 예문의 단어·문법이 낯설 수 있습니다.`) : null,
    h('section', { class: 'steps' }, reviewRow, ...rows),
    meta.tips?.length ? h('section', { class: 'card card--note' }, h('h2', { class: 'h2' }, '오늘의 요령'), h('ul', { class: 'tips' }, meta.tips.map(t => h('li', { html: rich(t) })))) : null,
    h('div', { class: 'day-nav' },
      n > 1 ? h('a', { class: 'btn btn--ghost', href: `#/day/${n - 1}` }, `← Day ${n - 1}`) : h('span'),
      !done ? h('button', { class: 'btn btn--ghost btn--sm', onclick: skip }, '이미 아는 내용 — 완료 처리') : h('span'),
      n < total ? h('a', { class: `btn ${done ? 'btn--primary' : 'btn--ghost'}`, href: `#/day/${n + 1}` }, `Day ${n + 1} →`) : h('span')));
}
