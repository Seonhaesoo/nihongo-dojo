// 획순 애니메이션 (KanjiVG, CC BY-SA 3.0)과 따라 쓰기 패드
import { h, clear } from './util.js';

const SOURCES = [
  hex => `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${hex}.svg`,
  hex => `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`
];
const cache = new Map();
const NS = 'http://www.w3.org/2000/svg';

async function fetchPaths(ch) {
  if (cache.has(ch)) return cache.get(ch);
  const hex = ch.codePointAt(0).toString(16).padStart(5, '0');
  let paths = null;
  for (const src of SOURCES) {
    try {
      const res = await fetch(src(hex));
      if (!res.ok) continue;
      const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
      const found = [...doc.querySelectorAll('path')].map(p => p.getAttribute('d')).filter(Boolean);
      if (found.length) { paths = found; break; }
    } catch { /* 다음 소스 시도 */ }
  }
  cache.set(ch, paths);
  return paths;
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function drawChar(paths) {
  const svg = svgEl('svg', { viewBox: '0 0 109 109', class: 'stroke__svg' });
  svg.append(svgEl('path', { d: 'M54.5 4V105M4 54.5H105', class: 'stroke__guide' }));
  const ghosts = svgEl('g', { class: 'stroke__ghost' });
  const lines = svgEl('g', { class: 'stroke__ink' });
  const nums = svgEl('g', { class: 'stroke__nums' });
  paths.forEach((d, i) => {
    ghosts.append(svgEl('path', { d }));
    lines.append(svgEl('path', { d }));
    const m = /M\s*([\d.]+)[,\s]([\d.]+)/i.exec(d);
    if (m) { const t = svgEl('text', { x: Math.max(3, Number(m[1]) - 6), y: Math.max(8, Number(m[2]) - 2) }); t.textContent = String(i + 1); nums.append(t); }
  });
  svg.append(ghosts, lines, nums);
  return svg;
}

function play(svg) {
  let delay = 0.15;
  svg.querySelectorAll('.stroke__ink path').forEach(p => {
    const len = p.getTotalLength();
    const dur = Math.max(0.28, len / 120);
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.style.animation = 'none';
    void p.getBoundingClientRect();
    p.style.animation = `stroke-draw ${dur}s ease-in-out ${delay}s forwards`;
    delay += dur + 0.12;
  });
}

/** 글자(한 글자 또는 きゃ 같은 두 글자)의 획순 플레이어 */
export function strokePlayer(text) {
  const chars = [...text];
  const stage = h('div', { class: 'stroke__stage' }, h('p', { class: 'stroke__loading' }, '획순을 불러오는 중…'));
  const replay = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', disabled: true }, '▶ 획순 다시 보기');
  const wrap = h('div', { class: 'stroke' }, stage, replay);
  Promise.all(chars.map(fetchPaths)).then(all => {
    if (all.some(p => !p)) {
      clear(stage).append(h('p', { class: 'stroke__loading' }, '획순 데이터를 불러오지 못했습니다. (인터넷 연결 필요)'));
      return;
    }
    const svgs = all.map(drawChar);
    clear(stage).append(...svgs);
    const run = () => svgs.forEach((s, i) => setTimeout(() => play(s), i * 900));
    replay.disabled = false;
    replay.onclick = run;
    requestAnimationFrame(run);
  });
  return wrap;
}

/** 따라 쓰기 패드: 흐린 글자 위에 손가락/마우스로 써 본다 (채점 없음) */
export function writePad(text) {
  const canvas = h('canvas', { class: 'pad__canvas', width: 440, height: 440 });
  const ctx = canvas.getContext('2d');
  let drawing = false, last = null;
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) }; };
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#111';
  canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.strokeStyle = ink(); ctx.lineWidth = 13; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p;
  });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  const wipe = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  return h('div', { class: 'pad' },
    h('div', { class: 'pad__box' }, h('span', { class: `pad__model glyph${[...text].length > 1 ? ' pad__model--two' : ''}`, 'aria-hidden': 'true' }, text), canvas),
    h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: wipe }, '지우고 다시 쓰기'));
}
