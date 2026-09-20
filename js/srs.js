// 간격 반복(SRS) 스케줄러 — SM-2 계열의 단순화 버전.
// 카드: { ease, ivl(일), due(dayNum), reps, lapses, state: 'learn' | 'review', last }

export const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };
export const MATURE_IVL = 21;
const MIN_EASE = 1.3;
const MAX_IVL = 365;

/** 레슨에서 막 배운 카드. 내일 첫 복습이 돌아온다. */
export function introduce(today) {
  return { ease: 2.5, ivl: 1, due: today + 1, reps: 0, lapses: 0, state: 'review', last: today };
}

function fuzz(ivl) {
  if (ivl < 5) return ivl;
  const f = Math.max(1, Math.round(ivl * 0.08));
  return ivl + Math.floor(Math.random() * (2 * f + 1)) - f;
}

/** 등급을 매겼을 때의 다음 간격(일). 0이면 이번 세션에서 다시 나온다. */
export function nextInterval(card, g) {
  if (card.state === 'learn') {
    if (g <= GRADE.HARD) return 0;
    return g === GRADE.EASY ? 3 : 1;
  }
  const ivl = Math.max(1, card.ivl);
  if (g === GRADE.AGAIN) return 0;
  if (g === GRADE.HARD) return Math.min(MAX_IVL, Math.max(ivl + 1, Math.round(ivl * 1.2)));
  if (g === GRADE.GOOD) return Math.min(MAX_IVL, Math.max(ivl + 1, Math.round(ivl * card.ease)));
  return Math.min(MAX_IVL, Math.max(ivl + 3, Math.round(ivl * card.ease * 1.6)));
}

/** 카드를 채점하고 갱신한다. 반환값 true면 이번 세션에 다시 넣어야 한다. */
export function grade(card, g, today) {
  const ivl = nextInterval(card, g);
  card.reps++;
  card.last = today;
  if (card.state === 'review') {
    if (g === GRADE.AGAIN) { card.lapses++; card.ease = Math.max(MIN_EASE, card.ease - 0.2); card.state = 'learn'; }
    else if (g === GRADE.HARD) card.ease = Math.max(MIN_EASE, card.ease - 0.15);
    else if (g === GRADE.EASY) card.ease += 0.15;
  } else if (ivl > 0) card.state = 'review';
  card.ivl = ivl === 0 ? 0 : fuzz(ivl);
  card.due = today + card.ivl;
  return ivl === 0;
}

export function isDue(card, today) { return card.due <= today; }
export function isMature(card) { return card.state === 'review' && card.ivl >= MATURE_IVL; }
