import { useApp } from '../store/AppStore'
import { IconCheck, IconClose } from './Icons'

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null
  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.tone}`} key={toast.id}>
          <span className="toast-icon">{toast.tone === 'success' ? <IconCheck size={16} /> : null}</span>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="关闭提示">
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
