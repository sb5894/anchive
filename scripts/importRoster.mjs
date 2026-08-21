// 사용법: node scripts/importRoster.mjs path/to/roster.csv
// 필요: 프로젝트 루트에 serviceAccountKey.json (Firebase 콘솔 > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성)
// CSV 형식: grade,class,number,name (헤더 포함)

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
function readCsvText(filePath) {
  const buf = readFileSync(filePath)
  const utf8 = buf.toString('utf-8')
  if (!utf8.includes('�')) return utf8
  return iconv.decode(buf, 'cp949')
}

const rows = parse(readCsvText(csvPath), { columns: true, skip_empty_lines: true })

const batch = db.batch()
for (const row of rows) {
  const grade = Number(row.grade)
  const klass = Number(row.class)
  const number = Number(row.number)
  const name = row.name.trim()
  const id = `${grade}-${klass}-${number}`
  batch.set(db.collection('roster').doc(id), { grade, class: klass, number, name })
}

await batch.commit()
console.log(`roster 컬렉션에 ${rows.length}명 업로드 완료`)
