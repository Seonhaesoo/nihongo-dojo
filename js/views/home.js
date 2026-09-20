// 홈 (道場): 오늘의 수련, 복습 대기, 출석 도장, 진도
import { h, ruby, dayNum, dateKey, weekdayKo, pct } from '../util.js';
import { db, dayMeta, weekMeta, daySteps, totalDays, sentenceCardIds } from '../data.js';
import * as store from '../store.js';
import { progressBar, stamp, japaneseDate } from '../ui.js';

export default function home() {
  const total = totalDays();
  const cur = store.currentDay(total);
  const meta = dayMeta(cur) || {};
  const week = weekMeta(meta.week) || {};
  const steps = daySteps(cur);
  const doneSteps = steps.filter(s => store.isStepDone(cur, s.key)).length;
  const due = store.dueCards().length;
  const streak = store.streak();
  const completed = store.completedCount();
  const today = dayNum();
  const finishedToday = (store.logFor(today)?.days || []).length;
  const allDone = completed >= total;
  const started = store.getState().startDay !== null;

  // 페이스: 시작 후 경과일 대비 완료한 Day
  const elapsed = store.daysSinceStart();
  const paceDiff = completed - Math.max(0, elapsed - 1);
  const pace = !started ? '오늘이 1일째입니다. 첫 도장을 찍어 보세요.'
    : paceDiff >= 1 ? `계획보다 ${paceDiff}일 앞서 있습니다. 이 기세로!`
    : paceDiff >= -1 ? '계획대로 가고 있습니다.'
    : `계획보다 ${-paceDiff}일 늦었습니다. 오늘 두 Day를 해치워 보세요.`;

  const hero = h('section', { class: 'hero card card--ink' },
    h('span', { class: 'hero__mark', 'aria-hidden': 'true' }, week.belt || '道'),
    h('div', { class: 'hero__top' },
      h('p', { class: 'kicker kicker--light' }, allDone ? '全課程修了' : `${meta.week || 1}주차 · ${week.title || ''}`),
      h('p', { class: 'hero__day' }, 'Day ', h('b', null, String(cur)), h('small', null, ` / ${total}`))),
    h('h2', { class: 'hero__title', html: ruby(allDone ? '12주 과정을 모두 마쳤습니다' : (meta.title || '')) }),
    meta.theme && !allDone ? h('p', { class: 'hero__theme' }, `어휘 테마 · ${meta.theme}`) : null,
    h('div', { class: 'hero__steps' }, steps.map(s => h('span', { class: `dot${store.isStepDone(cur, s.key) ? ' is-done' : ''}`, title: s.label }, s.icon))),
    h('div', { class: 'hero__cta' },
      h('a', { class: 'btn btn--primary btn--lg', href: allDone ? '#/final' : `#/day/${cur}` }, allDone ? '수료증 보기' : doneSteps ? '이어서 수련하기' : '오늘의 수련 시작'),
      h('span', { class: 'hero__hint' }, finishedToday ? `오늘 Day ${finishedToday}개 완료 — 더 달릴 수 있습니다` : `${doneSteps} / ${steps.length} 단계 완료`)));

  const tiles = h('section', { class: 'tiles' },
    h('a', { class: `tile${due ? ' tile--alert' : ''}`, href: '#/review' },
      h('span', { class: 'tile__num' }, String(due)), h('span', { class: 'tile__label' }, '복습 대기'), h('span', { class: 'tile__ja' }, '復習')),
    h('a', { class: 'tile', href: '#/stats' },
      h('span', { class: 'tile__num' }, String(streak), h('small', null, '일')), h('span', { class: 'tile__label' }, '연속 출석'), h('span', { class: 'tile__ja' }, '連続')),
    h('a', { class: 'tile', href: '#/plan' },
      h('span', { class: 'tile__num' }, `${pct(completed, total)}`, h('small', null, '%')), h('span', { class: 'tile__label' }, `진도 ${completed}/${total}`), h('span', { class: 'tile__ja' }, '進度')));

  // 이번 주 출석 도장 (월~일)
  const dow = (new Date(Date.now() - 4 * 3600000).getDay() + 6) % 7; // 월=0
  const monday = today - dow;
  const strip = h('section', { class: 'card' },
    h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '이번 주 출석부'), h('span', { class: 'card__aside jp', html: ruby('{出席簿|しゅっせきぼ}') })),
    h('div', { class: 'week' }, Array.from({ length: 7 }, (_, i) => {
      const n = monday + i;
      const log = store.logFor(n);
      const active = !!log && (log.reviews > 0 || log.newCards > 0 || log.quiz > 0 || log.days.length > 0);
      const cleared = log?.days?.length || 0;
      return h('div', { class: `week__cell${n === today ? ' is-today' : ''}${n > today ? ' is-future' : ''}` },
        h('span', { class: 'week__dow' }, weekdayKo(n)),
        active ? stamp(cleared ? '済' : '学', { size: 'sm', title: cleared ? `Day ${log.days.join(', ')} 완료` : '복습만 한 날' }) : stamp('', { size: 'sm', ghost: true }),
        h('span', { class: 'week__date' }, dateKey(n).slice(8)));
    })),
    h('p', { class: 'card__foot' }, pace));

  // 영역별 진도
  const count = pred => store.cardCounts(pred).total;
  const isType = (type, extra = () => true) => id => { const it = db.items.get(id); return !!it && !id.includes('#') && it.type === type && extra(it); };
  const lessonsDone = db.grammar.filter(g => store.hasCard(sentenceCardIds(g)[0])).length;
  const progress = h('section', { class: 'card' },
    h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '쌓아 올린 것'), h('a', { class: 'card__aside', href: '#/stats' }, '기록 자세히 →')),
    h('div', { class: 'meters' },
      progressBar(count(isType('kana', k => k.script === 'hiragana')), db.kana.filter(k => k.script === 'hiragana').length, { label: '히라가나' }),
      progressBar(count(isType('kana', k => k.script === 'katakana')), db.kana.filter(k => k.script === 'katakana').length, { label: '가타카나' }),
      progressBar(count(isType('vocab')), db.vocab.length, { label: '어휘', tone: 'ai' }),
      progressBar(count(isType('kanji')), db.kanji.length, { label: '한자', tone: 'ai' }),
      progressBar(lessonsDone, db.grammar.length, { label: '문법 레슨', tone: 'matcha' })));

  return h('div', { class: 'page page--home' },
    h('header', { class: 'masthead' },
      h('div', null,
        h('p', { class: 'masthead__date jp', html: ruby(japaneseDate(new Date(Date.now() - 4 * 3600000))) }),
        h('h1', { class: 'masthead__title' }, '일본어 도장'),
        h('p', { class: 'masthead__sub' }, '매일 도장 찍는 12주 집중 코스')),
      h('span', { class: 'masthead__tate', 'aria-hidden': 'true' }, '日本語道場')),
    hero, tiles, strip, progress);
}
