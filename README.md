# 학교 아카이브

개교기념일 행사용 사진/활동 아카이빙 사이트. React + Vite + Firebase(Firestore/Storage/Auth/Hosting).

## 처음 설정하는 법

1. [Firebase 콘솔](https://console.firebase.google.com)에서 새 프로젝트 생성
2. 프로젝트에서 **Firestore Database**, **Storage**, **Authentication** 활성화
   - Authentication > Sign-in method에서 **익명(Anonymous)** 과 **이메일/비밀번호** 두 가지 모두 켜기
3. 웹 앱 등록 후 나오는 설정 값을 `.env` 파일에 채우기 (`.env.example` 복사해서 사용)
   ```bash
   cp .env.example .env
   ```
4. 의존성 설치 및 로컬 실행
   ```bash
   npm install
   npm run dev
   ```

## 명단(roster) / 행사(events) 초기 데이터 넣기

Firestore Admin 권한이 필요해서 관리 스크립트로 넣는다.

1. Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > "새 비공개 키 생성" → 받은 JSON을 프로젝트 루트에 `serviceAccountKey.json`으로 저장 (git에 올라가지 않음)
2. 명단 CSV 준비 (`scripts/roster.sample.csv` 형식 참고: `grade,class,number,name`)
3. 실행
   ```bash
   node scripts/importRoster.mjs path/to/roster.csv
   node scripts/seedEvents.mjs
   ```
   `seedEvents.mjs` 안의 행사 목록은 실제 행사 종류에 맞게 직접 수정 후 실행.

## 관리자 계정 만들기

Firebase 콘솔 > Authentication > Users > "사용자 추가"에서 이메일/비밀번호로 관리자 계정을 만들면 `/admin` 경로에서 로그인해 삭제/수정된 게시물·댓글 로그를 볼 수 있다.

## 학교 로고로 PWA 아이콘 교체

```bash
node scripts/generateIcons.mjs
```

`public/안성초_로고_한글(png).png`를 안드로이드(192/512, 투명배경)·iOS(180, 흰배경 flatten) 아이콘으로 변환해서 `public/`에 생성한다. 로고 파일이 바뀌면 다시 실행하면 됨.

## 규칙/색인 배포 (firebase CLI 로그인 없이)

```bash
node scripts/deployRules.mjs
```

서비스 계정 키로 `firestore.rules`/`storage.rules`를 바로 배포한다. 단, **Firestore 복합 색인은 이 방법으로 못 만든다** — 색인이 새로 필요해지면(콘솔 에러에 뜨는 링크) Firebase 콘솔에서 직접 "색인 만들기"를 눌러야 한다.

## 사진·동영상 업로드

- 사진은 클라이언트에서 자동 리사이즈(최대 1600px, JPEG) 후 업로드된다(50MB 제한, 영상은 10MB).
- 동영상은 원본(HEVC 등 어떤 코덱이든) 그대로 올라간 뒤, Storage 트리거 Cloud Function(`functions/index.js`)이
  자동으로 H.264 + faststart로 다시 인코딩하고 포스터 이미지를 만든다. 변환이 끝나기 전에는
  게시물 화면에 "영상 준비 중" 표시가 뜬다. 이 변환이 없으면 업로더 기기에서만 재생되고
  다른 브라우저에서는 안 보이는 문제가 생긴다(HEVC는 Firefox 등에서 재생 불가).
- 업로드 시 행사 종류를 "미분류"로 선택하면 특정 행사에 안 묶고 올릴 수 있다.

## 배포

```bash
npm run build
npm install -g firebase-tools   # 최초 1회
firebase login
firebase deploy
```

Cloud Functions는 Blaze(종량제) 요금제가 필요하다. `firebase deploy`는 `functions/` 안의
의존성(`npm install`)을 자동으로 설치해서 배포하므로 따로 `npm install`을 미리 해 둘 필요는 없다.
영상 변환만 다시 배포하려면 `firebase deploy --only functions`.

## 폴더 구조

- `src/pages` — 화면 (입장, 피드, 업로드, 게시물 상세, 관리자)
- `src/lib` — Firebase 연동 로직 (roster, events, posts, admin, 익명 인증 상태)
- `firestore.rules` / `storage.rules` — 보안 규칙
- `scripts/` — 명단·행사 초기 데이터 업로드용 관리 스크립트
