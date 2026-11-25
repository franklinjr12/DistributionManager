import { useEffect, useRef } from 'react'

let lockCount = 0
/** Open overlays, in opening order. Only the topmost one reacts to Escape. */
const stack: symbol[] = []
const handlers = new Map<symbol, () => void>()
let listening = false

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  const top = stack[stack.length - 1]
  const fn = top && handlers.get(top)
  if (fn) {
    e.preventDefault()
    e.stopPropagation()
    fn()
  }
}

function ensureListener() {
  if (listening) return
  window.addEventListener('keydown', onKey)
  listening = true
}

/** Register an open overlay (topmost-only Escape). Returns unregister fn. Usable outside primitives. */
export function pushOverlay(onEscape: () => void): () => void {
  ensureListener()
  const id = Symbol('overlay')
  stack.push(id)
  handlers.set(id, onEscape)
  return () => {
    const i = stack.indexOf(id)
    if (i >= 0) stack.splice(i, 1)
    handlers.delete(id)
  }
}

/** ESC to close (topmost overlay only) + body scroll lock while open. */
export function useOverlay(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return
    const pop = pushOverlay(() => closeRef.current())
    lockCount++
    document.body.style.overflow = 'hidden'
    return () => {
      pop()
      lockCount--
      if (lockCount <= 0) {
        lockCount = 0
        document.body.style.overflow = ''
      }
    }
  }, [open])
}
