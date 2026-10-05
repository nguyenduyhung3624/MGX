import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthUser = {
  id: string
  email: string
  displayName: string
}

export type SignUpResult = {
  user: AuthUser
  needsEmailConfirmation: boolean
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

const mapUser = (user: User): AuthUser => {
  const email = user.email?.trim() ?? ''
  const displayName =
    (typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name.trim()
      : '') ||
    (typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '') ||
    email.split('@')[0] ||
    'Reader'

  return {
    id: user.id,
    email,
    displayName,
  }
}

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new AuthError(error.message)
  }

  return data.session?.user ? mapUser(data.session.user) : null
}

export const signUp = async (
  displayName: string,
  email: string,
  password: string
): Promise<SignUpResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        display_name: displayName.trim(),
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  })

  if (error) {
    throw new AuthError(error.message)
  }

  if (!data.user) {
    throw new AuthError('Unable to create the account.')
  }

  return {
    user: mapUser(data.user),
    needsEmailConfirmation: !data.session,
  }
}

export const signIn = async (email: string, password: string): Promise<AuthUser> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    throw new AuthError(error.message)
  }

  if (!data.user) {
    throw new AuthError('Unable to sign in.')
  }

  return mapUser(data.user)
}

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    const localResult = await supabase.auth.signOut({ scope: 'local' })
    if (localResult.error) {
      throw new AuthError(error.message)
    }
  }
}

export const subscribeAuth = (listener: (user: AuthUser | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user ? mapUser(session.user) : null)
  })

  return () => data.subscription.unsubscribe()
}
