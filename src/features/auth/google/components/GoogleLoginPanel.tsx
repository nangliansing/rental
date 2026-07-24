import { useState, type ReactNode } from "react"

import { ApiError } from "@/lib/api-client"

import { useGoogleLogin } from "../hooks/useGoogleLogin"
import { GoogleSignInButton } from "./GoogleSignInButton"

type GoogleLoginPanelProps = {
  description: string
  icon: ReactNode
  redirectTo: string
  title: string
}

export function GoogleLoginPanel({
  description,
  icon,
  redirectTo,
  title,
}: GoogleLoginPanelProps) {
  const googleLogin = useGoogleLogin(redirectTo)
  const [providerError, setProviderError] = useState("")
  const requestError =
    googleLogin.error instanceof ApiError
      ? googleLogin.error.message
      : googleLogin.error
        ? "Unable to sign in. Please try again."
        : ""
  const errorMessage = providerError || requestError

  const handleCredential = (credential: string) => {
    setProviderError("")
    googleLogin.reset()
    googleLogin.login(credential)
  }

  const handleProviderError = (message: string) => {
    googleLogin.reset()
    setProviderError(message)
  }

  return (
    <div className="w-full">
      <div className="mb-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          {icon}
        </div>

        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <GoogleSignInButton
        disabled={googleLogin.isPending}
        onCredential={handleCredential}
        onError={handleProviderError}
      />

      {googleLogin.isPending && (
        <p className="mt-3 text-center text-sm text-slate-500" aria-live="polite">
          Signing you in...
        </p>
      )}

      {errorMessage && (
        <p
          className="mt-3 text-center text-sm font-medium text-red-600"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <p className="mt-6 text-center text-xs leading-5 text-slate-500">
        Google is used only to confirm your identity and create your account.
      </p>
    </div>
  )
}
