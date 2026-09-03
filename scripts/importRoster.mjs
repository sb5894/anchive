// 사용법: node scripts/importRoster.mjs path/to/roster.csv
// 필요: 프로젝트 루트에 serviceAccountKey.json (Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성)
// CSV 형식: grade,class,number,name (헤더 포함)
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

const existing = await rosterRef.get()
await commitInChunks(existing.docs.map((d) => (batch) => batch.delete(d.ref)))
console.log(`기존 roster ${existing.size}명 삭제 완료`)

await commitInChunks(
  rows.map((row) => {
    const grade = Number(row.grade)
    const klass = Number(row.class)
    const number = Number(row.number)
    const name = row.name.trim()
    const id = `${grade}-${klass}-${number}`
    return (batch) => batch.set(rosterRef.doc(id), { grade, class: klass, number, name })
  })
)
console.log(`roster 컬렉션에 ${rows.length}명 업로드 완료`)
