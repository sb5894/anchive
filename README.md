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

Firebase 콘솔 > Authentication > Users > "사용자 추가"에서 이메일/비밀번호로 관리자 계정을 만들면 `/admin` 경로에서 로그인해 삭제/수정 로그를 볼 수 있다.

## 배포

```bash
npm run build
npm install -g firebase-tools   # 최초 1회
firebase login
firebase deploy
```

## 폴더 구조

- `src/pages` — 화면 (입장, 피드, 업로드, 게시물 상세, 관리자)
- `src/lib` — Firebase 연동 로직 (roster, events, posts, admin, 익명 인증 상태)
- `firestore.rules` / `storage.rules` — 보안 규칙
- `scripts/` — 명단·행사 초기 데이터 업로드용 관리 스크립트
