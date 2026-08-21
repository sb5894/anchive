import { readFileSync } from 'fs'
import { GoogleAuth } from 'google-auth-library'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf-8')
)

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/datastore'],
})
const client = await auth.getClient()
const token = await client.getAccessToken()

const projectId = serviceAccount.project_id
const res = await fetch(
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/-/indexes`,
  { headers: { Authorization: `Bearer ${token.token}` } }
)
const data = await res.json()
for (const idx of data.indexes || []) {
  console.log(idx.name.split('/').pop(), idx.state, JSON.stringify(idx.fields))
}
