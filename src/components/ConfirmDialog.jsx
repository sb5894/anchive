// IdentityPicker와 같은 modal-backdrop/modal-sheet 패턴을 재사용한
// 삭제 등 파괴적 동작용 확인 다이얼로그. 브라우저 기본 confirm()을 대체한다.
export default function ConfirmDialog({ title, message, confirmLabel = '확인', danger, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">{title}</h2>
        {message && <p className="modal-sub">{message}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className={danger ? 'primary danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
