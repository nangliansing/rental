const LOCAL_SOCKET_URL = "http://localhost:3000"

export function getSocketUrl(): string | null {
  const configured = import.meta.env.VITE_SOCKET_URL?.trim()

  if (configured) {
    return configured
  }

  if (import.meta.env.DEV) {
    return LOCAL_SOCKET_URL
  }

  return null
}
