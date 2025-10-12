import * as React from 'react'

import { sleep } from './utils'
import type { AuthTokenResponsePassword } from '@supabase/supabase-js'

export interface AuthContext {
  isAuthenticated: boolean
  login: (userData: AuthTokenResponsePassword["data"]) => Promise<void>
  logout: () => Promise<void>
  user: AuthTokenResponsePassword["data"] | null
}

const AuthContext = React.createContext<AuthContext | null>(null)

const key = 'tanstack.auth.user'

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') as AuthTokenResponsePassword["data"] | null
  } catch (error) {
    console.error('Error parsing stored user:', error)  
    return null
  }
}

function setStoredUser(user: AuthTokenResponsePassword["data"] | null) {
  if (user) {
    localStorage.setItem(key, JSON.stringify(user))
  } else {
    localStorage.removeItem(key)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthTokenResponsePassword["data"] | null>(getStoredUser())
  const isAuthenticated = !!user

  const logout = React.useCallback(async () => {

    setStoredUser(null)
    setUser(null)
  }, [])

  const login = React.useCallback(async (username: AuthTokenResponsePassword["data"]) => {

    setStoredUser(username)
    setUser(username)
  }, [])

  React.useEffect(() => {
    setUser(getStoredUser())
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
