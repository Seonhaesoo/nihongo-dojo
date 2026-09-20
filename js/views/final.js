// 수료 (修了): 12주의 기록과 다음 단계
import { h, ruby, dateKey, dayNum } from '../util.js';
import { db, totalDays } from '../data.js';
import * as store from '../store.js';
import { pageHead, stamp } from '../ui.js';
import { checkDayComplete } from './day.js';

export default function final() {
  const total = totalDays();
  const before = store.completedCount();
  const eligible = before >= total - 1;
  if (eligible && !store.isStepDone(total, 'final')) { store.markStep(total, 'final'); checkDayComplete(total); }
  const counts = store.cardCounts();
  const st = store.getState();

  const next = h('section', { class: 'card card--note' }, h('h2', { class: 'h2' }, '다음 단계 — N4, 그리고 그 너머'),
    h('ul', { class: 'tips' },
      h('li', null, h('b', null, '복습은 계속 '), '— 카드가 모두 “완전히 외움”이 될 때까지 매일 복습을 비우세요. 지금부터는 하루 10~15분이면 됩니다.'),
      h('li', null, h('b', null, 'N4 문법 '), '— 수동·사역·사역수동, 〜ば·〜なら 조건, 〜ようだ·〜らしい·〜はずだ 추측, 〜ておく·〜てしまう·〜てみる, 존경어·겸양어 본격 학습.'),
      h('li', null, h('b', null, '어휘 1,500 · 한자 300 '), '— 한국 한자음 ↔ 음독 대응 규칙을 알고 있으니 한자어는 빠르게 늘어납니다. 훈독 단어에 집중하세요.'),
      h('li', null, h('b', null, '많이 듣고 많이 읽기 '), '— NHK やさしいことばニュース, 쉬운 일본어 팟캐스트, 좋아하는 애니·드라마를 일본어 자막으로. 모르는 단어는 단어장처럼 복습하세요.'),
      h('li', null, h('b', null, 'JLPT '), '— 시험은 매년 7월과 12월 첫째 일요일에 있습니다. 한국인 학습자는 N5·N4를 건너뛰고 N3부터 응시하는 경우도 많습니다.')));

  if (!eligible) {
    return h('div', { class: 'page' },
      pageHead({ back: '#/plan', kicker: 'DAY 84', title: '수료', tate: '修了', lead: `수료식은 앞의 ${total - 1}일을 모두 마친 뒤에 열립니다. 지금까지 ${before}일을 완료했습니다.` }),
      h('a', { class: 'btn btn--primary btn--lg', href: `#/day/${store.currentDay(total)}` }, '이어서 수련하기'), next);
  }

  return h('div', { class: 'page page--final' },
    pageHead({ back: '#/', kicker: 'DAY 84 · 全課程修了', title: '수료를 축하합니다', tate: '修了' }),
    h('section', { class: 'diploma' },
      h('p', { class: 'diploma__head jp', html: ruby('{修了証|しゅうりょうしょう}') }),
      h('p', { class: 'diploma__body' }, '위 사람은 「일본어 도장」 12주 집중 과정의', h('br'), `84일 수련을 모두 마쳤기에 이 증서를 드립니다.`),
      h('div', { class: 'diploma__stats' },
        h('div', null, h('b', null, String(store.totalStudyDays())), h('span', null, '공부한 날')),
        h('div', null, h('b', null, String(counts.total)), h('span', null, '익힌 카드')),
        h('div', null, h('b', null, String(db.grammar.length)), h('span', null, '문법 레슨'))),
      h('p', { class: 'diploma__date' }, `${st.startDay !== null ? dateKey(st.startDay) : ''} ~ ${dateKey(dayNum())}`),
      stamp('合格', { size: 'xl', animate: true }),
      h('p', { class: 'diploma__sign jp' }, '日本語道場')),
    next);
}
