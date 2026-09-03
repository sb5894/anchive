// 캠퍼스 지도(school-map-4.webp) 위의 건물·구역 영역 정의.
//
// 이 파일 하나가 두 가지 역할을 동시에 한다:
//   1) 지도에서 건물을 눌러 장소를 고르는 히트 영역
//   2) 사진에 찍힌 좌표가 어느 장소인지 판정하는 분류 기준
// 두 곳이 같은 정의를 보게 해야 "누른 건물"과 "분류된 장소"가 어긋나지 않는다.
//
// 좌표는 모두 지도 이미지 기준 퍼센트(왼쪽 위가 0,0).

// 각 값은 school-map-4.webp(1024x1536)의 픽셀 경계를 색상으로 검출해 맞춘 것이다.
// 건물 사이 통로나 가장자리 나무처럼 어디에도 안 속하는 자리는 일부러 비워 두고 '기타'가 되게 한다.
// 특히 아래 세 곳은 요청에 따라 의도적으로 비워 두었다:
//   - 본관~비봉관을 잇는 무지개 통로(x 73~79.5% 띠, y 38~72% — 단 y 55~70%는 zelkova가 차지)
//   - 운동장~정문을 잇는 통로(y 66~69% 띠, x 49~67%)
//   - 정문, 후문
//
// 구역끼리 겹치지 않게 맞춰 놓았다. locationIdForSpot()이 먼저 걸리는 구역을 반환하는
// 선착순 방식이라, 겹치면 뒤쪽 구역이 영영 선택되지 않는다. 값을 넓힐 땐 이웃과의
// 경계를 함께 확인할 것.
export const LOCATION_REGIONS = {
  hugwan: { left: 27, top: 3, width: 59, height: 16 },
  bongwan: { left: 16, top: 23.5, width: 56, height: 10 },
  // 유치원 텃밭까지 유치원 영역에 포함시킨다(건물 아래 밭).
  kindergarten: { left: 73, top: 23.5, width: 20, height: 14.5 },
  singwan: { left: 7, top: 36, width: 15, height: 22 },
  playground: { left: 23.5, top: 38.5, width: 49.5, height: 27.5 },
  'kinder-play': { left: 79.5, top: 39.5, width: 15.5, height: 15 },
  garden: { left: 8, top: 58, width: 15, height: 8 },
  forest: { left: 4, top: 66, width: 22, height: 15.5 },
  'play-area': { left: 26, top: 69, width: 23, height: 12 },
  // 비봉관 오른쪽 위, 유치원 놀이터 아래의 느티나무(school-map-4에서 새로 추가된 나무).
  zelkova: { left: 78, top: 55, width: 22, height: 15 },
  bibonghall: { left: 67, top: 72, width: 27, height: 22 },
  'tennis-court': { left: 12, top: 81.5, width: 32, height: 14 },
}

// 어느 구역에도 안 들어가는 곳(건물 사이 통로, 나무, 가장자리 등)에 쓰는 가상 장소.
// Firestore locations 컬렉션에는 없고 화면에서만 만들어 쓴다.
export const ETC_ID = 'etc'
export const ETC_NAME = '기타'

// 좌표가 어느 장소에 속하는지 판정한다.
// 경계가 딱 맞닿은 구역들(신관/텃밭이 y=58에서, 텃밭/학교숲이 y=66에서, 학교숲/정구장이
// y=81.5에서, 운동장/유치원이 x=73에서 만남)이 있어서 반열린 구간(left <= x < left+width)으로
// 판정해 한 점이 두 구역에 걸리지 않게 한다.
export function locationIdForSpot(spot) {
  if (!spot || typeof spot.x !== 'number' || typeof spot.y !== 'number') return ETC_ID
  for (const [id, r] of Object.entries(LOCATION_REGIONS)) {
    if (spot.x >= r.left && spot.x < r.left + r.width && spot.y >= r.top && spot.y < r.top + r.height) {
      return id
    }
  }
  return ETC_ID
}

// "정해진 장소에서 고르기"로 장소를 골랐을 때 찍어줄 좌표(그 구역의 한가운데).
export function regionCenter(locationId) {
  const r = LOCATION_REGIONS[locationId]
  if (!r) return null
  return {
    x: Math.round((r.left + r.width / 2) * 10) / 10,
    y: Math.round((r.top + r.height / 2) * 10) / 10,
  }
}
