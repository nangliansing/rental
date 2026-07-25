const BACKEND_URL = "https://rental-be.fly.dev"

export async function onRequest(context) {
  const url = new URL(context.request.url)

  if (url.pathname.startsWith("/api/")) {
    const target = new URL(url.pathname + url.search, BACKEND_URL)
    return fetch(new Request(target, context.request))
  }

  return context.next()
}
