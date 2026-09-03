import { useEffect, useRef } from 'react'

// 앱의 모든 모달이 쓰는 공용 껍데기.
// 예전에는 화면마다 modal-backdrop/modal-sheet를 복붙했는데, 그 탓에 어디에도
// 포커스 이동·Esc·포커스 가둠이 없어서 키보드와 스크린리더로는 모달 안에
// 들어갈 수조차 없었다(이름 고르기가 여기 해당해서 글쓰기 경로가 막혀 있었다).
// 껍데기를 여기 한 곳으로 모아 그 처리를 함께 넣는다.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({ role = 'dialog', label, onClose, dismissible = true, children }) {
  const sheetRef = useRef(null)

  // 열릴 때 모달 안으로 포커스를 옮기고, 닫힐 때 원래 있던 곳으로 되돌린다.
  useEffect(() => {
    const previous = document.activeElement
    const sheet = sheetRef.current
    const first = sheet?.querySelector(FOCUSABLE)
    ;(first || sheet)?.focus?.()
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (dismissible) onClose?.()
        return
      }
      if (e.key !== 'Tab') return

      // 포커스 가능한 요소는 그때그때 다시 센다. 이름 고르기 모달은 명단을 받아온 뒤,
      // 그리고 학년을 고른 뒤에 select가 하나씩 풀리므로 목록이 도중에 늘어난다.
      const sheet = sheetRef.current
      if (!sheet) return
      const items = [...sheet.querySelectorAll(FOCUSABLE)]
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]

      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault()
        lastItem.focus()
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dismissible, onClose])

  return (
    <div className="modal-backdrop" onClick={dismissible ? onClose : undefined}>
      <div
        ref={sheetRef}
        className="modal-sheet"
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
