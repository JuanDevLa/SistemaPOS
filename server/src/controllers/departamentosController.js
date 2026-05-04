const pool = require('../db/client')

const listar = async (request, reply) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, activo FROM departamentos WHERE activo = true ORDER BY nombre ASC`
    )
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener departamentos' })
  }
}

const crear = async (request, reply) => {
  const { nombre } = request.body
  if (!nombre) return reply.code(400).send({ error: 'Nombre requerido' })
  try {
    const result = await pool.query(
      `INSERT INTO departamentos (nombre) VALUES ($1) RETURNING id, nombre, activo`,
      [nombre.trim()]
    )
    return reply.code(201).send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear departamento' })
  }
}

const editar = async (request, reply) => {
  const { id } = request.params
  const { nombre } = request.body
  if (!nombre) return reply.code(400).send({ error: 'Nombre requerido' })
  try {
    const result = await pool.query(
      `UPDATE departamentos SET nombre = $1 WHERE id = $2 AND activo = true
       RETURNING id, nombre, activo`,
      [nombre.trim(), id]
    )
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Departamento no encontrado' })
    return reply.send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al editar departamento' })
  }
}

const desactivar = async (request, reply) => {
  const { id } = request.params
  try {
    const result = await pool.query(
      `UPDATE departamentos SET activo = false WHERE id = $1 RETURNING id, nombre`,
      [id]
    )
    if (result.rows.length === 0) return reply.code(404).send({ error: 'Departamento no encontrado' })
    return reply.send({ mensaje: 'Departamento eliminado', departamento: result.rows[0] })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar departamento' })
  }
}

module.exports = { listar, crear, editar, desactivar }
