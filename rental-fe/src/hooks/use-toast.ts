import * as React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 300

export type ToastVariant = "default" | "search-hint" | "success-pill"

const TOAST_DURATIONS_MS: Record<ToastVariant, number> = {
  "search-hint": 3_000,
  "success-pill": 3_000,
  default: 5_000,
}

export { TOAST_DURATIONS_MS }

export type ToastProps = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  open?: boolean
  variant?: ToastVariant
}

type ToastAction =
  | { type: "ADD"; toast: ToastProps }
  | { type: "UPDATE"; toast: Partial<ToastProps> & Pick<ToastProps, "id"> }
  | { type: "DISMISS"; toastId?: string }
  | { type: "REMOVE"; toastId?: string }

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const toastDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function clearToastDismissTimeout(toastId: string) {
  const timeout = toastDismissTimeouts.get(toastId)
  if (!timeout) return

  clearTimeout(timeout)
  toastDismissTimeouts.delete(toastId)
}

function scheduleAutoDismiss(toastId: string, durationMs: number) {
  clearToastDismissTimeout(toastId)

  const timeout = setTimeout(() => {
    toastDismissTimeouts.delete(toastId)
    dispatch({ type: "DISMISS", toastId })
  }, durationMs)

  toastDismissTimeouts.set(toastId, timeout)
}

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) return

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE", toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

function reducer(state: ToastProps[], action: ToastAction): ToastProps[] {
  switch (action.type) {
    case "ADD":
      return [action.toast, ...state].slice(0, TOAST_LIMIT)
    case "UPDATE":
      return state.map((toast) =>
        toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
      )
    case "DISMISS": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.forEach((toast) => addToRemoveQueue(toast.id))
      }

      return state.map((toast) =>
        toast.id === toastId || toastId === undefined
          ? { ...toast, open: false }
          : toast,
      )
    }
    case "REMOVE":
      if (action.toastId === undefined) return []
      clearToastDismissTimeout(action.toastId)
      return state.filter((toast) => toast.id !== action.toastId)
    default:
      return state
  }
}

const listeners: Array<(state: ToastProps[]) => void> = []
let memoryState: ToastProps[] = []

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

export function toast({
  title,
  description,
  variant = "default",
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
}) {
  const id = genId()

  dispatch({
    type: "ADD",
    toast: {
      id,
      title,
      description,
      variant,
      open: true,
    },
  })

  scheduleAutoDismiss(id, TOAST_DURATIONS_MS[variant])

  return {
    id,
    dismiss: () => {
      clearToastDismissTimeout(id)
      dispatch({ type: "DISMISS", toastId: id })
    },
  }
}

export function useToast() {
  const [state, setState] = React.useState<ToastProps[]>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    toasts: state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS", toastId }),
  }
}
