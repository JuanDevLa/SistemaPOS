# Punto de Venta — Contexto del Proyecto

## Stack
- **POS**: Electron + React (`pos/`) — escritorio Windows, pantalla completa
- **Admin**: React + Vite (`admin/`) — panel web
- **Backend**: Node.js + Fastify + PostgreSQL (`server/`) — VPS
- **Offline**: SQLite local en Electron, auto-sync al reconectar
- **Auth**: PIN numérico (cajeros), JWT (admin web)

## Negocios
- Farmacia Noriega y Crucero Independencia
- Inventario separado por `negocio_id` — nunca mezclar datos entre negocios
- Hardware: PC Windows + escáner EAN-13 + impresora térmica Blackpos WW-5888T (58mm USB)

---

## Estructura (para no romper lo que funciona)

**POS (`pos/src/`)**
- `screens/VentaScreen.jsx` (~1100 LOC) — crítico y frágil
- `screens/CreditosScreen.jsx`, `screens/ClientesScreen.jsx`
- `api.js` — wrapper online/offline con fallback a SQLite
- `components/venta/` — 17+ modales

**Backend (`server/src/`)**
- `controllers/`, `routes/` (1 archivo por módulo)
- `db/migrate.js` — migraciones manuales (`node migrate.js`)
- Tablas: `negocios, usuarios, productos, inventario, ventas, venta_items, cortes_caja, movimientos_inventario, clientes, creditos, abonos, movimientos_caja`

**Admin (`admin/src/`)**
- `pages/` — 7 páginas CRUD con patrón búsqueda + tabla + modal edición

---

## Reglas

**POS**
- Lógica de carrito → `useCart()` hook, no en VentaScreen
- Usuario/negocio activo → contexto React, no props
- Nuevas pantallas → archivo propio en `screens/`
- Modales → componente autónomo en `components/venta/` (data + callbacks, no estado global)
- Toda llamada `api.js` → try/catch con mensaje al usuario

**Backend**
- Input de usuario → validar con schema Fastify
- Operaciones de 2+ tablas → transacción PostgreSQL
- Toda salida de inventario → registrar en `movimientos_inventario`
- Toda entrada/salida de efectivo → registrar en `movimientos_caja`

**Admin**
- Seguir el patrón de las páginas existentes, no duplicar lógica de filtrado/búsqueda

---

## Prohibiciones

- No fixes mínimos — siempre resolver la causa raíz completa, no parchar síntomas
- No `useState` en `VentaScreen.jsx` para lógica de negocio — crear hook
- No `await api.*()` sin try/catch
- No lógica de negocio inline en JSX
- No estilos inline con >1 propiedad — usar objeto `estilos` o CSS
- No modificar `db/migrate.js` sin documentar la tabla nueva en `PLAN.md`
- No mezclar datos de dos negocios sin filtrar por `negocio_id`

---

## Reglas POS (Electron)

**Color de texto — CRÍTICO**: En Electron, el color NO hereda correctamente del `body` dentro de `.pos-main`. Todo texto en screens del POS que no tenga clase CSS debe llevar `color` explícito en su style. Ejemplos:
- `{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }` ← correcto
- `{ fontWeight: 600, fontSize: 13 }` ← texto invisible en algunos contenedores

La raíz está resuelta en `.pos-main { color: #1a1a1a }` en `pos-desktop.css`, pero como regla defensiva: siempre poner color explícito en texto importante dentro de paneles.

---

## Eficiencia de tokens (reglas de trabajo)

- **Leer archivos con offset/limit** — nunca leer archivos >200 LOC completos si solo se necesita una sección
- **Bug recurrente → causa raíz primero** — antes de parchear la misma issue en múltiples lugares, buscar con `Grep` y resolver en el origen (CSS, utilidad, etc.)
- **Grep antes de Read** — para encontrar dónde está algo, usar Grep; Read solo cuando ya se sabe el archivo y la sección
- **Screens del POS ≤ 300 LOC** — si una screen supera eso, dividir en sub-componentes en archivos separados
- **No re-leer archivos ya leídos** en la misma sesión — confiar en el contexto de conversación

---

## Fases (detalle en `PLAN_UPGRADE_PDV.md`)

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Login + apertura de caja | ✅ |
| A | Clientes + Crédito/Fiado | ✅ |
| B | Layout + Pantalla de Venta | ✅ COMPLETADA 2026-04-16 |
| C | Productos Pro | ⬜ |
| D | Inventario Pro + Kardex | ⬜ |
| E | Cortes de Caja Pro | ⬜ |
| F | Recargas Electrónicas (CRÍTICA) | ⬜ |
| G | Pago de Servicios | ⬜ |
| H | Reportes y Dashboard Pro | ⬜ |
| I | Permisos Granulares | ⬜ |
| J | UX Polish + Onboarding | ⬜ |
| K | Deploy + Instalador .exe | ⬜ |

Próximo: Tabs del POS (compras, reportes, configuracion). Fase C en curso.

---

## Permisos canónicos (Sprint 4)

> Fuente única de verdad: `admin/src/pages/UsuariosPage.jsx → PERMISOS_TABS`. Si agregas/renombras una clave, actualiza también `pos/src/components/CajerosSection.jsx` y `admin/src/components/CajerosSection.jsx` (mismo array). Backend valida con `verifyPermiso(clave)` (`server/src/middleware/auth.js`); rol `admin` siempre pasa.

**Ventas**: `usar_producto_comun`, `aplicar_mayoreo`, `aplicar_descuento`, `historial_ventas`, `entrada_efectivo`, `salida_efectivo`, `cobrar_ticket`, `cobrar_credito`, `cancelar_devolver`, `eliminar_articulo_venta`, `facturar`, `vender_servicios`, `vender_recargas`, `buscar_productos`

**Clientes**: `clientes_crud`, `asignar_cliente`, `credito_clientes`, `ver_cuentas_credito`

**Productos**: `crear_productos`, `modificar_productos`, `eliminar_productos`, `ver_reporte_ventas`, `crear_promociones`, `modificar_varios`

**Inventario**: `agregar_mercancia`, `ver_existencias`, `ver_movimientos_inv`, `ajustar_inventario`

**Otros**: `corte_propio`, `corte_todos`, `corte_dia`, `ver_ganancia_dia`, `cambiar_config`, `ver_reportes`, `crear_ordenes_compra`, `recibir_ordenes_compra`

**Reglas al aplicar**:
- Backend: en cada route sensible → `preHandler: [verifyJWT, verifyPermiso('clave')]`. Si la clave depende del body (ej. `movimientos-caja` POST → `entrada_efectivo` vs `salida_efectivo`), validar en el controller.
- POS frontend: gatear el botón con `usePermisos().puede('clave')` y mostrar `setMensaje('Sin permiso: ...')` si falla. Defensivo: gatear también dentro del hook/servicio que ejecuta la acción.
- Lectura de catálogos compartidos (`/departamentos` GET, `/proveedores` GET, `/negocios` GET, `/recargas/companias`) queda con `verifyJWT` solo — los necesitan formularios que cualquier autenticado abre.

---

## Convenciones

- Nombres en español para dominio (`carrito, ticket, cajero, negocio`), inglés para patrones técnicos (`useCart, handleSubmit, onClose`)
- Fechas UTC en BD, formatear al mostrar
- Montos `DECIMAL(10,2)` en BD, `parseFloat().toFixed(2)` en JS
- `negocio_id` siempre presente en queries de inventario/ventas/movimientos
