// 자유 퀴즈 (試験): 범위·유형을 골라 풀기, 약점 공략
import { h, clear, sample, shuffle } from '../util.js';
import { db } from '../data.js';
import * as store from '../store.js';
import { pageHead } from '../ui.js';
import { runQuiz, resultView, questionFor, grammarQuestion } from '../quiz.js';

const TYPES = [['kana', '가나'], ['vocab', '단어'], ['kanji', '한자'], ['grammar', '문법']];

export default function freequiz() {
  const root = h('div');
  const types = new Set(['vocab']);
  let scope = 'learned', count = 20, typing = false;

  function pool() {
    const learnedGrammar = db.grammar.filter(g => store.hasCard(`${g.id}#0`));
    const weak = new Set(store.weakItems(60));
    const pick = list => scope === 'all' ? list : scope === 'weak' ? list.filter(x => weak.has(x.id)) : list.filter(x => store.hasCard(x.id));
    const items = ['kana', 'vocab', 'kanji'].filter(t => types.has(t)).flatMap(t => pick(db[t]));
    const lessons = !types.has('grammar') ? [] : scope === 'all' ? db.grammar : scope === 'weak' ? db.grammar.filter(g => weak.has(g.id)) : learnedGrammar;
    return { items, lessons };
  }

  function setup() {
    document.body.classList.remove('is-focus');
    const { items, lessons } = pool();
    const size = items.length + lessons.length * 8;
    clear(root).append(h('div', { class: 'page' },
      pageHead({ back: '#/lib', kicker: 'FREE PRACTICE', title: '자유 퀴즈', tate: '試験', lead: '도장과는 상관없는 연습장입니다. 틀려도 되니 마음껏 풀어 보세요.' }),
      h('section', { class: 'card form' },
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '영역'),
          h('div', { class: 'checks' }, TYPES.map(([k, l]) => h('label', { class: `check${types.has(k) ? ' is-on' : ''}` },
            h('input', { type: 'checkbox', checked: types.has(k) || undefined, onchange: e => { e.target.checked ? types.add(k) : types.delete(k); setup(); } }), h('span', null, l))))),
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '범위'),
          h('div', { class: 'seg' }, [['learned', '배운 것'], ['weak', '약점 공략'], ['all', '전체']].map(([k, l]) => h('button', { class: `seg__btn${scope === k ? ' is-active' : ''}`, onclick: () => { scope = k; setup(); } }, l)))),
        h('div', { class: 'form__row' }, h('span', { class: 'form__label' }, '문항 수'),
          h('div', { class: 'seg' }, [10, 20, 40].map(n => h('button', { class: `seg__btn${count === n ? ' is-active' : ''}`, onclick: () => { count = n; setup(); } }, String(n))))),
        h('label', { class: 'checkline' }, h('input', { type: 'checkbox', checked: typing || undefined, onchange: e => { typing = e.target.checked; } }),
          h('span', null, '입력형 문제 섞기'), h('small', null, ' — 로마자로 직접 입력 (PC 추천)')),
        h('button', { class: 'btn btn--primary btn--lg btn--block', disabled: !size || undefined, onclick: run }, size ? `시작 (출제 가능 ${size}문항)` : scope === 'weak' ? '아직 틀린 문제가 없습니다' : '해당하는 항목이 없습니다'))));
  }

  function run() {
    const { items, lessons } = pool();
    const gq = lessons.flatMap(g => g.quiz.map(q => grammarQuestion(q, g)));
    const share = items.length && gq.length ? Math.round(count * 0.35) : gq.length ? count : 0;
    const modes = typing ? { kana: ['k2r', 'r2k', 'listen', 'type'], vocab: ['j2k', 'k2j', 'listen', 'read', 'type'] } : undefined;
    const qs = shuffle([...sample(items, count - share).map(x => questionFor(x, modes)), ...sample(gq, share)].filter(Boolean));
    if (!qs.length) return;
    document.body.classList.add('is-focus');
    const holder = h('div', { class: 'session' });
    clear(root).append(holder);
    runQuiz(holder, qs, {
      onExit: setup,
      onDone: ({ right, total }) => clear(holder).append(resultView({ right, total, title: '자유 퀴즈', onRetry: run, onContinue: setup, continueText: '설정으로' }))
    });
    root._cleanup = () => { holder._cleanup?.(); document.body.classList.remove('is-focus'); };
  }

  setup();
  return root;
}
