import { useState, useEffect } from 'react'
import { api } from '../../api'

export function useConfigNegocios() {
  const [negocios, setNegocios] = useState([])
  const [configs, setConfigs]   = useState({})
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.listarNegocios().then(async ns => {
      if (!Array.isArray(ns)) return setCargando(false)
      setNegocios(ns)
      const map = {}
      await Promise.all(ns.map(async n => {
        try { map[n.id] = await api.obtenerConfigNegocio(n.id) }
        catch { map[n.id] = {} }
      }))
      setConfigs(map)
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  return { negocios, configs, cargando }
}
