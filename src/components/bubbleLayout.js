// 사진 "비눗방울"들을 화면 밖으로 나가지 않고 서로 크게 겹치지 않게 배치하기 위한
// 순수 계산 함수. 같은 post.id에는 항상 같은 위치/크기를 돌려줘서(안정적인 시드) 목록이
// 다시 그려져도 방울이 제자리에서 유지되게 한다.
function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return h
}

function seededRandom(seed) {
  const h = hashString(seed)
  return (((h % 10000) + 10000) % 10000) / 10000
}

// containerWidth(px) 기준으로 몇 칸으로 나눌지 정한다. 칸이 너무 작아지면
// 방울이 손가락으로 누르기 어려워지므로 하한을 둔다.
export function columnsForWidth(width) {
  // 화면 크기와 상관없이 한 줄에 사진 3개 정도가 크게 보이도록 3칸으로 고정.
  // 아주 좁은 화면(폰 세로)에서만 방울이 너무 작아지지 않게 2칸으로 줄인다.
  if (width < 360) return 2
  return 3
}

export function computeBubbleLayout(posts, containerWidth) {
  const cols = columnsForWidth(containerWidth)
  const rows = Math.max(1, Math.ceil(posts.length / cols))
  const cell = containerWidth / cols

  const items = posts.map((post, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const seed = post.id || String(index)

    // 방울 지름: 칸의 58~94% 사이. 화면에 크게 보이면서도 방울마다 크기 차이가 눈에 띄게.
    const sizeRatio = 0.58 + seededRandom(`${seed}-size`) * 0.36
    const size = cell * sizeRatio

    // 남는 여백 안에서만 흔들어 배치 → 절대 칸 밖(=화면 밖)으로 나가지 않는다.
    const slack = cell - size
    const jitterX = (seededRandom(`${seed}-x`) - 0.5) * slack * 0.9
    const jitterY = (seededRandom(`${seed}-y`) - 0.5) * slack * 0.9

    const left = col * cell + (cell - size) / 2 + jitterX
    const top = row * cell + (cell - size) / 2 + jitterY

    // 둥실거리는 애니메이션에 쓸 랜덤한 리듬(다들 똑같이 움직이면 기계적으로 보임)
    const duration = 5 + seededRandom(`${seed}-dur`) * 3.5
    const delay = seededRandom(`${seed}-delay`) * -6
    const drift = 6 + seededRandom(`${seed}-drift`) * 6

    return { post, left, top, size, duration, delay, drift }
  })

  const height = rows * cell
  return { items, height, cols }
}
