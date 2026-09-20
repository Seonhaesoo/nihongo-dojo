# 일본어 도장 · 日本語道場

한국어가 모국어인 **완전 초보자**가 12주(84일) 동안 히라가나부터 JLPT N5 전 범위까지 끝내는 집중 학습 앱입니다.
매일 그날의 수련을 마치면 출석부에 도장(済)이 찍힙니다.

**바로 쓰기 → https://seonhaesoo.github.io/nihongo-dojo/** (폰에서 열고 "홈 화면에 추가"하면 앱처럼 설치됩니다)

- 설치형 웹앱(PWA) — 폰·PC 어디서나, 한 번 열어 두면 오프라인에서도 동작
- 빌드 과정 없음 — 순수 HTML/CSS/JavaScript. 서버도 의존성 0개
- 학습 기록은 기기의 브라우저(localStorage)에 저장, 백업 파일로 내보내기/불러오기

## 무엇이 들어 있나

| | |
|---|---|
| 글자 | 히라가나·가타카나 220자 — 한국인 기준 발음 팁, 헷갈리는 글자, 획순 애니메이션, 따라 쓰기 |
| 어휘 | 약 860개 — 예문·한자어 대응(學生→학생)·한국인이 틀리기 쉬운 조사 메모 |
| 한자 | N5 한자 104자 — 훈음, 음독/훈독, 한국 한자음 ↔ 일본 음독 대응 요령 |
| 발음 | 발음·표기 규칙 레슨 3개 — 탁음, 요음·촉음·장음·ん, 가타카나 외래어 표기 |
| 문법 | 53개 레슨 — 한국어와 같은 점은 짧게, 다른 점은 확실하게. 레슨마다 확인 퀴즈 8문항 |
| 실전 | 독해 10편, 청해 8편(TTS), 주간 테스트, N5 모의고사 2회 |
| 복습 | 간격 반복(SRS). 잊어버릴 때쯤 다시 보여 줍니다 |
| 연습 | 활용 연습(ます형·て형·ない형…), 자유 퀴즈, 약점 공략 |

전체 커리큘럼은 [docs/학습플랜.md](docs/학습플랜.md)에 있습니다.

## 실행하기

Node.js만 있으면 됩니다.

```bash
node server.js
```

`http://localhost:5173` 을 엽니다. 터미널에 같은 와이파이의 폰에서 접속할 수 있는 주소도 함께 표시됩니다.

## 인터넷에 올리기 (GitHub Pages)

정적 파일뿐이라 저장소를 그대로 GitHub Pages에 올리면 끝입니다.

1. GitHub에 저장소를 만들고 push
2. 저장소 **Settings → Pages → Build and deployment**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 지정
3. 1~2분 뒤 `https://<계정>.github.io/<저장소>/` 로 접속
4. 폰에서 그 주소를 열고 **홈 화면에 추가**하면 앱처럼 쓸 수 있습니다

## 폴더 구조

```
index.html              앱 셸
css/style.css           디자인 (和紙·墨·朱)
js/
  main.js               부트스트랩·라우터
  store.js              학습 기록 저장소
  srs.js                간격 반복 스케줄러
  data.js               데이터 로딩·색인, Day별 학습 단계
  quiz.js               퀴즈 엔진 (객관식·입력·어순 배열)
  conjugate.js          동사·형용사 활용 엔진
  romaji.js             로마자 → 가나 변환
  tts.js                일본어 음성 (Web Speech API)
  stroke.js             획순 애니메이션·따라 쓰기
  cards.js, ui.js       공용 UI
  views/                화면별 모듈
data/                   학습 콘텐츠 (JSON)
tools/
  syllabus.json         84일 커리큘럼 기준표
  validate.mjs          콘텐츠 검증기
  build-*.mjs           가나·기초 세트·커리큘럼 생성기
docs/
  학습플랜.md            12주 학습 계획
  CONTENT_SPEC.md       콘텐츠 작성 규격
sw.js, manifest.webmanifest   PWA
server.js               로컬 서버
```

## 콘텐츠 고치기·추가하기

모든 학습 내용은 `data/`의 JSON입니다. 규격은 [docs/CONTENT_SPEC.md](docs/CONTENT_SPEC.md)를 따르고, 고친 뒤에는 검증기를 돌립니다.

```bash
node tools/build-index.mjs   # 데이터 파일을 추가·삭제했을 때: 파일 목록(data/index.json) 갱신
node tools/validate.mjs      # 규격 검증
```

후리가나는 `{漢字|かんじ}` 형식으로 적고, 한자에는 예외 없이 읽기를 답니다.

## 라이선스와 출처

- 앱 코드와 학습 콘텐츠: MIT
- 획순 데이터: [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel, CC BY-SA 3.0 (실행 중 CDN에서 불러옵니다)
- 서체: Klee One, Shippori Mincho B1, Zen Kaku Gothic New, Gowun Batang, IBM Plex Sans KR — SIL Open Font License (Google Fonts)
