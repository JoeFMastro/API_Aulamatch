import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Asignaciones from './pages/Asignaciones'
import Conflictos from './pages/Conflictos'
import Reportes from './pages/Reportes'
import Perfil from './pages/Perfil'

/** Ruta protegida: redirige a /login si no hay token */
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

/** Ruta pública: redirige a /asignaciones si ya está autenticado */
function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/asignaciones" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/asignaciones"
        element={
          <ProtectedRoute>
            <Asignaciones />
          </ProtectedRoute>
        }
      />
      <Route
        path="/conflictos"
        element={
          <ProtectedRoute>
            <Conflictos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute>
            <Reportes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      {/* Redirect raíz → asignaciones */}
      <Route path="/" element={<Navigate to="/asignaciones" replace />} />
      <Route path="*" element={<Navigate to="/asignaciones" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
