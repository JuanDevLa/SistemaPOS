# PLAN: Productos por negocio + Webhook MP

Sesión: 2026-05-08

## Contexto

Dos cambios paralelos al POS:

1. **Aislamiento estricto de productos por `negocio_id`**. Hasta ahora `productos` era catálogo global; un alta en Farmacia Noriega aparecía también en Crucero Independencia. Cliente confirma que cada negocio mantiene su propio catálogo, mismo código de barras puede coexistir entre tiendas.
2. **Webhook MP con HTTPS para evitar pagos colgados**. El polling-only a la API de MP ocasionalmente deja al POS esperando aunque la terminal aprobó. Con el VPS ya con `pos-farmacia.duckdns.org` + Let's Encrypt, alimentamos un estado autoritativo local desde MP.

## Fase 1 — Productos por negocio

### Cambios de esquema (migrate.js)

- [x] `productos.negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE`
- [x] Backfill: cada producto recibe el primer `negocio_id` que lo tenga en `inventario`; productos huérfanos al `MIN(id)` de `negocios`
- [x] `negocio_id NOT NULL`
- [x] Drop `productos_codigo_barras_key`; add `UNIQUE (codigo_barras, negocio_id)`
- [x] Índice `idx_productos_negocio (negocio_id, activo)`

### Backend (`productosController.js`)

- [x] Helper `resolverNegocioId(request)` — admins respetan `query.negocio_id`, todos los demás van atados al JWT
- [x] `listar`: exige `negocio_id`, agrega `WHERE p.negocio_id = $1`
- [x] `buscar`: `AND p.negocio_id = $X`
- [x] `obtener`: `AND negocio_id = $2`
- [x] `crear`: inserta `negocio_id`, crea fila inicial en `inventario(producto_id, negocio_id, 0)` en transacción; reactivación 23505 filtra por negocio
- [x] `editar`: `AND negocio_id = $X` en SELECT y UPDATE; `audit` ahora con negocio_id correcto
- [x] `desactivar`: filtrado; movimiento de baja sólo en el negocio dueño
- [x] `importar`: agrega `negocio_id` y crea `inventario` por cada producto creado
- [x] `catalogo`: `AND p.negocio_id = $1`

### Frontend Admin

- [x] `ProductosPage`: pasa `usuario?.negocio_id || 1` a `listarProductos`, `listarDepartamentos`, `ModalProductoForm` y `ModalImportarProductos`
- [x] `ModalProductoForm`: incluye `negocio_id` en el body de `crearProducto`
- [x] `ModalImportarProductos`: recibe `negocioId` por prop y lo manda a `importarProductos`
- [x] `admin/api.js`: `importarProductos(productos, negocio_id)` con query string

### Frontend POS

- No requiere cambios: el cajero ya lleva `negocio_id` en su JWT y `resolverNegocioId` lo usa automáticamente. `crearProducto` desde POS recibe el negocio del JWT, no necesita pasarlo en el body.

### Pendiente (fuera de scope, futuro)

- Selector de negocio en el panel admin para cambiar entre tiendas sin re-loguear
- Token admin con `negocio_id` para que admins también queden atados (defensa en profundidad)

## Fase 2 — Webhook Mercado Pago

### Cambios de esquema (migrate.js)

- [x] Tabla `mp_intent_estados (intent_id PK, estado, payment_id, payment_state, monto, raw, recibido_en, actualizado_en)`
- [x] Trigger `actualizado_en` agrega `mp_intent_estados`

### Backend (`mpController.js`)

- [x] `crearIntentoPago`: agrega `notification_url` y persiste el intent en `mp_intent_estados` con estado `OPEN`
- [x] `obtenerEstadoIntento` (NUEVO): lee la tabla local primero; si no hay estado terminal, consulta MP y refresca la tabla
- [x] `recibirWebhook` (NUEVO):
  - Valida firma HMAC-SHA256 con `MP_WEBHOOK_SECRET` y header `x-signature` (formato `ts=...,v1=...`)
  - Ventana anti-replay de 5 minutos contra `ts`
  - Consulta el intent a MP para no confiar en el payload, hace UPSERT en la tabla
  - Devuelve 200 incluso ante errores propios para evitar reintentos infinitos de MP
- [x] Mantenemos `obtenerIntentoPago` (`/mp/payment-intents/:id` directo a MP) por compatibilidad y debugging

### Routes (`routes/mp.js`)

- [x] `GET /mp/payment-intents/:id/estado` (verifyJWT) → endpoint que consume el POS
- [x] `POST /mp/webhook` (sin auth, rate limit propio) → callback MP

### Frontend POS

- [x] `pos/api.js`: `mpObtenerIntento` ahora apunta a `/mp/payment-intents/:id/estado`
- El hook `useMercadoPagoPoint` no requiere cambios: estados desconocidos siguen el polling, FINISHED/CANCELED/ERROR resuelven igual

### Variables de entorno (`.env` del VPS)

- `MP_WEBHOOK_URL=https://pos-farmacia.duckdns.org/mp/webhook`
- `MP_WEBHOOK_SECRET=<secret del panel MP>`

### Configuración panel MP

- Notificaciones webhooks: URL `https://pos-farmacia.duckdns.org/mp/webhook`
- Eventos: `payment` y `point_integration_wh`
- Copiar el secret a `MP_WEBHOOK_SECRET`

## Despliegue

1. Backup `pg_dump` (ya hecho)
2. `git pull` en el VPS
3. `node server/src/db/migrate.js`
4. Verificar que `.env` tenga `MP_WEBHOOK_URL` y `MP_WEBHOOK_SECRET`
5. `pm2 restart pos-server`
6. Probar:
   - Crear producto en Farmacia Noriega → confirmar que NO aparece al loguear como Crucero Independencia
   - Crear producto con mismo código de barras en ambos negocios → ambos coexisten
   - "Simular notificación" desde panel MP → verificar fila en `mp_intent_estados`
   - Cobro real $1 con tarjeta propia → POS confirma sin polling colgado

## Riesgos conocidos

- **Admin web sin `negocio_id` en JWT**: el resolver permite admins pasar `query.negocio_id` libremente. Defensa actual: el panel siempre fija `negocioId = usuario?.negocio_id || 1`. Si hubiera un admin malicioso pasando otro `negocio_id`, hoy el sistema lo permitiría — aceptable mientras todos los admins son confiables, no es un boundary externo.
- **MP firma con `data.id`**: si MP cambia el formato del manifest, la validación falla. Documentado en el manifest hardcodeado del controller. Revisar docs si MP actualiza la integración.
- **404 transitorio en GET intent**: con la tabla local como fuente primaria, el caso ya no tumba al POS. Si tampoco hay fila local, devuelve el error de MP — comportamiento previo, sin regresión.
