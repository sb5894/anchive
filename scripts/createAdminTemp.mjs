// 테스트용 임시 관리자 계정 생성 스크립트 (1회성 검증 목적)
import { readFileSync } from 'fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

initializeApp({ credential: cert(serviceAccount) })
const auth = getAuth()

const email = process.argv[2]
const password = process.argv[3]

try {
  const user = await auth.createUser({ email, password })
  console.log('생성됨:', user.uid)
} catch (e) {
  console.error(e.message)
}
