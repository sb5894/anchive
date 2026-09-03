import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOCATION_REGIONS } from '../lib/campusRegions'
import Modal from './Modal'

// 사용자가 직접 만든 손그림풍 캠퍼스 일러스트(school-map-3.webp)를 배경으로 쓴다.
// 원본 PNG(school-map-3.png, 3.2MB)도 public/에 남겨 두었다 — 다시 압축할 일이 있을 때 쓴다.
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

// 확대한 만큼 지도가 틀 밖으로 밀려나지 않도록 이동량을 가둔다.
// transform-origin이 0 0이라 배율 s일 때 왼쪽 위는 0, 오른쪽 아래는 -(s-1)*크기가 한계다.
function clampPan(tx, ty, scale, rect) {
  const minX = -(scale - 1) * rect.width
  const minY = -(scale - 1) * rect.height
  return {
    tx: Math.min(0, Math.max(minX, tx)),
    ty: Math.min(0, Math.max(minY, ty)),
  }
}

// 핀은 좌표를 중심으로 그려지는데 지도 틀이 overflow:hidden이라 가장자리 사진이 잘린다.
// 분류 기준인 원본 좌표(spot)는 그대로 두고, 그리는 위치만 안쪽으로 민다.
const PIN_EDGE_INSET = 4
function insetPercent(v) {
  return Math.min(100 - PIN_EDGE_INSET, Math.max(PIN_EDGE_INSET, v))
}

export default function CampusMap({ categories, activeId, onSelect, spots, spot, onMapClick }) {
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  // scale과 이동량(tx,ty)을 함께 관리한다. 버튼 확대와 손가락 확대가 같은 상태를 공유한다.
  const [view, setView] = useState({ scale: MIN_ZOOM, tx: 0, ty: 0 })
  const [openCluster, setOpenCluster] = useState(null)
  const zoom = view.scale

  // 진행 중인 손가락들과 제스처 시작 시점의 상태를 담아둔다(렌더와 무관하므로 ref).
  const pointersRef = useRef(new Map())
  const gestureRef = useRef(null)
  const movedRef = useRef(false)
  // 실제로 끌기/핀치가 시작된 포인터만 캡처한다. 탭 시점에 무조건 캡처하면 mousedown과
  // mouseup의 타깃이 갈라져 click이 wrap에서 발생하고, 사진·건물 버튼의 onClick이
  // 마우스 환경에서 아예 호출되지 않는 문제가 있었다(터치는 암시적 캡처 덕분에 무사했다).
  const capturedRef = useRef(new Set())
  // 손가락으로 조작하는 중인지. 전환 효과를 끄는 판단에 쓰이므로 ref가 아니라 상태여야 한다.
  const [gesturing, setGesturing] = useState(false)

  const allSpots = spots || (spot ? [{ id: 'single', x: spot.x, y: spot.y }] : [])
  const clusters = useMemo(() => clusterSpots(allSpots, zoom), [allSpots, zoom])

  // 버튼 확대는 보이는 화면의 한가운데를 기준으로 키운다(구석으로 튀지 않게).
  function zoomBy(delta) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    setView((v) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.scale + delta))
      const k = next / v.scale
      const cx = rect.width / 2
      const cy = rect.height / 2
      const raw = { tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k }
      return { scale: next, ...clampPan(raw.tx, raw.ty, next, rect) }
    })
  }

  function pointerList() {
    return [...pointersRef.current.values()]
  }

  // 포인터가 이미 놓였거나 요소가 사라진 경우 예외가 날 수 있는데,
  // 붙잡기/놓기에 실패해도 제스처 자체는 동작하므로 조용히 넘어간다.
  function capturePointer(el, pointerId) {
    if (capturedRef.current.has(pointerId)) return
    try {
      el.setPointerCapture?.(pointerId)
      capturedRef.current.add(pointerId)
    } catch {
      /* 붙잡기 실패는 무시 */
    }
  }

  function releasePointer(el, pointerId) {
    if (!capturedRef.current.delete(pointerId)) return
    try {
      el.releasePointerCapture?.(pointerId)
    } catch {
      /* 놓기 실패는 무시 */
    }
  }

  function handlePointerDown(e) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movedRef.current = false
    setGesturing(true)
    const pts = pointerList()
    const rect = wrapRef.current.getBoundingClientRect()
    if (pts.length === 1) {
      gestureRef.current = { mode: 'pan', startX: pts[0].x, startY: pts[0].y, view, rect }
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      gestureRef.current = {
        mode: 'pinch',
        startDist: dist || 1,
        midX: (pts[0].x + pts[1].x) / 2 - rect.left,
        midY: (pts[0].y + pts[1].y) / 2 - rect.top,
        view,
        rect,
      }
    }
  }

  function handlePointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gestureRef.current
    if (!g) return
    const pts = pointerList()

    if (g.mode === 'pinch' && pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.view.scale * (dist / g.startDist)))
      const k = next / g.view.scale
      // 두 손가락 사이 지점이 제자리에 있도록 이동량을 함께 보정한다.
      const raw = {
        tx: g.midX - (g.midX - g.view.tx) * k,
        ty: g.midY - (g.midY - g.view.ty) * k,
      }
      movedRef.current = true
      capturePointer(e.currentTarget, e.pointerId)
      setView({ scale: next, ...clampPan(raw.tx, raw.ty, next, g.rect) })
    } else if (g.mode === 'pan' && pts.length === 1) {
      const dx = pts[0].x - g.startX
      const dy = pts[0].y - g.startY
      if (Math.hypot(dx, dy) > 6) {
        movedRef.current = true
        // 실제로 끌기 시작한 뒤에만 캡처한다 — 커서가 지도 밖으로 나가도 제스처가 이어지게.
        capturePointer(e.currentTarget, e.pointerId)
      }
      setView((v) => ({
        scale: v.scale,
        ...clampPan(g.view.tx + dx, g.view.ty + dy, v.scale, g.rect),
      }))
    }
  }

  function handlePointerUp(e) {
    pointersRef.current.delete(e.pointerId)
    releasePointer(e.currentTarget, e.pointerId)
    if (pointersRef.current.size === 0) {
      gestureRef.current = null
      setGesturing(false)
    }
  }

  function handleWrapClick(e) {
    // 끌어서 이동한 직후의 클릭은 위치 찍기로 보지 않는다.
    if (movedRef.current) return
    if (!onMapClick) return
    if (e.target.closest('.map-spot') || e.target.closest('.map-region')) return
    if (e.target.closest('.map-zoom-controls')) return
    const rect = e.currentTarget.getBoundingClientRect()
    // 확대·이동을 되돌려 원래 그림 기준 좌표로 변환한다.
    // (이 보정이 없으면 확대한 상태에서 엉뚱한 자리에 찍혔다.)
    const px = (e.clientX - rect.left - view.tx) / view.scale
    const py = (e.clientY - rect.top - view.ty) / view.scale
    const x = (px / rect.width) * 100
    const y = (py / rect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return
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
        // 기본 배율에서는 페이지 세로 스크롤을 브라우저에 돌려준다(막아만 놓고
        // 아무 것도 안 하고 있었다 — clampPan이 scale===1일 때 이동량을 0으로 고정한다).
        // 확대 상태에서만 제스처를 독점해 손가락 조작이 끊기지 않게 한다.
        style={{ touchAction: view.scale > MIN_ZOOM ? 'none' : 'pan-y' }}
        onClick={handleWrapClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="campus-map-zoomer"
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            // 손가락으로 조작하는 동안에는 전환 효과를 꺼야 끌리는 느낌 없이 따라온다.
            transition: gesturing ? 'none' : undefined,
          }}
        >
          <img className="campus-map-illustration" src="/school-map-3.webp" alt="" aria-hidden="true" />


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
                  aria-pressed={activeId === cat.id}
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
                  // 업로드 화면에서 콕 찍은 점(picker dot)은 누른 자리 그대로 찍혀야 하므로
                  // 밀지 않는다. 실제 사진 핀만 가장자리에서 안쪽으로 민다.
                  left: `${isPickerDot ? c.x : insetPercent(c.x)}%`,
                  top: `${isPickerDot ? c.y : insetPercent(c.y)}%`,
                  transform: `translate(-50%, -50%) scale(${1 / zoom})`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isPickerDot) handleSpotClick(c)
                }}
                aria-label={extra > 0 ? `사진 ${c.items.length}장 모여있는 곳` : '사진 보기'}
              >
                {/* 찍기용 점은 사진이 아니라 좌표만 있는 가짜 항목이라 thumbUrl이 항상 없다.
                    여기서 렌더를 건너뛰지 않으면 썸네일-없음 대체용 회색 원(.map-spot-blank)이
                    100% 크기로 덮여서 .map-spot.picked의 그라데이션이 아예 안 보이게 된다. */}
                {!isPickerDot &&
                  (lead.thumbUrl ? (
                    lead.thumbType === 'video' ? (
                      <video src={`${lead.thumbUrl}#t=0.1`} muted playsInline preload="metadata" />
                    ) : (
                      <img src={lead.thumbUrl} alt="" />
                    )
                  ) : (
                    <span className="map-spot-blank" aria-hidden="true" />
                  ))}
                {extra > 0 && <span className="map-spot-count">+{extra}</span>}
              </button>
            )
          })}
        </div>

        {/* 찍기 모드(onMapClick)에서도 노출한다 — 마우스 사용자는 핀치를 못 하므로
            이 버튼이 확대의 유일한 수단이다. 이 레이어를 눌러도 위치가 찍히지 않도록
            handleWrapClick에서 .map-zoom-controls는 걸러낸다. */}
        <div className="map-zoom-controls">
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="지도 크게 보기"
          >
            🔍＋
          </button>
          <button
            type="button"
            onClick={() => zoomBy(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="지도 작게 보기"
          >
            🔍－
          </button>
        </div>
      </div>

      {openCluster && (
        <Modal label="이 자리에서 찍은 사진" onClose={() => setOpenCluster(null)}>
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
                  {item.thumbUrl ? (
                    item.thumbType === 'video' ? (
                      <>
                        <video
                          src={`${item.thumbUrl}#t=0.1`}
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className="cluster-play" aria-hidden="true">
                          ▶
                        </span>
                      </>
                    ) : (
                      <img src={item.thumbUrl} alt="" />
                    )
                  ) : (
                    <span>사진</span>
                  )}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setOpenCluster(null)}>
                닫기
              </button>
            </div>
        </Modal>
      )}
    </div>
  )
}
