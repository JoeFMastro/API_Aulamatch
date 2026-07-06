import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('aulamatch_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (email, password) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.login(email, password)
      localStorage.setItem('aulamatch_token', data.token)
      const userData = {
        email,
        nombre: data.nombre || email.split('@')[0],
        rol: data.rol || 'COORDINADOR',
      }
      localStorage.setItem('aulamatch_user', JSON.stringify(userData))
      setUser(userData)
      return true
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('aulamatch_token')
    localStorage.removeItem('aulamatch_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
