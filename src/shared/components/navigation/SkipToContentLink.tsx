import type { MouseEvent } from "react"

const MAIN_CONTENT_ID = "main-content"

export function SkipToContentLink() {
  const focusMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const mainContent = document.getElementById(MAIN_CONTENT_ID)
    if (!mainContent) return

    event.preventDefault()
    mainContent.focus()
  }

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed left-4 top-4 z-[2000] -translate-y-24 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      onClick={focusMainContent}
    >
      Skip to main content
    </a>
  )
}

export { MAIN_CONTENT_ID }
