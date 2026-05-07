import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCart } from '../useCart'

vi.mock('../../api', () => ({ api: {} }))

const prod = (overrides = {}) => ({
  id: 1,
  nombre: 'Paracetamol 500mg',
  codigo_barras: '7501030472006',
  precio: 10.00,
  precio_mayoreo: 7.50,
  stock_actual: 20,
  ...overrides,
})

beforeEach(() => {
  vi.stubGlobal('dbAPI', {
    getStockProducto: vi.fn().mockResolvedValue({ cantidad: 20 }),
    getApiUrl: vi.fn().mockResolvedValue('http://localhost:3001'),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCart — agregar productos', () => {
  it('agrega un producto nuevo al carrito', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => {
      await result.current.agregarAlCarrito(prod())
    })

    expect(result.current.carrito).toHaveLength(1)
    expect(result.current.carrito[0].nombre).toBe('Paracetamol 500mg')
    expect(result.current.carrito[0].cantidad).toBe(1)
    expect(result.current.total).toBe(10.00)
  })

  it('acumula cantidad si el producto ya existe', async () => {
    const { result } = renderHook(() => useCart(1))
    const p = prod()

    await act(async () => { await result.current.agregarAlCarrito(p) })
    await act(async () => { await result.current.agregarAlCarrito(p) })

    expect(result.current.carrito).toHaveLength(1)
    expect(result.current.carrito[0].cantidad).toBe(2)
    expect(result.current.total).toBeCloseTo(20.00)
  })

  it('devuelve error si stock es 0', async () => {
    vi.stubGlobal('dbAPI', {
      getStockProducto: vi.fn().mockResolvedValue({ cantidad: 0 }),
    })
    const { result } = renderHook(() => useCart(1))

    let err
    await act(async () => {
      err = await result.current.agregarAlCarrito(prod({ stock_actual: null }))
    })

    expect(err).toMatchObject({ error: expect.stringContaining('Sin existencia') })
    expect(result.current.carrito).toHaveLength(0)
  })
})

describe('useCart — cantidades', () => {
  it('cambiarCantidad nunca baja de 1', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => { await result.current.agregarAlCarrito(prod()) })
    act(() => { result.current.cambiarCantidad(1, -5) })

    expect(result.current.carrito[0].cantidad).toBe(1)
  })

  it('cambiarCantidad incrementa correctamente', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => { await result.current.agregarAlCarrito(prod()) })
    act(() => { result.current.cambiarCantidad(1, 3) })

    expect(result.current.carrito[0].cantidad).toBe(4)
    expect(result.current.total).toBeCloseTo(40.00)
  })
})

describe('useCart — descuentos', () => {
  it('descuento global en % aplica sobre el subtotal', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => { await result.current.agregarAlCarrito(prod()) })
    act(() => { result.current.aplicarDescuentoGlobal('%', 10) })

    expect(result.current.descuentoMonto).toBeCloseTo(1.00)
    expect(result.current.total).toBeCloseTo(9.00)
  })

  it('aplicarMayoreo + descuento global se combinan', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => { await result.current.agregarAlCarrito(prod()) })
    // Mayoreo -25% → precio 7.50
    act(() => { result.current.aplicarMayoreo(25, 1) })
    // Descuento global 10% sobre 7.50 → 0.75
    act(() => { result.current.aplicarDescuentoGlobal('%', 10) })

    expect(result.current.subtotal).toBeCloseTo(7.50)
    expect(result.current.descuentoMonto).toBeCloseTo(0.75)
    expect(result.current.total).toBeCloseTo(6.75)
  })
})

describe('useCart — multi-ticket', () => {
  it('ticket B no afecta el carrito del ticket A', async () => {
    const { result } = renderHook(() => useCart(1))

    await act(async () => { await result.current.agregarAlCarrito(prod()) })
    act(() => { result.current.nuevoTicket('Cliente 2') })
    await act(async () => {
      await result.current.agregarAlCarrito(prod({ id: 2, nombre: 'Ibuprofeno', precio: 15 }))
    })

    const ticketA = result.current.tickets.find(t => t.id === 1)
    const ticketB = result.current.tickets[result.current.tickets.length - 1]

    expect(ticketA.carrito).toHaveLength(1)
    expect(ticketA.carrito[0].nombre).toBe('Paracetamol 500mg')
    expect(ticketB.carrito).toHaveLength(1)
    expect(ticketB.carrito[0].nombre).toBe('Ibuprofeno')
  })
})
