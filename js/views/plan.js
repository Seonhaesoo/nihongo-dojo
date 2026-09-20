// 12주 플랜 (計画): 주차별 목표와 84일 로드맵
import { h, ruby } from '../util.js';
import { db, weekDays, dayMeta, totalDays } from '../data.js';
import * as store from '../store.js';
import { pageHead, stamp } from '../ui.js';

export default function plan() {
  const cur = store.currentDay(totalDays());
  const curWeek = dayMeta(cur)?.week || 1;

  const weeks = db.curriculum.weeks.map(w => {
    const days = weekDays(w.week);
    const done = days.filter(d => store.isDayDone(d)).length;
    const open = w.week === curWeek;
    const list = h('ol', { class: 'plan__days' }, days.map(n => {
      const m = dayMeta(n);
      const isDone = store.isDayDone(n);
      return h('li', null, h('a', { class: `plan__day${isDone ? ' is-done' : ''}${n === cur ? ' is-current' : ''}`, href: `#/day/${n}` },
        h('span', { class: 'plan__num' }, String(n).padStart(2, '0')),
        h('span', { class: 'plan__text' },
          h('span', { class: 'plan__title', html: ruby(m.title || '') }),
          m.theme ? h('span', { class: 'plan__theme' }, `어휘 · ${m.theme}`) : null),
        isDone ? stamp('済', { size: 'xs' }) : n === cur ? h('span', { class: 'chip chip--accent' }, '오늘') : m.kind === 'review' ? h('span', { class: 'chip chip--soft' }, '테스트') : null));
    }));
    const details = h('details', { class: 'plan__week', open: open || undefined },
      h('summary', null,
        h('span', { class: 'plan__belt', dataset: { belt: w.belt } }, w.belt),
        h('span', { class: 'plan__wtext' },
          h('span', { class: 'plan__wtitle' }, `${w.week}주차 · ${w.title}`),
          h('span', { class: 'plan__goal' }, w.goal)),
        h('span', { class: 'plan__count' }, `${done}/${days.length}`)),
      list);
    return details;
  });

  return h('div', { class: 'page' },
    pageHead({ kicker: '12 WEEKS · 84 DAYS', title: '수련 계획', tate: '計画', lead: '하루에 한 Day. 더 달리고 싶은 날은 다음 Day를 미리 해도 됩니다. 띠 색은 주차가 오를수록 짙어집니다.' }),
    h('section', { class: 'plan' }, weeks),
    h('section', { class: 'card card--note' },
      h('h2', { class: 'h2' }, '하루 수련 순서'),
      h('ol', { class: 'steps-guide' },
        h('li', null, h('b', null, '복습'), ' — 밀린 카드부터 비웁니다. 복습이 이 코스의 심장입니다.'),
        h('li', null, h('b', null, '새 학습'), ' — 글자·문법·단어·한자를 소리 내어 익힙니다.'),
        h('li', null, h('b', null, '마무리 테스트'), ' — 80% 이상이면 그날의 도장이 찍힙니다.'))));
}
