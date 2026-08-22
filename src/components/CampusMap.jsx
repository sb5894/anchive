// 사용자가 직접 만든 손그림풍 캠퍼스 일러스트(campus-map-2.png)를 배경으로 쓴다.
// categories 핀은 장소를 고르는 접근 경로이고, onMapClick이 주어지면 지도를 직접 탭해서
// "정확히 여기서 찍었어요"라고 좌표를 콕 찍는 보조 입력도 지원한다(둘 다 선택 사항).

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

export default function CampusMap({ categories, activeId, onSelect, spot, onMapClick }) {
  let fallbackIndex = 0

  function handleWrapClick(e) {
    if (!onMapClick) return
    if (e.target.closest('.map-pin')) return
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

      {categories.map((cat) => {
        const slot = LOCATION_POSITIONS[cat.id] || FALLBACK_SLOTS[fallbackIndex++ % FALLBACK_SLOTS.length]
        const isActive = activeId === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={isActive ? 'map-pin active' : 'map-pin'}
            style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(cat.id)
            }}
            aria-pressed={isActive}
          >
            <span className="map-pin-dot" aria-hidden="true" />
            <span className="map-pin-label">{cat.name}</span>
          </button>
        )
      })}

      {spot && (
        <span className="map-spot-marker" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} aria-hidden="true" />
      )}
    </div>
  )
}
