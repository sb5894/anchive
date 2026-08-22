import { Link } from 'react-router-dom'

// 사용자가 직접 만든 손그림풍 캠퍼스 일러스트(campus-map-2.png)를 배경으로 쓴다.
// categories 핀은 장소를 고르는 접근 경로이고, onMapClick이 주어지면(업로드 화면)
// 지도를 직접 탭해서 "정확히 여기서 찍었어요"라고 좌표를 콕 찍는 보조 입력도 지원한다.

// 핀(라벨)이 표시될 고정 지점
const LOCATION_POSITIONS = {
  hugwan: { left: 50, top: 13 },
  bongwan: { left: 44, top: 33 },
  kindergarten: { left: 87, top: 34 },
  singwan: { left: 14, top: 54 },
  playground: { left: 62, top: 59 },
  garden: { left: 13, top: 72 },
  forest: { left: 13, top: 84 },
  'play-area': { left: 48, top: 86 },
  bibonghall: { left: 84, top: 86 },
}
const FALLBACK_SLOTS = [
  { left: 60, top: 30 },
  { left: 70, top: 55 },
  { left: 30, top: 85 },
]

// 건물/구역 색 구분 (핀·배지 색). 그림 위에서 확실히 눈에 띄도록 채도/명도를 높게 잡았다.
const LOCATION_COLORS = {
  hugwan: '#ff5a4e',
  bongwan: '#ff8a3d',
  kindergarten: '#ffc93d',
  singwan: '#3d8bff',
  playground: '#ffb300',
  garden: '#5fd93f',
  forest: '#1fb35a',
  'play-area': '#22c7dd',
  bibonghall: '#8a6cff',
}
const DEFAULT_PIN_COLOR = '#4f5fe0'

// 핀을 정확히 못 눌러도 건물 영역 아무 데나 눌러서 고를 수 있도록 하는 대략적인 히트 영역
// (퍼센트 좌표: left, top, width, height). onMapClick(콕 찍기 모드)일 때는 쓰지 않는다.
const LOCATION_REGIONS = {
  hugwan: { left: 14, top: 7, width: 71, height: 13 },
  bongwan: { left: 10, top: 25, width: 67, height: 15 },
  kindergarten: { left: 77, top: 26, width: 20, height: 14 },
  singwan: { left: 2, top: 41, width: 24, height: 26 },
  playground: { left: 27, top: 42, width: 69, height: 33 },
  garden: { left: 1, top: 67, width: 25, height: 10 },
  forest: { left: 1, top: 77, width: 25, height: 14 },
  'play-area': { left: 28, top: 78, width: 40, height: 16 },
  bibonghall: { left: 69, top: 77, width: 30, height: 18 },
}

export default function CampusMap({ categories, activeId, onSelect, counts, spots, spot, onMapClick }) {
  let fallbackIndex = 0
  const allSpots = spots || (spot ? [{ id: 'single', ...spot }] : [])

  function handleWrapClick(e) {
    if (!onMapClick) return
    if (e.target.closest('.map-pin') || e.target.closest('.map-region')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onMapClick({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }

  return (
    <div
      className={onMapClick ? 'campus-map-wrap pickable' : 'campus-map-wrap'}
      onClick={handleWrapClick}
    >
      <img className="campus-map-illustration" src="/campus-map-2.png" alt="" aria-hidden="true" />

      {/* 건물 영역 아무데나 눌러도 그 장소가 선택되게 하는 넓은 히트 영역(콕 찍기 모드에서는 숨김) */}
      {!onMapClick &&
        categories.map((cat) => {
          const region = LOCATION_REGIONS[cat.id]
          if (!region) return null
          return (
            <button
              key={`region-${cat.id}`}
              type="button"
              className="map-region"
              aria-label={cat.name}
              style={{
                left: `${region.left}%`,
                top: `${region.top}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(cat.id)
              }}
            />
          )
        })}

      {categories.map((cat) => {
        const slot = LOCATION_POSITIONS[cat.id] || FALLBACK_SLOTS[fallbackIndex++ % FALLBACK_SLOTS.length]
        const isActive = activeId === cat.id
        const color = LOCATION_COLORS[cat.id] || DEFAULT_PIN_COLOR
        const count = counts?.[cat.id]
        return (
          <button
            key={cat.id}
            type="button"
            className={isActive ? 'map-pin active' : 'map-pin'}
            style={{ left: `${slot.left}%`, top: `${slot.top}%`, '--pin-color': color }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(cat.id)
            }}
            aria-pressed={isActive}
          >
            <span className="map-pin-dot" aria-hidden="true">
              {!!count && <span className="map-pin-count">{count}</span>}
            </span>
            <span className="map-pin-label">{cat.name}</span>
          </button>
        )
      })}

      {allSpots.map((s) =>
        s.id && s.id !== 'single' ? (
          <Link
            key={s.id}
            to={`/post/${s.id}`}
            className="map-spot-marker"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            onClick={(e) => e.stopPropagation()}
            aria-label="이 위치에서 찍은 사진 보기"
          />
        ) : (
          <span
            key={s.id || `${s.x}-${s.y}`}
            className="map-spot-marker"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-hidden="true"
          />
        )
      )}
    </div>
  )
}
