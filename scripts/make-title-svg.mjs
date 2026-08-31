// 제목 "안성초 추억지도"를 온글잎 박다현체로 렌더링해 SVG 로고로 뽑아낸다.
//
// 왜 SVG인가: 이 폰트를 웹폰트(@font-face)로 그냥 쓰면 964KB짜리 파일 전체를
// 방문자가 받아야 한다(눈누 폰트는 구글 폰트와 달리 글자 단위로 쪼개 주지 않는다).
// 제목 7글자의 외곽선만 미리 떠서 SVG로 저장하면 수십 KB로 끝나고,
// 폰트가 늦게 도착해 제목 글씨체가 바뀌며 깜빡이는 현상도 없다.
//
// 라이선스 주의: 온글잎 박다현체는 상업적 사용·BI/CI(로고) 용도가 무료로 허용되지만
// "폰트 파일 자체의 수정·복제·배포"는 금지한다. 그래서 이 스크립트는 매번 CDN에서
// 폰트를 받아 메모리에서만 쓰고 버리며, 폰트 파일(.woff2/.ttf)은 저장소에 커밋하지
// 않는다. 커밋되는 것은 결과물인 SVG(글자 외곽선)뿐이다.
//
// 실행: node scripts/make-title-svg.mjs

import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const wawoff2 = require('wawoff2')
const opentype = require('opentype.js')

const __dirname = dirname(fileURLToPath(import.meta.url))

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/projectnoonnu/2411-3@1.0/Ownglyph_ParkDaHyun.woff2'
const TITLE = '안성초 추억지도'
const FONT_SIZE = 64
const FILL = '#2f3437' // --text 토큰과 동일
const PADDING = 6 // 외곽선이 viewBox 가장자리에 딱 붙지 않도록 여백

async function main() {
  console.log('폰트를 받는 중...', FONT_URL)
  const res = await fetch(FONT_URL)
  if (!res.ok) throw new Error(`폰트 다운로드 실패: ${res.status}`)
  const woff2Buffer = Buffer.from(await res.arrayBuffer())

  console.log('woff2 -> ttf 압축 해제 중...')
  const ttfBuffer = await wawoff2.decompress(woff2Buffer)

  console.log('폰트 파싱 중...')
  const font = opentype.parse(
    ttfBuffer.buffer.slice(ttfBuffer.byteOffset, ttfBuffer.byteOffset + ttfBuffer.byteLength)
  )

  const path = font.getPath(TITLE, 0, 0, FONT_SIZE)
  const box = path.getBoundingBox()

  const width = box.x2 - box.x1 + PADDING * 2
  const height = box.y2 - box.y1 + PADDING * 2
  const dx = -box.x1 + PADDING
  const dy = -box.y1 + PADDING

  // opentype가 만든 path는 baseline 기준 좌표라 원점 밖으로 나갈 수 있다.
  // path 자체를 다시 계산하지 않고, SVG group에 (dx, dy) translate만 적용해
  // bounding box 좌상단이 viewBox 원점(여백만큼 안쪽)에 오게 맞춘다.
  const d = path.toPathData(2)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" role="img">
  <title>${TITLE}</title>
  <g transform="translate(${dx.toFixed(2)}, ${dy.toFixed(2)})" fill="${FILL}">
    <path d="${d}" />
  </g>
</svg>
`

  const outPath = join(__dirname, '..', 'public', 'title-anchive.svg')
  await writeFile(outPath, svg, 'utf8')
  console.log(`저장 완료: ${outPath}`)
  console.log(`viewBox: 0 0 ${width.toFixed(2)} ${height.toFixed(2)} (가로:세로 비율 ${(width / height).toFixed(3)})`)
  console.log(`파일 크기: ${(Buffer.byteLength(svg) / 1024).toFixed(1)}KB`)
}

main().catch((err) => {
  console.error('실패:', err)
  process.exit(1)
})
