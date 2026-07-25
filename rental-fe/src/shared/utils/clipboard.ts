export async function copyTextToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(value)
            return
        } catch {
            // Fall back for browsers or contexts where Clipboard API is blocked.
        }
    }

    const textArea = document.createElement("textarea")
    textArea.value = value
    textArea.setAttribute("readonly", "")
    textArea.style.position = "fixed"
    textArea.style.top = "-9999px"

    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand("copy")
    document.body.removeChild(textArea)
}
