// 지도(캠퍼스맵) 디자인 전용 "장소" 컬렉션 시드 스크립트.
// 기존 events 컬렉션(행사 종류)과는 별개로 분리해서, 다른 디자인 시안에 영향 없게 한다.
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const locations = [
  { id: 'playground', name: '운동장' },
  { id: 'main-building', name: '본관' },
  { id: 'annex', name: '별관' },
  { id: 'library', name: '도서관' },
  { id: 'cafeteria', name: '급식실' },
  { id: 'gate', name: '정문' },
]

const batch = db.batch()
for (const loc of locations) {
  const { id, ...data } = loc
  batch.set(db.collection('locations').doc(id), data)
}
await batch.commit()
console.log(`locations 컬렉션에 ${locations.length}개 업로드 완료`)
