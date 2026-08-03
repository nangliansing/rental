type ApiClientResponse<T> = {
  data: T
}

type RequestBody = unknown

type ApiErrorData = {
  code?: string
  message?: string
}

type RefreshAccessTokenResponse = {
  success: true
  data: {
    accessToken: string
  }
}

let accessToken: string | null = null
let refreshAccessTokenPromise: Promise<string> | null = null
const authInvalidationListeners = new Set<() => void>()

function invalidateAuthSession() {
  accessToken = null
  authInvalidationListeners.forEach((listener) => listener())
}

export function subscribeToAuthInvalidation(listener: () => void) {
  authInvalidationListeners.add(listener)

  return () => {
    authInvalidationListeners.delete(listener)
  }
}

const friendlyErrorMessages: Record<string, string> = {
  AGENT_PROFILE_ALREADY_EXISTS: 'You already have a profile.',
  AGENT_PROFILE_REQUIRED: 'Create an agent profile before continuing.',
  ACCESS_TOKEN_REQUIRED: 'Please log in to continue.',
  ACCOUNT_INACTIVE: 'Your account is inactive.',
  ACCOUNT_SUSPENDED: 'Your account is suspended.',
  ACCOUNT_LINK_REQUIRED: 'An account already exists with this email.',
  ACCOUNT_UNAVAILABLE: 'This account is no longer available.',
  INVALID_GOOGLE_CREDENTIAL: 'Google sign-in could not be completed.',
  INVALID_ACCESS_TOKEN: 'Your session expired. Please log in again.',
  REFRESH_TOKEN_REQUIRED: 'Please log in to continue.',
  INVALID_REFRESH_TOKEN: 'Your session expired. Please log in again.',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait and try again.',
  BUILDING_NOT_FOUND: 'This building could not be found.',
  BUILDING_INACTIVE: 'This building is not active.',
  BUILDING_EDIT_REQUEST_ALREADY_PENDING: 'You already have a pending edit request for this building.',
  NO_BUILDING_CHANGES: 'Change at least one building detail first.',
  BUILDING_EDIT_REQUEST_NOT_FOUND: 'This building edit request is no longer available.',
  BUILDING_EDIT_REQUEST_NOT_PENDING: 'This building edit request has already been reviewed.',
  LISTING_NOT_FOUND: 'This listing could not be found.',
  CLIENT_REQUEST_NOT_FOUND: 'This client request could not be found.',
  CLIENT_REQUEST_CLOSED: 'This client request is already closed.',
  NO_VALID_CHANGE: 'Make at least one change before saving.',
  PENDING_POST_NOT_FOUND: 'This pending submission could not be found.',
  REPORT_ALREADY_OPEN: 'You already reported this listing. Our team will review it.',
  REVIEW_REPORT_ALREADY_EXISTS: 'You already reported this review. Our team will review it.',
  REVIEW_REPORT_NOT_FOUND: 'This review report is no longer available.',
  REVIEW_REPORT_NOT_OPEN: 'This review report has already been reviewed.',
  REVIEW_REPORT_SELF_NOT_ALLOWED: 'You cannot report your own review.',
  REVIEW_NOT_FOUND: 'This review is no longer available.',
  LISTER_REVIEW_NOT_FOUND: 'This review is no longer available.',
  LISTER_REVIEW_OWNER_REQUIRED: 'You can only moderate reviews on your own profile.',
  SAVED_LISTING_ALREADY_EXISTS: 'This listing is already saved.',
  SAVED_LISTING_NOT_FOUND: 'This listing is not saved.',
  BUILDING_ALREADY_FOLLOWED: 'You are already following this building.',
  BUILDING_FOLLOW_NOT_FOUND: 'You are not following this building.',
  GEOCODE_NOT_FOUND: 'No address was found for this location.',
  GEOCODE_UNAVAILABLE: 'Address lookup is temporarily unavailable. Please try again.',
  GEOCODE_DISABLED: 'Address lookup is currently unavailable.',
  GEOCODE_NOT_CONFIGURED: 'Address lookup is not configured on the server. Enter the address manually.',
  GEOCODE_REQUEST_DENIED: 'Address lookup is blocked by Google API key restrictions. Enter the address manually.',
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text) return {} as T

  return JSON.parse(text) as T
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function getErrorCode(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string'
  ) {
    return data.code
  }

  return undefined
}

function getErrorMessage(data: unknown, status: number) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    typeof data.code === 'string' &&
    friendlyErrorMessages[data.code]
  ) {
    return friendlyErrorMessages[data.code]
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  if (status === 409) {
    return 'This already exists.'
  }

  return `Request failed with status code ${status}`
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function readAccessToken(data: unknown) {
  const body = readRecord(data)
  const responseData = readRecord(body.data)
  const nextAccessToken = responseData.accessToken

  return typeof nextAccessToken === 'string' ? nextAccessToken : ''
}

async function requestNewAccessToken() {
  const response = await fetch('/api/v1/users/token/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  const data = await parseJsonResponse<RefreshAccessTokenResponse>(response)

  if (!response.ok) {
    invalidateAuthSession()
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      getErrorCode(data),
    )
  }

  const nextAccessToken = readAccessToken(data)

  if (!nextAccessToken) {
    invalidateAuthSession()
    throw new ApiError(
      'Your session expired. Please log in again.',
      401,
      'INVALID_REFRESH_RESPONSE',
    )
  }

  accessToken = nextAccessToken

  return accessToken
}

async function refreshAccessToken() {
  refreshAccessTokenPromise ??= requestNewAccessToken().finally(() => {
    refreshAccessTokenPromise = null
  })

  return refreshAccessTokenPromise
}

export function setAccessToken(token: string | null) {
  const normalizedToken = typeof token === 'string' ? token.trim() : ''
  accessToken = normalizedToken || null
}

export function getAccessToken() {
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  body?: RequestBody,
  retryAfterRefresh = true,
  signal?: AbortSignal,
): Promise<ApiClientResponse<T>> {
  const response = await fetch(`/api/v1${url}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  })

  const data = await parseJsonResponse<T | ApiErrorData>(response)

  if (response.status === 401 && retryAfterRefresh) {
    await refreshAccessToken()
    return request<T>(method, url, body, false, signal)
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      getErrorCode(data),
    )
  }

  return { data: data as T }
}

async function get<T>(
  url: string,
  retryAfterRefreshOrOptions:
    | boolean
    | { signal?: AbortSignal } = true,
  signal?: AbortSignal,
) {
  const retryAfterRefresh =
    typeof retryAfterRefreshOrOptions === 'boolean'
      ? retryAfterRefreshOrOptions
      : true
  const requestSignal =
    typeof retryAfterRefreshOrOptions === 'boolean'
      ? signal
      : retryAfterRefreshOrOptions.signal

  return request<T>('GET', url, undefined, retryAfterRefresh, requestSignal)
}

async function post<T>(
  url: string,
  body: RequestBody = {},
  retryAfterRefresh = true,
  signal?: AbortSignal,
): Promise<ApiClientResponse<T>> {
  return request<T>('POST', url, body, retryAfterRefresh, signal)
}

async function patch<T>(
  url: string,
  body: RequestBody = {},
  retryAfterRefresh = true,
): Promise<ApiClientResponse<T>> {
  return request<T>('PATCH', url, body, retryAfterRefresh)
}

async function deleteRequest<T>(
  url: string,
  body?: RequestBody,
  retryAfterRefresh = true,
  signal?: AbortSignal,
) {
  return request<T>('DELETE', url, body, retryAfterRefresh, signal)
}

export const apiClient = {
  delete: deleteRequest,
  get,
  patch,
  post,
}
