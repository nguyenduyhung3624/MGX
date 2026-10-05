export type AuthUser = {
  id: string
  email: string
  displayName: string
}

export type AuthSession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: {
    display_name?: string
    full_name?: string
  }
}

type SupabaseAuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: SupabaseUser | null
  msg?: string
  message?: string
  error_description?: string
}

export type SignUpResult = {
  user: AuthUser
  needsEmailConfirmation: boolean
}

const SESSION_KEY = 'mgx-auth-session-v1'
const AUTH_EVENT = 'mgx-auth-change'

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const getConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new AuthError('Authentication is not configured.')
  }

  return { url, anonKey }
}

const emitAuthChange = () => {
  window.dispatchEvent(new Event(AUTH_EVENT))
}

const mapUser = (user: SupabaseUser): AuthUser => {
  const email = user.email?.trim() ?? ''
  const displayName =
    user.user_metadata?.display_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    email.split('@')[0] ||
    'Reader'

  return { id: user.id, email, displayName }
}

const request = async (
  path: string,
  init: RequestInit,
  accessToken?: string
): Promise<SupabaseAuthResponse> => {
  const { url, anonKey } = getConfig()
  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const data = (await response.json().catch(() => ({}))) as SupabaseAuthResponse
  if (!response.ok) {
    throw new AuthError(data.msg || data.message || data.error_description || 'Authentication request failed.')
  }
  return data
}

const saveSession = (data: SupabaseAuthResponse): AuthSession => {
  if (!data.access_token || !data.refresh_token || !data.user) {
    throw new AuthError('The authentication server returned an incomplete session.')
  }

  const session: AuthSession = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    user: mapUser(data.user),
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  emitAuthChange()
  return session
}

export const getAuthSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session?.accessToken || !session?.refreshToken || !session?.user?.id) return null
    return session
  } catch {
    return null
  }
}

export const getCurrentUser = (): AuthUser | null => getAuthSession()?.user ?? null

export const signUp = async (
  displayName: string,
  email: string,
  password: string
): Promise<SignUpResult> => {
  const data = await request('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: { display_name: displayName.trim() },
    }),
  })

  if (!data.user) throw new AuthError('Unable to create the account.')

  if (data.access_token && data.refresh_token) {
    const session = saveSession(data)
    return { user: session.user, needsEmailConfirmation: false }
  }

  return { user: mapUser(data.user), needsEmailConfirmation: true }
}

export const signIn = async (email: string, password: string): Promise<AuthSession> => {
  const data = await request('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  return saveSession(data)
}

export const signOut = async (): Promise<void> => {
  const session = getAuthSession()
  try {
    if (session?.accessToken) {
      await request('/logout', { method: 'POST' }, session.accessToken)
    }
  } finally {
    localStorage.removeItem(SESSION_KEY)
    emitAuthChange()
  }
}

export const subscribeAuth = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SESSION_KEY) listener()
  }

  window.addEventListener(AUTH_EVENT, listener)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(AUTH_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}
