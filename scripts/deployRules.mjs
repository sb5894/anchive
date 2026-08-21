// 사용법: node scripts/deployRules.mjs
// firebase-admin의 Security Rules API로 firestore.rules / storage.rules를 배포한다.
// (firebase CLI 로그인 없이 서비스 계정 키만으로 가능)

import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getSecurityRules } from 'firebase-admin/security-rules'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

const app = initializeApp({ credential: cert(serviceAccount) })
const rules = getSecurityRules(app)

const firestoreSource = readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf-8')
const storageSource = readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf-8')

await rules.releaseFirestoreRulesetFromSource(firestoreSource)
console.log('firestore.rules 배포 완료')

const bucket = serviceAccount.project_id + '.firebasestorage.app'
await rules.releaseStorageRulesetFromSource(storageSource, bucket)
console.log(`storage.rules 배포 완료 (bucket: ${bucket})`)
