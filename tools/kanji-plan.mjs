#!/usr/bin/env node
// 한자 → day 배정표 출력 (syllabus.kanjiOrder / kanjiDays 기준)
import { kanjiPlan } from './validate.mjs';
const plan = kanjiPlan();
const byDay = {};
for (const [k, d] of Object.entries(plan)) (byDay[d] ||= []).push(k);
for (const [d, ks] of Object.entries(byDay)) console.log(`Day ${d}: ${ks.join(' ')}`);
console.log(`총 ${Object.keys(plan).length}자`);
