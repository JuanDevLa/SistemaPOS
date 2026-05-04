import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const u = localStorage.getItem('admin_usuario')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  })

  const login = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('admin_usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin_usuario')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
