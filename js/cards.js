// 항목 상세 카드 (새 학습 화면과 자료실 모달이 함께 쓴다)
import { h, ruby, rich, esc, hasKanji } from './util.js';
import { db } from './data.js';
import { speakBtn, exampleBlock, wordRuby } from './ui.js';
import { strokePlayer, writePad } from './stroke.js';
import { conjugate, VERB_FORMS, ADJ_FORMS } from './conjugate.js';
import { getCard } from './store.js';
import { fmtInterval, dayNum } from './util.js';

const SCRIPT_KO = { hiragana: '히라가나', katakana: '가타카나' };
const GROUP_KO = { basic: '청음', dakuten: '탁음', handakuten: '반탁음', yoon: '요음', ext: '외래어 특수음' };

function srsLine(id) {
  const c = getCard(id);
  if (!c) return h('p', { class: 'srs-line' }, '아직 복습 카드에 없습니다');
  const left = c.due - dayNum();
  return h('p', { class: 'srs-line' }, c.state === 'learn' ? '다시 익히는 중' : `복습 간격 ${fmtInterval(c.ivl)} · ${left <= 0 ? '지금 복습 대기' : `${left}일 뒤 복습`}`);
}

function practiceTabs(text) {
  const body = h('div', { class: 'practice__body' });
  const show = which => { body.replaceChildren(which === 'order' ? strokePlayer(text) : writePad(text)); btns.forEach(b => b.classList.toggle('is-active', b.dataset.k === which)); };
  const btns = [['order', '획순 보기'], ['write', '따라 쓰기']].map(([k, label]) => h('button', { class: 'seg__btn', type: 'button', dataset: { k }, onclick: () => show(k) }, label));
  const wrap = h('div', { class: 'practice' }, h('div', { class: 'seg' }, btns), body);
  show('order');
  return wrap;
}

export function kanaDetail(k, { withSrs = false } = {}) {
  return h('article', { class: 'detail detail--kana' },
    h('div', { class: 'detail__hero' },
      h('span', { class: 'glyph glyph--hero' }, k.kana),
      h('div', { class: 'detail__read' },
        h('span', { class: 'detail__romaji' }, k.romaji), h('span', { class: 'detail__ko' }, k.ko),
        speakBtn(k.kana),
        h('span', { class: 'chips' }, h('span', { class: 'chip' }, SCRIPT_KO[k.script]), h('span', { class: 'chip chip--soft' }, GROUP_KO[k.group] || k.group)))),
    k.tip ? h('p', { class: 'callout', html: `<b>발음</b> ${rich(k.tip)}` }) : null,
    k.confuse?.length ? h('p', { class: 'callout callout--warn' }, h('b', null, '헷갈리는 글자 '), k.confuse.map(c => h('span', { class: 'glyph glyph--inline' }, c))) : null,
    k.word ? h('div', { class: 'detail__word' }, h('span', { class: 'kicker' }, '단어로 읽기'),
      h('p', { class: 'detail__wordline' }, h('span', { class: 'jp detail__wordjp' }, k.word.kana), speakBtn(k.word.kana, { small: true }), h('span', { class: 'detail__wordko' }, k.word.ko)))
      : k.rare ? h('p', { class: 'callout' }, k.rare) : null,
    practiceTabs(k.kana),
    withSrs ? srsLine(k.id) : null);
}

function conjTable(v) {
  const forms = /^동사/.test(v.pos) ? VERB_FORMS : (v.pos === 'い형용사' || v.pos === 'な형용사') ? ADJ_FORMS : null;
  if (!forms) return null;
  const rows = forms.map(f => [f, conjugate(v, f.key)]).filter(([, c]) => c);
  if (!rows.length) return null;
  return h('details', { class: 'fold' }, h('summary', null, '활용형 보기'),
    h('table', { class: 'tbl tbl--conj' }, h('tbody', null, rows.map(([f, c]) => h('tr', null,
      h('th', null, f.label, h('small', null, f.ko)),
      h('td', { class: 'jp', html: hasKanji(c.jp) ? `<ruby>${esc(c.jp)}<rt>${esc(c.kana)}</rt></ruby>` : esc(c.jp) }),
      h('td', null, speakBtn(c.kana, { small: true })))))));
}

export function vocabDetail(v, { withSrs = false } = {}) {
  const masu = /^동사/.test(v.pos) ? conjugate(v, 'masu') : null;
  return h('article', { class: 'detail detail--vocab' },
    h('div', { class: 'detail__hero detail__hero--word' },
      h('p', { class: 'detail__kana jp' }, hasKanji(v.jp) ? v.kana : ''),
      h('h2', { class: 'detail__jp jp' }, v.jp),
      h('div', { class: 'detail__meta' }, speakBtn(v.kana), h('span', { class: 'chip' }, v.pos), v.set ? h('span', { class: 'chip chip--soft' }, v.set) : null, h('span', { class: 'chip chip--soft' }, `Day ${v.day}`))),
    h('p', { class: 'detail__meaning' }, v.ko),
    masu ? h('p', { class: 'detail__masu jp' }, h('span', { class: 'kicker' }, 'ます형 '), h('span', { html: hasKanji(masu.jp) ? `<ruby>${esc(masu.jp)}<rt>${esc(masu.kana)}</rt></ruby>` : esc(masu.jp) })) : null,
    v.cog ? h('p', { class: 'callout callout--cog' }, h('b', null, '한자어 '), v.cog, h('small', null, ' — 한국 한자음과 비교해 보세요')) : null,
    v.note ? h('p', { class: 'callout', html: `<b>메모</b> ${rich(v.note)}` }) : null,
    exampleBlock(v.ex),
    conjTable(v),
    withSrs ? srsLine(v.id) : null);
}

export function kanjiDetail(k, { withSrs = false } = {}) {
  return h('article', { class: 'detail detail--kanji' },
    h('div', { class: 'detail__hero' },
      h('span', { class: 'glyph glyph--hero' }, k.kanji),
      h('div', { class: 'detail__read' },
        h('span', { class: 'detail__hun' }, k.hun), h('span', { class: 'detail__ko' }, k.ko),
        h('span', { class: 'chips' }, h('span', { class: 'chip' }, `${k.strokes}획`), h('span', { class: 'chip chip--soft' }, `Day ${k.day}`)))),
    h('dl', { class: 'readings' },
      h('dt', null, '음독'), h('dd', { class: 'jp' }, k.on.length ? k.on.join('　') : '—'),
      h('dt', null, '훈독'), h('dd', { class: 'jp' }, k.kun.length ? k.kun.map(r => r.replace('.', '·')).join('　') : '—')),
    k.tip ? h('p', { class: 'callout', html: `<b>요령</b> ${rich(k.tip)}` }) : null,
    h('ul', { class: 'wordlist' }, k.words.map(w => h('li', null,
      h('span', { class: 'jp wordlist__jp', html: wordRuby(w) }), h('span', { class: 'wordlist__ko' }, w.ko), speakBtn(w.kana, { small: true })))),
    practiceTabs(k.kanji),
    withSrs ? srsLine(k.id) : null);
}

export function detailFor(it, opts) {
  if (it.type === 'kana') return kanaDetail(it, opts);
  if (it.type === 'kanji') return kanjiDetail(it, opts);
  return vocabDetail(it, opts);
}

/** 자동 읽기에 쓸 텍스트 */
export function speechOf(it) {
  if (it.type === 'kana') return it.kana;
  if (it.type === 'kanji') return it.words[0]?.kana || '';
  return it.kana;
}

/** 한자가 들어간, 이미 배운 단어 찾기 (한자 상세의 보너스) */
export function vocabWithKanji(ch, limit = 4) {
  return db.vocab.filter(v => v.jp.includes(ch)).slice(0, limit);
}
