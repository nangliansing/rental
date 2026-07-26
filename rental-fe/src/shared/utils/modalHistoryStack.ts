export const MODAL_HISTORY_STATE_KEY = "__rentalModal"

type StackEntry = {
  token: symbol
  onClose: () => void
  tracksHistory: boolean
  historyActive: boolean
}

const stack: StackEntry[] = []
let listenerAttached = false
let suppressNextPopstate = false

function attachListener() {
  if (listenerAttached || typeof window === "undefined") return
  listenerAttached = true
  window.addEventListener("popstate", handlePopstate)
}

function removeEntry(token: symbol) {
  const index = stack.findIndex((entry) => entry.token === token)
  if (index >= 0) stack.splice(index, 1)
}

function findEntry(token: symbol) {
  return stack.find((entry) => entry.token === token)
}

function handlePopstate() {
  if (suppressNextPopstate) {
    suppressNextPopstate = false
    return
  }

  const top = stack.at(-1)
  if (!top?.tracksHistory || !top.historyActive) return

  top.historyActive = false
  removeEntry(top.token)
  top.onClose()
}

export function isTopStackEntry(token: symbol) {
  return stack.at(-1)?.token === token
}

export function registerStackEntry({
  token,
  onClose,
  tracksHistory,
}: {
  token: symbol
  onClose: () => void
  tracksHistory: boolean
}): () => void {
  attachListener()

  const entry: StackEntry = {
    token,
    onClose,
    tracksHistory,
    historyActive: false,
  }

  if (tracksHistory && typeof window !== "undefined") {
    window.history.pushState({ [MODAL_HISTORY_STATE_KEY]: true }, "")
    entry.historyActive = true
  }

  stack.push(entry)

  return () => {
    const current = findEntry(token)
    if (!current) return

    if (current.tracksHistory && current.historyActive) {
      current.historyActive = false
      removeEntry(token)
      suppressNextPopstate = true
      window.history.back()
      return
    }

    removeEntry(token)
  }
}

export function requestStackClose(token: symbol) {
  const index = stack.findIndex((entry) => entry.token === token)
  if (index < 0 || index !== stack.length - 1) return

  const entry = stack[index]!

  if (entry.tracksHistory && entry.historyActive) {
    entry.historyActive = false
    removeEntry(token)
    entry.onClose()
    suppressNextPopstate = true
    window.history.back()
    return
  }

  removeEntry(token)
  entry.onClose()
}

export function __resetModalHistoryStackForTests() {
  stack.length = 0
  suppressNextPopstate = false
}
