const pool = require('../db/client')

const listar = async (request, reply) => {
  try {
    const res = await pool.query('SELECT id, clave, nombre, activo FROM unidades_medida ORDER BY nombre')
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar unidades' })
  }
}

const crear = async (request, reply) => {
  const { clave, nombre } = request.body
  if (!clave?.trim() || !nombre?.trim()) return reply.code(400).send({ error: 'Clave y nombre son requeridos' })
  try {
    const res = await pool.query(
      'INSERT INTO unidades_medida (clave, nombre) VALUES ($1,$2) RETURNING id, clave, nombre, activo',
      [clave.trim().toUpperCase(), nombre.trim()]
    )
    return reply.code(201).send(res.rows[0])
  } catch (err) {
    if (err.code === '23505') return reply.code(409).send({ error: 'La clave ya existe' })
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear unidad' })
  }
}

const actualizar = async (request, reply) => {
  const { id } = request.params
  const { clave, nombre, activo } = request.body
  const sets = []; const params = []
  if (clave  !== undefined) { params.push(clave.trim().toUpperCase()); sets.push(`clave=$${params.length}`) }
  if (nombre !== undefined) { params.push(nombre.trim());              sets.push(`nombre=$${params.length}`) }
  if (activo !== undefined) { params.push(activo);                     sets.push(`activo=$${params.length}`) }
  if (sets.length === 0) return reply.code(400).send({ error: 'Nada que actualizar' })
  try {
    params.push(id)
    const res = await pool.query(
      `UPDATE unidades_medida SET ${sets.join(',')} WHERE id=$${params.length} RETURNING id, clave, nombre, activo`,
      params
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Unidad no encontrada' })
    return reply.send(res.rows[0])
  } catch (err) {
    if (err.code === '23505') return reply.code(409).send({ error: 'La clave ya existe' })
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar unidad' })
  }
}

const eliminar = async (request, reply) => {
  const { id } = request.params
  try {
    const res = await pool.query('DELETE FROM unidades_medida WHERE id=$1 RETURNING id', [id])
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Unidad no encontrada' })
    return reply.send({ ok: true })
  } catch (err) {
    if (err.code === '23503') return reply.code(409).send({ error: 'No se puede eliminar: está en uso' })
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar unidad' })
  }
}

module.exports = { listar, crear, actualizar, eliminar }
