// 학습 상태 저장소 (localStorage). 모든 진도·SRS 카드·설정이 여기 들어간다.
import { dayNum, dateKey, keyToDayNum } from './util.js';
import { introduce, grade as srsGrade, isDue, isMature } from './srs.js';

const KEY = 'nihongo-dojo.v1';

const DEFAULT_SETTINGS = {
  theme: 'auto',          // auto | light | dark
  furigana: 'always',     // always | tap | off
  ttsRate: 0.9,
  ttsVoice: '',
  autoSpeak: true,
  reverseCards: false,    // 한→일 카드도 만들기
  sessionSize: 60,        // 복습 한 세션의 최대 카드 수
  glyphFont: 'klee'       // klee | gothic | mincho
};

function fresh() {
  return { version: 1, createdAt: new Date().toISOString(), startDay: null, settings: { ...DEFAULT_SETTINGS }, cards: {}, days: {}, log: {}, itemStats: {}, lessons: {} };
}

let state = fresh();
const listeners = new Set();
let saveTimer = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...fresh(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) } };
    }
  } catch (e) { console.warn('저장 데이터를 읽지 못했습니다', e); }
  return state;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 150);
}
export function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.error('저장 실패', e); }
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => fn(state)); }

export const getState = () => state;
export const settings = () => state.settings;
export function setSetting(k, v) { state.settings[k] = v; save(); emit(); }

// ── 로그 ──
function todayLog() {
  const k = dateKey();
  return (state.log[k] ||= { reviews: 0, correct: 0, newCards: 0, quiz: 0, quizRight: 0, days: [] });
}
function touchStart() { if (state.startDay === null) state.startDay = dayNum(); }

// ── 카드 ──
export function hasCard(id) { return id in state.cards; }
export function getCard(id) { return state.cards[id]; }
export function addCards(ids) {
  const today = dayNum();
  let n = 0;
  for (const id of ids) if (!state.cards[id]) { state.cards[id] = introduce(today); n++; }
  if (n) { touchStart(); todayLog().newCards += n; save(); emit(); }
  return n;
}
export function gradeCard(id, g) {
  const card = state.cards[id];
  if (!card) return false;
  const again = srsGrade(card, g, dayNum());
  const log = todayLog();
  log.reviews++;
  if (g >= 2) log.correct++;
  save();
  return again;
}
export function dueCards(today = dayNum()) {
  return Object.entries(state.cards).filter(([, c]) => isDue(c, today)).map(([id]) => id);
}
export function cardCounts(filter = () => true) {
  let total = 0, mature = 0, young = 0, learning = 0;
  for (const [id, c] of Object.entries(state.cards)) {
    if (!filter(id)) continue;
    total++;
    if (isMature(c)) mature++; else if (c.state === 'learn') learning++; else young++;
  }
  return { total, mature, young, learning };
}
export function forecast(n = 7) {
  const today = dayNum();
  const out = new Array(n).fill(0);
  for (const c of Object.values(state.cards)) {
    const off = Math.max(0, c.due - today);
    if (off < n) out[off]++;
  }
  return out;
}

// ── 퀴즈 통계 (약점 파악용) ──
export function recordAnswer(itemId, right) {
  if (!itemId) return;
  const s = (state.itemStats[itemId] ||= { r: 0, w: 0 });
  if (right) s.r++; else s.w++;
  const log = todayLog();
  log.quiz++;
  if (right) log.quizRight++;
  save();
}
export function weakItems(limit = 20) {
  return Object.entries(state.itemStats)
    .filter(([, s]) => s.w > 0)
    .sort((a, b) => (b[1].w / (b[1].r + b[1].w)) - (a[1].w / (a[1].r + a[1].w)) || b[1].w - a[1].w)
    .slice(0, limit).map(([id]) => id);
}

// ── 레슨(문법·발음) 통과 기록 ──
export function markLesson(id, score) { touchStart(); (state.lessons ||= {})[id] = { score, at: dayNum() }; save(); emit(); }
export function isLessonDone(id) { return !!state.lessons?.[id] || `${id}#0` in state.cards; }

// ── Day 진행 ──
export function dayState(n) { return (state.days[n] ||= { steps: {}, completedAt: null }); }
export function isStepDone(n, step) { return !!state.days[n]?.steps?.[step]?.done; }
export function stepInfo(n, step) { return state.days[n]?.steps?.[step]; }
export function markStep(n, step, info = {}) {
  touchStart();
  const d = dayState(n);
  const prev = d.steps[step] || {};
  d.steps[step] = { ...prev, ...info, done: true, best: Math.max(prev.best ?? 0, info.score ?? 0) };
  save(); emit();
}
export function isDayDone(n) { return !!state.days[n]?.completedAt; }
export function completeDay(n) {
  const d = dayState(n);
  if (d.completedAt) return false;
  touchStart();
  d.completedAt = new Date().toISOString();
  d.completedDay = dayNum();
  const log = todayLog();
  if (!log.days.includes(n)) log.days.push(n);
  save(); emit();
  return true;
}
export function currentDay(total = 84) {
  for (let n = 1; n <= total; n++) if (!isDayDone(n)) return n;
  return total;
}
export function completedCount() { return Object.values(state.days).filter(d => d.completedAt).length; }

// ── 출석(스트릭) ──
function activeOn(key) {
  const l = state.log[key];
  return !!l && (l.reviews > 0 || l.newCards > 0 || l.quiz > 0 || l.days.length > 0);
}
export function streak() {
  let n = dayNum(), count = 0;
  if (!activeOn(dateKey(n))) n--; // 오늘 아직 안 했어도 어제까지의 연속은 유지
  while (activeOn(dateKey(n))) { count++; n--; }
  return count;
}
export function studiedToday() { return activeOn(dateKey()); }
export function logFor(n) { return state.log[dateKey(n)]; }
export function totalStudyDays() { return Object.keys(state.log).filter(activeOn).length; }
export function daysSinceStart() { return state.startDay === null ? 0 : dayNum() - state.startDay + 1; }

// ── 백업 ──
export function exportData() { return JSON.stringify({ app: 'nihongo-dojo', exportedAt: new Date().toISOString(), state }, null, 1); }
export function importData(text) {
  const obj = JSON.parse(text);
  const s = obj.state || obj;
  if (!s || typeof s !== 'object' || !s.cards || !s.days) throw new Error('일본어 도장 백업 파일이 아닙니다.');
  state = { ...fresh(), ...s, settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) } };
  flush(); emit();
}
export function resetAll() { state = fresh(); flush(); emit(); }
export { keyToDayNum };
