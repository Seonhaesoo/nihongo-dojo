// 마무리 테스트 / 주간 테스트 / 모의고사
import { h, clear, shuffle, sample } from '../util.js';
import { db, dayMeta, dayItems, weekDays, itemsUpTo } from '../data.js';
import * as store from '../store.js';
import { runQuiz, resultView, questionFor, grammarQuestion, conjQuestion, vocabQuestion, kanjiQuestion } from '../quiz.js';
import { VERB_FORMS } from '../conjugate.js';
import { checkDayComplete } from './day.js';

const PASS = 80;

function grammarQs(lessons, n) {
  const all = lessons.flatMap(g => g.quiz.map(q => grammarQuestion(q, g)));
  return sample(all, n);
}

function buildDaily(n) {
  const it = dayItems(n);
  const items = [...it.kana, ...it.vocab, ...it.kanji];
  const picked = items.length > 18 ? sample(items, 18) : items;
  const qs = picked.map(x => questionFor(x));
  // 어제까지의 내용에서 3문항 섞기
  const older = ['kana', 'vocab', 'kanji'].flatMap(t => itemsUpTo(n - 1, t)).filter(x => store.hasCard(x.id));
  qs.push(...sample(older, Math.min(3, older.length)).map(x => questionFor(x)));
  qs.push(...grammarQs(it.grammar, 4));
  return shuffle(qs.filter(Boolean));
}

function buildWeekly(n) {
  const meta = dayMeta(n);
  const days = weekDays(meta.week);
  const items = days.flatMap(d => { const it = dayItems(d); return [...it.kana, ...it.vocab, ...it.kanji]; });
  const lessons = days.flatMap(d => dayItems(d).grammar);
  const qs = sample(items, Math.min(24, items.length)).map(x => questionFor(x));
  // 가나 주차(1~2주)는 입력형도 섞는다
  if (meta.week <= 2) qs.push(...sample(items.filter(x => x.type === 'kana' && x.group !== 'ext' && !['hi-di', 'hi-du', 'ka-di', 'ka-du'].includes(x.id)), 6).map(x => questionFor(x, { kana: ['type'] })));
  qs.push(...grammarQs(lessons, 8));
  const weak = store.weakItems(6).map(id => db.items.get(id)).filter(x => x && x.type !== 'grammar');
  qs.push(...weak.map(x => questionFor(x)));
  return shuffle(qs.filter(Boolean));
}

function buildMock(n) {
  if (n === 82) {
    const v = sample(db.vocab.filter(x => x.id.startsWith('v-')), 30);
    const k = sample(db.kanji, 14);
    const kana = sample(db.kana.filter(x => x.script === 'katakana' && x.group === 'basic'), 6);
    return shuffle([
      ...v.slice(0, 12).map(x => vocabQuestion(x, 'j2k')), ...v.slice(12, 20).map(x => vocabQuestion(x, 'read')), ...v.slice(20, 26).map(x => vocabQuestion(x, 'k2j')), ...v.slice(26).map(x => vocabQuestion(x, 'listen')),
      ...k.slice(0, 7).map(x => kanjiQuestion(x, 'word')), ...k.slice(7).map(x => kanjiQuestion(x, 'm2k')),
      ...kana.map(x => questionFor(x))
    ].filter(Boolean));
  }
  const verbs = sample(db.vocab.filter(x => /^동사/.test(x.pos)), 10);
  const forms = VERB_FORMS.filter(f => ['te', 'nai', 'ta', 'masu'].includes(f.key));
  return shuffle([...grammarQs(db.grammar.filter(g => g.day <= 69), 40), ...verbs.map(v => conjQuestion(v, sample(forms, 1)[0]))].filter(Boolean));
}

export default function test([nStr]) {
  const n = Number(nStr);
  const meta = dayMeta(n) || { kind: 'learn' };
  const back = `#/day/${n}`;
  const root = h('div', { class: 'session' });
  const title = meta.kind === 'mock' ? '모의고사' : meta.kind === 'review' ? '주간 테스트' : `Day ${n} 마무리 테스트`;

  function start() {
    const qs = meta.kind === 'mock' ? buildMock(n) : meta.kind === 'review' ? buildWeekly(n) : buildDaily(n);
    if (!qs.length) {
      store.markStep(n, 'test', { score: 100 });
      checkDayComplete(n);
      location.hash = back;
      return;
    }
    runQuiz(root, qs, {
      onExit: () => { location.hash = back; },
      onDone: ({ right, total, wrongIds }) => {
        const score = Math.round((right / total) * 100);
        const pass = score >= PASS;
        let completed = false;
        if (pass) { store.markStep(n, 'test', { score }); completed = checkDayComplete(n); }
        const wrongNames = wrongIds.map(id => db.items.get(id)).filter(Boolean).map(x => x.kana && x.type === 'kana' ? x.kana : x.kanji || x.jp || x.titleKo).slice(0, 12);
        clear(root).append(resultView({
          right, total, passMark: PASS, title,
          note: pass ? (wrongNames.length ? `다시 볼 것: ${wrongNames.join(' · ')}` : '만점입니다. 완벽해요!') : `80점 이상이어야 도장을 받습니다. 틀린 것: ${wrongNames.join(' · ')}`,
          onRetry: start,
          onContinue: () => { location.hash = back; },
          continueText: completed ? 'Day 완료! 돌아가기' : pass ? '돌아가기' : '나중에 다시'
        }));
      }
    });
  }

  start();
  return root;
}
