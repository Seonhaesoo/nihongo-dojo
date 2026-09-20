// 동사·형용사 활용 엔진. 입력: 어휘 항목 { jp, kana, pos }
const GODAN = {
  う: { i: 'い', a: 'わ', e: 'え', o: 'お', te: 'って', ta: 'った' },
  つ: { i: 'ち', a: 'た', e: 'て', o: 'と', te: 'って', ta: 'った' },
  る: { i: 'り', a: 'ら', e: 'れ', o: 'ろ', te: 'って', ta: 'った' },
  む: { i: 'み', a: 'ま', e: 'め', o: 'も', te: 'んで', ta: 'んだ' },
  ぶ: { i: 'び', a: 'ば', e: 'べ', o: 'ぼ', te: 'んで', ta: 'んだ' },
  ぬ: { i: 'に', a: 'な', e: 'ね', o: 'の', te: 'んで', ta: 'んだ' },
  く: { i: 'き', a: 'か', e: 'け', o: 'こ', te: 'いて', ta: 'いた' },
  ぐ: { i: 'ぎ', a: 'が', e: 'げ', o: 'ご', te: 'いで', ta: 'いだ' },
  す: { i: 'し', a: 'さ', e: 'せ', o: 'そ', te: 'して', ta: 'した' }
};

export const VERB_FORMS = [
  { key: 'masu', label: 'ます형', ko: '~합니다', from: 17 },
  { key: 'masen', label: 'ません', ko: '~하지 않습니다', from: 17 },
  { key: 'mashita', label: 'ました', ko: '~했습니다', from: 17 },
  { key: 'te', label: 'て형', ko: '~하고, ~해서', from: 33 },
  { key: 'nai', label: 'ない형', ko: '~하지 않다', from: 39 },
  { key: 'ta', label: 'た형', ko: '~했다', from: 43 },
  { key: 'nakatta', label: 'なかった', ko: '~하지 않았다', from: 45 },
  { key: 'volitional', label: '의지형', ko: '~하자', from: 67 },
  { key: 'potential', label: '가능형', ko: '~할 수 있다', from: 71 }
];
export const ADJ_FORMS = [
  { key: 'neg', label: '부정', ko: '~지 않다', from: 23 },
  { key: 'past', label: '과거', ko: '~었다', from: 25 },
  { key: 'pastneg', label: '과거 부정', ko: '~지 않았다', from: 25 },
  { key: 'te', label: 'て형(연결)', ko: '~고, ~서', from: 38 }
];

function swapTail(word, n, tail) { return word.slice(0, word.length - n) + tail; }

/** { jp, kana } 반환. 활용 불가면 null */
export function conjugate(v, form) {
  const { jp, kana, pos } = v;
  const both = (n, tail) => ({ jp: swapTail(jp, n, tail), kana: swapTail(kana, n, tail) });

  if (pos === '동사2') {
    const t = { masu: 'ます', masen: 'ません', mashita: 'ました', te: 'て', ta: 'た', nai: 'ない', nakatta: 'なかった', volitional: 'よう', potential: 'られる' }[form];
    return t ? both(1, t) : null;
  }
  if (pos === '동사3') {
    if (kana.endsWith('する')) {
      const t = { masu: 'します', masen: 'しません', mashita: 'しました', te: 'して', ta: 'した', nai: 'しない', nakatta: 'しなかった', volitional: 'しよう', potential: 'できる' }[form];
      return t ? both(2, t) : null;
    }
    // 来る
    const t = { masu: ['きます', 'ます'], masen: ['きません', 'ません'], mashita: ['きました', 'ました'], te: ['きて', 'て'], ta: ['きた', 'た'], nai: ['こない', 'ない'], nakatta: ['こなかった', 'なかった'], volitional: ['こよう', 'よう'], potential: ['こられる', 'られる'] }[form];
    if (!t) return null;
    return { jp: jp.endsWith('来る') ? swapTail(jp, 1, t[1]) : swapTail(jp, 2, t[0]), kana: swapTail(kana, 2, t[0]) };
  }
  if (pos === '동사1') {
    const last = kana.slice(-1);
    const row = GODAN[last];
    if (!row) return null;
    const iku = jp.endsWith('行く') || kana === 'いく';
    const aru = kana === 'ある';
    switch (form) {
      case 'masu': return both(1, row.i + 'ます');
      case 'masen': return both(1, row.i + 'ません');
      case 'mashita': return both(1, row.i + 'ました');
      case 'te': return both(1, iku ? 'って' : row.te);
      case 'ta': return both(1, iku ? 'った' : row.ta);
      case 'nai': return aru ? { jp: 'ない', kana: 'ない' } : both(1, row.a + 'ない');
      case 'nakatta': return aru ? { jp: 'なかった', kana: 'なかった' } : both(1, row.a + 'なかった');
      case 'volitional': return both(1, row.o + 'う');
      case 'potential': return aru ? null : both(1, row.e + 'る');
      default: return null;
    }
  }
  if (pos === 'い형용사') {
    const ii = kana === 'いい';
    const stem = ii ? { jp: 'よ', kana: 'よ' } : both(1, '');
    const t = { neg: 'くない', past: 'かった', pastneg: 'くなかった', te: 'くて' }[form];
    return t ? { jp: stem.jp + t, kana: stem.kana + t } : null;
  }
  if (pos === 'な형용사') {
    const t = { neg: 'じゃない', past: 'だった', pastneg: 'じゃなかった', te: 'で' }[form];
    return t ? { jp: jp + t, kana: kana + t } : null;
  }
  return null;
}

/** 오답 보기 생성: 다른 규칙을 잘못 적용한 형태들 */
export function distractors(v, form, correct) {
  const { jp, kana, pos } = v;
  const out = new Set();
  const add = tail => { const w = swapTail(jp, 1, tail); if (w !== correct.jp) out.add(w); };
  if (/^동사/.test(pos)) {
    const last = kana.slice(-1);
    const row = GODAN[last] || GODAN['る'];
    if (form === 'te' || form === 'ta') {
      const e = form === 'te' ? ['って', 'んで', 'いて', 'いで', 'して', 'て', row.i + 'て'] : ['った', 'んだ', 'いた', 'いだ', 'した', 'た', row.i + 'た'];
      e.forEach(add);
    } else if (form === 'nai' || form === 'nakatta') {
      const s = form === 'nai' ? 'ない' : 'なかった';
      [row.a + s, row.i + s, s, last + s, row.e + s].forEach(add);
    } else if (form === 'masu' || form === 'masen' || form === 'mashita') {
      const s = { masu: 'ます', masen: 'ません', mashita: 'ました' }[form];
      [row.i + s, s, last + s, row.a + s, row.e + s].forEach(add);
    } else if (form === 'volitional') {
      [row.o + 'う', 'よう', row.i + 'よう', row.a + 'う', last + 'よう'].forEach(add);
    } else if (form === 'potential') {
      [row.e + 'る', 'られる', row.a + 'れる', row.i + 'れる', last + 'れる'].forEach(add);
    }
    if (pos === '동사3') {
      out.clear();
      const suru = kana.endsWith('する');
      const wrong = suru
        ? { te: ['すて', 'しって', 'すって'], ta: ['すた', 'しった', 'すった'], nai: ['すない', 'さない', 'すらない'], nakatta: ['すなかった', 'さなかった', 'すらなかった'], masu: ['すます', 'するます', 'すります'], masen: ['すません', 'するません', 'すりません'], mashita: ['すました', 'するました', 'すりました'], volitional: ['すよう', 'そう', 'しろう'], potential: ['しられる', 'すれる', 'せる'] }
        : { te: ['くて', 'きって', 'こて'], ta: ['くた', 'きった', 'こた'], nai: ['きない', 'くない', 'くらない'], nakatta: ['きなかった', 'くなかった', 'くらなかった'], masu: ['くます', 'こます', 'くります'], masen: ['くません', 'こません', 'くりません'], mashita: ['くました', 'こました', 'くりました'], volitional: ['きよう', 'くよう', 'こう'], potential: ['きられる', 'くられる', 'くれる'] };
      const stem = suru ? jp.slice(0, -2) : (jp.endsWith('来る') ? jp.slice(0, -2) : jp.slice(0, -2));
      (wrong[form] || []).forEach(t => out.add(stem + t));
    }
  } else if (pos === 'い형용사') {
    const base = jp.slice(0, -1);
    const cands = {
      neg: [jp + 'じゃない', jp + 'くない', base + 'じゃない', base + 'ない'],
      past: [jp + 'でした', jp + 'かった', jp + 'だった', base + 'だった'],
      pastneg: [jp + 'じゃなかった', jp + 'くなかった', base + 'くないでした', base + 'なかった'],
      te: [jp + 'で', jp + 'くて', base + 'で', jp + 'て']
    }[form] || [];
    cands.forEach(w => { if (w !== correct.jp) out.add(w); });
  } else if (pos === 'な형용사') {
    const cands = {
      neg: [jp + 'くない', jp + 'ない', jp + 'なじゃない'],
      past: [jp + 'かった', jp + 'なだった', jp + 'なかった'],
      pastneg: [jp + 'くなかった', jp + 'じゃないだった', jp + 'なくなかった'],
      te: [jp + 'くて', jp + 'なで', jp + 'て']
    }[form] || [];
    cands.forEach(w => { if (w !== correct.jp) out.add(w); });
  }
  return [...out];
}
