// 캠퍼스 지도(campus-map-2.png) 위의 건물·구역 영역 정의.
//
// 이 파일 하나가 두 가지 역할을 동시에 한다:
//   1) 지도에서 건물을 눌러 장소를 고르는 히트 영역
//   2) 사진에 찍힌 좌표가 어느 장소인지 판정하는 분류 기준
// 두 곳이 같은 정의를 보게 해야 "누른 건물"과 "분류된 장소"가 어긋나지 않는다.
//
// 좌표는 모두 지도 이미지 기준 퍼센트(왼쪽 위가 0,0).

// 각 값은 campus-map-2.png의 픽셀을 실제로 샘플링해 건물·구역 위치와 대조해 맞춘 것이다.
// 건물 사이 통로나 가장자리 나무처럼 어디에도 안 속하는 자리는 일부러 비워 두고 '기타'가 되게 한다.
export const LOCATION_REGIONS = {
  hugwan: { left: 14, top: 6, width: 71, height: 14 },
  bongwan: { left: 10, top: 24, width: 67, height: 16 },
  kindergarten: { left: 77, top: 24, width: 20, height: 16 },
  singwan: { left: 2, top: 41, width: 24, height: 26 },
  playground: { left: 27, top: 42, width: 69, height: 34 },
  garden: { left: 1, top: 67, width: 25, height: 10 },
  forest: { left: 1, top: 77, width: 25, height: 22 },
  'play-area': { left: 28, top: 78, width: 40, height: 21 },
  bibonghall: { left: 69, top: 75, width: 30, height: 24 },
}

// 어느 구역에도 안 들어가는 곳(건물 사이 통로, 나무, 가장자리 등)에 쓰는 가상 장소.
// Firestore locations 컬렉션에는 없고 화면에서만 만들어 쓴다.
export const ETC_ID = 'etc'
export const ETC_NAME = '기타'

// 좌표가 어느 장소에 속하는지 판정한다.
// 경계가 맞닿은 구역들(신관/텃밭이 y=67에서, 텃밭/학교숲이 y=77에서 만남)이 있어서
// 반열린 구간(left <= x < left+width)으로 판정해 한 점이 두 구역에 걸리지 않게 한다.
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
