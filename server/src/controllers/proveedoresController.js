const pool = require('../db/client')

const listar = async (request, reply) => {
  try {
    const res = await pool.query(
      `SELECT id, nombre, contacto, telefono, email, notas, activo
       FROM proveedores WHERE activo = true ORDER BY nombre ASC`
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar proveedores' })
  }
}

const crear = async (request, reply) => {
  const { nombre, contacto, telefono, email, notas } = request.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'El nombre es requerido' })
  try {
    const res = await pool.query(
      `INSERT INTO proveedores (nombre, contacto, telefono, email, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre.trim(), contacto || null, telefono || null, email || null, notas || null]
    )
    return reply.code(201).send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear proveedor' })
  }
}

const editar = async (request, reply) => {
  const { id } = request.params
  const { nombre, contacto, telefono, email, notas } = request.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'El nombre es requerido' })
  try {
    const res = await pool.query(
      `UPDATE proveedores SET nombre=$1, contacto=$2, telefono=$3, email=$4, notas=$5
       WHERE id=$6 AND activo=true RETURNING *`,
      [nombre.trim(), contacto || null, telefono || null, email || null, notas || null, id]
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Proveedor no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al editar proveedor' })
  }
}

const eliminar = async (request, reply) => {
  const { id } = request.params
  try {
    await pool.query('UPDATE proveedores SET activo=false WHERE id=$1', [id])
    return reply.send({ mensaje: 'Proveedor desactivado' })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar proveedor' })
  }
}

module.exports = { listar, crear, editar, eliminar }
