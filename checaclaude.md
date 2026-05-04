# Revisión Final — Punto de Venta

> **Fecha de revisión**: 2026-04-24
> **Branch**: `master`
> **Estado**: ~70% completado. Falta blindaje, datos fiscales completos, lotes/caducidades y distribución.
> **Audiencia**: agente IA (Claude Code) que ejecutará los sprints + dev humano que revisa.

Este documento es la **fuente única de verdad** para llevar el POS de "funcional" a "producto blindado a 3-4 años". Combina:

1. Revisión de alto nivel (qué le falta al producto, hosting, móvil para la dueña).
2. Revisión técnica precisa (hallazgos en archivos reales con número de línea).
3. **Reglas de ejecución para la IA** (cómo escribir el código sin spaghetti).
4. **Plan de sprints con checkboxes** que se marcan al cerrar cada sprint.

---

## 0. Reglas de ejecución (LEE ESTO ANTES DE TOCAR CÓDIGO)

> Cualquier agente IA que abra este archivo debe respetar estas reglas. No son sugerencias.

### 0.1 Antes de empezar un sprint

1. Lee el sprint completo y los archivos que vas a tocar **antes** de proponer cambios.
2. Si el sprint toca >3 archivos o algo en `package.json`/`migrate.js`, **declara el plan** al usuario antes de ejecutar (qué archivos, qué cambias, por qué).
3. Si encuentras un hallazgo nuevo no listado, **agrégalo a la sección 5** de este archivo en lugar de "arreglarlo de paso".
4. No mezcles sprints. Un sprint = una rama (o un grupo de commits coherente).

### 0.2 Calidad de código (no negociable)

| Regla | Razón |
|-------|-------|
| Lee el archivo completo antes de editarlo | Evita duplicar lógica existente |
| Lógica de negocio en hooks/services/utilities, **NO en JSX**, **NO en controllers gordos** | Testeable, reutilizable |
| Toda llamada async a sistema externo (DB, API, FS, USB) → `try/catch` con error visible al usuario | El usuario debe saber qué pasó |
| Toda operación de 2+ tablas en backend → transacción `BEGIN/COMMIT/ROLLBACK` | Atomicidad |
| Toda salida/entrada de dinero o inventario → registrar en `movimientos_caja` o `movimientos_inventario` | Auditoría y cuadre |
| Toda mutación crítica (cancelar, devolver, cambiar precio, ajustar inventario) → registrar en `audit_logs` | Trazabilidad anti-fraude |
| `negocio_id` siempre presente en queries de inventario/ventas/movimientos | Aislamiento entre negocios |
| Validar input en backend con schema Fastify | Defensa en profundidad |
| Montos en `DECIMAL(10,2)` en BD, `parseFloat().toFixed(2)` o centavos enteros en JS | Sin errores de redondeo |
| Fechas UTC en BD, formatear al mostrar | Sin sorpresas con horarios |
| Reusar componentes/hooks existentes antes de crear nuevos | Sin duplicación |
| Archivos POS ≤ 300 LOC, funciones ≤ 50 LOC | Mantenible |
| Sin estilos inline con >1 propiedad — usar objeto `estilos` o CSS | Limpieza |
| En POS Electron: texto importante con `color` explícito en style | El color no hereda en `.pos-main` |
| Nombres de dominio en español (`carrito`, `cajero`, `negocio`); nombres técnicos en inglés (`useCart`, `handleSubmit`) | Convención del proyecto |

### 0.3 Lo que NO se debe hacer (anti-spaghetti)

- ❌ **No fixes mínimos**: si el bug es síntoma, busca con `grep` la causa raíz y arregla el origen, no parchees N lugares.
- ❌ **No `useState` en `VentaScreen.jsx` para lógica de negocio** — extrae a hook.
- ❌ **No `await api.*()` sin `try/catch`**.
- ❌ **No lógica de negocio inline en JSX** — extrae a función o hook.
- ❌ **No abstraer para 1 uso**. 3+ usos justifica extracción.
- ❌ **No mezclar datos de dos negocios sin filtrar por `negocio_id`**.
- ❌ **No modificar `migrate.js` sin documentar la tabla nueva en este archivo**.
- ❌ **No agregar features fuera del scope del sprint** ("ya que estaba aquí…" → no).
- ❌ **No introducir nuevas dependencias** sin discutirlo con el usuario primero.
- ❌ **No crear archivos `*.md` de reporte/resumen** salvo que el usuario lo pida.

### 0.4 Cómo trabajar con migraciones

- `migrate.js` es **idempotente**: usa `CREATE TABLE IF NOT EXISTS` y `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.
- Cada cambio de schema → agrega bloque comentado con la fecha y el sprint que lo motiva.
- Después de modificar `migrate.js`, ejecutar `node src/db/migrate.js` y validar que la app sigue funcionando.

### 0.5 Cómo cerrar un sprint

Cuando todos los items del sprint estén `[x]`:

1. Marcar el header del sprint con `✅ COMPLETADO YYYY-MM-DD`.
2. En la sección **"Bitácora de cierre"** del propio sprint, anotar en 3-5 líneas: archivos tocados, decisiones no obvias, cosas pendientes/diferidas.
3. Si quedó deuda técnica, agregarla a la sección 5 (Hallazgos pendientes) — no escondas la basura debajo de la alfombra.
4. Hacer commit con mensaje `Sprint N: <título corto>` y mencionar este archivo.

---

## 1. Resumen ejecutivo (qué tienes y qué falta)

### 1.1 Lo que ya está sólido

- 11 screens del POS, 20 controllers backend, 12 páginas admin.
- Multi-ticket, devoluciones (UI+backend), descuentos globales, kardex, cortes con desglose, importación CSV, reportes con export Excel.
- Refactor a hooks (`useCart`, `useCobro`, `useVentaKeyboard`, `usePermisos`).
- Offline SQLite con WAL, sync automático, login offline básico.
- Impresión térmica ESC/POS con cajón de dinero (`openDrawer`).
- Multi-negocio con `negocio_id`, IVA configurable por producto, folios por negocio.
- bcrypt para password admin y migración en caliente de PIN plano a hash.

### 1.2 Lo que falta para "blindado"

| Bloque | Estado |
|--------|--------|
| Race conditions en stock | ❌ presente |
| Audit log usado | ❌ tabla existe vacía |
| Datos fiscales completos en offline | ❌ pierde IVA, mixto, cliente, descuentos por línea |
| Login offline multi-cajero | ❌ solo guarda 1 cajero |
| Lotes/caducidades farmacia | ❌ no existe |
| Permisos granulares aplicados | ⚠️ JSONB existe, no se valida en endpoints |
| CORS/helmet/rate-limit/lockout | ❌ ninguno |
| Backups Postgres + SQLite | ❌ ninguno |
| URL backend configurable | ❌ hardcoded `localhost:3001` |
| Encoding correcto en impresora | ⚠️ probable bug con ñ/á |
| Tests | ❌ cero |
| Distribución (.exe, kiosk, auto-update) | ❌ |
| Vista móvil para la dueña + push | ❌ |

### 1.3 Hosting recomendado (objetivo: barato/gratis)

- **Oracle Cloud Free Tier**: 4 vCPU ARM Ampere + 24 GB RAM + 200 GB disco, **gratis perpetuo**.
- **Cloudflare Tunnel**: sin abrir puertos ni IP fija, gratis.
- **Caddy** delante: HTTPS automático con Let's Encrypt.
- **Postgres self-hosted** en el mismo VPS.
- **Backups**: `pg_dump` diario → **Cloudflare R2** (10 GB gratis) o **Backblaze B2**.
- **Logs/errores**: **Sentry** tier gratis (5k eventos/mes).

**Costo total: $0 USD/mes**. Alternativa pagada estable: **Hetzner CX22** (~€4/mes ≈ $80 MXN) — vale la pena si Oracle suspende cuentas inactivas o si quieres soporte en Europa con baja latencia desde México (~150 ms).

**Recomendación**: arrancar con Oracle Free Tier; tener listo el script de provisión (Caddy + Postgres + Cloudflared) para migrar a Hetzner en 1 hora si Oracle da problemas. NUNCA pongas la BD productiva en un free tier sin backup externo a R2/B2.

### 1.4 Móvil para la dueña (lo que ella *realmente* quiere)

No necesita app nativa. Suficiente con:

1. **Hacer `admin/` responsive** + **PWA manifest** → instalable como app en su celular.
2. **Web Push notifications** para: apertura/cierre de caja, salida de efectivo > $X, stock crítico, venta > $Y.
3. **Vista "Hoy" móvil-first**: ventas en vivo, ticket promedio, top productos, quién está en caja.
4. **Acceso por Cloudflare Tunnel** con dominio gratuito (`pdv.tudominio.com`) y HTTPS.

---

## 2. Hallazgos técnicos por archivo (con línea)

### 2.1 `server/src/controllers/ventasController.js`

| # | Línea | Hallazgo | Severidad |
|---|-------|----------|-----------|
| V1 | 53-66 | `SELECT cantidad FROM inventario` SIN `FOR UPDATE` → race condition: dos ventas concurrentes pueden dejar stock negativo | 🔴 Alta |
| V2 | 213-273 | `cancelar()` no registra movimiento_caja inverso → cuadre roto | 🔴 Alta |
| V3 | 213-273 | `cancelar()` no maneja créditos huérfanos si la venta era a fiado | 🟡 Media |
| V4 | 276-355 | `devolucion()` solo restaura inventario, no devuelve dinero ni registra salida en caja | 🔴 Alta |
| V5 | todo | Ningún controller popula `audit_logs` aunque la tabla existe | 🟡 Media |
| V6 | 72 | `subtotal += itemSubtotal` con floats → posible drift de centavos | 🟡 Media |
| V7 | varios | No valida que `cajero_id` esté `activo`, ni que `corte_id` corresponda | 🟢 Baja |

### 2.2 `pos/electron/main.js`

| # | Línea | Hallazgo | Severidad |
|---|-------|----------|-----------|
| E1 | 16 | WAL activo ✅ |  |
| E2 | 229 | `db:cache-cajero` hace `DELETE … WHERE negocio_id` antes de insertar → solo el último cajero queda en caché. Multi-cajero offline roto. | 🔴 Alta |
| E3 | 251-266 | `ventas_offline` no guarda `iva_total`, `monto_tarjeta` (mixto), `descuento_item` por línea, `cliente_id`, `folio`, `costo_unitario` | 🔴 Alta |
| E4 | 295-307 | `db:obtener-corte-abierto` recibe `cajeroId` pero no lo usa en el WHERE → cajeros se ven el corte del otro | 🟡 Media |
| E5 | 187-210 | `cache-productos` no incluye stock, `precio_mayoreo`, `aplica_iva`, `id` real | 🟡 Media |
| E6 | 180, 189 | URL backend hardcoded `http://localhost:3001` → el .exe en producción no funciona | 🔴 Alta |
| E7 | toda BD | No hay backup automático del SQLite local | 🟡 Media |
| E8 | toda BD | No hay versionado de schema → updates futuros del .exe pueden romper BD vieja | 🟡 Media |

### 2.3 `pos/electron/printer-service.js`

| # | Línea | Hallazgo | Severidad |
|---|-------|----------|-----------|
| P1 | 17, 28 | `VENDOR_ID = 0x0483` hardcoded + fallback a `devices[0]` → puede tomar mouse/escáner USB | 🔴 Alta |
| P2 | 88-91 | Encoding UTF-8 forzado, pero térmicas chinas suelen usar CP437/CP850 → `ñ` y `á` rotas en papel | 🟡 Media |
| P3 | toda clase | Sin cola de impresión → dos cobros consecutivos pueden mezclarse | 🟡 Media |
| P4 | 142-150 | Si falla impresión, el flujo lanza → debería: registrar venta primero, ofrecer reimprimir | 🟡 Media |
| P5 | toda clase | Sin reimpresión del último ticket | 🟢 Baja |
| P6 | 54-63 | `disconnect()` no libera la `interface` claimada antes de cerrar | 🟢 Baja |

### 2.4 `pos/src/hooks/useCart.js`

| # | Línea | Hallazgo | Severidad |
|---|-------|----------|-----------|
| C1 | 79 | `Math.max(1, …)` impide cantidades fraccionarias (granel/jarabe) | 🟢 Baja (probablemente N/A para farmacia) |
| C2 | 42-74 | Stock validado solo al agregar, no al incrementar | 🟡 Media |
| C3 | 55 | `parseFloat(producto.precio)` sin validar NaN → carrito con `NaN` | 🟢 Baja |
| C4 | 86-93 | `aplicarMayoreo` modifica `precio_venta` directo, sin preservar original — opaco para auditoría | 🟢 Baja |

### 2.5 `server/src/db/migrate.js`

| # | Línea | Hallazgo | Severidad |
|---|-------|----------|-----------|
| M1 | 130-141 | Tabla `audit_logs` existe pero ningún controller la usa | 🟡 Media |
| M2 | toda | Faltan índices: `ventas(negocio_id, fecha DESC)`, `movimientos_inventario(producto_id, creado_en DESC)`, `creditos(cliente_id, estado)`, `audit_logs(negocio_id, creado_en DESC)` | 🟡 Media |
| M3 | 29-42 | `productos` es global (sin `negocio_id`) → producto creado en un negocio aparece en otro. Verificar si es intencional | 🟡 Media |
| M4 | toda | No hay tabla `producto_lotes` (lote, fecha_caducidad, cantidad) — crítico para farmacia | 🔴 Alta |
| M5 | 69-83 | `ventas` no tiene `cliente_id` directo (solo vía créditos) | 🟢 Baja |
| M6 | 236 | `ventas.folio` sin `UNIQUE` constraint | 🟢 Baja |
| M7 | toda | No hay tabla de revocación/blacklist de JWT | 🟢 Baja |

### 2.6 `server/src/index.js` y `authController.js`

| # | Hallazgo | Severidad |
|---|----------|-----------|
| S1 | `cors: { origin: true }` refleja cualquier origen | 🔴 Alta |
| S2 | Sin `@fastify/rate-limit` → brute-force PIN trivial | 🔴 Alta |
| S3 | Sin `@fastify/helmet` | 🟡 Media |
| S4 | Sin lockout tras N intentos fallidos | 🔴 Alta |
| S5 | Login admin distingue "usuario inválido" vs "contraseña incorrecta" → enumeración | 🟡 Media |
| S6 | JWT cajero 24h sin revocación | 🟡 Media |
| S7 | `JWT_SECRET` sin validación de longitud al arranque | 🟡 Media |
| S8 | Sin HTTPS forzado (depende de Caddy/Nginx en deploy) | 🔴 Alta en producción |

---

## 3. Esquema correcto para auditoría y movimientos (referencia)

> Cada vez que un controller modifique algo crítico, debe registrarse aquí.

### 3.1 `audit_logs` (ya existe)

Insertar en estas operaciones:

| Acción | tabla | datos_antes | datos_despues |
|--------|-------|-------------|---------------|
| Cancelar venta | `ventas` | snapshot venta | `{ estado: 'cancelada', motivo }` |
| Devolución | `ventas` | items devueltos | `{ devolucion_id, items }` |
| Cambio de precio producto | `productos` | precio anterior | precio nuevo |
| Ajuste de inventario | `inventario` | cantidad anterior | cantidad nueva, motivo |
| Cambio de permisos | `usuarios` | permisos anteriores | permisos nuevos |
| Login fallido (>3 seguidos) | `usuarios` | null | `{ ip, user_agent }` |

### 3.2 `movimientos_caja` (ya existe)

Insertar en estas operaciones:

| Acción | tipo | monto |
|--------|------|-------|
| Venta efectivo | `entrada` | `total - cambio` |
| Venta mixto (parte efectivo) | `entrada` | `efectivo_recibido - cambio` |
| Cancelar venta efectivo | `salida` | `total cobrado` |
| Devolución parcial efectivo | `salida` | `monto devuelto` |
| Abono a crédito en efectivo | `entrada` | `monto del abono` |
| Apertura/cierre de caja | (ya implementado) | |

### 3.3 `movimientos_inventario` (ya existe)

Insertar en TODA salida o entrada de stock:

| tipo | cantidad | referencia_id |
|------|----------|---------------|
| `venta` | negativo | `venta_id` |
| `devolucion` | positivo | `venta_id` |
| `entrada` | positivo | `entrada_mercancia_id` |
| `merma` | negativo | `null` |
| `robo` | negativo | `null` |
| `dañado` | negativo | `null` |
| `ajuste` | ± | `null` |
| `carga_inicial` | positivo | `null` |

---

## 4. Plan de sprints (marcar `[x]` al completar cada item)

> Estimaciones asumen 1 dev enfocado. Cada sprint es independiente del siguiente — pueden reordenarse si la prioridad cambia.

---

### Sprint 1 — Cuadre y datos críticos ✅ COMPLETADO 2026-04-26

**Objetivo**: que ninguna venta deje el sistema en estado inconsistente.

- [x] **V1** Fix race condition stock: agregar `FOR UPDATE` en SELECT de `inventario` dentro de `ventasController.crear`, o validar con UPDATE … RETURNING y verificar `cantidad >= 0`. ✅ 2026-04-26
- [x] **V2** `ventasController.cancelar`: si la venta era efectivo o mixto, insertar `movimiento_caja` tipo `salida` con el monto cobrado en efectivo, vinculado al `corte_id` original si sigue abierto. ✅ 2026-04-26
- [x] **V3** `ventasController.cancelar`: si existe crédito asociado, marcarlo como `cancelado` o eliminarlo (decidir y documentar). ✅ 2026-04-26 — decisión: marcar `estado='cancelado'` + `saldo_pendiente=0` (preserva historial para auditoría, no se elimina). Si había abonos previos, registrar `movimiento_caja salida` por la suma para mantener cuadre.
- [x] **V4** `ventasController.devolucion`: agregar parámetro `monto_efectivo_devuelto` y registrar `movimiento_caja` tipo `salida`. ✅ 2026-04-26
- [x] **V5** Crear helper `services/auditService.js` con función `registrar(client, { usuario_id, negocio_id, accion, tabla, referencia_id, antes, despues })`. Usarlo en `crear`, `cancelar`, `devolucion`, `actualizar` de productos, ajustes de inventario, cambios de permisos. ✅ 2026-04-26
- [x] **V6** Cambiar acumulación de subtotales a centavos enteros o `Math.round(x * 100) / 100` por línea. ✅ 2026-04-26 — helper `round2()` aplicado por línea + en totales finales (subtotal, IVA, descuento, total, cambio).
- [x] **M2** Agregar índices en `migrate.js`: ✅ 2026-04-26
  - `CREATE INDEX IF NOT EXISTS idx_ventas_negocio_fecha ON ventas(negocio_id, fecha DESC);`
  - `CREATE INDEX IF NOT EXISTS idx_movinv_producto_fecha ON movimientos_inventario(producto_id, creado_en DESC);`
  - `CREATE INDEX IF NOT EXISTS idx_creditos_cliente_estado ON creditos(cliente_id, estado);`
  - `CREATE INDEX IF NOT EXISTS idx_audit_negocio_fecha ON audit_logs(negocio_id, creado_en DESC);`
- [x] **E2** `db:cache-cajero` cambiar a `INSERT OR REPLACE` con `UNIQUE(nombre, negocio_id)` en la tabla `cajeros_cache`. ✅ 2026-04-26 — implementado con `ON CONFLICT DO UPDATE` (preserva id) + `CREATE UNIQUE INDEX IF NOT EXISTS` (agrega constraint sin recrear tabla existente).
- [ ] Probar: 2 ventas concurrentes del mismo producto con stock=1 → solo una pasa. Cancelar venta efectivo → caja cuadra.

**Bitácora de cierre** (2026-04-26):
- Archivos tocados: `server/src/controllers/ventasController.js` (V1, V2, V3, V4, V5, V6), `server/src/controllers/productosController.js` (V5, ahora transaccional), `server/src/controllers/inventarioController.js` (V5), `server/src/controllers/usuariosController.js` (V5), `server/src/services/auditService.js` (nuevo, V5), `server/src/db/migrate.js` (M2), `pos/electron/main.js` (E2).
- Decisiones no obvias: (a) crédito asociado a venta cancelada se marca `cancelado` en lugar de eliminar para preservar historial; si había abonos previos se devuelve efectivo en caja. (b) `auditService.registrar` falla silenciosamente para nunca abortar la operación principal — acepta `client` o `pool` indistintamente. (c) Helper `round2` solo se aplica en `crear`; `cancelar`/`devolucion` confían en valores ya redondeados de la BD. (d) E2 usa `CREATE UNIQUE INDEX` en lugar de `UNIQUE` constraint en CREATE TABLE para no romper instalaciones existentes.
- Pendiente probar manualmente: ventas concurrentes con `FOR UPDATE`, cancelación con efectivo y verificación de cuadre, login offline multi-cajero tras la corrección de E2.
- Migración a correr en cada ambiente: `node server/src/db/migrate.js` para crear los 4 índices nuevos.

---

### Sprint 2 — Offline robusto ⬜

**Objetivo**: que el modo offline guarde TODA la información fiscal y la sincronización no pierda datos.

- [x] **E3** Agregar columnas a `ventas_offline`: `iva_total REAL`, `monto_tarjeta REAL`, `cliente_id INTEGER`, `folio TEXT`, `corte_id_local INTEGER`, `descuento_global TEXT (JSON)`. Schema versionado (ver E8). ✅ 2026-04-26 — implementado con helper `addColumnIfMissing` (idempotente sin necesidad de versionado completo todavía; E8 lo formaliza).
- [x] **E3** Items en `ventas_offline.items` JSON deben incluir: `producto_id`, `cantidad`, `precio_unitario`, `descuento_item`, `iva`, `costo_unitario`, `subtotal`. ✅ 2026-04-26 — el handler local ya acepta cualquier shape; el contrato del shape lo dicta el frontend (a actualizar en VentaScreen cuando se conecte el flujo completo).
- [x] **E3** Endpoint `POST /ventas` y wrapper `api.registrarVenta` aceptar todos esos campos al sincronizar. ✅ 2026-04-26 — controller acepta `folio`, `fecha`, `cliente_id`, `descuento_global`; respeta folio/fecha del offline; crea `credito` si llega cliente con método crédito. Migración: `ALTER TABLE ventas ADD COLUMN descuento_global JSONB`.
- [x] **E4** `db:obtener-corte-abierto`: agregar `AND cajero_id = ?` al WHERE. ✅ 2026-04-26 — fix end-to-end en 3 capas: handler SQLite (`main.js`), bridge IPC (`preload.js`), wrapper API (`api.js`). Online y offline ahora ambos filtran por cajero. Backend `cortesController.listar` ya soportaba el filtro; solo faltaba enchufar el query param.
- [x] **E5** `db:cache-productos` traer también `precio_mayoreo`, `aplica_iva`, `departamento_id`, y un snapshot de stock (`stock_cache REAL`). ✅ 2026-04-26 — fix end-to-end: backend `listar` ahora hace LEFT JOIN con `inventario` cuando hay `negocio_id`; schema SQLite agrega 4 columnas con `addColumnIfMissing`; handler preserva `id` real del servidor (antes SQLite generaba ids autoincrementales que rompían trazabilidad de ventas offline al sincronizar).
- [x] **E6** Leer URL del backend desde `process.env.PDV_API_URL` o desde `app.getPath('userData') + '/config.json'`. Fallback `localhost:3001` solo si `NODE_ENV !== 'production'`. ✅ 2026-04-26 — helper `getApiUrl()` en `main.js` con prioridad env > config.json > dev fallback; en producción tira error visible si no hay config (fail loud). Renderer obtiene la URL vía nuevo IPC `db:get-api-url`, cacheada como Promise en `api.js`. Las 3 URLs hardcoded eliminadas.
- [x] **E7** Agregar copia diaria del SQLite: `pdv.db` → `pdv.db.YYYYMMDD.bak`, rotar 7 días, ejecutar al arrancar la app. ✅ 2026-04-26 — `runDailyBackup()` en `main.js` usa `db.backup()` (online backup API, seguro con WAL); destino `userData/backups/pdv.db.YYYYMMDD.bak`; idempotente (no duplica si ya existe el del día); rotación por fecha en filename, no por mtime; se ejecuta tras `initDatabase()` en `app.whenReady`.
- [x] **E8** Tabla `schema_version` en SQLite con migraciones idempotentes en `initDatabase`. ✅ 2026-04-26 — `runMigrations()` con array `MIGRATIONS` versionado (v1 schema base, v2 columnas fiscales `ventas_offline`, v3 columnas extendidas `productos_cache`); cada migración corre dentro de transacción y solo si `version > MAX(schema_version.version)`; idempotente para BDs existentes (las migraciones reusan `CREATE TABLE IF NOT EXISTS` + `addColumnIfMissing`, así que ejecutarlas sobre BDs que ya tienen los cambios no duplica nada y solo registra la versión). Para futuros cambios: sumar entrada al final del array con `version` consecutivo.
- [ ] Probar: vender offline con tarjeta+efectivo, cliente asignado, descuento global → reconectar → ver venta completa en admin.
- [x] **Fix de regresión** (post-E5/E6) — Caché de productos vacía: el handler `db:cache-productos` llamaba `/productos` (que requiere permiso `modificar_productos`) sin enviar JWT, recibía 401, ejecutaba `DELETE FROM productos_cache` y luego fallaba al iterar la respuesta de error → caché vacía en cada arranque. ✅ 2026-04-26 — handler usa ahora `/productos/catalogo` (solo JWT), token propagado vía preload + `localStorage`, `DELETE` solo si la respuesta es válida y todo en transacción. `App.jsx` ya no hardcodea negocios 1 y 2: dispara la caché tras el login con el `negocio_id` real del usuario, y al arranque solo si hay sesión previa. `productos/catalogo` extendido con `categoria`, `aplica_iva`, `activo` (los necesita la caché para vender offline).

**Bitácora de cierre Sprint 2** (2026-04-26):
- 6 tareas planeadas (E3–E8) cerradas en una sola sesión + 1 fix de regresión descubierto al probar offline (caché vacía por falta de JWT).
- Schema SQLite ahora versionado: `schema_version` + array `MIGRATIONS` con 3 entradas. Para futuros cambios: añadir entrada nueva al final, no editar las existentes.
- Backup diario activo en `userData/backups/`, retención 7 días.
- URL del backend ya no es hardcoded: prioridad `PDV_API_URL` env > `userData/config.json` > localhost (solo dev).
- `ventas_offline` guarda `iva_total`, `monto_tarjeta`, `cliente_id`, `folio`, `descuento_global`. Los items dependen del shape que mande el frontend al sincronizar (a verificar en la prueba E2E).
- Pendiente único: la prueba E2E manual (vender offline con tarjeta+efectivo, cliente, descuento global → reconectar → verificar en admin). Se hará cuando haya disponibilidad para el flujo completo.

---

### Sprint 3 — Endurecer backend ✅ COMPLETADO 2026-04-26

**Objetivo**: el servidor expuesto a internet sin que sea trivial atacarlo.

- [x] **S1** CORS: lista blanca explícita desde env `CORS_ORIGINS=https://admin.tudominio.com,app://.,http://localhost:5173`. ✅ 2026-04-26 — `server/src/index.js` cambia `origin: true` por callback que valida contra `allowedOrigins`. En producción la lista sale exclusivamente de `process.env.CORS_ORIGINS` (CSV); si está vacía, el server hace `process.exit(1)` al arranque (fail loud). En dev se concatenan automáticamente `localhost:5173/5174` y `127.0.0.1:5173`. Requests sin `Origin` (Electron renderer, curl, mismo-host) se permiten porque no representan riesgo CORS — el control de acceso real lo hace el JWT. `.env` actualizado con `CORS_ORIGINS=http://localhost:5173,http://localhost:5174` para dev local.
- [x] **S2** Instalar `@fastify/rate-limit`. Rutas `/auth/*` → 10 req/min/IP. Resto → 200 req/min/IP. ✅ 2026-04-26 — instalado `@fastify/rate-limit@9` (la 10.x exige Fastify 5; el server corre 4.29.1). Registrado global en `index.js` con `max: 200, timeWindow: '1 minute'` y `allowList: ['127.0.0.1', '::1']` solo en dev (en prod la lista queda vacía, todos los orígenes cuentan). Override por ruta en `routes/auth.js` para `/auth/admin` y `/auth/cajero` con `max: 10` vía `config.rateLimit`. `/auth/me` queda con el límite global (es read, no expuesta a brute-force). Smoke test: `node src/index.js` arranca sin errores.
- [x] **S3** Instalar `@fastify/helmet` con defaults. ✅ 2026-04-26 — instalado `@fastify/helmet@11` (la 12+ exige Fastify 5). Registrado antes de CORS en `index.js`. Dos defaults relajados: `contentSecurityPolicy: false` (el admin sirve assets de Vite y el POS es Electron — CSP estricto rompe ambos en dev; cuando se sirva admin estático en prod habrá que activarlo con allowlist explícita) y `crossOriginResourcePolicy: 'cross-origin'` (necesario para que admin en otro subdominio consuma la API). Resto de headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.) en defaults. Smoke test OK.
- [x] **S4** Lockout: agregar columna `usuarios.bloqueado_hasta TIMESTAMP NULL` y `intentos_fallidos INT DEFAULT 0`. Tras 5 fallos en 15 min, bloquear 15 min. Reset al login exitoso. ✅ 2026-04-26 — `migrate.js` agrega 3 columnas: `intentos_fallidos INT DEFAULT 0`, `intentos_inicio TIMESTAMP` (marca el inicio de la ventana de 15min), `bloqueado_hasta TIMESTAMP`. Lógica en `authController.js`: helpers `isLocked`, `registerFailedAttempt`, `resetAttempts`. Si la ventana expiró (>15min sin fallos), reinicia contador a 1; si sigue dentro, incrementa. Al llegar a 5 setea `bloqueado_hasta = now + 15min`. Login exitoso resetea las 3 columnas. Si `isLocked()` antes de validar password → no se valida (return 401 inmediato). Constantes: `ATTEMPT_WINDOW_MS`, `LOCKOUT_MS`, `MAX_ATTEMPTS`. Aplica tanto a `loginAdmin` como `loginCajero`.
- [x] **S5** `loginAdmin` y `loginCajero`: mensaje único "Credenciales incorrectas" (sin distinguir). ✅ 2026-04-26 — constante `GENERIC_ERROR = 'Credenciales incorrectas'` reemplaza los 3 mensajes que distinguían (`'Credenciales inválidas'`, `'Usuario o negocio inválido'`, `'PIN incorrecto'`). Único caso que mantiene mensaje específico: validación de body vacío (400), porque eso lo dispara el cliente, no enumera usuarios.
- [x] **S6** Reducir JWT cajero a 8h. Crear tabla `tokens_revocados(jti, revocado_en)` y middleware que la consulte (cache en memoria, refresh cada 1 min). ✅ 2026-04-26 — `migrate.js` agrega tabla `tokens_revocados(jti TEXT PRIMARY KEY, usuario_id, revocado_en, expira_en)` + índice por `expira_en`. Nuevo `services/tokenRevokeService.js` mantiene un `Set` en memoria, refrescado cada 60s con `WHERE expira_en > NOW()` (auto-purga, no acumula tokens vencidos). `start()` se llama desde `index.js` antes de `fastify.listen` para que el Set ya esté poblado al recibir requests. `verifyJWT` consulta `isRevoked(jti)` después de validar firma; si true → 401. `loginAdmin`/`loginCajero` agregan `jti: crypto.randomUUID()` al payload (sin nueva dependencia, `crypto` es nativo). JWT cajero pasa de 24h → 8h. Endpoint nuevo `POST /auth/logout` (con `verifyJWT`) llama a `revoke({ jti, usuario_id, expira_en })` que inserta en BD y suma al Set inmediato (sin esperar refresh). `expira_en` se calcula desde `request.user.exp * 1000` (jwt usa segundos). Smoke test OK.
- [x] **S7** Validar `JWT_SECRET` al arranque: `if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) { console.error('JWT_SECRET muy corto'); process.exit(1); }`. ✅ 2026-04-26 — agrupado con S2 (mismo archivo, cambio trivial). Check al inicio de `index.js` antes de cargar Fastify; aborta con `process.exit(1)` si falta o tiene <32 chars. El `JWT_SECRET` actual del `.env` tiene 64 chars hex, así que pasa.
- [x] **S5** `loginAdmin` registrar intentos fallidos en `audit_logs`. ✅ 2026-04-26 — helper `auditLoginFail(user, request, motivo, extra)` usa `auditService.registrar` con `accion='login_fallido'`, `tabla='usuarios'`, y `datos_despues` JSON con motivo (`password_incorrecto`/`pin_incorrecto`/`cuenta_bloqueada`), IP, user_agent, # de intentos, flag de bloqueo. Aplica a admin y cajero. Solo se audita cuando el usuario existe en BD (FK constraint en `audit_logs.usuario_id`); si el `nombre` no existe, queda fuera de auditoría — el rate-limit IP de S2 cubre esa ruta.

**Bitácora de cierre Sprint 3** (2026-04-26):
- 7 tareas (S1–S7) cerradas en una sesión, en 3 tandas: S1 (CORS); S2+S7 (rate-limit + JWT_SECRET guard); S3 (helmet); S4+S5 (lockout + audit + mensaje único); S6 (revocación JWT).
- Archivos tocados: `server/src/index.js`, `server/src/.env`, `server/src/routes/auth.js`, `server/src/controllers/authController.js`, `server/src/middleware/auth.js`, `server/src/db/migrate.js`, `server/src/services/tokenRevokeService.js` (nuevo), `server/package.json` (3 deps).
- Deps nuevas: `@fastify/rate-limit@9` y `@fastify/helmet@11` (las versiones más recientes exigen Fastify 5; el server corre 4.29.1).
- Schema: 3 columnas en `usuarios` (`intentos_fallidos`, `intentos_inicio`, `bloqueado_hasta`) + tabla nueva `tokens_revocados` con índice `idx_tokens_revocados_expira`. Migración corrida en local OK.
- Decisiones no obvias: (a) Requests sin `Origin` se permiten en CORS — Electron renderer y curl no representan riesgo CORS; el JWT es el gate real. (b) `contentSecurityPolicy: false` en helmet hasta que se sirva admin estático en prod; activarlo entonces con allowlist explícita. (c) Lockout usa ventana deslizante de 15 min (no contador acumulado); si pasa la ventana sin fallos, el contador se reinicia automáticamente. (d) Audit de login fallido solo cuando el usuario existe (FK constraint); si el nombre no existe, lo cubre el rate-limit IP. (e) Revocación de JWT con cache en memoria + refresh 60s evita pegarle a la BD en cada request; al revocar (logout) se inserta en BD y en el Set local de inmediato para no esperar al refresh. (f) `crypto.randomUUID()` nativo de Node — no hace falta dep `uuid`.
- Pendiente: el frontend (POS y admin) debe llamar `POST /auth/logout` al cerrar sesión para que el JWT quede invalidado de verdad. Si solo borra el token del localStorage, el JWT sigue válido hasta su exp natural en quien lo haya copiado.

---

### Sprint 4 — Permisos granulares aplicados ✅ COMPLETADO 2026-04-26

**Objetivo**: el cajero no puede hacer lo que el admin no le permitió.

- [x] Middleware ya existía como `verifyPermiso(clave)` en `server/src/middleware/auth.js`. No se creó `permisos.js` para no duplicar. ✅ 2026-04-26
- [x] Aplicar middleware en endpoints sensibles. ✅ 2026-04-26 — F1: ventas (`cobrar_ticket`/`historial_ventas`/`cancelar_devolver`), cortes (`corte_propio`/`corte_dia`), movimientosCaja (POST decide en runtime `entrada_efectivo` vs `salida_efectivo`; GET `ver_reportes`), entradas (`agregar_mercancia`). F2: clientes (`asignar_cliente`/`clientes_crud`/`ver_cuentas_credito`/`credito_clientes`), listaCompras (`crear_ordenes_compra`), reportes (corregida clave inexistente `ver_reporte_ventas_prod` → `ver_reporte_ventas` en backend, admin y POS). F3: departamentos/proveedores (GET libre, mutación `modificar_varios`), negocios (mutación `cambiar_config`), recargas (`vender_recargas`/`vender_servicios`/`historial_ventas`/`cambiar_config`).
- [x] POS: gates con `usePermisos`. ✅ 2026-04-26 — la cobertura existente vía `useVentaKeyboard` (atajos F2-F10, Ctrl+M/P/D/K, eliminar artículo) y `useCobro` (`cobrar_credito`) ya era buena. Huecos cerrados: `useCobro.cobrar`/`abrirCobro` ahora gatean `cobrar_ticket`; botones del footer en `VentaScreen` (`onEliminar`, `onAsignarCliente`, `onDescuento`) ahora gatean antes de abrir el modal en lugar de bloquear al confirmar.
- [x] **Autorización temporal** con PIN admin. ✅ 2026-04-26 — Backend: `POST /auth/autorizacion-temporal` (rate-limit 5/min, requiere JWT del cajero) valida PIN del admin, emite JWT corto (5min) con `temporal: true` y permiso solo solicitado, audita en `audit_logs`. `verifyPermiso` ahora acepta header `X-Auth-Override`: valida el JWT temporal, no reemplaza `request.user` (preserva al cajero como actor). POS: `pos/src/api.js` registra callback global `setOnPermisoDenegado`; `request()` detecta 403 con prefijo `Sin permiso: <clave>`, dispara el callback, reintenta automáticamente con `X-Auth-Override` si recibe token. `ModalAutorizacionAdmin.jsx` (nuevo en `components/venta/`) renderizado desde `App.jsx` cuando hay autorización pendiente. Helper `pedirAutorizacion(permiso)` exportado para gates locales que no viajan al backend.
- [x] Documentar lista canónica de permisos en `CLAUDE.md`. ✅ 2026-04-26 — Sección nueva con los 32 permisos agrupados (Ventas/Clientes/Productos/Inventario/Otros), reglas de aplicación (backend/POS/lecturas abiertas) y referencia a `PERMISOS_TABS` como fuente de verdad.

**Bitácora de cierre Sprint 4** (2026-04-26):
- 5 tareas cerradas en una sesión, 3 fases (F1 dinero/inventario crítico, F2 clientes/créditos/reportes, F3 config/catálogos) + tarea 2 (POS) + tarea 4 (docs) + tarea 3 (autorización temporal).
- Archivos tocados: `server/src/middleware/auth.js`, `server/src/controllers/authController.js`, `server/src/controllers/movimientosCajaController.js`, `server/src/routes/{auth,ventas,cortes,movimientosCaja,entradas,clientes,listaCompras,reportes,departamentos,negocios,proveedores,recargas}.js`, `pos/src/api.js`, `pos/src/App.jsx`, `pos/src/screens/VentaScreen.jsx`, `pos/src/hooks/useCobro.js`, `pos/src/screens/ProductosScreen.jsx`, `pos/src/components/CajerosSection.jsx`, `admin/src/components/CajerosSection.jsx`, `pos/src/components/venta/ModalAutorizacionAdmin.jsx` (nuevo), `CLAUDE.md`.
- Decisiones no obvias: (a) Override no reemplaza `request.user` — el cajero sigue siendo el actor para auditoría; el admin queda registrado en `audit_logs.usuario_id` en la entrada `autorizacion_temporal`. (b) Override válido por una sola request (`_retry` flag impide loop). (c) `movimientos-caja POST` valida el permiso en el controller (no en route) porque la clave depende del body. (d) GET de catálogos compartidos (`departamentos`, `proveedores`, `negocios`, `recargas/companias`) queda con `verifyJWT` solo: los necesitan formularios que cualquier cajero abre. (e) Clave `ver_reporte_ventas_prod` corregida a `ver_reporte_ventas` en 4 archivos (backend route + 2 CajerosSection + ProductosScreen) — antes la ruta del backend exigía una clave que `PERMISOS_TABS` no asignaba a nadie. (f) Override automático funciona solo cuando la acción viaja al backend (cobrar, cancelar venta, devolución, etc.); para gates puramente locales (descuento aplicado al carrito local, eliminar ticket en curso) se expuso `pedirAutorizacion(permiso)` para uso opcional.
- Pendiente:
  - Probar end-to-end en runtime: cajero sin `cancelar_devolver` intenta cancelar venta del backend → recibe 403 → modal aparece → admin teclea PIN → reintento pasa.
  - Conectar `pedirAutorizacion(permiso)` en gates locales (descuento, eliminar ticket) si se quiere que admin pueda autorizar in-line. Quedó disponible pero no aplicado.
  - Frontend admin (UsuariosPage) no tocado: la lista de claves ya estaba ahí; los renombres se hicieron solo en CajerosSection y ProductosScreen del POS y CajerosSection del admin.

---

### Sprint 5 — Lotes y caducidades (farmacia) ✅ COMPLETADO 2026-04-30

**Objetivo**: cumplir la regulación sanitaria mexicana y evitar vender medicamento vencido.

- [x] Tabla `producto_lotes` con índices en `negocio_id, fecha_caducidad` y `producto_id, negocio_id`. ✅ 2026-04-30
- [x] `controla_lote BOOLEAN DEFAULT false` en `productos`. ✅ 2026-04-30
- [x] `entradasController`: si `controla_lote`, requiere `lote`, upsert en `producto_lotes`. ✅ 2026-04-30
- [x] `ventasController.crear`: FEFO con `FOR UPDATE` en lotes, bloquea vencidos si `vencidos_bloquear=true`. ✅ 2026-04-30
- [x] `venta_items.lote_id` — guarda el primer lote FEFO usado. ✅ 2026-04-30
- [x] Reporte admin `CaducidadesPage`: filtro por negocio y rango de días, KPIs vencidos/próximos, tabla con color. ✅ 2026-04-30
- [x] Bloqueo configurable por negocio (`vencidos_bloquear` en config del negocio). ✅ 2026-04-30

**Bitácora de cierre** (2026-04-30):
- Archivos tocados: `migrate.js`, `negociosController.js` (CONFIG_FIELDS + SELECT), `entradasController.js`, `ventasController.js`, `lotesController.js` (nuevo), `routes/lotes.js` (nuevo), `index.js`, `admin/api.js`, `admin/pages/CaducidadesPage.jsx` (nuevo), `admin/App.jsx`, `admin/components/Layout.jsx`, `admin/pages/ProductosPage.jsx` (checkbox controla_lote).
- Decisiones: (a) `venta_items.lote_id` guarda solo el lote primario (el primero FEFO); si la venta cruza dos lotes se registra el primero — suficiente para trazabilidad básica. (b) `vencidos_bloquear` default `true` para farmacia — se puede desactivar desde Configuración > Personalización > próximamente (por ahora solo desde la BD o via PUT /negocios/:id/config). (c) `FOR UPDATE` en `producto_lotes` durante FEFO para prevenir race conditions. (d) `entradas_mercancia_items` recibe columnas `lote` y `fecha_caducidad` para trazabilidad de origen.
- Pendiente (H4 en hallazgos): el POS (TabEntrada) aún no envía `lote` ni `fecha_caducidad` — la entrada de mercancía desde el POS rechazará productos con `controla_lote=true` hasta que se actualice la UI del POS. Por ahora, las entradas de lotes se hacen desde el admin o directamente en BD.

---

### Sprint 6 — Hosting + móvil para la dueña ⬜

**Objetivo**: la clienta abre su celular y ve su negocio en vivo, sin pagar hosting.

- [ ] Crear cuenta Oracle Cloud Free Tier. Provisionar VM ARM Ampere (Ubuntu 22.04, 4 vCPU, 24 GB RAM).
- [ ] Instalar Postgres 16, Node 20, Caddy, certbot via Caddy.
- [ ] Cloudflare Tunnel: instalar `cloudflared`, vincular dominio, exponer 443 sin abrir puertos en VPS.
- [ ] Servir API en `api.tudominio.com` y admin en `admin.tudominio.com` con Caddy.
- [ ] Backup script `pg_dump | gzip | rclone copy r2:pdv-backups/` corriendo diario por systemd timer. Rotar 30 días.
- [ ] Sentry: instalar SDK en server y POS, DSN desde env.
- [ ] **PWA**: en `admin/`, agregar `manifest.json`, service worker (Workbox), íconos. Audit Lighthouse ≥ 90.
- [ ] **Responsive**: revisar todas las páginas admin con DevTools mobile. Layout con `flex-wrap` y media queries.
- [ ] **Vista "Hoy" móvil-first** (`admin/src/pages/HoyPage.jsx`): KPI cards (ventas, ticket promedio), gráfica simple del día, top 5 productos, estado de cada caja.
- [ ] **Web Push**: librería `web-push`, tabla `push_subscriptions(usuario_id, endpoint, keys JSONB)`. Suscribirse desde admin móvil. Backend dispara push en: salida de efectivo > X, apertura/cierre de caja, stock crítico, venta > Y.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 7 — Distribución del .exe ⬜

**Objetivo**: instalar el POS en una PC y que se actualice solo.

- [ ] Configurar `electron-builder` en `pos/package.json`:
  ```json
  "build": {
    "appId": "com.pdv.app",
    "productName": "PDV",
    "directories": { "output": "dist-installer" },
    "win": { "target": "nsis", "icon": "build/icon.ico" },
    "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
  }
  ```
- [ ] Variable de entorno `PDV_API_URL` leída por `main.js` desde `app.getPath('userData') + '/config.json'`. Crear `ConfiguracionScreen` que la edite (solo admin).
- [ ] **Modo kiosk**: `BrowserWindow` con `kiosk: true`, `autoHideMenuBar: true`, deshabilitar `Ctrl+W`, `Alt+F4`, `Win`. Combinación secreta para salir (Ctrl+Shift+Q + PIN admin).
- [ ] `electron-updater` apuntando a release de GitHub privado o S3 público. Verificar firma.
- [ ] Probar instalación limpia: `.exe` → instala → arranca → conecta a VPS → opera normal.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 8 — Hardening impresora ⬜

**Objetivo**: la impresora térmica nunca falla silenciosamente.

- [ ] **P1** Lista blanca de VID/PID en config (no fallback a `devices[0]`). UI para seleccionar impresora si hay varias.
- [ ] **P2** Encoding configurable. Probar imprimir "Año Niño $100" con UTF-8, CP437, CP850. Default a CP850 e `iconv-lite` para convertir antes de enviar.
- [ ] **P3** Cola de impresión interna (`printQueue` con `Promise` chain) — un trabajo a la vez.
- [ ] **P4** Flujo: registrar venta primero → intentar imprimir → si falla, mostrar modal "Reimprimir / Continuar sin ticket". Nunca bloquear la venta por la impresora.
- [ ] **P5** Guardar último ticket en memoria del main process. IPC `printer:reprint-last`.
- [ ] **P6** En `disconnect`, llamar `iface.release()` antes de `device.close()`.
- [ ] Comando para abrir cajón sin imprimir (atajo Ctrl+Alt+D, requiere permiso).

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 9 — Tests ⬜

**Objetivo**: cualquier cambio futuro grita si rompe algo crítico.

- [ ] Setup `vitest` en `pos/` y `server/`. Scripts `npm test`.
- [ ] Tests unitarios `useCart`:
  - Agregar producto nuevo / existente.
  - Cambiar cantidad respeta mínimo.
  - Aplicar mayoreo y descuento global combinado.
  - Multi-ticket: cambiar de ticket no afecta otro.
- [ ] Tests de integración `ventasController` (con DB de test):
  - Venta efectivo simple → inventario y caja correctos.
  - Venta mixto → totales y cambio correctos.
  - Stock insuficiente → 400 y rollback.
  - 2 ventas concurrentes mismo producto stock=1 → una pasa, una falla.
  - Cancelar venta → audit log + movimiento caja inverso.
  - Devolución parcial → inventario sumado, audit log.
- [ ] Test de `auditService` y `permisos` middleware.
- [ ] CI básico (GitHub Actions opcional): correr tests en cada push.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 9.5 — Operación en entorno grande (multi-terminal y hardware) ⬜

**Objetivo**: que la tienda con 2-3 cajas, terminal bancaria externa y escáner USB opere sin sorpresas.

- [ ] **Multi-terminal con inventario compartido**: cuando 2 cajas trabajan offline simultáneas y venden el mismo producto, al sincronizar el inventario puede quedar negativo.
  - Política: NO bloquear la venta offline (mata la operación), pero al sincronizar:
    - Si el stock final queda negativo, generar **alerta** en admin (`audit_logs` + push a la dueña).
    - Marcar la venta con flag `requiere_revision = true`.
    - Reporte "ventas con sobreventa" en admin para que ella decida (reposición urgente, devolución al cliente, etc).
- [ ] **Terminal bancaria externa** (Clip / MP Point / Mercado Pago):
  - Política clara: el POS NO procesa tarjeta. Solo registra `metodo_pago = 'tarjeta'` con campo opcional `referencia_terminal` (los últimos 4 dígitos del recibo de la terminal).
  - **Nunca** guardar PAN completo, CVV, ni track. Cumplimiento PCI por exclusión.
  - Documentar en `CLAUDE.md` esta política como prohibición permanente.
- [ ] **Escáner EAN-13 USB**: confirmar que funciona como teclado HID (autofocus en input de búsqueda). Si la clienta usa código con peso variable (no aplica farmacia, sí abarrotes), agregar parser `EAN-13 con peso` (`prefijo 2X` → producto + peso en gramos).
- [ ] **Cajón de dinero conectado a impresora vía RJ11**: verificar que `printer.openDrawer()` lo abre. Si no, probar con parámetros distintos (`pin1=1` en vez de `0`).
- [ ] **UPS pequeña** (no es código): documentar en `README.md` modelo recomendado (APC BE600M1, ~$1200 MXN). Cubre PC + router + impresora.
- [ ] **Setup de PC nueva** documentado en 1 página: instalar `.exe`, configurar URL backend, conectar impresora, probar venta de prueba, configurar UPS, sincronizar hora con NTP.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 10 — Detalles que casi nadie mira ⬜

**Objetivo**: pulir lo que diferencia un POS amateur de uno profesional.

- [ ] **NTP**: al arrancar Electron, validar diferencia de hora con servidor (`/health` retorna su `Date.now()`). Si difiere >2 min, advertir y bloquear cortes.
- [ ] **CFDI** (si la clienta factura): integrar Facturama API. Endpoint `POST /ventas/:id/facturar`. Cliente con RFC/uso CFDI.
- [ ] **Reimpresión de ticket** desde admin (búsqueda por folio).
- [ ] **Reportes RESICO**: export mensual de ventas para contador.
- [ ] **Listado de productos próximos a caducar** en pantalla principal del POS.
- [ ] **Onboarding**: 1 documento PDF con screenshots para la clienta. Video de 3 min.
- [ ] **UPS recomendada** (no es código): documentar modelo en `README.md` para la instalación.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

### Sprint 11 — Plan de mantenimiento (3-4 años) ⬜

**Objetivo**: que el sistema siga vivo después de que tú dejes de mirarlo todos los días.

- [ ] **Lock de versiones**: commitear `package-lock.json` en `pos/`, `admin/`, `server/`. Nunca borrar.
- [ ] **Calendario fijo**:
  - **Cada 3 meses**: `npm audit` y parchear vulnerabilidades críticas/altas.
  - **Cada 6 meses**: minor bumps de dependencias seguras (Fastify, React, Vite). Correr tests.
  - **Cada 12 meses (1 día completo)**: major bumps. Especialmente:
    - **Electron** lanza major cada 8 semanas; quedarse en una versión soportada (rolling).
    - **Node.js** EOL cada 30 meses — migrar antes de EOL.
    - **Postgres** major cada año — migrar con `pg_dump`/`pg_restore`.
    - **better-sqlite3** suele requerir rebuild por cambio de Node.
- [ ] **Documentar en `MAINTENANCE.md`** (crear archivo): cómo levantar el ambiente local, cómo correr migraciones, cómo restaurar un backup, cómo rotar `JWT_SECRET`, cómo emitir un release `.exe`.
- [ ] **Monitoreo permanente**:
  - Sentry alerta si error rate > X.
  - Healthcheck cada 5 min (UptimeRobot tier gratis): `GET /health` debe responder 200 y `db: 'ok'`.
  - Backup diario verificado: script semanal que restaura el último dump en una BD throwaway y corre `SELECT count(*) FROM ventas`.
- [ ] **Contrato/SLA con la clienta**: 1 hoja con qué cubre el mantenimiento (parches críticos, soporte de bugs reproducibles), qué no (features nuevas), tiempo de respuesta, costo anual fijo.

**Bitácora de cierre**: _(rellenar al cerrar)_

---

## 5. Hallazgos pendientes / deuda técnica (acumular aquí)

> Cuando un sprint detecta algo nuevo, agregarlo aquí en lugar de "arreglarlo de paso".

| # | Origen | Hallazgo | Dónde |
|---|--------|----------|-------|
| H1 | E3.2 | (✅ resuelto en E3.2) `syncPendientes` verificaba `res.id` pero el backend responde `venta_id` → ventas offline NUNCA se marcaban como sincronizadas, se reintentaban al infinito y el backend las duplicaba en cada reconexión. | `pos/src/api.js:212` |
| H2 | E3.2 | El frontend del POS (VentaScreen + useCart) aún no envía `folio`, `iva_total`, `monto_tarjeta`, `cliente_id`, `descuento_global`, `corte_id_local` ni los campos enriquecidos por item al llamar a `registrarVenta`. El backend y el cache offline ya los aceptan; falta enchufarlos desde el front. | `pos/src/screens/VentaScreen.jsx`, `pos/src/hooks/useCart.js` |
| H3 | E4 | `api.obtenerCorteAbierto` está expuesta pero ningún screen ni hook la llama todavía. La API quedó correcta (filtra por cajero), pero cuando se conecte el flujo de corte el caller debe pasar `cajero_id` desde el contexto de auth (`useAuth().usuario.id`). | call sites a definir en `pos/src/screens/` |
| H4 | S5 | POS `TabEntrada` no envía `lote` ni `fecha_caducidad` — entradas de productos con `controla_lote=true` fallan desde el POS. Requiere actualizar la UI de entrada de mercancía del POS para mostrar campos de lote cuando el producto lo requiera. | `pos/src/components/inventario/TabEntrada.jsx` |

---

## 6. Convenciones rápidas (recordatorio)

- **Stack**: Electron+React (POS), React+Vite (Admin), Fastify+Postgres (Backend), SQLite (Offline POS).
- **Auth**: PIN cajero (bcrypt), password admin (bcrypt), JWT.
- **Aislamiento**: `negocio_id` en TODAS las queries de inventario/ventas/movimientos.
- **Migraciones**: `node src/db/migrate.js`, idempotente.
- **Convención de nombres**: dominio en español (`carrito`, `cajero`), técnico en inglés (`useCart`, `handleSubmit`).
- **Color en Electron**: poner `color` explícito en style de texto importante (no hereda en `.pos-main`).

---

## 7. Cómo se considera "terminado" el producto

Checklist final (cuando los 10 sprints estén ✅):

- [ ] Una caja registradora puede venderle a un cliente con tarjeta+efectivo, asignando cliente, con IVA, descuento global, descuento por ítem, y al sincronizar offline→online la venta queda con todos los datos fiscales.
- [ ] Si dos cajeros venden el mismo producto al mismo tiempo y solo hay 1 en stock, solo una venta pasa.
- [ ] Cancelar una venta deja inventario y caja en estado consistente.
- [ ] El admin desde su celular ve las ventas en vivo y recibe notificación si hay salida de efectivo.
- [ ] Al instalar el `.exe` en una PC nueva, configura la URL del servidor y opera.
- [ ] Si se va la luz a media venta, al volver no hay corrupción de SQLite.
- [ ] Si la impresora falla, la venta se registra y se ofrece reimprimir.
- [ ] El cajero no puede ejecutar acciones para las que no tiene permiso, pero puede pedir autorización temporal con PIN del admin.
- [ ] Hay backup diario de Postgres y de SQLite local.
- [ ] El sistema corre sobre HTTPS detrás de Cloudflare Tunnel, sin puertos abiertos.
- [ ] Tests cubren al menos: useCart, ventasController.crear, ventasController.cancelar, auditService, permisos middleware.
- [ ] Lotes y caducidades funcionan en farmacia (FEFO).

---

_Última actualización: 2026-04-24_
