// Helper de auditoría — registra mutaciones críticas en audit_logs.
// Recibe el `client` de pg para participar en la transacción del caller.
// Falla silenciosamente: nunca debe abortar la operación principal.

const registrar = async (client, { usuario_id, negocio_id, accion, tabla, referencia_id, antes = null, despues = null, notas = null }) => {
  try {
    await client.query(
      `INSERT INTO audit_logs (usuario_id, negocio_id, accion, tabla, referencia_id, datos_antes, datos_despues, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        usuario_id || null,
        negocio_id || null,
        accion,
        tabla || null,
        referencia_id || null,
        antes ? JSON.stringify(antes) : null,
        despues ? JSON.stringify(despues) : null,
        notas || null,
      ]
    )
  } catch (err) {
    console.error('[auditService] fallo al registrar:', accion, err.message)
  }
}

module.exports = { registrar }
