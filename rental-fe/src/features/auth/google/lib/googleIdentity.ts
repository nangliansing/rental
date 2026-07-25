import type {
  GoogleCredentialResponse,
  GoogleIdentityApi,
} from "../types"

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client"
const GOOGLE_IDENTITY_SCRIPT_SELECTOR = "script[data-google-identity]"
const SCRIPT_LOAD_TIMEOUT_MS = 15_000

let googleIdentityScriptPromise: Promise<GoogleIdentityApi> | null = null
let initializedClientId: string | null = null
let credentialHandler:
  | ((response: GoogleCredentialResponse) => void)
  | null = null

const readGoogleIdentityApi = () => window.google?.accounts?.id ?? null

const waitForGoogleIdentityScript = () => {
  const loadedApi = readGoogleIdentityApi()

  if (loadedApi) return Promise.resolve(loadedApi)
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise

  googleIdentityScriptPromise = new Promise<GoogleIdentityApi>(
    (resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>(
        GOOGLE_IDENTITY_SCRIPT_SELECTOR,
      )
      let shouldAppendScript = false

      const timeoutId = window.setTimeout(() => {
        cleanup()
        googleIdentityScriptPromise = null
        reject(new Error("Google Identity Services took too long to load"))
      }, SCRIPT_LOAD_TIMEOUT_MS)

      const cleanup = () => {
        window.clearTimeout(timeoutId)
        script?.removeEventListener("load", handleLoad)
        script?.removeEventListener("error", handleError)
      }

      const handleLoad = () => {
        const api = readGoogleIdentityApi()
        cleanup()

        if (!api) {
          googleIdentityScriptPromise = null
          reject(new Error("Google Identity Services is unavailable"))
          return
        }

        resolve(api)
      }

      const handleError = () => {
        cleanup()
        googleIdentityScriptPromise = null
        script?.remove()
        reject(new Error("Google Identity Services could not be loaded"))
      }

      if (!script) {
        script = document.createElement("script")
        script.src = GOOGLE_IDENTITY_SCRIPT_URL
        script.async = true
        script.defer = true
        script.dataset.googleIdentity = "true"
        shouldAppendScript = true
      }

      script.addEventListener("load", handleLoad, { once: true })
      script.addEventListener("error", handleError, { once: true })

      if (shouldAppendScript) {
        document.head.appendChild(script)
      } else if (readGoogleIdentityApi()) {
        queueMicrotask(handleLoad)
      }
    },
  )

  return googleIdentityScriptPromise
}

export const initializeGoogleIdentity = async (clientId: string) => {
  const normalizedClientId = clientId.trim()

  if (!normalizedClientId) {
    throw new Error("Google sign-in is not configured")
  }

  const api = await waitForGoogleIdentityScript()

  if (initializedClientId && initializedClientId !== normalizedClientId) {
    throw new Error("Google sign-in was initialized with another client")
  }

  if (!initializedClientId) {
    api.initialize({
      client_id: normalizedClientId,
      callback: (response) => credentialHandler?.(response),
      cancel_on_tap_outside: true,
    })
    initializedClientId = normalizedClientId
  }

  return api
}

export const setGoogleCredentialHandler = (
  handler: ((response: GoogleCredentialResponse) => void) | null,
) => {
  credentialHandler = handler
}

export const disableGoogleAutoSelect = () => {
  readGoogleIdentityApi()?.disableAutoSelect()
}
