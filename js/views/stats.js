// 학습 기록 (記録)
import { h, dayNum, dateKey, pct, weekdayKo, fmtMD } from '../util.js';
import { db, totalDays } from '../data.js';
import * as store from '../store.js';
import { pageHead, progressBar } from '../ui.js';

export default function stats() {
  const today = dayNum();
  const st = store.getState();
  const counts = store.cardCounts();
  const fc = store.forecast(7);
  const fcMax = Math.max(1, ...fc);

  // 최근 7일 정답률
  let rev = 0, cor = 0, quiz = 0, quizR = 0, newCards = 0;
  for (let i = 0; i < 7; i++) { const l = store.logFor(today - i); if (l) { rev += l.reviews; cor += l.correct; quiz += l.quiz; quizR += l.quizRight; newCards += l.newCards; } }

  // 12주 히트맵 (월요일 시작)
  const dow = (new Date(Date.now() - 4 * 3600000).getDay() + 6) % 7;
  const start = today - dow - 7 * 11;
  const cells = [];
  for (let n = start; n < start + 84; n++) {
    const l = store.logFor(n);
    const amount = l ? l.reviews + l.newCards * 2 + l.quiz : 0;
    const lv = n > today ? 'future' : amount === 0 ? 0 : amount < 30 ? 1 : amount < 80 ? 2 : amount < 160 ? 3 : 4;
    cells.push(h('span', { class: `heat__cell heat__cell--${lv}${l?.days?.length ? ' has-stamp' : ''}`, title: `${fmtMD(n)} (${weekdayKo(n)}) · 복습 ${l?.reviews || 0} · 새 카드 ${l?.newCards || 0}${l?.days?.length ? ` · Day ${l.days.join(',')} 완료` : ''}` }));
  }

  const typeCount = (type, extra = () => true) => store.cardCounts(id => { const it = db.items.get(id); return !!it && !id.includes('#') && it.type === type && extra(it); });
  const rowsData = [
    ['히라가나', typeCount('kana', k => k.script === 'hiragana'), db.kana.filter(k => k.script === 'hiragana').length],
    ['가타카나', typeCount('kana', k => k.script === 'katakana'), db.kana.filter(k => k.script === 'katakana').length],
    ['어휘', typeCount('vocab'), db.vocab.length],
    ['한자', typeCount('kanji'), db.kanji.length]
  ];

  return h('div', { class: 'page' },
    pageHead({ back: '#/', kicker: 'RECORDS', title: '학습 기록', tate: '記録' }),
    h('section', { class: 'tiles tiles--4' },
      h('div', { class: 'tile' }, h('span', { class: 'tile__num' }, String(store.streak()), h('small', null, '일')), h('span', { class: 'tile__label' }, '연속 출석')),
      h('div', { class: 'tile' }, h('span', { class: 'tile__num' }, String(store.totalStudyDays()), h('small', null, '일')), h('span', { class: 'tile__label' }, '총 공부한 날')),
      h('div', { class: 'tile' }, h('span', { class: 'tile__num' }, String(store.completedCount()), h('small', null, `/${totalDays()}`)), h('span', { class: 'tile__label' }, '완료한 Day')),
      h('div', { class: 'tile' }, h('span', { class: 'tile__num' }, String(counts.total)), h('span', { class: 'tile__label' }, '복습 카드'))),

    h('section', { class: 'card' },
      h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '앞으로 7일 복습 예정'), h('span', { class: 'card__aside' }, '오늘 포함')),
      h('div', { class: 'bars' }, fc.map((v, i) => h('div', { class: 'bars__col' },
        h('span', { class: 'bars__val' }, String(v)),
        h('span', { class: `bars__bar${i === 0 ? ' is-today' : ''}`, style: { height: `${Math.max(3, (v / fcMax) * 100)}%` } }),
        h('span', { class: 'bars__label' }, i === 0 ? '오늘' : weekdayKo(today + i))))),
      h('p', { class: 'card__foot' }, '복습을 하루 미루면 다음 날 두 배로 쌓입니다. 새 학습보다 복습이 먼저입니다.')),

    h('section', { class: 'card' },
      h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '최근 7일')),
      h('div', { class: 'kv' },
        h('div', null, h('dt', null, '복습한 카드'), h('dd', null, `${rev}장`)),
        h('div', null, h('dt', null, '복습 기억률'), h('dd', null, rev ? `${pct(cor, rev)}%` : '—')),
        h('div', null, h('dt', null, '퀴즈 정답률'), h('dd', null, quiz ? `${pct(quizR, quiz)}%` : '—')),
        h('div', null, h('dt', null, '새로 배운 카드'), h('dd', null, `${newCards}장`)))),

    h('section', { class: 'card' },
      h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '12주 출석 지도'), h('span', { class: 'card__aside' }, '진할수록 많이 공부한 날 · 붉은 점 = 도장')),
      h('div', { class: 'heat' }, cells)),

    h('section', { class: 'card' },
      h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '영역별 암기 상태'), h('span', { class: 'card__aside' }, '완전히 외움 = 복습 간격 21일 이상')),
      h('div', { class: 'meters' }, rowsData.map(([label, c, total]) => h('div', { class: 'meter' },
        h('div', { class: 'meter__row' }, h('span', { class: 'meter__label' }, label), h('span', { class: 'meter__val' }, `외움 ${c.mature} · 익히는 중 ${c.young + c.learning}`, h('small', null, ` / ${total}`))),
        h('div', { class: 'progress progress--stack' },
          h('div', { class: 'progress__fill progress__fill--mature', style: { width: `${pct(c.mature, total)}%` } }),
          h('div', { class: 'progress__fill progress__fill--young', style: { width: `${pct(c.young + c.learning, total)}%` } })))))),

    st.startDay !== null ? h('p', { class: 'listinfo' }, `${dateKey(st.startDay)}에 시작 · 오늘로 ${store.daysSinceStart()}일째`) : null);
}
