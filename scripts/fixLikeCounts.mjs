// 1회성 복구 스크립트: 트랜잭션 도입 전 버그로 어긋난 likeCount를 실제 likes 서브컬렉션 개수로 재계산
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

const postsSnap = await db.collection('posts').get()
for (const postDoc of postsSnap.docs) {
  const likesSnap = await postDoc.ref.collection('likes').get()
  const actual = likesSnap.size
  const current = postDoc.data().likeCount
  if (current !== actual) {
    await postDoc.ref.update({ likeCount: actual })
    console.log(`${postDoc.id}: ${current} -> ${actual}`)
  }
}
console.log('완료')
