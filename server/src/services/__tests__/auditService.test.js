const { registrar } = require('../auditService')

describe('auditService.registrar', () => {
  it('llama INSERT INTO audit_logs con los parámetros correctos', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] })
    const client = { query: mockQuery }

    await registrar(client, {
      usuario_id: 5,
      negocio_id: 1,
      accion: 'VENTA_CREADA',
      tabla: 'ventas',
      referencia_id: 42,
      antes: null,
      despues: { total: 150.00 },
      notas: 'test unitario',
    })

    expect(mockQuery).toHaveBeenCalledOnce()
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO audit_logs')
    expect(params[0]).toBe(5)           // usuario_id
    expect(params[1]).toBe(1)           // negocio_id
    expect(params[2]).toBe('VENTA_CREADA') // accion
    expect(params[4]).toBe(42)          // referencia_id
    expect(params[6]).toBe(JSON.stringify({ total: 150.00 })) // datos_despues
  })

  it('no inserta datos_antes cuando antes es null', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] })
    const client = { query: mockQuery }

    await registrar(client, { usuario_id: 1, negocio_id: 1, accion: 'TEST', tabla: 'test', referencia_id: 1 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toBeNull() // datos_antes
  })

  it('falla silenciosamente — nunca lanza si la query falla', async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error('connection lost')) }

    await expect(
      registrar(client, { usuario_id: 1, negocio_id: 1, accion: 'FAIL_TEST' })
    ).resolves.toBeUndefined()
  })
})
