Tengo suficiente contexto. Aquí va el reporte por archivo.

  ---
  1. pos/src/screens/VentaScreen.jsx (Frontend — Resiliencia/Rendimiento)

  🚨 CRÍTICO

  1.1 Listener de eventos de red nunca se desuscribe (memory leak + listeners apilados)
  useEffect líneas 215-226 agrega window.addEventListener('online'/'offline', ...) pero el cleanup solo limpia el
  setInterval. Cada vez que cambia syncPending (dependencia), se re-monta y agrega otro par de listeners. Tras un día de
   uso son cientos.

  useEffect(() => {
    const check = async () => { /* ... */ }
    const onOnline  = () => { setIsOnline(true); check() }
    const onOffline = () => setIsOnline(false)
    check()
    const iv = setInterval(check, 30000)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(iv)
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [syncPending])
  Además, mover la lógica de sync a un effect con dependencia explícita (no acoplada al check de conectividad) — hoy
  syncPending no se setea en ningún lado visible; revísalo.

  1.2 useEffect con dependencia faltante invalida la regla de hooks
  Línea 101-106: el effect usa onRefrescarUsuario pero el array de deps es []. Si el padre cambia esa prop (HMR,
  re-login), el intervalo queda apuntando al callback viejo. Línea 109-112: usa puede y tab pero deps es [usuario].
  ESLint con react-hooks/exhaustive-deps te lo marcaría.

  ⚠️ ADVERTENCIA

  - Componente de ~650 LOC con 18 useState y 17 modales. Viola la regla del propio CLAUDE.md ("Screens del POS ≤ 300
  LOC"). Extraer useModales() (un objeto/reducer para todos los modales) reduciría ~80 líneas y elimina renders por
  modales no relacionados.
  - mostrarMensaje mezclado con setMensaje directo: en handleAccion se usa setMensaje(...) + setTimeout inline (líneas
  236-242) en vez del helper que ya tienes. Inconsistencia + timers no cancelables (si el componente se desmonta o
  cambias mensaje rápido, fugas).
  - Re-render por reloj cada 1s (línea 209-212): setHoraActual(new Date()) re-renderiza toda la pantalla cada segundo.
  Footer debería suscribirse a su propio reloj para aislar el render.
  - cobro se reconstruye en cada render (línea 186): useCobro recibe 8 args primitivos + objetos. Si dentro no memoiza,
  fuerza re-renders en ModalCobrar.
  - tabsPermitidos(puede) en cada render (línea 110) — debería ir en useMemo o dentro del propio effect.

  💡 SUGERENCIA

  - Reemplazar if-cascade de handleAccion por un dispatch table ({ borrar: ..., buscar: ... }[id]?.()).
  - Estilos inline duplicados (mensajes ✓ / ❌) → extraer a CSS module.
  - TABS_NEXT = [] y TABS_NEXT_LABEL = {} están vacíos pero renderizados (línea 582). Borrar código muerto.

  ✅ LO BUENO

  - Buen uso de useCart, useCobro, useVentaKeyboard — la lógica está extraída a hooks (cumple CLAUDE.md).
  - Modal de logout con guardia para tickets pendientes y corte abierto — UX defensiva correcta.
  - notasCajaPendiente usando useRef en vez de state — evita re-render innecesario.

  ---
  2. pos/src/api.js (Frontend — Resiliencia/Sync)

  🚨 CRÍTICO

  2.1 Token en localStorage — vulnerable a XSS persistente
  Línea 19: localStorage.getItem('token'). En Electron con nodeIntegration o cualquier paquete npm comprometido, queda
  exfiltrable. Aunque sea desktop, es un anti-patrón. Mover a memoria + safeStorage de Electron, o cookie httpOnly si tu
   backend lo soporta.

  2.2 Race condition en isOnline (caché compartido global)
  Líneas 22-41: lastConnCheck/lastConnResult son globales mutables. Dos llamadas concurrentes dentro de los 10s leen
  estados intermedios o disparan checkConn doble. Si pierdes red entre el check y el fetch, el request ya quedó "online"
   y truena con error genérico. Usar promesa memoizada (como getBaseUrl).

  let inflightCheck = null
  const isOnline = async () => {
    if (lastConnCheck && Date.now() - lastConnCheck < 10000) return lastConnResult
    if (inflightCheck) return inflightCheck
    inflightCheck = (async () => {
      try { return await window.dbAPI.checkConn() } catch { return false }
      finally { inflightCheck = null }
    })()
    const result = await inflightCheck
    lastConnCheck = Date.now(); lastConnResult = result
    return result
  }

  2.3 Sync de ventas: el marcarSincronizado puede dejar duplicados ante errores intermitentes
  Líneas 283-292: si request truena con timeout después de que el servidor sí guardó, la venta nunca se marca
  sincronizada y se vuelve a enviar en la próxima reconexión → duplicado en BD. Solución: enviar idempotency_key (UUID
  generado en cliente, único por venta offline) y que el backend lo respete con UNIQUE constraint o upsert por esa key.

  ⚠️ ADVERTENCIA

  - syncPendientes corre en serie con for await y sin lock global. Si el usuario abre dos ventanas o se dispara
  concurrente desde el monitor de conectividad y desde el evento online, ejecuta dos veces → duplicados.
  - registrarVenta offline no devuelve estructura uniforme: online retorna {venta_id, folio, ...}, offline lo que sea
  que regrese dbAPI.registrarVenta. Documentar contrato o normalizar.
  - Sin timeout en fetch: si la red está degradada (no caída pero lenta), el POS queda colgado sin feedback. Agregar
  AbortController con 10-15s.
  - Sin reintentos con backoff para 5xx — el error sube directo al usuario.
  - Re-declaración: listarEntradas está definido dos veces (líneas 150-157 y 393-394). El segundo sobreescribe al
  primero. Bug latente.

  💡 SUGERENCIA

  - URLSearchParams ya hace encoding — eliminar encodeURIComponent redundante en buscarProducto.
  - El método request podría lanzar errores tipados (AuthError, PermisoError, NetworkError) en vez de new Error(string)
  — facilita gateo en UI.

  ✅ LO BUENO

  - Mecanismo de X-Auth-Override con reintento de una sola vez es elegante para autorización temporal.
  - Memoización de getBaseUrl como Promise.
  - Comentario histórico (línea 280-282) explicando bug de res.id vs res.venta_id — buen contexto para el siguiente que
  lea.

  ---
  3. server/src/middleware/auth.js (Backend — Seguridad)

  🚨 CRÍTICO

  3.1 verifyAdmin y verifyAdminOrSupervisor NO llaman request.jwtVerify()
  Líneas 46-59: confían en que request.user ya esté poblado, pero si por error se monta esta middleware sin verifyJWT
  previo, deja pasar a cualquiera porque request.user es undefined → tiran 401 sí, pero si Fastify globalmente decora
  request.user de otra fuente o si añades un endpoint con solo verifyAdmin, queda abierto.

  Defensa en profundidad: ejecutar await request.jwtVerify() también dentro de estos guards, o usar un middleware
  compuesto.

  const verifyAdmin = async (request, reply) => {
    try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'No autenticado' }) }
    if (request.user?.rol !== 'admin') return reply.code(403).send({ error: 'Solo administradores' })
  }
  O confirmar por convención (test) que todas las rutas usan [verifyJWT, verifyAdmin].

  3.2 X-Auth-Override no valida negocio_id
  Líneas 26-40: el token override solo se valida por permiso. Un admin del Negocio A podría firmar un override y un
  cajero del Negocio B usarlo — desbloquea operación cross-negocio. Verificar que payload.negocio_id ===
  request.user.negocio_id.

  ⚠️ ADVERTENCIA

  - tokenRevokeService.isRevoked se llama dos veces (en verifyJWT y en verifyPermiso para overrides). En verifyJWT no
  devuelve después del reply.code(401).send → el handler sigue ejecutando. Agregar return:
  if (...isRevoked(jti)) { return reply.code(401).send({ error: 'Token revocado' }) }
  - verifyPermiso con clave dinámica: como el body puede determinar el permiso (ej. entrada_efectivo vs salida_efectivo
  en movimientos-caja), exigir validación a nivel de controller en esos casos. Documentado en CLAUDE.md, pero no
  enforced — agregar test.

  💡 SUGERENCIA

  - user.permisos?.[clave] === true: si permisos es array u objeto malformado en BD, falla silente. Validar shape en
  login.
  - Loguear intentos fallidos (403) en audit_logs para detectar escalación de privilegios.

  ✅ LO BUENO

  - Override no reemplaza request.user — el cajero original sigue siendo el actor para auditoría. Diseño correcto.
  - Revocación con jti aplicada también a tokens temporales.

  ---
  4. server/src/controllers/ventasController.js (Backend — Lógica/Integridad)

  🚨 CRÍTICO

  4.1 cancelar no revierte el folio ni lotes FEFO
  Línea 309-449: cuando cancelas una venta, se restaura inventario.cantidad pero no se devuelven cantidades a
  producto_lotes (de donde se descontó por FEFO en crear). Resultado: el inventario total y la suma de
  producto_lotes.cantidad quedan desincronizados → futuras ventas con productos por lote fallarán o desbordarán.

  Solución: leer venta_items.lote_id (ya lo guardas) y devolver la cantidad al lote original. Si la venta usó múltiples
  lotes por item, necesitas guardar las deducciones por lote (hoy solo guardas primary_lote_id — pierde info). Crear
  tabla venta_item_lotes o JSONB con el detalle.

  4.2 cancelar y devolucion no validan que la venta sea del negocio_id del usuario
  Líneas 318-322: cualquier cajero autenticado con permiso cancelar_devolver puede cancelar una venta de otro negocio
  pasando el id por URL. CLAUDE.md dice "nunca mezclar datos entre negocios" — esto lo viola.

  // Validar que venta.negocio_id == request.user.negocio_id (salvo admin)
  if (request.user.rol !== 'admin' && v.negocio_id !== request.user.negocio_id) {
    await client.query('ROLLBACK')
    return reply.code(403).send({ error: 'Venta de otro negocio' })
  }
  Mismo problema en obtener (línea 234) y devolucion (línea 452).

  4.3 devolucion no valida acumulado de devoluciones previas
  Líneas 488-501: valida que item.cantidad <= venta_items.cantidad, pero no resta lo ya devuelto en devoluciones
  anteriores. Cliente puede devolver 5 unidades de una venta de 5 → luego devolver otras 5 → recibe efectivo doble +
  inventario duplicado.

  const yaDevuelto = await client.query(
    `SELECT COALESCE(SUM(di.cantidad),0) AS d
     FROM devoluciones d
     JOIN devolucion_items di ON di.devolucion_id = d.id
     WHERE d.venta_id = $1 AND di.producto_id = $2`,
    [id, item.producto_id]
  )
  if (item.cantidad + parseFloat(yaDevuelto.rows[0].d) > parseFloat(vi.rows[0].cantidad)) { /* 400 */ }
  4.4 devolucion tampoco devuelve cantidad a lotes (mismo bug que 4.1).

  4.5 Folio del cliente offline aceptado sin validación de unicidad
  Líneas 40-41: if (folioCliente) folio = folioCliente. No hay UNIQUE en (negocio_id, folio). Dos cajeros offline pueden
   generar el mismo folio → al sincronizar quedan duplicados. Migrar índice UNIQUE(negocio_id, folio) y manejar
  conflicto.

  ⚠️ ADVERTENCIA

  - crear permite corte_id arbitrario (línea 154): cliente puede mandar corte_id de otro cajero/negocio → la venta queda
   imputada al corte equivocado. Validar contra cortes_caja WHERE estado='abierto' AND cajero_id=$user.
  - No valida que cliente_id pertenezca al negocio_id (línea 197) — fiar a un cliente de otro negocio.
  - No valida que precio_unitario sea ≥ 0 ni que cantidad > 0. Cantidad negativa = robar inventario y restar caja.
  - IVA calculado como inclusivo (itemSubtotal * iva / (100 + iva)): correcto si todos los precios incluyen IVA. Si
  algún producto tiene precio sin IVA, está mal. Asumir explícito o agregar flag por negocio.
  - SELECT ... FOR UPDATE por producto en loop: con N items, son N round-trips a BD bajo lock. Reescribir en una sola
  query WHERE producto_id = ANY($1) para reducir latencia.
  - console.error(err) expone stack en logs sin contexto (venta_id, usuario). Agregar logger estructurado.
  - audit.registrar sin antes/después en crear (línea 205): antes debería existir aunque sea null por consistencia.

  💡 SUGERENCIA

  - Validación con schema Fastify (CLAUDE.md lo dice) — hoy todo es manual if (!x).
  - Extraer cálculo de totales a función pura testeable (calcularTotales(items, ivaPct, descuento)).
  - obtener/listar no validan negocio_id query — listar todo si no se manda. Forzar.

  ✅ LO BUENO

  - Uso correcto de BEGIN/COMMIT/ROLLBACK con client.release() en finally.
  - FOR UPDATE en negocios y inventario evita doble decremento.
  - FEFO ordenado por fecha_caducidad ASC NULLS LAST — algoritmo correcto.
  - round2 para evitar drift IEEE 754 en acumulación de floats.
  - Vincular corte_id solo si sigue abierto en cancelaciones (líneas 354-361) — buen detalle.

  ---
  5. server/src/db/migrate.js (Esquema)

  🚨 CRÍTICO

  5.1 Falta UNIQUE(negocio_id, folio) en ventas
  Línea 236: ALTER TABLE ventas ADD COLUMN IF NOT EXISTS folio VARCHAR(20) — sin constraint. Permite folios duplicados
  (especialmente con sync offline). Agregar:
  CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_negocio_folio
  ON ventas(negocio_id, folio) WHERE folio IS NOT NULL;

  5.2 Falta índice en columnas de búsqueda críticas
  - ventas(negocio_id, fecha) — el listar filtra por ambos y hace ORDER BY fecha DESC. Sin índice, full scan a partir de
   cierto volumen.
  - venta_items(venta_id) — implícito por FK pero no garantizado en PG.
  - movimientos_inventario(producto_id, negocio_id, creado_en) — kardex.
  - creditos(cliente_id, estado).

  5.3 pin VARCHAR(6) aún existe junto a pin_hash
  Línea 18: el PIN en claro nunca debería estar en BD. Si todavía se usa para "compatibilidad", planea borrar la columna
   y verificar que nadie escriba ahí. Una pin_hash IS NULL debería forzar re-set, no caer al PIN plano.

  5.4 Sin campo idempotency_key en ventas
  Necesario para sync offline seguro (ver 2.3 y 4.5).

  ⚠️ ADVERTENCIA

  - creditos.cliente_id y venta_id son NOT NULL pero sin ON DELETE explícito → quedan en NO ACTION. Si borras un cliente
   con créditos activos, falla. Definir ON DELETE RESTRICT explícito.
  - devolucion_items sin precio_unitario ni monto_devuelto — si los precios cambian, no puedes reconstruir cuánto se
  devolvió.
  - metodo_pago VARCHAR(20) sin CHECK — acepta cualquier string. Usar enum o CHECK constraint
  ('efectivo','tarjeta','mixto','credito','transferencia').
  - venta_items.lote_id no existe en este snapshot pero el controller lo escribe (línea 168) — confirmar que la
  migración lo agrega más abajo en el archivo. Sin esa columna, crear truena.
  - movimientos_inventario.tipo VARCHAR(30) sin enum — mismas variaciones (venta, entrada, devolucion, ajuste) deberían
  normalizarse.
  - Sin tabla producto_lotes visible en este fragmento — el controller depende de ella. Si está más abajo, ok; si no, el
   flujo FEFO no corre.

  💡 SUGERENCIA

  - actualizado_en con DEFAULT CURRENT_TIMESTAMP no se actualiza solo. Usar trigger BEFORE UPDATE.
  - Migrar migrate.js "todo-en-uno" a archivos numerados (001_init.sql, 002_lotes.sql, ...) con tabla migrations para
  idempotencia/rollback. Hoy es seguro porque todo es IF NOT EXISTS, pero pierdes orden histórico.

  ✅ LO BUENO

  - Uso consistente de ON DELETE CASCADE en hijos de negocios — borrado seguro.
  - JSONB para permisos (flexible) y audit_logs.datos_antes/despues (versionado de cambios).
  - Tabla tokens_revocados con índice por expira_en para limpieza.
  - Lockout de PIN (intentos_fallidos, bloqueado_hasta) — defensa contra bruteforce.

  ---
  Resumen ejecutivo

  Top 3 bugs críticos a arreglar primero:

  1. ventasController.cancelar/devolucion no devuelve cantidades a lotes ni valida acumulado de devoluciones →
  inventario corrupto + fraude posible.
  2. Cancelar/obtener venta no valida negocio_id del usuario → cross-tenant leak.
  3. Sync offline sin idempotency_key + folio sin UNIQUE → duplicación de ventas garantizada en cualquier reconexión
  flaky.

  Top 3 mejoras de resiliencia frontend:

  1. Listeners online/offline con cleanup correcto en VentaScreen.
  2. isOnline con promesa memoizada para evitar race.
  3. fetch con AbortController y reintentos con backoff en request.

  ¿Quieres que entre a implementar alguno?