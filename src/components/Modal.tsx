import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './Icons'

interface ModalProps {
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
  labelledBy?: string
}

export function Modal({ onClose, title, subtitle, children, footer, size = 'md', labelledBy }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <header className="modal-head">
          <div>
            {title && (
              <h2 className="modal-title" id={labelledBy}>
                {title}
              </h2>
            )}
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <IconClose size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
