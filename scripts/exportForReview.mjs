// 사용법: node scripts/exportForReview.mjs
// 심사용으로 게시물 사진/영상을 전부 review/ 폴더에 내려받고, 오프라인으로 열 수 있는
// 심사 화면(review/index.html)을 만든다. 이미 받은 파일은 건너뛰니 행사 중에 여러 번 돌려도 된다.
// review/에는 학생 이름이 들어가므로 .gitignore에 올려 두었다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { fileURLToPath } from 'url'
import path from 'path'
import { locationIdForSpot, ETC_ID, ETC_NAME } from '../src/lib/campusRegions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'review')
const mediaDir = path.join(outDir, 'media')
mkdirSync(mediaDir, { recursive: true })

const serviceAccount = JSON.parse(readFileSync(path.join(root, 'serviceAccountKey.json'), 'utf-8'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const [postsSnap, locSnap, evSnap] = await Promise.all([
  db.collection('posts').orderBy('createdAt', 'asc').get(),
  db.collection('locations').get(),
  db.collection('events').get(),
])
const locationNames = Object.fromEntries(locSnap.docs.map((d) => [d.id, d.data().name || d.id]))
locationNames[ETC_ID] = ETC_NAME
const eventNames = Object.fromEntries(evSnap.docs.map((d) => [d.id, d.data().name || d.id]))

const posts = []
let downloaded = 0
for (const doc of postsSnap.docs) {
  const p = doc.data()
  if (p.deleted) continue
  const a = p.authorInfo || {}
  const media = []
  for (let i = 0; i < (p.media || []).length; i++) {
    const m = p.media[i]
    // 저장 경로에서 확장자를 뽑는다(다운로드 URL은 경로가 %2F로 인코딩돼 있다).
    const storagePath = decodeURIComponent(new URL(m.url).pathname.split('/o/')[1] || '')
    const ext = path.extname(storagePath) || (m.type === 'video' ? '.mp4' : '.jpg')
    const fileName = `${doc.id}_${i + 1}${ext}`
    const filePath = path.join(mediaDir, fileName)
    if (!existsSync(filePath)) {
      const res = await fetch(m.url)
      if (!res.ok) {
        console.error(`다운로드 실패 ${doc.id} #${i + 1}: ${res.status}`)
        continue
      }
      writeFileSync(filePath, Buffer.from(await res.arrayBuffer()))
      downloaded++
    }
    media.push({ file: `media/${fileName}`, type: m.type || 'image' })
  }
  const locationId = locationIdForSpot(p.spot)
  posts.push({
    id: doc.id,
    author: `${a.grade ?? ''}-${a.class ?? ''} ${a.name ?? ''}`.trim(),
    grade: a.grade ?? '',
    klass: a.class ?? '',
    name: a.name ?? '',
    location: locationNames[locationId] || locationId,
    event: eventNames[p.eventId] || p.eventId || '',
    caption: p.caption || '',
    likes: p.likeCount || 0,
    createdAt: p.createdAt?.toDate?.().toISOString() || '',
    media,
  })
}

const template = readFileSync(path.join(__dirname, 'reviewTemplate.html'), 'utf-8')
writeFileSync(
  path.join(outDir, 'index.html'),
  template.replace('/*__POSTS__*/[]', JSON.stringify(posts).replace(/</g, '\\u003c'))
)
console.log(`게시물 ${posts.length}개, 새로 받은 파일 ${downloaded}개`)
console.log(`심사 화면: ${path.join(outDir, 'index.html')}`)
