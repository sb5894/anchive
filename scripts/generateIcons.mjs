// 학교 로고(public/안성초_로고_한글(png).png)로 PWA 아이콘 세트 생성
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const src = path.join(__dirname, '..', 'public', '안성초_로고_한글(png).png')
const outDir = path.join(__dirname, '..', 'public')

// Android/Chrome: 투명 배경 유지 (원형 로고라 그대로 둬도 자연스러움)
await sharp(src).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'))
await sharp(src).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))

// iOS 홈 화면 아이콘: 투명 배경을 지원 안 해서 흰 배경으로 깔아줌 (안 그러면 검게 보일 수 있음)
await sharp(src)
  .resize(180, 180)
  .flatten({ background: '#ffffff' })
  .png()
  .toFile(path.join(outDir, 'apple-touch-icon.png'))

console.log('아이콘 생성 완료: icon-192.png, icon-512.png, apple-touch-icon.png')
