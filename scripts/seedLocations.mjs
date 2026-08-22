// 지도(캠퍼스맵) 디자인 전용 "장소" 컬렉션 시드 스크립트.
// 기존 events 컬렉션(행사 종류)과는 별개로 분리해서, 다른 디자인 시안에 영향 없게 한다.
// 실제 학교 건물 배치도 기준으로 반영(2026-08-22 업데이트).
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
  { id: 'hugwan', name: '후관' },
  { id: 'bongwan', name: '본관' },
  { id: 'kindergarten', name: '유치원' },
  { id: 'singwan', name: '신관' },
  { id: 'bibonghall', name: '비봉관' },
  { id: 'playground', name: '운동장' },
  { id: 'play-area', name: '놀이터' },
  { id: 'garden', name: '두손이텃밭' },
  { id: 'forest', name: '학교숲' },
]

// 기존에 있던 도서관/급식실/정문/이전 버전의 본관·별관 id는 실제 배치도와 안 맞아서 정리
const OLD_IDS_TO_REMOVE = ['library', 'cafeteria', 'gate', 'main-building', 'annex']

const batch = db.batch()
for (const loc of locations) {
  const { id, ...data } = loc
  batch.set(db.collection('locations').doc(id), data)
}
for (const id of OLD_IDS_TO_REMOVE) {
  batch.delete(db.collection('locations').doc(id))
}
await batch.commit()
console.log(`locations 컬렉션 업데이트 완료: ${locations.length}개 등록, ${OLD_IDS_TO_REMOVE.length}개 제거`)
