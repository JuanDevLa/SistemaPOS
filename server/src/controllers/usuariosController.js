const bcrypt = require('bcrypt')
const pool = require('../db/client')
const audit = require('../services/auditService')

// Listar usuarios (cajeros y admins)
const listar = async (request, reply) => {
  const requester = request.user
  let { negocio_id, rol } = request.query

  // Supervisor solo ve cajeros de su negocio
  if (requester.rol === 'supervisor') {
    negocio_id = requester.negocio_id
    rol = 'cajero'
  } else if (requester.rol !== 'admin') {
    negocio_id = requester.negocio_id
  }

  let query = `
    SELECT u.id, u.nombre, u.rol, u.activo, u.creado_en,
           u.negocio_id, n.nombre AS negocio,
           COALESCE(u.permisos, '{}') AS permisos
    FROM usuarios u
    LEFT JOIN negocios n ON n.id = u.negocio_id
    WHERE 1=1`

  const params = []

  if (negocio_id) {
    params.push(negocio_id)
    query += ` AND u.negocio_id = $${params.length}`
  }
  if (rol) {
    params.push(rol)
    query += ` AND u.rol = $${params.length}`
  }

  query += ' ORDER BY u.rol, u.nombre ASC'

  try {
    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar usuarios' })
  }
}

// Crear usuario
const crear = async (request, reply) => {
  const requester = request.user
  const { nombre, rol, pin, password, negocio_id, permisos } = request.body

  if (!nombre || !rol) {
    return reply.code(400).send({ error: 'nombre y rol son requeridos' })
  }

  // Supervisor solo puede crear cajeros de su propio negocio
  if (requester.rol === 'supervisor') {
    if (rol !== 'cajero') {
      return reply.code(403).send({ error: 'Supervisor solo puede crear cajeros' })
    }
    if (parseInt(negocio_id) !== requester.negocio_id) {
      return reply.code(403).send({ error: 'Solo puedes crear cajeros de tu negocio' })
    }
  }

  const rolesConPin = ['cajero', 'supervisor']
  if (rolesConPin.includes(rol) && !pin) {
    return reply.code(400).send({ error: 'PIN requerido' })
  }
  if (rolesConPin.includes(rol) && !negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }
  if (rol === 'admin' && !password) {
    return reply.code(400).send({ error: 'contraseña requerida para administradores' })
  }

  try {
    const existe = await pool.query(
      'SELECT id FROM usuarios WHERE nombre = $1 AND negocio_id IS NOT DISTINCT FROM $2',
      [nombre, negocio_id || null]
    )
    if (existe.rows.length > 0) {
      return reply.code(400).send({ error: 'Ya existe un usuario con ese nombre en este negocio' })
    }

    const password_hash = rol === 'admin' ? await bcrypt.hash(password, 10) : null
    const pin_hash = pin ? await bcrypt.hash(pin, 10) : null
    const permisosFinales = (rolesConPin.includes(rol) && permisos && typeof permisos === 'object') ? permisos : {}

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, rol, pin_hash, password_hash, negocio_id, permisos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, rol, activo, creado_en, negocio_id, permisos`,
      [nombre, rol, pin_hash, password_hash, negocio_id || null, JSON.stringify(permisosFinales)]
    )

    return reply.code(201).send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear usuario' })
  }
}

// Editar usuario (nombre, PIN o contraseña)
const editar = async (request, reply) => {
  const { id } = request.params
  const { nombre, pin, password, negocio_id, permisos } = request.body

  try {
    const usuario = await pool.query('SELECT id, rol FROM usuarios WHERE id = $1', [id])
    if (usuario.rows.length === 0) {
      return reply.code(404).send({ error: 'Usuario no encontrado' })
    }

    const rol = usuario.rows[0].rol
    const campos = []
    const params = []

    if (nombre) {
      params.push(nombre)
      campos.push(`nombre = $${params.length}`)
    }
    if (pin && rol === 'cajero') {
      const hashPin = await bcrypt.hash(pin, 10)
      params.push(hashPin)
      campos.push(`pin_hash = $${params.length}`)
      campos.push('pin = NULL')
    }
    if (password && rol === 'admin') {
      const hash = await bcrypt.hash(password, 10)
      params.push(hash)
      campos.push(`password_hash = $${params.length}`)
    }
    if (negocio_id !== undefined && rol === 'cajero') {
      params.push(negocio_id)
      campos.push(`negocio_id = $${params.length}`)
    }
    let permisosCambiaron = false
    let permisosAntes = null
    if (permisos !== undefined && ['cajero', 'supervisor'].includes(rol) && typeof permisos === 'object') {
      const prev = await pool.query('SELECT permisos FROM usuarios WHERE id = $1', [id])
      permisosAntes = prev.rows[0]?.permisos || {}
      permisosCambiaron = true
      params.push(JSON.stringify(permisos))
      campos.push(`permisos = $${params.length}`)
    }

    if (campos.length === 0) {
      return reply.code(400).send({ error: 'Nada que actualizar' })
    }

    params.push(id)
    const result = await pool.query(
      `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${params.length}
       RETURNING id, nombre, rol, activo, negocio_id, COALESCE(permisos, '{}') AS permisos`,
      params
    )

    if (permisosCambiaron) {
      await audit.registrar(pool, {
        usuario_id: request.user?.id,
        negocio_id: result.rows[0].negocio_id,
        accion: 'permisos_modificados',
        tabla: 'usuarios',
        referencia_id: parseInt(id),
        antes: { permisos: permisosAntes },
        despues: { permisos }
      })
    }

    return reply.send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al editar usuario' })
  }
}

// Desactivar / reactivar
const toggleActivo = async (request, reply) => {
  const { id } = request.params

  try {
    const result = await pool.query(
      `UPDATE usuarios SET activo = NOT activo WHERE id = $1
       RETURNING id, nombre, activo`,
      [id]
    )
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Usuario no encontrado' })
    }
    return reply.send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar usuario' })
  }
}

module.exports = { listar, crear, editar, toggleActivo }
