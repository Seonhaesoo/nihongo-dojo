// 부트스트랩 + 해시 라우터 + 내비게이션
import { h, clear } from './util.js';
import { load, settings, subscribe, dueCards } from './store.js';
import { loadAll } from './data.js';
import { stop as stopSpeech } from './tts.js';

import home from './views/home.js';
import plan from './views/plan.js';
import day from './views/day.js';
import learn from './views/learn.js';
import readwords from './views/readwords.js';
import review from './views/review.js';
import test from './views/test.js';
import { grammarList, grammarLesson } from './views/grammar.js';
import { library, kanaChart, vocabList, kanjiGrid } from './views/library.js';
import { readingList, readingView, listeningView } from './views/reading.js';
import drill from './views/drill.js';
import freequiz from './views/freequiz.js';
import stats from './views/stats.js';
import settingsView from './views/settings.js';
import final from './views/final.js';

const ROUTES = [
  [/^\/$/, home, 'home'],
  [/^\/plan$/, plan, 'plan'],
  [/^\/day\/(\d+)$/, day, 'plan'],
  [/^\/learn\/(\d+)\/(kana|vocab|kanji)$/, learn, 'focus'],
  [/^\/readwords\/(\d+)$/, readwords, 'focus'],
  [/^\/test\/(\d+)$/, test, 'focus'],
  [/^\/review$/, review, 'focus'],
  [/^\/grammar$/, grammarList, 'lib'],
  [/^\/grammar\/([gk]\d+)$/, grammarLesson, 'lib'],
  [/^\/lib$/, library, 'lib'],
  [/^\/kana$/, kanaChart, 'lib'],
  [/^\/vocab$/, vocabList, 'lib'],
  [/^\/kanji$/, kanjiGrid, 'lib'],
  [/^\/reading$/, readingList, 'lib'],
  [/^\/reading\/(r\d+)$/, readingView, 'lib'],
  [/^\/listening\/(l\d+)$/, listeningView, 'lib'],
  [/^\/drill$/, drill, 'lib'],
  [/^\/quiz$/, freequiz, 'lib'],
  [/^\/stats$/, stats, 'home'],
  [/^\/settings$/, settingsView, 'settings'],
  [/^\/final$/, final, 'plan']
];

const NAV = [
  { key: 'home', href: '#/', ja: '道場', ko: '홈' },
  { key: 'plan', href: '#/plan', ja: '計画', ko: '플랜' },
  { key: 'review', href: '#/review', ja: '復習', ko: '복습' },
  { key: 'lib', href: '#/lib', ja: '書庫', ko: '자료실' },
  { key: 'settings', href: '#/settings', ja: '設定', ko: '설정' }
];

const viewEl = document.getElementById('view');
const railEl = document.getElementById('rail');
let current = null;

function applySettings() {
  const s = settings();
  document.documentElement.dataset.theme = s.theme;
  document.documentElement.dataset.glyph = s.glyphFont;
  document.body.classList.remove('furi-always', 'furi-tap', 'furi-off');
  document.body.classList.add(`furi-${s.furigana}`);
}

function drawRail(active) {
  const due = dueCards().length;
  clear(railEl).append(
    h('a', { class: 'rail__brand', href: '#/', 'aria-label': '일본어 도장 홈' }, h('span', { class: 'rail__seal' }, '道')),
    ...NAV.map(n => h('a', { class: `rail__item${n.key === active ? ' is-active' : ''}`, href: n.href },
      h('span', { class: 'rail__ja' }, n.ja), h('span', { class: 'rail__ko' }, n.ko),
      n.key === 'review' && due ? h('span', { class: 'rail__badge' }, due > 99 ? '99+' : String(due)) : null)));
}

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

async function route() {
  stopSpeech();
  current?._cleanup?.();
  document.querySelectorAll('#modal-root .modal').forEach(m => m.remove());
  const { path, query } = parseHash();
  let match = null;
  for (const [re, view, nav] of ROUTES) {
    const m = re.exec(path);
    if (m) { match = { view, nav, params: m.slice(1) }; break; }
  }
  if (!match) { location.hash = '#/'; return; }
  document.body.classList.toggle('is-focus', match.nav === 'focus');
  drawRail(match.nav);
  try {
    const el = await match.view(match.params, query);
    current = el;
    clear(viewEl).append(el);
  } catch (e) {
    console.error(e);
    clear(viewEl).append(h('div', { class: 'page' }, h('h1', { class: 'h1' }, '문제가 생겼습니다'), h('p', null, String(e.message || e)), h('a', { class: 'btn btn--primary', href: '#/' }, '홈으로')));
  }
  viewEl.scrollTop = 0;
  window.scrollTo(0, 0);
  viewEl.focus({ preventScroll: true });
}

// 후리가나 '탭하면 보기' 모드: 문장을 누르면 읽기가 나타난다
document.addEventListener('click', e => {
  if (!document.body.classList.contains('furi-tap')) return;
  const host = e.target.closest?.('.jp, .ex__jp, .quiz__sentence, .flash__main');
  if (host && host.querySelector('rt')) host.classList.toggle('show-furi');
});

async function boot() {
  load();
  applySettings();
  subscribe(applySettings);
  await loadAll();
  window.addEventListener('hashchange', route);
  await route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('서비스 워커 등록 실패', e));
  }
}

boot();
