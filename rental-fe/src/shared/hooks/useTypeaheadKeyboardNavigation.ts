import { useState, type KeyboardEvent } from "react"

type UseTypeaheadKeyboardNavigationInput = {
  itemCount: number
  resetKey: string
  onDismiss: () => void
  onSelect: (index: number) => void
  onSubmit: () => void
}

export function useTypeaheadKeyboardNavigation({
  itemCount,
  resetKey,
  onDismiss,
  onSelect,
  onSubmit,
}: UseTypeaheadKeyboardNavigationInput) {
  const [activeOption, setActiveOption] = useState({ index: -1, resetKey })
  const activeIndex =
    activeOption.resetKey === resetKey && activeOption.index < itemCount
      ? activeOption.index
      : -1

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && itemCount > 0) {
      event.preventDefault()
      setActiveOption({ index: (activeIndex + 1) % itemCount, resetKey })
      return
    }

    if (event.key === "ArrowUp" && itemCount > 0) {
      event.preventDefault()
      setActiveOption({
        index: activeIndex <= 0 ? itemCount - 1 : activeIndex - 1,
        resetKey,
      })
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setActiveOption({ index: -1, resetKey })
      onDismiss()
      return
    }

    if (event.key !== "Enter") return

    event.preventDefault()
    if (activeIndex >= 0 && activeIndex < itemCount) {
      onSelect(activeIndex)
    } else {
      onSubmit()
    }
  }

  return { activeIndex, onKeyDown }
}
