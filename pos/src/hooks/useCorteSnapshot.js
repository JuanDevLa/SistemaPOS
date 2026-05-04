import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

export function useCorteSnapshot({ usuario, tipo = 'cajero', corteId }) {
  const [snapshot, setSnapshot] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await api.obtenerSnapshotCorte({
        negocio_id: usuario.negocio_id,
        cajero_id: tipo === 'cajero' ? usuario.id : undefined,
        tipo,
      })
      setSnapshot(data)
    } catch (e) {
      setError(e.message || 'Error al cargar corte')
      setSnapshot(null)
    } finally {
      setCargando(false)
    }
  }, [usuario.id, usuario.negocio_id, tipo, corteId])

  useEffect(() => { cargar() }, [cargar])

  return { snapshot, cargando, error, recargar: cargar }
}
