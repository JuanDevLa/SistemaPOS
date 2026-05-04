import { useRef } from 'react'

const ORDER = ['nombre','apellidos','telefono','email','domicilio1','domicilio2','colonia','municipio','codigo_postal','notas']

export function useFieldNavigation(onLastField) {
  const refs = {
    nombre:        useRef(),
    apellidos:     useRef(),
    telefono:      useRef(),
    email:         useRef(),
    domicilio1:    useRef(),
    domicilio2:    useRef(),
    colonia:       useRef(),
    municipio:     useRef(),
    codigo_postal: useRef(),
    notas:         useRef(),
  }

  const focusNext = (current) => {
    const idx = ORDER.indexOf(current)
    if (idx >= 0 && idx < ORDER.length - 1) {
      refs[ORDER[idx + 1]]?.current?.focus()
    } else {
      onLastField?.()
    }
  }

  return { refs, focusNext }
}
