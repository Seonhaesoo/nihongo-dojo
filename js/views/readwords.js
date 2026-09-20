// 가나 단어 읽기 연습: 배운 글자로 실제 단어를 소리 내어 읽고, 눌러서 확인한다
import { h, clear, shuffle } from '../util.js';
import { itemsUpTo } from '../data.js';
import * as store from '../store.js';
import { speak } from '../tts.js';
import { speakBtn } from '../ui.js';
import { checkDayComplete } from './day.js';

export default function readwords([nStr]) {
  const n = Number(nStr);
  const back = `#/day/${n}`;
  const words = shuffle(itemsUpTo(n, 'kana').filter(k => k.script === 'hiragana' && k.word && [...k.word.kana].length > 1)).slice(0, 20);
  const root = h('div', { class: 'session' });
  let i = 0;

  function card() {
    if (i >= words.length) return done();
    const k = words[i];
    const answer = h('div', { class: 'reveal is-hidden' },
      h('p', { class: 'reveal__ko' }, k.word.ko), speakBtn(k.word.kana));
    const btn = h('button', { class: 'btn btn--primary btn--lg btn--block', onclick: () => {
      if (answer.classList.contains('is-hidden')) { answer.classList.remove('is-hidden'); speak(k.word.kana); btn.textContent = i + 1 < words.length ? '다음 단어' : '끝내기'; }
      else { i++; card(); }
    } }, '소리 내어 읽은 뒤 → 확인');
    clear(root).append(h('div', { class: 'quiz' },
      h('header', { class: 'quiz__bar' },
        h('a', { class: 'quiz__exit', href: back, 'aria-label': '그만두기' }, '×'),
        h('div', { class: 'progress' }, h('div', { class: 'progress__fill', style: { width: `${(i / words.length) * 100}%` } })),
        h('span', { class: 'quiz__count' }, `${i + 1} / ${words.length}`)),
      h('div', { class: 'quiz__body is-in' },
        h('p', { class: 'quiz__label' }, '한 글자씩 또박또박 소리 내어 읽어 보세요'),
        h('div', { class: 'quiz__prompt' }, h('span', { class: 'glyph glyph--word' }, k.word.kana)),
        answer),
      h('footer', { class: 'quiz__foot' }, btn)));
  }

  function done() {
    store.markStep(n, 'readwords');
    const completed = checkDayComplete(n);
    clear(root).append(h('div', { class: 'result' },
      h('p', { class: 'kicker' }, '읽기 연습 완료'),
      h('p', { class: 'result__big jp' }, 'すらすら！'),
      h('p', { class: 'result__detail' }, `단어 ${words.length}개를 읽었습니다. 글자가 단어로 보이기 시작하면 성공입니다.`),
      h('div', { class: 'result__actions' }, h('a', { class: 'btn btn--primary btn--lg', href: back }, completed ? 'Day 완료! 돌아가기' : '다음 단계로'))));
  }

  card();
  return root;
}
