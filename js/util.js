// 공용 유틸: DOM 빌더, 후리가나 마크업 렌더링, 날짜, 배열 헬퍼

const GROUP = /\{([^{}|]*)\|([^{}|]*)\}/g;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** {漢字|かんじ} → <ruby>. 나머지는 이스케이프된다. */
export function ruby(s) {
  return esc(s).replace(GROUP, (_, base, reading) => `<ruby>${base}<rt>${reading}</rt></ruby>`);
}

/** 한국어 설명문: 후리가나 + **굵게** + 줄바꿈 */
export function rich(s) {
  return ruby(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

export function stripMarkup(s) { return String(s ?? '').replace(GROUP, '$1'); }
export function readingOf(s) { return String(s ?? '').replace(GROUP, '$2'); }

/** h('div', {class:'a', onclick:fn}, child, ...) */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function sample(arr, n) { return shuffle(arr).slice(0, n); }
export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── 날짜 (모두 기기 로컬 시간 기준) ──
const DAY_MS = 86400000;
/** 로컬 자정 기준의 일련번호. SRS의 due 계산에 쓴다. 새벽 4시 이전은 전날로 친다. */
export function dayNum(d = new Date()) {
  const t = new Date(d.getTime() - 4 * 3600000);
  return Math.floor((Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())) / DAY_MS);
}
export function dayNumToDate(n) { return new Date(n * DAY_MS); }
export function dateKey(n = dayNum()) {
  const d = dayNumToDate(n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export function keyToDayNum(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}
const WEEK_KO = ['일', '월', '화', '수', '목', '금', '토'];
const WEEK_JA = ['日', '月', '火', '水', '木', '金', '土'];
export function weekdayKo(n) { return WEEK_KO[dayNumToDate(n).getUTCDay()]; }
export function weekdayJa(n) { return WEEK_JA[dayNumToDate(n).getUTCDay()]; }
export function fmtMD(n) { const d = dayNumToDate(n); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; }

export function fmtInterval(days) {
  if (days <= 0) return '곧';
  if (days < 30) return `${days}일`;
  if (days < 365) return `${Math.round(days / 30)}개월`;
  return `${(days / 365).toFixed(1)}년`;
}

export function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

export function isKanji(ch) { return /[㐀-䶿一-鿿々]/.test(ch); }
export function hasKanji(s) { return /[㐀-䶿一-鿿々]/.test(s); }
export function kataToHira(s) {
  return String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

// ── 토스트 / 모달 ──
export function toast(msg, ms = 2200) {
  const root = document.getElementById('toast-root');
  const el = h('div', { class: 'toast' }, msg);
  root.append(el);
  setTimeout(() => el.classList.add('is-out'), ms);
  setTimeout(() => el.remove(), ms + 400);
}

export function modal(content, { onClose, wide = false } = {}) {
  const root = document.getElementById('modal-root');
  const close = () => {
    wrap.classList.add('is-out');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 180);
    onClose?.();
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  const sheet = h('div', { class: `sheet${wide ? ' sheet--wide' : ''}`, role: 'dialog', 'aria-modal': 'true' },
    h('button', { class: 'sheet__close', 'aria-label': '닫기', onclick: close }, '×'),
    content);
  const wrap = h('div', { class: 'modal', onclick: e => { if (e.target === wrap) close(); } }, sheet);
  document.addEventListener('keydown', onKey);
  root.append(wrap);
  return { close, el: sheet };
}

export function confirmDialog(message, { okText = '확인', cancelText = '취소', danger = false } = {}) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; m.close(); resolve(v); } };
    const m = modal(h('div', { class: 'confirm' },
      h('p', { class: 'confirm__msg' }, message),
      h('div', { class: 'confirm__row' },
        h('button', { class: 'btn btn--ghost', onclick: () => finish(false) }, cancelText),
        h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, onclick: () => finish(true) }, okText))
    ), { onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}
