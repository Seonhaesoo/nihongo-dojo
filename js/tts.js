// 일본어 음성 합성 (Web Speech API)
import { settings } from './store.js';
import { stripMarkup } from './util.js';

let voices = [];
const synth = window.speechSynthesis;

function refresh() { voices = synth ? synth.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang)) : []; }
if (synth) {
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
}

export function jaVoices() { if (!voices.length) refresh(); return voices; }
export function supported() { return !!synth; }
/** 듣기 문제를 낼 수 있는가: 음성 목록이 아직 비어 있으면(일부 모바일) 가능하다고 본다 */
export function canListen() {
  if (!synth) return false;
  const all = synth.getVoices();
  return all.length === 0 || jaVoices().length > 0;
}

function pickVoice(index = 0) {
  const list = jaVoices();
  if (!list.length) return null;
  const pref = settings().ttsVoice;
  if (index === 0 && pref) { const v = list.find(x => x.voiceURI === pref); if (v) return v; }
  // 자연스러운 온라인 음성을 우선
  const ranked = list.slice().sort((a, b) => score(b) - score(a));
  return ranked[index % ranked.length];
}
function score(v) {
  let s = 0;
  if (/natural|neural/i.test(v.name)) s += 4;
  if (/google/i.test(v.name)) s += 3;
  if (/nanami|keita|kyoko|o-ren|haruka|ayumi/i.test(v.name)) s += 1;
  if (v.lang.replace('_', '-').toLowerCase() === 'ja-jp') s += 1;
  return s;
}

/** text: 후리가나 마크업이 있어도 된다. opts.voice: 화자 번호(청해용), opts.rate, opts.pitch */
export function speak(text, opts = {}) {
  if (!synth || !text) return Promise.resolve();
  const clean = stripMarkup(text).replace(/[〜～]/g, '').replace(/（　）/g, '、').trim();
  if (!clean) return Promise.resolve();
  const busy = synth.speaking || synth.pending;
  if (!opts.queue) synth.cancel();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ja-JP';
    const v = pickVoice(opts.voice || 0);
    if (v) u.voice = v;
    u.rate = opts.rate ?? settings().ttsRate ?? 0.9;
    u.pitch = opts.pitch ?? 1;
    u.onend = u.onerror = () => resolve();
    if (busy && !opts.queue) setTimeout(() => synth.speak(u), 70); else synth.speak(u);
    // 일부 브라우저는 onend를 부르지 않는 경우가 있어 안전장치를 둔다
    setTimeout(resolve, Math.max(4000, clean.length * 450));
  });
}

export function stop() { synth?.cancel(); }

/** 자동 재생 설정이 켜져 있을 때만 읽는다 */
export function autoSpeak(text, opts) { if (settings().autoSpeak) return speak(text, opts); return Promise.resolve(); }
