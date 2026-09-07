// 사용법: node scripts/importRoster.mjs path/to/roster.csv
// 필요: 프로젝트 루트에 serviceAccountKey.json (Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성)
// CSV 형식: grade,class,number,name (헤더 포함)
//
// grade/class는 숫자와 한글을 모두 받는다 — 유치원은 학년이 없고 반 이름이
// '햇살반'처럼 한글이기 때문이다. 교사는 번호가 없으므로 99번으로 약속한다
// (src/lib/identityLabel.js의 TEACHER_NUMBER). 번호 칸을 비우면 안 된다.
//
//   유치원,햇살반,3,김유치
//   유치원,햇살반,99,박선생
//   3,2,15,이학생
//
// roster 컬렉션을 통째로 비우고 CSV 내용으로 다시 채운다(추가가 아니라 교체).
// 그래야 이전에 넣어 둔 테스트/가짜 명단이 실제 명단과 섞여 남지 않는다 —
// 안 지우면 IdentityPicker에 존재하지 않는 학생이 계속 뜬다.

import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import iconv from 'iconv-lite'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = process.argv[2] || path.join(__dirname, 'roster.sample.csv')

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// 엑셀(윈도우)에서 내보낸 CSV는 대개 EUC-KR/CP949라 UTF-8로 읽으면 한글이 깨진다.
// UTF-8로 유효하게 디코딩되지 않으면 CP949로 다시 디코딩한다.
// 엑셀의 "CSV UTF-8" 저장 옵션은 파일 맨 앞에 BOM(U+FEFF)을 붙이는데, 그대로 두면
// 첫 헤더가 "grade"가 아니라 BOM이 붙은 문자열이 되어 컬럼을 못 찾는다.
function readCsvText(filePath) {
  const buf = readFileSync(filePath)
  let utf8 = buf.toString('utf-8')
  if (utf8.charCodeAt(0) === 0xfeff) utf8 = utf8.slice(1)
  if (!utf8.includes('�')) return utf8
  return iconv.decode(buf, 'cp949')
}

const rows = parse(readCsvText(csvPath), { columns: true, skip_empty_lines: true })
const rosterRef = db.collection('roster')

// Firestore 배치는 최대 500건이라 여유를 두고 400건씩 나눠 커밋한다.
async function commitInChunks(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch()
    for (const op of ops.slice(i, i + 400)) op(batch)
    await batch.commit()
  }
}

// '3'은 숫자 3으로, '햇살반'은 문자열 그대로 저장한다.
// 화면(src/lib/identityLabel.js)이 숫자면 'N학년/N반', 문자면 그대로 붙여 쓴다.
function parseField(value) {
  const text = String(value ?? '').trim()
  if (text === '') return ''
  return Number.isNaN(Number(text)) ? text : Number(text)
}

// 문서 id는 `학년-반-번호`라서 이 셋이 겹치면 batch.set이 앞사람을 덮어쓴다.
// 그러면 명단이 조용히 사라지는데 로그에는 CSV 줄 수가 그대로 찍혀 알아챌 수가 없다.
// 그래서 업로드 전에 전부 검사하고, 문제가 있으면 아무것도 쓰지 않고 멈춘다.
const entries = rows.map((row, i) => {
  const grade = parseField(row.grade)
  const klass = parseField(row.class)
  const number = parseField(row.number)
  const name = String(row.name ?? '').trim()
  return { line: i + 2, grade, class: klass, number, name, id: `${grade}-${klass}-${number}` }
})

const problems = []
for (const e of entries) {
  const blanks = ['grade', 'class', 'number', 'name'].filter((k) => e[k] === '')
  if (blanks.length > 0) {
    problems.push(`${e.line}행: ${blanks.join(', ')} 칸이 비어 있음 (${e.name || '이름 없음'})`)
  }
}

const seen = new Map()
for (const e of entries) {
  const first = seen.get(e.id)
  if (first) {
    problems.push(`${first.line}행 "${first.name}"과 ${e.line}행 "${e.name}"이 같은 자리(${e.id})`)
  } else {
    seen.set(e.id, e)
  }
}

if (problems.length > 0) {
  console.error('CSV에 문제가 있어 업로드하지 않았습니다. 고친 뒤 다시 실행하세요.\n')
  for (const p of problems) console.error(`  - ${p}`)
  console.error('\n학년-반-번호가 같으면 한 명만 남고 나머지는 사라집니다.')
  console.error('교사는 번호를 비우지 말고 99번으로 넣으세요.')
  process.exit(1)
}

const existing = await rosterRef.get()
await commitInChunks(existing.docs.map((d) => (batch) => batch.delete(d.ref)))
console.log(`기존 roster ${existing.size}명 삭제 완료`)

await commitInChunks(
  entries.map(
    ({ id, grade, class: klass, number, name }) =>
      (batch) =>
        batch.set(rosterRef.doc(id), { grade, class: klass, number, name })
  )
)
console.log(`roster 컬렉션에 ${entries.length}명 업로드 완료`)
