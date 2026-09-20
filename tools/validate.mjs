#!/usr/bin/env node
// 콘텐츠 JSON 검증기.
//   node tools/validate.mjs                 → data/ 전체 검증
//   node tools/validate.mjs data/vocab/a.json [...]  → 지정 파일만 검증
// 규격은 docs/CONTENT_SPEC.md, 기준표는 tools/syllabus.json.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const syllabus = JSON.parse(readFileSync(join(ROOT, 'tools/syllabus.json'), 'utf8'));

const KANJI = /[㐀-䶿一-鿿々〆]/;
const KANJI_G = /[㐀-䶿一-鿿々〆]/g;
const KANA_ONLY = /^[぀-ゟ゠-ヿ〜～\s、。！？!?・]+$/;
const READING_ONLY = /^[぀-ゟ゠-ヿー]+$/;
const BASE_ONLY = /^[㐀-䶿一-鿿々〆0-9０-９]+$/;
const HANGUL = /[가-힣]/;
const GROUP = /\{([^{}|]*)\|([^{}|]*)\}/g;

const POS = ['명사', '대명사', '동사1', '동사2', '동사3', 'い형용사', 'な형용사', '부사', '접속사', '의문사', '조사', '감탄사', '연체사', '표현', '접미사', '수사'];
const U_ROW = 'うくぐすつぬぶむる';
const IE_ROW = 'いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ';

export function stripMarkup(s) { return String(s).replace(GROUP, '$1'); }
export function readingOf(s) { return String(s).replace(GROUP, '$2'); }

export function kanjiPlan() {
  const chars = [...syllabus.kanjiOrder];
  const days = syllabus.kanjiDays;
  const counts = days.map((_, i) => (i < 2 ? 3 : i < 4 ? 4 : 2));
  let rest = chars.length - counts.reduce((a, b) => a + b, 0);
  for (let i = counts.length - 1; rest > 0 && i >= 0; i--, rest--) counts[i]++;
  const plan = {};
  let k = 0;
  days.forEach((d, i) => { for (let n = 0; n < counts[i]; n++) plan[chars[k++]] = d; });
  return plan;
}

let errors = 0, warnings = 0;
const seenIds = new Map();
function err(file, path, msg) { errors++; console.log(`  ✗ ${file} ${path}: ${msg}`); }
function warn(file, path, msg) { warnings++; console.log(`  ! ${file} ${path}: ${msg}`); }

function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }

function checkMarkup(file, path, s, { required = true } = {}) {
  if (s === undefined || s === null) { if (required) err(file, path, '필수 문자열 누락'); return; }
  if (typeof s !== 'string') return err(file, path, '문자열이어야 함');
  if (required && !s.trim()) return err(file, path, '빈 문자열');
  let m; GROUP.lastIndex = 0;
  while ((m = GROUP.exec(s))) {
    const [, base, reading] = m;
    if (!BASE_ONLY.test(base)) err(file, path, `후리가나 그룹의 앞부분은 한자(또는 숫자)만: {${base}|${reading}} — 오쿠리가나는 중괄호 밖으로`);
    else if (!KANJI.test(base) && !/[0-9０-９]/.test(base)) err(file, path, `그룹에 한자가 없음: {${base}|${reading}}`);
    if (!READING_ONLY.test(reading)) err(file, path, `읽기는 가나만: {${base}|${reading}}`);
  }
  const rest = s.replace(GROUP, '');
  if (/[{}|]/.test(rest)) err(file, path, `후리가나 마크업이 깨짐: "${s}"`);
  const bare = rest.match(KANJI_G);
  if (bare) err(file, path, `후리가나 없는 한자 [${[...new Set(bare)].join('')}] in "${s}"`);
}

function checkId(file, path, id) {
  if (seenIds.has(id)) err(file, path, `id 중복: ${id} (이미 ${seenIds.get(id)}에 있음)`);
  else seenIds.set(id, file);
}

// ───────── vocab ─────────
function validateVocab(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  const byDay = {};
  arr.forEach((v, i) => {
    const p = `[${i}]${v && v.id ? `(${v.id})` : ''}`;
    if (!v || typeof v !== 'object') return err(file, p, '객체가 아님');
    const m = /^(v|s)-d(\d{2})-(\d{2})$/.exec(v.id || '');
    if (!m) err(file, p, `id 형식은 v-dNN-NN 또는 s-dNN-NN: ${v.id}`);
    else {
      checkId(file, p, v.id);
      if (Number(m[2]) !== v.day) err(file, p, `id의 day(${m[2]})와 day(${v.day}) 불일치`);
    }
    if (!Number.isInteger(v.day) || v.day < 1 || v.day > 84) err(file, p, `day 범위 오류: ${v.day}`);
    if (!isStr(v.jp)) err(file, p + '.jp', '누락');
    if (!isStr(v.kana)) err(file, p + '.kana', '누락');
    else if (!KANA_ONLY.test(v.kana)) err(file, p + '.kana', `가나만 허용: ${v.kana}`);
    if (!isStr(v.ko)) err(file, p + '.ko', '누락');
    else if (!HANGUL.test(v.ko)) warn(file, p + '.ko', `한국어 뜻에 한글이 없음: ${v.ko}`);
    if (!POS.includes(v.pos)) err(file, p + '.pos', `허용되지 않는 품사: ${v.pos}`);
    if (isStr(v.jp) && isStr(v.kana)) {
      if (!KANJI.test(v.jp) && KANA_ONLY.test(v.jp) && v.jp.replace(/[〜～]/g, '') !== v.kana.replace(/[〜～]/g, '')) warn(file, p, `jp가 가나인데 kana와 다름: ${v.jp} / ${v.kana}`);
      const last = v.kana.trim().slice(-1);
      if (/^동사/.test(v.pos) && !U_ROW.includes(last)) err(file, p, `동사는 사전형(う단)으로: ${v.kana}`);
      if (v.pos === '동사2' && !(last === 'る' && IE_ROW.includes(v.kana.trim().slice(-2, -1)))) err(file, p, `2그룹 동사는 い단/え단+る: ${v.kana}`);
      if (v.pos === '동사3' && !/(する|くる)$/.test(v.kana.trim())) err(file, p, `3그룹은 する/くる: ${v.kana}`);
      if (v.pos === 'い형용사' && last !== 'い') err(file, p, `い형용사는 い로 끝나야 함: ${v.kana}`);
      if (v.pos === 'な형용사' && /な$/.test(v.jp)) warn(file, p, 'な형용사의 jp에는 な를 붙이지 않음');
    }
    const needEx = m && m[1] === 'v' && v.pos !== '표현';
    if (v.ex) {
      checkMarkup(file, p + '.ex.jp', v.ex.jp);
      if (!isStr(v.ex.ko)) err(file, p + '.ex.ko', '누락');
      if (isStr(v.ex.jp) && !/[。？！?!]$/.test(stripMarkup(v.ex.jp).trim())) warn(file, p + '.ex.jp', '예문이 문장부호로 끝나지 않음');
    } else if (needEx) err(file, p + '.ex', '예문 누락');
    if (v.note !== undefined) checkMarkup(file, p + '.note', v.note);
    if (v.cog !== undefined && !isStr(v.cog)) err(file, p + '.cog', '빈 값');
    if (m && m[1] === 'v') (byDay[v.day] ||= []).push(v.jp);
  });
  for (const [day, list] of Object.entries(byDay)) {
    const expect = (syllabus.vocab[day] || []).map(s => s.replace(/\(.*?\)/g, ''));
    if (!expect.length) { err(file, `day ${day}`, 'syllabus에 없는 day'); continue; }
    const missing = expect.filter(w => !list.includes(w));
    const extra = list.filter(w => !expect.includes(w));
    if (missing.length) err(file, `day ${day}`, `syllabus 단어 누락: ${missing.join(', ')}`);
    if (extra.length) err(file, `day ${day}`, `syllabus에 없는 단어(표기를 syllabus와 똑같이): ${extra.join(', ')}`);
  }
}

// ───────── kanji ─────────
function validateKanji(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  const plan = kanjiPlan();
  const seen = new Set();
  arr.forEach((k, i) => {
    const p = `[${i}]${k && k.kanji ? `(${k.kanji})` : ''}`;
    if (!k || typeof k !== 'object') return err(file, p, '객체가 아님');
    if (!isStr(k.kanji) || [...k.kanji].length !== 1) return err(file, p + '.kanji', '한 글자여야 함');
    if (!(k.kanji in plan)) err(file, p, `syllabus에 없는 한자: ${k.kanji}`);
    else if (plan[k.kanji] !== k.day) err(file, p + '.day', `day는 ${plan[k.kanji]}이어야 함 (현재 ${k.day})`);
    if (k.id !== `kj-${k.kanji}`) err(file, p + '.id', `id는 kj-${k.kanji}`);
    else checkId(file, p, k.id);
    seen.add(k.kanji);
    if (!isStr(k.hun) || !HANGUL.test(k.hun)) err(file, p + '.hun', '훈음(예: "날 일") 누락');
    if (!isStr(k.ko)) err(file, p + '.ko', '누락');
    if (!Array.isArray(k.on) || k.on.some(r => !/^[゠-ヿ]+$/.test(r))) err(file, p + '.on', '음독은 가타카나 배열');
    if (!Array.isArray(k.kun) || k.kun.some(r => !/^[぀-ゟ.\-]+$/.test(r))) err(file, p + '.kun', '훈독은 히라가나 배열 (오쿠리가나는 . 으로 구분)');
    if (Array.isArray(k.on) && Array.isArray(k.kun) && k.on.length + k.kun.length === 0) err(file, p, '음독/훈독이 모두 비어 있음');
    if (!Number.isInteger(k.strokes) || k.strokes < 1 || k.strokes > 30) err(file, p + '.strokes', '획수 오류');
    if (!Array.isArray(k.words) || k.words.length < 2 || k.words.length > 5) err(file, p + '.words', '예시 단어 2~5개');
    else k.words.forEach((w, j) => {
      const wp = `${p}.words[${j}]`;
      if (!isStr(w.jp) || !w.jp.includes(k.kanji)) err(file, wp + '.jp', `해당 한자가 들어간 단어여야 함: ${w.jp}`);
      if (!isStr(w.kana) || !KANA_ONLY.test(w.kana)) err(file, wp + '.kana', `가나만 허용: ${w.kana}`);
      if (!isStr(w.ko)) err(file, wp + '.ko', '누락');
    });
    if (k.tip !== undefined) checkMarkup(file, p + '.tip', k.tip);
  });
  const missing = Object.keys(plan).filter(c => !seen.has(c));
  if (missing.length) err(file, '$', `누락된 한자 ${missing.length}자: ${missing.join('')}`);
}

// ───────── grammar ─────────
function validateQuiz(file, p, q) {
  if (!q || typeof q !== 'object') return err(file, p, '객체가 아님');
  if (q.type === 'choice') {
    checkMarkup(file, p + '.q', q.q);
    if (q.ko !== undefined && !isStr(q.ko)) err(file, p + '.ko', '빈 값');
    if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 4) err(file, p + '.choices', '보기 3~4개');
    else {
      q.choices.forEach((c, j) => checkMarkup(file, `${p}.choices[${j}]`, c));
      if (new Set(q.choices).size !== q.choices.length) err(file, p + '.choices', '보기 중복');
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) err(file, p + '.answer', '정답 인덱스 범위 오류');
    }
    checkMarkup(file, p + '.explain', q.explain);
  } else if (q.type === 'order') {
    if (!Array.isArray(q.tokens) || q.tokens.length < 3 || q.tokens.length > 8) err(file, p + '.tokens', '토큰 3~8개');
    else {
      q.tokens.forEach((t, j) => checkMarkup(file, `${p}.tokens[${j}]`, t));
      if (new Set(q.tokens).size !== q.tokens.length) err(file, p + '.tokens', '같은 토큰이 두 번 나오면 안 됨');
    }
    if (!isStr(q.ko)) err(file, p + '.ko', '한국어 해석 누락');
    if (q.alts !== undefined) {
      const n = (q.tokens || []).length;
      if (!Array.isArray(q.alts) || q.alts.some(a => !Array.isArray(a) || a.length !== n || new Set(a).size !== n || a.some(x => !Number.isInteger(x) || x < 0 || x >= n))) err(file, p + '.alts', 'alts는 토큰 인덱스 순열의 배열');
    }
  } else err(file, p + '.type', `type은 choice 또는 order: ${q.type}`);
}

function validateGrammar(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  arr.forEach((g, i) => {
    const p = `[${i}]${g && g.id ? `(${g.id})` : ''}`;
    if (!g || typeof g !== 'object') return err(file, p, '객체가 아님');
    const ref = syllabus.grammar.find(x => x.id === g.id);
    if (!ref) return err(file, p + '.id', `syllabus에 없는 id: ${g.id}`);
    checkId(file, p, g.id);
    if (g.day !== ref.day) err(file, p + '.day', `day는 ${ref.day}`);
    checkMarkup(file, p + '.title', g.title);
    if (isStr(g.title) && stripMarkup(g.title) !== ref.title) warn(file, p + '.title', `syllabus 제목과 다름: "${stripMarkup(g.title)}" ≠ "${ref.title}"`);
    if (!isStr(g.titleKo)) err(file, p + '.titleKo', '누락');
    checkMarkup(file, p + '.summary', g.summary);
    if (!Array.isArray(g.points) || g.points.length < 1 || g.points.length > 7) err(file, p + '.points', '포인트 1~7개');
    else g.points.forEach((pt, j) => {
      const pp = `${p}.points[${j}]`;
      checkMarkup(file, pp + '.pattern', pt.pattern);
      if (!isStr(pt.meaning)) err(file, pp + '.meaning', '누락');
      checkMarkup(file, pp + '.explain', pt.explain);
      if (!Array.isArray(pt.examples) || pt.examples.length < 2 || pt.examples.length > 5) err(file, pp + '.examples', '예문 2~5개');
      else pt.examples.forEach((e, k) => {
        checkMarkup(file, `${pp}.examples[${k}].jp`, e.jp);
        if (!isStr(e.ko)) err(file, `${pp}.examples[${k}].ko`, '누락');
      });
    });
    if (g.table !== undefined) {
      const tables = Array.isArray(g.table) ? g.table : [g.table];
      tables.forEach((t, j) => {
        const tp = `${p}.table[${j}]`;
        if (!isStr(t.caption)) err(file, tp + '.caption', '누락');
        if (!Array.isArray(t.head) || !Array.isArray(t.rows)) return err(file, tp, 'head/rows 배열 필요');
        t.head.forEach((c, k) => checkMarkup(file, `${tp}.head[${k}]`, c, { required: false }));
        t.rows.forEach((r, k) => {
          if (!Array.isArray(r) || r.length !== t.head.length) return err(file, `${tp}.rows[${k}]`, '열 개수가 head와 다름');
          r.forEach((c, l) => checkMarkup(file, `${tp}.rows[${k}][${l}]`, c, { required: false }));
        });
      });
    }
    if (g.compare !== undefined) checkMarkup(file, p + '.compare', g.compare);
    if (g.pitfalls !== undefined) {
      if (!Array.isArray(g.pitfalls)) err(file, p + '.pitfalls', '배열이어야 함');
      else g.pitfalls.forEach((s, j) => checkMarkup(file, `${p}.pitfalls[${j}]`, s));
    }
    if (!Array.isArray(g.quiz) || g.quiz.length < 6 || g.quiz.length > 12) err(file, p + '.quiz', '퀴즈 6~12문항');
    else {
      g.quiz.forEach((q, j) => validateQuiz(file, `${p}.quiz[${j}]`, q));
      const pos = g.quiz.filter(q => q.type === 'choice').map(q => q.answer);
      if (pos.length >= 4 && new Set(pos).size === 1) warn(file, p + '.quiz', '정답 위치가 전부 같음 — 섞을 것');
    }
  });
}

// ───────── reading / listening ─────────
function validateQuestions(file, p, qs, min, max, jpQuestion) {
  if (!Array.isArray(qs) || qs.length < min || qs.length > max) return err(file, p, `문항 ${min}~${max}개`);
  qs.forEach((q, j) => {
    const qp = `${p}[${j}]`;
    if (jpQuestion) checkMarkup(file, qp + '.q', q.q);
    if (!isStr(q.qKo)) err(file, qp + '.qKo', '누락');
    if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 4) err(file, qp + '.choices', '보기 3~4개');
    else {
      q.choices.forEach((c, k) => checkMarkup(file, `${qp}.choices[${k}]`, c));
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) err(file, qp + '.answer', '정답 인덱스 범위 오류');
    }
    checkMarkup(file, qp + '.explain', q.explain);
  });
}

function expectDay(map, id) { for (const [d, ids] of Object.entries(map)) if (ids.includes(id)) return Number(d); return null; }

function validateReading(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  arr.forEach((r, i) => {
    const p = `[${i}]${r && r.id ? `(${r.id})` : ''}`;
    const d = expectDay(syllabus.reading, r.id);
    if (d === null) return err(file, p + '.id', `syllabus에 없는 id: ${r.id}`);
    checkId(file, p, r.id);
    if (r.day !== d) err(file, p + '.day', `day는 ${d}`);
    checkMarkup(file, p + '.title', r.title);
    if (!isStr(r.titleKo)) err(file, p + '.titleKo', '누락');
    if (!Array.isArray(r.text) || !r.text.length) err(file, p + '.text', '문단 배열 필요');
    else r.text.forEach((t, j) => checkMarkup(file, `${p}.text[${j}]`, t));
    if (!Array.isArray(r.ko) || (Array.isArray(r.text) && r.ko.length !== r.text.length)) err(file, p + '.ko', 'text와 같은 개수의 해석 문단 필요');
    if (!Array.isArray(r.vocab)) err(file, p + '.vocab', '배열 필요');
    else r.vocab.forEach((w, j) => {
      if (!isStr(w.jp) || !isStr(w.ko) || !isStr(w.kana) || !KANA_ONLY.test(w.kana)) err(file, `${p}.vocab[${j}]`, 'jp/kana(가나만)/ko 필요');
    });
    validateQuestions(file, p + '.questions', r.questions, 2, 4, true);
  });
}

function validateListening(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  arr.forEach((l, i) => {
    const p = `[${i}]${l && l.id ? `(${l.id})` : ''}`;
    const d = expectDay(syllabus.listening, l.id);
    if (d === null) return err(file, p + '.id', `syllabus에 없는 id: ${l.id}`);
    checkId(file, p, l.id);
    if (l.day !== d) err(file, p + '.day', `day는 ${d}`);
    if (!isStr(l.title)) err(file, p + '.title', '누락');
    if (!isStr(l.situation)) err(file, p + '.situation', '누락');
    if (!Array.isArray(l.lines) || l.lines.length < 2) err(file, p + '.lines', '대사 2줄 이상');
    else l.lines.forEach((ln, j) => {
      if (!['A', 'B', 'N'].includes(ln.sp)) err(file, `${p}.lines[${j}].sp`, 'sp는 A/B/N');
      checkMarkup(file, `${p}.lines[${j}].jp`, ln.jp);
      if (!isStr(ln.ko)) err(file, `${p}.lines[${j}].ko`, '누락');
    });
    validateQuestions(file, p + '.questions', l.questions, 1, 3, false);
  });
}

// ───────── kana ─────────
function validateKana(file, arr) {
  if (!Array.isArray(arr)) return err(file, '$', '최상위는 배열이어야 함');
  arr.forEach((k, i) => {
    const p = `[${i}]${k && k.id ? `(${k.id})` : ''}`;
    if (!/^(hi|ka)-[a-z]+$/.test(k.id || '')) err(file, p + '.id', `id 형식 오류: ${k.id}`);
    else checkId(file, p, k.id);
    for (const f of ['kana', 'romaji', 'ko', 'script', 'group']) if (!isStr(k[f])) err(file, `${p}.${f}`, '누락');
    if (!Number.isInteger(k.day)) err(file, p + '.day', '누락');
  });
}

// ───────── run ─────────
function typeOf(rel) {
  const r = rel.replace(/\\/g, '/');
  if (r.startsWith('data/vocab/')) return validateVocab;
  if (r.startsWith('data/grammar/')) return validateGrammar;
  if (r === 'data/kanji.json') return validateKanji;
  if (r === 'data/kana.json') return validateKana;
  if (r === 'data/reading/listening.json') return validateListening;
  if (r.startsWith('data/reading/')) return validateReading;
  return null;
}

function collect() {
  const out = [];
  const walk = dir => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.json')) out.push(full);
    }
  };
  walk(join(ROOT, 'data'));
  return out.sort();
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const files = args.length ? args.map(a => resolve(a)) : collect();
  const counts = {};
  for (const full of files) {
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    const fn = typeOf(rel);
    if (!fn) continue;
    let data;
    try { data = JSON.parse(readFileSync(full, 'utf8').replace(/^﻿/, '')); }
    catch (e) { err(rel, '$', `JSON 파싱 실패: ${e.message}`); continue; }
    const before = errors;
    fn(rel, data);
    counts[rel] = Array.isArray(data) ? data.length : 0;
    console.log(`${errors === before ? '✓' : '✗'} ${rel} — ${counts[rel]}개`);
  }
  if (!args.length) {
    // 전체 검증일 때만: syllabus 대비 누락 점검
    const allIds = [...seenIds.keys()];
    const gMissing = syllabus.grammar.map(g => g.id).filter(id => !seenIds.has(id));
    if (gMissing.length) warn('data/grammar', '$', `아직 없는 문법 레슨: ${gMissing.join(', ')}`);
    const vDays = Object.keys(syllabus.vocab).filter(d => !allIds.some(id => id.startsWith(`v-d${String(d).padStart(2, '0')}-`)));
    if (vDays.length) warn('data/vocab', '$', `아직 어휘가 없는 day: ${vDays.join(', ')}`);
  }
  console.log(`\n오류 ${errors}건, 경고 ${warnings}건`);
  process.exit(errors ? 1 : 0);
}
