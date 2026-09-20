#!/usr/bin/env node
// data/index.json 생성기 — 앱이 읽어 들일 데이터 파일 목록. 데이터 파일을 추가·삭제했으면 다시 실행한다.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const list = dir => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)) : [])
  .filter(f => f.endsWith('.json') && !f.startsWith('_')).sort().map(f => `${dir}/${f}`);

const index = {
  kana: 'data/kana.json',
  curriculum: 'data/curriculum.json',
  kanji: 'data/kanji.json',
  vocab: list('data/vocab'),
  grammar: list('data/grammar'),
  reading: 'data/reading/reading.json',
  listening: 'data/reading/listening.json'
};
writeFileSync(join(ROOT, 'data/index.json'), JSON.stringify(index, null, 1) + '\n');
console.log(`index.json: 어휘 ${index.vocab.length}개 파일, 문법 ${index.grammar.length}개 파일`);
