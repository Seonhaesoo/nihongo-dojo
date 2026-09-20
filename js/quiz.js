// 퀴즈 엔진: 문항 생성기 + 실행기(객관식 / 입력 / 어순 배열)
import { h, clear, ruby, rich, esc, shuffle, sample, hasKanji, stripMarkup, confirmDialog } from './util.js';
import { db } from './data.js';
import { speak, autoSpeak, canListen } from './tts.js';
import { recordAnswer } from './store.js';
import { normalizeKana } from './romaji.js';
import { conjugate, distractors as conjDistractors } from './conjugate.js';

// ───────── 보기(오답) 고르기 ─────────
function pickOthers(pool, item, textOf, n, prefer = () => 0) {
  const mine = textOf(item);
  const seen = new Set([mine]);
  const cands = [];
  for (const p of shuffle(pool)) {
    if (p.id === item.id) continue;
    const t = textOf(p);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    cands.push(p);
  }
  cands.sort((a, b) => prefer(b) - prefer(a));
  const top = cands.slice(0, Math.max(n * 3, n));
  return sample(top, n);
}
function mixChoices(correct, wrongs) {
  return shuffle([{ ...correct, correct: true }, ...wrongs.map(w => ({ ...w, correct: false }))]);
}
const wordHtml = v => hasKanji(v.jp) ? `<ruby>${esc(v.jp)}<rt>${esc(v.kana)}</rt></ruby>` : esc(v.jp);

// ───────── 가나 ─────────
export function kanaQuestion(k, mode, pool = db.kana) {
  const same = pool.filter(p => p.script === k.script);
  const prefer = p => (k.confuse?.includes(p.kana) ? 5 : 0) + (p.row === k.row ? 2 : 0) + (p.col === k.col ? 1 : 0) + (p.group === k.group ? 2 : 0);
  const readLabel = p => `<b>${esc(p.romaji)}</b><small>${esc(p.ko)}</small>`;
  if (mode === 'type') {
    return { kind: 'input', itemId: k.id, label: '이 글자의 발음을 로마자로 입력하세요', promptHtml: `<span class="glyph glyph--xl">${esc(k.kana)}</span>`,
      accept: [normalizeKana(k.kana)], raw: [k.romaji], answerHtml: `<b>${esc(k.romaji)}</b> · ${esc(k.ko)}`, speak: k.kana, placeholder: 'romaji' };
  }
  if (mode === 'r2k' || mode === 'listen') {
    const others = pickOthers(same, k, p => p.romaji, 3, prefer);
    return { kind: 'choice', itemId: k.id, label: mode === 'listen' ? '들리는 소리의 글자를 고르세요' : '이 발음의 글자를 고르세요',
      promptHtml: mode === 'listen' ? '<span class="quiz__ear">🔊</span>' : `<span class="quiz__big">${esc(k.romaji)}</span><span class="quiz__sub">${esc(k.ko)}</span>`,
      speakOnShow: mode === 'listen' ? k.kana : null, replay: mode === 'listen' ? k.kana : null, revealHtml: `<span class="quiz__big">${esc(k.romaji)}</span><span class="quiz__sub">${esc(k.ko)}</span>`, speak: k.kana, glyphChoices: true,
      choices: mixChoices({ html: `<span class="glyph">${esc(k.kana)}</span>` }, others.map(p => ({ html: `<span class="glyph">${esc(p.kana)}</span>` }))) };
  }
  const others = pickOthers(same, k, p => p.romaji, 3, prefer);
  return { kind: 'choice', itemId: k.id, label: '이 글자의 발음은?', promptHtml: `<span class="glyph glyph--xl">${esc(k.kana)}</span>`, speak: k.kana,
    choices: mixChoices({ html: readLabel(k) }, others.map(p => ({ html: readLabel(p) }))) };
}

// ───────── 어휘 ─────────
export function vocabQuestion(v, mode, pool = db.vocab) {
  const prefer = p => (p.pos === v.pos ? 3 : 0) + (p.set && p.set === v.set ? 3 : 0) + (Math.abs((p.day || 0) - (v.day || 0)) <= 7 ? 2 : 0);
  const after = v.ex ? `<div class="ex"><p class="ex__jp jp">${ruby(v.ex.jp)}</p><p class="ex__ko">${esc(v.ex.ko)}</p></div>` : '';
  if (mode === 'read' && hasKanji(v.jp)) {
    const others = pickOthers(pool.filter(p => hasKanji(p.jp)), v, p => p.kana, 3, p => prefer(p) + (Math.abs(p.kana.length - v.kana.length) <= 1 ? 3 : 0));
    return { kind: 'choice', itemId: v.id, label: '읽는 법을 고르세요', promptHtml: `<span class="quiz__word jp">${esc(v.jp)}</span><span class="quiz__sub">${esc(v.ko)}</span>`, speak: v.kana, afterHtml: after,
      choices: mixChoices({ html: `<span class="jp">${esc(v.kana)}</span>` }, others.map(p => ({ html: `<span class="jp">${esc(p.kana)}</span>` }))) };
  }
  if (mode === 'type') {
    return { kind: 'input', itemId: v.id, label: '일본어로 입력하세요 (로마자 또는 가나)', promptHtml: `<span class="quiz__big ko">${esc(v.ko)}</span>`,
      accept: [normalizeKana(v.kana)], raw: [v.jp], answerHtml: `${wordHtml(v)}`, speak: v.kana, afterHtml: after, placeholder: '예: gakusei' };
  }
  if (mode === 'k2j') {
    const others = pickOthers(pool, v, p => p.jp, 3, prefer);
    return { kind: 'choice', itemId: v.id, label: '일본어로는?', promptHtml: `<span class="quiz__big ko">${esc(v.ko)}</span>`, speak: v.kana, afterHtml: after,
      choices: mixChoices({ html: `<span class="jp">${wordHtml(v)}</span>` }, others.map(p => ({ html: `<span class="jp">${wordHtml(p)}</span>` }))) };
  }
  const others = pickOthers(pool, v, p => p.ko, 3, prefer);
  const listen = mode === 'listen';
  return { kind: 'choice', itemId: v.id, label: listen ? '듣고 뜻을 고르세요' : '뜻을 고르세요',
    promptHtml: listen ? '<span class="quiz__ear">🔊</span>' : `<span class="quiz__word jp">${wordHtml(v)}</span>`,
    speakOnShow: listen ? v.kana : null, replay: listen ? v.kana : null, revealHtml: `<span class="quiz__word jp">${wordHtml(v)}</span>`, speak: v.kana, afterHtml: (listen ? `<p class="quiz__reveal jp">${wordHtml(v)}</p>` : '') + after,
    choices: mixChoices({ html: esc(v.ko) }, others.map(p => ({ html: esc(p.ko) }))) };
}

// ───────── 한자 ─────────
export function kanjiQuestion(k, mode, pool = db.kanji) {
  const near = p => (Math.abs(p.day - k.day) <= 10 ? 2 : 0);
  const info = `<p class="quiz__reveal"><b>${esc(k.hun)}</b> · 음 ${esc(k.on.join('、') || '—')} · 훈 ${esc(k.kun.join('、') || '—')}</p>`;
  if (mode === 'word') {
    const w = sample(k.words, 1)[0];
    const allWords = pool.flatMap(p => p.words.map(x => ({ ...x, id: p.id + x.jp })));
    const others = pickOthers(allWords, { ...w, id: k.id + w.jp }, p => p.kana, 3, p => (Math.abs(p.kana.length - w.kana.length) <= 1 ? 3 : 0));
    return { kind: 'choice', itemId: k.id, label: '읽는 법을 고르세요', promptHtml: `<span class="quiz__word jp">${esc(w.jp)}</span><span class="quiz__sub">${esc(w.ko)}</span>`, speak: w.kana, afterHtml: info,
      choices: mixChoices({ html: `<span class="jp">${esc(w.kana)}</span>` }, others.map(p => ({ html: `<span class="jp">${esc(p.kana)}</span>` }))) };
  }
  if (mode === 'm2k') {
    const others = pickOthers(pool, k, p => p.kanji, 3, near);
    return { kind: 'choice', itemId: k.id, label: '이 뜻의 한자는?', promptHtml: `<span class="quiz__big ko">${esc(k.hun)}</span><span class="quiz__sub">${esc(k.ko)}</span>`, glyphChoices: true, afterHtml: info,
      choices: mixChoices({ html: `<span class="glyph">${esc(k.kanji)}</span>` }, others.map(p => ({ html: `<span class="glyph">${esc(p.kanji)}</span>` }))) };
  }
  const others = pickOthers(pool, k, p => p.hun, 3, near);
  return { kind: 'choice', itemId: k.id, label: '이 한자의 뜻과 음은?', promptHtml: `<span class="glyph glyph--xl">${esc(k.kanji)}</span>`, afterHtml: info,
    choices: mixChoices({ html: esc(k.hun) }, others.map(p => ({ html: esc(p.hun) }))) };
}

// ───────── 문법 (레슨에 수록된 문항) ─────────
/** 정답을 채운 문장을 읽어 준다. 한국어로 된 질문은 일본어 음성으로 읽을 수 없으므로 정답 보기만 읽는다. */
function grammarSpeech(q) {
  const answer = stripMarkup(q.choices[q.answer]);
  const hangul = /[가-힣]/;
  if (hangul.test(q.q)) return hangul.test(answer) ? null : answer;
  return q.q.includes('（　）') ? q.q.replace('（　）', answer) : null;
}
export function grammarQuestion(q, lesson) {
  const itemId = lesson?.id;
  if (q.type === 'order') return { kind: 'order', itemId, label: '단어를 올바른 순서로 배열하세요', tokens: q.tokens, ko: q.ko, alts: q.alts || [], tag: lesson?.titleKo };
  return { kind: 'choice', itemId, label: '빈칸에 알맞은 것을 고르세요', tag: lesson?.titleKo,
    promptHtml: `<span class="quiz__sentence jp">${ruby(q.q)}</span>${q.ko ? `<span class="quiz__sub">${esc(q.ko)}</span>` : ''}`,
    explainHtml: rich(q.explain), speak: grammarSpeech(q), fixedOrder: true,
    choices: q.choices.map((c, i) => ({ html: `<span class="jp">${ruby(c)}</span>`, correct: i === q.answer })) };
}

// ───────── 활용 ─────────
export function conjQuestion(v, form) {
  const c = conjugate(v, form.key);
  if (!c) return null;
  const wrongs = sample(conjDistractors(v, form.key, c), 3);
  if (wrongs.length < 2) return null;
  return { kind: 'choice', itemId: v.id, label: `${form.label}(${form.ko})으로 바꾸세요`,
    promptHtml: `<span class="quiz__word jp">${wordHtml(v)}</span><span class="quiz__sub">${esc(v.ko)} · ${esc(v.pos)}</span>`, speak: c.kana,
    afterHtml: `<p class="quiz__reveal jp">${wordHtml(v)} → <b><ruby>${esc(c.jp)}<rt>${esc(c.kana)}</rt></ruby></b></p>`,
    choices: mixChoices({ html: `<span class="jp">${esc(c.jp)}</span>` }, wrongs.map(w => ({ html: `<span class="jp">${esc(w)}</span>` }))) };
}

/** 항목 종류에 맞는 문항을 무작위 모드로 만든다 */
export function questionFor(it, modes) {
  const ok = m => m !== 'listen' || canListen();
  if (it.type === 'kana') return kanaQuestion(it, sample((modes?.kana || ['k2r', 'r2k', 'listen']).filter(ok), 1)[0]);
  if (it.type === 'kanji') return kanjiQuestion(it, sample(modes?.kanji || ['k2m', 'm2k', 'word'], 1)[0]);
  if (it.type === 'vocab') {
    const ms = (modes?.vocab || ['j2k', 'k2j', 'listen', 'read']).filter(m => ok(m) && (m !== 'read' || hasKanji(it.jp)));
    return vocabQuestion(it, sample(ms, 1)[0]);
  }
  return null;
}

// ───────── 실행기 ─────────
/**
 * root에 퀴즈 UI를 그린다.
 * opts: { title, requeue(틀린 문항 재출제), onDone({right,total,wrongIds}), onExit, passMark }
 */
export function runQuiz(root, questions, opts = {}) {
  const queue = questions.filter(Boolean).map(q => ({ q, first: true }));
  const total = queue.length;
  let done = 0, right = 0, locked = false, cleanup = null;
  const wrongIds = new Set();
  if (!total) { opts.onDone?.({ right: 0, total: 0, wrongIds: [] }); return; }

  const fill = h('div', { class: 'progress__fill' });
  const count = h('span', { class: 'quiz__count' });
  const body = h('div', { class: 'quiz__body' });
  const foot = h('footer', { class: 'quiz__foot' });
  const exit = h('button', { class: 'quiz__exit', 'aria-label': '그만두기', onclick: async () => {
    if (await confirmDialog('여기서 그만둘까요? 진행 중인 내용은 저장되지 않습니다.', { okText: '그만두기', cancelText: '계속하기' })) { cleanup?.(); opts.onExit?.(); }
  } }, '×');
  clear(root).append(h('div', { class: 'quiz' },
    h('header', { class: 'quiz__bar' }, exit, h('div', { class: 'progress' }, fill), count), body, foot));
  root._cleanup = () => cleanup?.();

  function finishOne(entry, ok) {
    if (entry.first) { done++; if (ok) right++; else if (entry.q.itemId) wrongIds.add(entry.q.itemId); recordAnswer(entry.q.itemId, ok); }
    if (!ok && opts.requeue) queue.splice(Math.min(queue.length, 3), 0, { q: reshuffle(entry.q), first: false });
  }
  function reshuffle(q) { return q.kind === 'choice' && !q.fixedOrder ? { ...q, choices: shuffle(q.choices) } : q; }

  function next() {
    cleanup?.(); cleanup = null;
    const entry = queue.shift();
    if (!entry) { opts.onDone?.({ right, total, wrongIds: [...wrongIds] }); return; }
    locked = false;
    fill.style.width = `${(done / total) * 100}%`;
    count.textContent = `${Math.min(done + 1, total)} / ${total}`;
    clear(body); clear(foot);
    body.classList.remove('is-in'); void body.offsetWidth; body.classList.add('is-in');
    const render = { choice: renderChoice, input: renderInput, order: renderOrder }[entry.q.kind];
    render(entry);
  }

  function feedback(entry, ok, extraHtml = '') {
    const q = entry.q;
    const box = h('div', { class: `quiz__feedback ${ok ? 'is-right' : 'is-wrong'}` },
      h('p', { class: 'quiz__verdict' }, ok ? '正解！ 정답' : '不正解… 오답'),
      extraHtml ? h('div', { html: extraHtml }) : null,
      q.explainHtml ? h('p', { class: 'quiz__explain', html: q.explainHtml }) : null,
      q.afterHtml ? h('div', { html: q.afterHtml }) : null);
    body.append(box);
    if (q.speak) autoSpeak(q.speak);
    const btn = h('button', { class: 'btn btn--primary btn--block btn--lg', onclick: next }, queue.length ? '다음' : '결과 보기');
    foot.append(btn);
    btn.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function head(q) {
    body.append(
      h('p', { class: 'quiz__label' }, q.tag ? h('span', { class: 'chip chip--soft' }, q.tag) : null, q.label),
      q.promptHtml ? h('div', { class: 'quiz__prompt', html: q.promptHtml }) : null);
    if (q.replay) {
      const prompt = body.querySelector('.quiz__prompt');
      const tools = h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ghost btn--sm', onclick: () => speak(q.replay) }, '다시 듣기'),
        q.revealHtml ? h('button', { class: 'btn btn--ghost btn--sm', onclick: () => { prompt.querySelector('.quiz__ear')?.replaceWith(h('span', { html: q.revealHtml, style: { display: 'contents' } })); } }, '소리가 안 나오면 · 글자로 보기') : null);
      prompt?.append(tools);
    }
    if (q.speakOnShow) speak(q.speakOnShow);
  }

  function renderChoice(entry) {
    const q = entry.q;
    head(q);
    const wrap = h('div', { class: `quiz__choices${q.glyphChoices ? ' quiz__choices--glyph' : ''}` });
    const btns = q.choices.map((c, i) => h('button', { class: 'choice', onclick: () => choose(i) },
      h('span', { class: 'choice__key' }, String(i + 1)), h('span', { class: 'choice__text', html: c.html })));
    wrap.append(...btns);
    body.append(wrap);
    function choose(i) {
      if (locked) return;
      locked = true;
      const ok = !!q.choices[i].correct;
      btns.forEach((b, j) => { b.disabled = true; if (q.choices[j].correct) b.classList.add('is-correct'); });
      if (!ok) btns[i].classList.add('is-wrong');
      finishOne(entry, ok);
      feedback(entry, ok);
    }
    const onKey = e => {
      if (e.target.closest?.('input, textarea')) return;
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= btns.length) { e.preventDefault(); choose(n - 1); }
    };
    document.addEventListener('keydown', onKey);
    cleanup = () => document.removeEventListener('keydown', onKey);
  }

  function renderInput(entry) {
    const q = entry.q;
    head(q);
    const preview = h('span', { class: 'quiz__preview jp' });
    const input = h('input', { class: 'quiz__input', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', placeholder: q.placeholder || '',
      oninput: () => { preview.textContent = input.value ? `→ ${normalizeKana(input.value)}` : ''; },
      onkeydown: e => { if (e.key === 'Enter' && !locked) submit(); } });
    const go = h('button', { class: 'btn btn--ink btn--block', onclick: () => submit() }, '확인');
    body.append(h('div', { class: 'quiz__inputrow' }, input, preview));
    foot.append(go);
    setTimeout(() => input.focus({ preventScroll: true }), 50);
    function submit() {
      if (locked || !input.value.trim()) return;
      locked = true;
      const val = input.value.trim();
      const ok = q.accept.includes(normalizeKana(val)) || (q.raw || []).includes(val.toLowerCase()) || (q.raw || []).includes(val);
      input.disabled = true;
      input.classList.add(ok ? 'is-correct' : 'is-wrong');
      clear(foot);
      finishOne(entry, ok);
      feedback(entry, ok, `<p class="quiz__reveal jp">${q.answerHtml}</p>`);
    }
  }

  function renderOrder(entry) {
    const q = entry.q;
    head(q);
    body.append(h('p', { class: 'quiz__sub quiz__sub--lead' }, q.ko));
    const order = shuffle(q.tokens.map((_, i) => i));
    if (order.every((v, i) => v === i) && order.length > 1) order.reverse();
    const picked = [];
    const line = h('div', { class: 'order__line' });
    const bank = h('div', { class: 'order__bank' });
    const check = h('button', { class: 'btn btn--ink btn--block', disabled: true, onclick: () => submit() }, '확인');
    body.append(line, bank);
    foot.append(check);
    const tokenBtn = (i, inLine) => h('button', { class: 'token jp', html: ruby(q.tokens[i]), onclick: () => {
      if (locked) return;
      if (inLine) picked.splice(picked.indexOf(i), 1); else picked.push(i);
      draw();
    } });
    function draw() {
      clear(line); clear(bank);
      picked.forEach(i => line.append(tokenBtn(i, true)));
      if (!picked.length) line.append(h('span', { class: 'order__hint' }, '아래 단어를 순서대로 누르세요'));
      order.filter(i => !picked.includes(i)).forEach(i => bank.append(tokenBtn(i, false)));
      check.disabled = picked.length !== q.tokens.length;
    }
    function submit() {
      if (locked) return;
      locked = true;
      const key = picked.join(',');
      const ok = key === q.tokens.map((_, i) => i).join(',') || q.alts.some(a => a.join(',') === key)
        || picked.map(i => stripMarkup(q.tokens[i])).join('') === q.tokens.map(stripMarkup).join('');
      line.classList.add(ok ? 'is-correct' : 'is-wrong');
      clear(foot);
      finishOne(entry, ok);
      entry.q.speak = q.tokens.join('');
      feedback(entry, ok, `<p class="quiz__reveal jp">${ruby(q.tokens.join(''))}。</p>`);
    }
    draw();
  }

  next();
}

/** 결과 화면 */
export function resultView({ right, total, passMark = 0, title = '결과', onRetry, onContinue, continueText = '계속', note }) {
  const score = total ? Math.round((right / total) * 100) : 100;
  const pass = score >= passMark;
  return h('div', { class: 'result' },
    h('p', { class: 'kicker' }, title),
    h('div', { class: `result__score ${pass ? 'is-pass' : 'is-fail'}` }, h('span', { class: 'result__num' }, String(score)), h('span', { class: 'result__unit' }, '点')),
    h('p', { class: 'result__detail' }, `${total}문항 중 ${right}문항 정답`),
    passMark ? h('div', { class: `stamp stamp--lg ${pass ? 'stamp--in' : 'stamp--ghost'}` }, pass ? '合格' : '再挑戦') : null,
    note ? h('p', { class: 'result__note' }, note) : null,
    h('div', { class: 'result__actions' },
      onRetry ? h('button', { class: `btn ${pass ? 'btn--ghost' : 'btn--primary'} btn--lg`, onclick: onRetry }, '다시 풀기') : null,
      onContinue ? h('button', { class: `btn ${pass ? 'btn--primary' : 'btn--ghost'} btn--lg`, onclick: onContinue }, continueText) : null));
}
