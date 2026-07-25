export function getModalRoot() {
  if (typeof document === "undefined") return undefined

  return document.getElementById("modal") ?? document.body
}
