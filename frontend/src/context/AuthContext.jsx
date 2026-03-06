import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount: if a token exists, fetch the current user
  useEffect(() => {
    const token = localStorage.getItem('hd_token')
    if (!token) { setLoading(false); return }
    getMe()
      .then(u => setUser(u))
      .catch(() => { localStorage.removeItem('hd_token'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('hd_token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('hd_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
