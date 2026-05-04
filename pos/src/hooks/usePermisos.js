export function usePermisos(usuario) {
  const esAdmin      = usuario?.rol === 'admin'
  const esSupervisor = usuario?.rol === 'supervisor'
  const permisos     = usuario?.permisos || {}
  const puede = (clave) => esAdmin || permisos[clave] === true
  return { puede, esAdmin, esSupervisor }
}
