// 활용 연습 (活用): 동사·형용사를 지정한 형태로 바꾸는 훈련
import { h, clear, sample, shuffle } from '../util.js';
import { db } from '../data.js';
import * as store from '../store.js';
import { pageHead, emptyState } from '../ui.js';
import { VERB_FORMS, ADJ_FORMS } from '../conjugate.js';
import { runQuiz, resultView, conjQuestion } from '../quiz.js';

export default function drill() {
  const root = h('div');
  const chosen = new Set(['masu', 'te']);
  let target = 'verb', count = 15, onlyLearned = true;

  function words() {
    const pool = db.vocab.filter(v => (target === 'verb' ? /^동사/.test(v.pos) : v.pos === 'い형용사' || v.pos === 'な형용사'));
    const learned = pool.filter(v => store.hasCard(v.id));
    return onlyLearned && learned.length >= 5 ? learned : pool;
  }

  function setup() {
    document.body.classList.remove('is-focus');
    const forms = target === 'verb' ? VERB_FORMS : ADJ_FORMS;
    [...chosen].forEach(k => { if (!forms.some(f => f.key === k)) chosen.delete(k); });
    if (!chosen.size) chosen.add(forms[0].key);
    const pool = words();
    const learnedCount = db.vocab.filter(v => store.hasCard(v.id) && (target === 'verb' ? /^동사/.test(v.pos) : /형용사$/.test(v.pos))).length;
    clear(root).append(h('div', { class: 'page' },
      pageHead({ back: '#/lib', kicker: 'CONJUGATION DRILL', title: '활용 연습', tate: '活用', lead: 'て형은 규칙을 아는 것만으로는 부족합니다. 입에서 바로 나올 때까지 반복하세요.' }),
      !db.vocab.length ? emptyState('活', '단어 데이터가 없습니다', '') : h('section', { class: 'card form' },
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '대상'),
          h('div', { class: 'seg' }, [['verb', '동사'], ['adj', '형용사']].map(([k, l]) => h('button', { class: `seg__btn${target === k ? ' is-active' : ''}`, onclick: () => { target = k; setup(); } }, l)))),
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '바꿀 형태'),
          h('div', { class: 'checks' }, forms.map(f => h('label', { class: `check${chosen.has(f.key) ? ' is-on' : ''}` },
            h('input', { type: 'checkbox', checked: chosen.has(f.key) || undefined, onchange: e => { e.target.checked ? chosen.add(f.key) : chosen.delete(f.key); e.target.parentElement.classList.toggle('is-on', e.target.checked); } }),
            h('span', { class: 'jp' }, f.label), h('small', null, `Day ${f.from}~`))))),
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '문항 수'),
          h('div', { class: 'seg' }, [10, 15, 30].map(n => h('button', { class: `seg__btn${count === n ? ' is-active' : ''}`, onclick: () => { count = n; setup(); } }, String(n))))),
        h('label', { class: 'checkline' }, h('input', { type: 'checkbox', checked: onlyLearned || undefined, onchange: e => { onlyLearned = e.target.checked; setup(); } }),
          h('span', null, `배운 단어만 (${learnedCount}개)`), learnedCount < 5 ? h('small', null, ' — 5개 미만이면 전체 단어로 출제') : null),
        h('button', { class: 'btn btn--primary btn--lg btn--block', disabled: !pool.length || undefined, onclick: run }, `연습 시작 (대상 단어 ${pool.length}개)`))));
  }

  function run() {
    const forms = (target === 'verb' ? VERB_FORMS : ADJ_FORMS).filter(f => chosen.has(f.key));
    if (!forms.length) return;
    const pool = words();
    const qs = [];
    let guard = 0;
    while (qs.length < count && guard++ < count * 6) {
      const q = conjQuestion(sample(pool, 1)[0], sample(forms, 1)[0]);
      if (q) qs.push(q);
    }
    document.body.classList.add('is-focus');
    const holder = h('div', { class: 'session' });
    clear(root).append(holder);
    runQuiz(holder, shuffle(qs), {
      requeue: true,
      onExit: setup,
      onDone: ({ right, total }) => clear(holder).append(resultView({ right, total, title: '활용 연습', onRetry: run, onContinue: setup, continueText: '설정으로' }))
    });
    root._cleanup = () => { holder._cleanup?.(); document.body.classList.remove('is-focus'); };
  }

  setup();
  return root;
}
