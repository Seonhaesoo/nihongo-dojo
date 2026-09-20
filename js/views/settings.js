// 설정 (設定): 표시·음성·복습·백업
import { h, clear, toast, confirmDialog } from '../util.js';
import * as store from '../store.js';
import { pageHead } from '../ui.js';
import { jaVoices, speak, supported } from '../tts.js';

function field(label, help, control) {
  return h('div', { class: 'field' }, h('div', { class: 'field__text' }, h('span', { class: 'field__label' }, label), help ? h('span', { class: 'field__help' }, help) : null), control);
}
function seg(key, options, after) {
  const wrap = h('div', { class: 'seg' });
  const draw = () => wrap.replaceChildren(...options.map(([v, l]) => h('button', { class: `seg__btn${store.settings()[key] === v ? ' is-active' : ''}`, onclick: () => { store.setSetting(key, v); draw(); after?.(); } }, l)));
  draw();
  return wrap;
}
function toggle(key) {
  return h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: store.settings()[key] || undefined, onchange: e => store.setSetting(key, e.target.checked) }), h('span', { class: 'switch__track' }));
}

export default function settingsView() {
  const voiceBox = h('div');
  function drawVoices() {
    const voices = jaVoices();
    clear(voiceBox).append(!supported()
      ? h('p', { class: 'notice' }, '이 브라우저는 음성 합성을 지원하지 않습니다.')
      : !voices.length
        ? h('p', { class: 'notice' }, '일본어 음성을 찾지 못했습니다. Chrome·Edge·Safari 최신 버전을 쓰거나, 기기 설정에서 일본어 TTS 음성을 설치해 주세요. (Windows: 설정 → 시간 및 언어 → 음성 → 음성 추가 → 일본어)')
        : h('select', { class: 'input input--select', onchange: e => store.setSetting('ttsVoice', e.target.value) },
          h('option', { value: '' }, '자동 선택 (권장)'),
          voices.map(v => h('option', { value: v.voiceURI, selected: store.settings().ttsVoice === v.voiceURI || undefined }, `${v.name}${v.localService ? '' : ' · 온라인'}`))));
  }
  drawVoices();
  window.speechSynthesis?.addEventListener?.('voiceschanged', drawVoices, { once: true });

  const rate = h('input', { type: 'range', min: '0.5', max: '1.2', step: '0.05', value: String(store.settings().ttsRate), class: 'range',
    oninput: e => { store.setSetting('ttsRate', Number(e.target.value)); rateVal.textContent = `${Number(e.target.value).toFixed(2)}×`; } });
  const rateVal = h('span', { class: 'field__val' }, `${Number(store.settings().ttsRate).toFixed(2)}×`);

  const exportData = () => {
    const blob = new Blob([store.exportData()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `nihongo-dojo-backup-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('백업 파일을 저장했습니다');
  };
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!(await confirmDialog('백업 파일로 현재 기록을 덮어씁니다. 계속할까요?', { okText: '불러오기', danger: true }))) return;
    try { store.importData(await file.text()); toast('기록을 불러왔습니다'); location.hash = '#/'; }
    catch (err) { toast(`불러오기 실패: ${err.message}`, 4000); }
    e.target.value = '';
  } });
  const reset = async () => {
    if (!(await confirmDialog('모든 학습 기록과 복습 카드를 지웁니다. 되돌릴 수 없습니다. 먼저 백업을 권합니다.', { okText: '전부 지우기', danger: true }))) return;
    store.resetAll(); toast('초기화했습니다'); location.hash = '#/';
  };

  return h('div', { class: 'page' },
    pageHead({ kicker: 'SETTINGS', title: '설정', tate: '設定' }),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '화면')),
      field('테마', '종이(라이트) / 밤 도장(다크)', seg('theme', [['auto', '자동'], ['light', '라이트'], ['dark', '다크']])),
      field('후리가나', '한자 위의 읽기 표시. 익숙해지면 “누르면 보기”로 바꿔 보세요.', seg('furigana', [['always', '항상'], ['tap', '누르면 보기'], ['off', '숨김']])),
      field('큰 글자 서체', '교과서체는 손글씨에 가깝습니다. 인쇄체 모양도 눈에 익혀 두세요.', seg('glyphFont', [['klee', '교과서체'], ['gothic', '고딕'], ['mincho', '명조']]))),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '음성')),
      field('자동 읽기', '카드를 넘기거나 정답을 확인할 때 자동으로 읽어 줍니다.', toggle('autoSpeak')),
      field('읽기 속도', '처음에는 0.8~0.9×로 천천히 듣는 것을 권합니다.', h('div', { class: 'field__range' }, rate, rateVal)),
      field('일본어 음성', null, voiceBox),
      h('button', { class: 'btn btn--ghost', onclick: () => speak('こんにちは。{日本語|にほんご}の{勉強|べんきょう}を{始|はじ}めましょう。') }, '🔊 음성 테스트')),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '복습')),
      field('한 세션의 카드 수', '밀린 카드가 많아도 한 번에 이만큼씩 끊어서 복습합니다.', seg('sessionSize', [[30, '30'], [60, '60'], [100, '100'], [200, '200']])),
      field('한→일 역방향 카드', '단어를 배울 때 “한국어 → 일본어” 카드도 함께 만듭니다. 복습량이 두 배가 되므로 여유가 있을 때만 켜세요.', toggle('reverseCards'))),
    h('section', { class: 'card' }, h('div', { class: 'card__head' }, h('h2', { class: 'h2' }, '백업과 기기 이동')),
      h('p', { class: 'card__text' }, '기록은 이 기기의 브라우저에만 저장됩니다. 폰과 PC를 오가며 쓰려면 백업 파일을 내보낸 뒤 다른 기기에서 불러오세요. 브라우저 데이터를 지우면 기록도 사라지니 가끔 백업해 두세요.'),
      h('div', { class: 'btnrow' },
        h('button', { class: 'btn btn--ink', onclick: exportData }, '백업 내보내기'),
        h('button', { class: 'btn btn--ghost', onclick: () => fileInput.click() }, '백업 불러오기'), fileInput,
        h('button', { class: 'btn btn--danger', onclick: reset }, '기록 초기화'))),
    h('section', { class: 'card card--note' }, h('h2', { class: 'h2' }, '앱으로 설치하기'),
      h('ul', { class: 'tips' },
        h('li', null, h('b', null, '안드로이드(Chrome) '), '— 메뉴(⋮) → “앱 설치” 또는 “홈 화면에 추가”'),
        h('li', null, h('b', null, '아이폰(Safari) '), '— 공유 버튼 → “홈 화면에 추가”'),
        h('li', null, h('b', null, 'PC(Chrome·Edge) '), '— 주소창 오른쪽의 설치 아이콘'))),
    h('p', { class: 'credits' }, '획순 데이터: KanjiVG © Ulrich Apel (CC BY-SA 3.0) · 서체: Klee One, Shippori Mincho B1, Zen Kaku Gothic New, Gowun Batang, IBM Plex Sans KR (SIL OFL)'));
}
