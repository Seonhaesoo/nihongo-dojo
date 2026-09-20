// 여러 화면이 같이 쓰는 작은 UI 조각들
import { h, ruby, esc, pct, hasKanji } from './util.js';
import { speak } from './tts.js';

export function pageHead({ kicker, title, tate, lead, back, right }) {
  return h('header', { class: 'page-head' },
    tate ? h('span', { class: 'tate', 'aria-hidden': 'true' }, tate) : null,
    h('div', { class: 'page-head__main' },
      back ? h('a', { class: 'back', href: back }, '← 돌아가기') : null,
      kicker ? h('p', { class: 'kicker' }, kicker) : null,
      h('h1', { class: 'h1', html: ruby(title) }),
      lead ? h('p', { class: 'lead', html: ruby(lead) }) : null),
    right || null);
}

export function progressBar(value, max, { label, tone } = {}) {
  const p = pct(value, max);
  return h('div', { class: 'meter' },
    label ? h('div', { class: 'meter__row' }, h('span', { class: 'meter__label' }, label), h('span', { class: 'meter__val' }, `${value}`, h('small', null, ` / ${max}`))) : null,
    h('div', { class: `progress${tone ? ` progress--${tone}` : ''}` }, h('div', { class: 'progress__fill', style: { width: `${p}%` } })));
}

export function stamp(text, { size = '', ghost = false, animate = false, title } = {}) {
  return h('span', { class: `stamp${size ? ` stamp--${size}` : ''}${ghost ? ' stamp--ghost' : ''}${animate ? ' stamp--in' : ''}`, title }, text);
}

export function speakBtn(text, { label = '듣기', small = false } = {}) {
  return h('button', { class: `speak${small ? ' speak--sm' : ''}`, type: 'button', 'aria-label': label, title: label, onclick: e => { e.stopPropagation(); speak(text); } },
    h('span', { 'aria-hidden': 'true' }, '🔊'));
}

export function wordRuby(v) {
  return hasKanji(v.jp) ? `<ruby>${esc(v.jp)}<rt>${esc(v.kana)}</rt></ruby>` : esc(v.jp);
}

export function exampleBlock(ex, { speakable = true } = {}) {
  if (!ex) return null;
  return h('div', { class: 'ex' },
    h('p', { class: 'ex__jp jp', html: ruby(ex.jp) }, speakable ? speakBtn(ex.jp, { small: true }) : null),
    h('p', { class: 'ex__ko' }, ex.ko));
}

export function emptyState(glyph, title, body, action) {
  return h('div', { class: 'empty' }, h('div', { class: 'empty__glyph' }, glyph), h('h2', { class: 'h2' }, title), h('p', null, body), action || null);
}

export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'seg', role: 'tablist' });
  const draw = v => {
    wrap.replaceChildren(...options.map(o => h('button', { class: `seg__btn${o.value === v ? ' is-active' : ''}`, role: 'tab', 'aria-selected': String(o.value === v), onclick: () => { draw(o.value); onChange(o.value); } }, o.label)));
  };
  draw(value);
  return wrap;
}

// ── 오늘 날짜를 일본어로 (읽기 포함) ──
const NUM = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう'];
const MONTH = ['', 'いち', 'に', 'さん', 'し', 'ご', 'ろく', 'しち', 'はち', 'く', 'じゅう', 'じゅういち', 'じゅうに'];
const DAY_IRR = { 1: 'ついたち', 2: 'ふつか', 3: 'みっか', 4: 'よっか', 5: 'いつか', 6: 'むいか', 7: 'なのか', 8: 'ようか', 9: 'ここのか', 10: 'とおか', 14: 'じゅうよっか', 17: 'じゅうしちにち', 19: 'じゅうくにち', 20: 'はつか', 24: 'にじゅうよっか', 27: 'にじゅうしちにち', 29: 'にじゅうくにち' };
const WEEK = [['日', 'にち'], ['月', 'げつ'], ['火', 'か'], ['水', 'すい'], ['木', 'もく'], ['金', 'きん'], ['土', 'ど']];
function twoDigit(n) {
  const t = Math.floor(n / 10), o = n % 10;
  return (t > 1 ? NUM[t] : '') + (t ? 'じゅう' : '') + NUM[o];
}
export function japaneseDate(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate(), [wk, wr] = WEEK[d.getDay()];
  const dayRead = DAY_IRR[day] || `${twoDigit(day)}にち`;
  return `{${m}月|${MONTH[m]}がつ}{${day}日|${dayRead}} {${wk}曜日|${wr}ようび}`;
}
