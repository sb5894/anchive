import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOCATION_REGIONS } from '../lib/campusRegions'

// 사용자가 직접 만든 손그림풍 캠퍼스 일러스트(campus-map-2.png)를 배경으로 쓴다.
// 지도 위에는 "학생들이 찍은 사진"만 올려서 포토스팟 지도처럼 보이게 하고,
// 장소 선택은 건물 영역 클릭(아래 map-region)과 지도 밖 칩 목록으로 처리한다.
// onMapClick이 주어지면(업로드 화면) 지도를 탭해 정확한 촬영 위치를 콕 찍는 모드로 동작한다.
// 영역 정의는 분류 로직과 공유해야 하므로 lib/campusRegions.js에 둔다.

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5

// 이 거리(퍼센트) 안에 있으면 한 묶음으로 본다.
// 확대 배율의 제곱으로 좁혀서, 끝까지 확대하면 몇 %밖에 안 떨어진 사진들도 개별로 풀리게 한다.
function mergeRadiusFor(zoom) {
  return 9 / (zoom * zoom)
}

// 가까이 있는 사진들을 거리 기준으로 묶는다.
// 격자로 나누면 경계에 걸친 사진이 바로 옆인데도 안 묶여서, 거리 기반으로 처리한다.
function clusterSpots(spots, zoom) {
  const radius = mergeRadiusFor(zoom)
  const clusters = []
  for (const s of spots) {
    const near = clusters.find(
      (c) => Math.hypot(c.x - s.x, c.y - s.y) <= radius
    )
    if (near) {
      near.items.push(s)
      // 묶음 중심을 구성원 평균으로 갱신
      near.x = near.items.reduce((sum, i) => sum + i.x, 0) / near.items.length
      near.y = near.items.reduce((sum, i) => sum + i.y, 0) / near.items.length
    } else {
      clusters.push({ key: s.id || `${s.x}-${s.y}`, x: s.x, y: s.y, items: [s] })
    }
  }
  return clusters
}

export default function CampusMap({ categories, activeId, onSelect, spots, spot, onMapClick }) {
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [openCluster, setOpenCluster] = useState(null)

  const allSpots = spots || (spot ? [{ id: 'single', x: spot.x, y: spot.y }] : [])
  const clusters = useMemo(() => clusterSpots(allSpots, zoom), [allSpots, zoom])

  function handleWrapClick(e) {
    if (!onMapClick) return
    if (e.target.closest('.map-spot') || e.target.closest('.map-region')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onMapClick({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }

  function handleSpotClick(cluster) {
    if (cluster.items.length === 1) {
      const only = cluster.items[0]
      if (only.id && only.id !== 'single') navigate(`/post/${only.id}`)
      return
    }
    setOpenCluster(cluster)
  }

  return (
    <div className="campus-map-outer">
      <div
        ref={wrapRef}
        className={onMapClick ? 'campus-map-wrap pickable' : 'campus-map-wrap'}
        onClick={handleWrapClick}
      >
        <div className="campus-map-zoomer" style={{ transform: `scale(${zoom})` }}>
          <img className="campus-map-illustration" src="/campus-map-2.png" alt="" aria-hidden="true" />


          {/* 건물 영역을 눌러도 그 장소가 선택되게 하는 넓은 히트 영역(콕 찍기 모드에서는 숨김) */}
          {!onMapClick &&
            categories.map((cat) => {
              const region = LOCATION_REGIONS[cat.id]
              if (!region) return null
              return (
                <button
                  key={`region-${cat.id}`}
                  type="button"
                  className={activeId === cat.id ? 'map-region active' : 'map-region'}
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

          {clusters.map((c) => {
            const lead = c.items[0]
            const extra = c.items.length - 1
            const isPickerDot = lead.id === 'single'
            return (
              <button
                key={c.key}
                type="button"
                className={isPickerDot ? 'map-spot picked' : 'map-spot'}
                style={{
                  left: `${c.x}%`,
                  top: `${c.y}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isPickerDot) handleSpotClick(c)
                }}
                aria-label={extra > 0 ? `사진 ${c.items.length}장 모여있는 곳` : '사진 보기'}
              >
                {lead.thumbUrl ? (
                  <img src={lead.thumbUrl} alt="" />
                ) : (
                  <span className="map-spot-blank" aria-hidden="true" />
                )}
                {extra > 0 && <span className="map-spot-count">+{extra}</span>}
              </button>
            )
          })}
        </div>

        {!onMapClick && (
          <div className="map-zoom-controls">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="지도 크게 보기"
            >
              ＋
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="지도 작게 보기"
            >
              －
            </button>
          </div>
        )}
      </div>

      {openCluster && (
        <div className="modal-backdrop" onClick={() => setOpenCluster(null)}>
          <div
            className="modal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="이 자리에서 찍은 사진"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">이 자리에서 찍은 사진</h2>
            <p className="modal-sub">{openCluster.items.length}장이 모여 있어요. 눌러서 볼 수 있어요.</p>
            <div className="cluster-grid">
              {openCluster.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cluster-item"
                  onClick={() => {
                    setOpenCluster(null)
                    navigate(`/post/${item.id}`)
                  }}
                >
                  {item.thumbUrl ? <img src={item.thumbUrl} alt="" /> : <span>사진</span>}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setOpenCluster(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
