'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userProfile: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, fullName: string) => Promise<any>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<any>
  logActivity: (action: string, entityType: string, entityId?: string, details?: any) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
        updateLastLogin(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
        if (_event === 'SIGNED_IN') {
          updateLastLogin(session.user.id)
        }
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    setUserProfile(data)
    setLoading(false)
  }

  async function updateLastLogin(userId: string) {
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)
  }

  async function signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    
    if (result.data.user) {
      await logActivity('user_login', 'auth', result.data.user.id)
    }
    
    return result
  }

  async function signUp(email: string, password: string, fullName: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
  }

  async function signOut() {
    if (user) {
      await logActivity('user_logout', 'auth', user.id)
    }
    await supabase.auth.signOut()
  }

  async function resetPassword(email: string) {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
  }

  async function logActivity(
    action: string,
    entityType: string,
    entityId?: string,
    details?: any
  ) {
    if (!user) return

    try {
      await supabase.rpc('log_activity', {
        p_user_id: user.id,
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId || null,
        p_details: details || null
      })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      logActivity
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}