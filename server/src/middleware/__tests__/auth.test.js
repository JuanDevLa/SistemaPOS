// Mock tokenRevokeService antes de cargar auth.js para evitar efecto secundario
vi.mock('../../services/tokenRevokeService', () => ({
  isRevoked: vi.fn().mockReturnValue(false),
}))

const { verifyPermiso } = require('../auth')

const makeReply = () => {
  const r = { code: vi.fn(), send: vi.fn() }
  r.code.mockReturnValue(r)
  r.send.mockReturnValue(r)
  return r
}

describe('verifyPermiso', () => {
  it('pasa sin tocar reply si el usuario es admin', async () => {
    const req = { user: { rol: 'admin' }, headers: {} }
    const reply = makeReply()

    await verifyPermiso('cobrar_ticket')(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('pasa si el cajero tiene el permiso exacto', async () => {
    const req = {
      user: { rol: 'cajero', permisos: { cobrar_ticket: true } },
      headers: {},
    }
    const reply = makeReply()

    await verifyPermiso('cobrar_ticket')(req, reply)

    expect(reply.code).not.toHaveBeenCalled()
  })

  it('retorna 403 si el cajero no tiene el permiso', async () => {
    const req = {
      user: { rol: 'cajero', permisos: {} },
      headers: {},
    }
    const reply = makeReply()

    await verifyPermiso('cobrar_ticket')(req, reply)

    expect(reply.code).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith({ error: 'Sin permiso: cobrar_ticket' })
  })

  it('retorna 401 si no hay user en request', async () => {
    const req = { user: null, headers: {} }
    const reply = makeReply()

    await verifyPermiso('cobrar_ticket')(req, reply)

    expect(reply.code).toHaveBeenCalledWith(401)
  })

  it('permiso false en el objeto no cuenta como autorizado', async () => {
    const req = {
      user: { rol: 'cajero', permisos: { cobrar_ticket: false } },
      headers: {},
    }
    const reply = makeReply()

    await verifyPermiso('cobrar_ticket')(req, reply)

    expect(reply.code).toHaveBeenCalledWith(403)
  })
})
