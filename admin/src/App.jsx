import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ProductosPage from './pages/ProductosPage'
import DashboardPage from './pages/DashboardPage'
import InventarioPage from './pages/InventarioPage'
import VentasPage from './pages/VentasPage'
import CortesPage from './pages/CortesPage'
import UsuariosPage from './pages/UsuariosPage'
import MovimientosPage from './pages/MovimientosPage'
import DepartamentosPage from './pages/DepartamentosPage'
import ClientesPage from './pages/ClientesPage'
import ConfiguracionPage from './pages/ConfiguracionPage'
import CaducidadesPage from './pages/CaducidadesPage'
import ReportesPage from './pages/ReportesPage'
import AuditLogPage from './pages/AuditLogPage'

function PrivateRoute({ children }) {
  const { usuario } = useAuth()
  return usuario ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { usuario } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/inventario" element={<InventarioPage />} />
              <Route path="/ventas" element={<VentasPage />} />
              <Route path="/cortes" element={<CortesPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/movimientos" element={<MovimientosPage />} />
              <Route path="/departamentos" element={<DepartamentosPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/auditoria"   element={<AuditLogPage />} />
              <Route path="/caducidades" element={<CaducidadesPage />} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
