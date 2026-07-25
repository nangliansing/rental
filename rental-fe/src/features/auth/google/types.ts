import type { AuthUser } from "../types"

export type LoginWithGoogleInput = {
  credential: string
}

export type LoginWithGoogleResult = {
  user: AuthUser
  accessToken: string
  isNewUser: boolean
}

export type GoogleCredentialResponse = {
  credential: string
  select_by: string
}

export type GoogleButtonOptions = {
  type?: "standard" | "icon"
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  logo_alignment?: "left" | "center"
  width?: number
}

export type GoogleIdentityApi = {
  initialize: (configuration: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id: GoogleIdentityApi
      }
    }
  }
}
