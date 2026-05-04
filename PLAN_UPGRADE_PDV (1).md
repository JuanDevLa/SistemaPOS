# PLAN DE UPGRADE — PUNTO DE VENTA
### Inspirado en Eleventa + Módulo de Recargas Electrónicas

**Inicio**: 2026-04-12 | **Última actualización**: 2026-04-16

---

# 🔴 PENDIENTE — POR HACER (en orden de prioridad)

---

## ✅ P1 — DEVOLUCIONES — Completada 2026-04-16
**Estado**: Modal conectado. Backend, tabla `devoluciones`/`devolucion_items`, endpoint `POST /ventas/:id/devolucion` y métodos `api.obtenerVenta` / `api.registrarDevolucion` implementados. Correr `node migrate.js` para crear las tablas.

**Qué falta:**
- `api.obtenerVenta(id)` en `pos/src/api.js` — no existe
- `api.registrarDevolucion()` en `pos/src/api.js` — no existe
- Endpoint `POST /ventas/:id/devolucion` en el backend — no existe
- El endpoint `DELETE /ventas/:id` cancela la venta completa pero no hace devolución parcial

**Qué hay que hacer:**
1. Backend: crear endpoint `POST /ventas/:id/devolucion` que reciba items a devolver, revierta inventario, registre movimiento en `movimientos_inventario` tipo `devolucion`, y cree registro en nueva tabla `devoluciones`
2. POS api.js: agregar `obtenerVenta(id)` y `registrarDevolucion(id, items)`
3. ModalDevoluciones: ya tiene la UI, solo conectarla a los métodos reales

**Archivos a tocar:**
- `server/src/controllers/ventasController.js` — agregar `devolucion()`
- `server/src/routes/ventas.js` — registrar la ruta
- `server/src/db/migrate.js` — tabla `devoluciones`
- `pos/src/api.js` — agregar métodos
- `pos/src/components/venta/ModalDevoluciones.jsx` — conectar a API real

---

## ✅ P2 — DESCUENTOS POR % O $ AL TICKET — Completada 2026-04-16
**Estado**: `aplicarDescuentoGlobal` en useCart (por ticket), `ModalDescuento.jsx` creado, botón en ZonaTotales, atajo CTRL+K, descuento enviado al backend en `registrarVenta`.

**Qué falta:**
- Un modal/interfaz para aplicar descuento % o $ al total del ticket
- Que ese descuento se refleje en el total antes de cobrar
- Que se guarde en la venta (el backend ya tiene campo `descuento` en ventas)
- `useCart` tiene `aplicarPrecioFijo()` por producto pero no descuento global

**Qué hay que hacer:**
1. `useCart.js`: agregar `aplicarDescuentoGlobal(tipo, valor)` — recalcula total
2. Modal nuevo `ModalDescuento.jsx` o extender `ModalMayoreo.jsx`
3. VentaScreen: conectar atajo (sugerencia: CTRL+D) y botón en ZonaTotales
4. Enviar el descuento al backend en `registrarVenta()`

**Archivos a tocar:**
- `pos/src/hooks/useCart.js`
- `pos/src/components/venta/ModalDescuento.jsx` (NUEVO)
- `pos/src/screens/VentaScreen.jsx`

---

## ✅ P3 — DESGLOSE DEL CORTE EN EL POS + IMPRESIÓN — Completada 2026-04-16
**Estado**: Backend retorna `resumen_por_metodo`, `movimientos_caja` y `negocio`. CorteScreen muestra desglose completo con entradas/salidas. Botón imprimir conectado. printer-service imprime movimientos.

**Qué falta:**
- `CorteScreen` solo muestra diferencia (contado vs esperado). No muestra ventas por método
- No hay botón de imprimir corte
- `printer-client.js` existe para tickets pero no para cortes

**Qué hay que hacer:**
1. `CorteScreen.jsx`: al cerrar corte, llamar a `api.obtenerCorte(id)` para traer el desglose completo
2. Mostrar resumen: ventas efectivo, tarjeta, transferencia, crédito, fiado, entradas/salidas
3. Agregar botón "Imprimir corte" que llame a `printCorte()` en printer-client

**Archivos a tocar:**
- `pos/src/screens/CorteScreen.jsx`
- `pos/src/api.js` (POS) — agregar `obtenerCorte(id)`
- `pos/src/printer-client.js` — agregar `printCorte(data)`

---

## ✅ P4 — FASE D PARTE 2: INVERSIÓN EN INVENTARIO + MÍNIMOS/MÁXIMOS — Completada 2026-04-16
**Estado**: Columna `maximo` en inventario. Endpoint `GET /inventario/inversion` retorna total + por categoría. Widget en InventarioPage, columna máximo en tabla, sugerencia de compra en modal ajuste.

**Qué falta:**
- Columna `maximo` en tabla `inventario` (para sugerir cuánto comprar)
- Endpoint `GET /inventario/inversion` — suma `cantidad × costo` por departamento
- Widget en `InventarioPage` mostrando inversión total y por departamento
- En modal de ajuste: mostrar sugerencia "comprar X para llegar al máximo"

**Qué hay que hacer:**
1. `migrate.js`: `ALTER TABLE inventario ADD COLUMN IF NOT EXISTS maximo INT`
2. Backend: agregar `inversion()` a inventarioController
3. `InventarioPage`: widget resumen arriba de la tabla + columna máximo en modal ajuste

**Archivos a tocar:**
- `server/src/db/migrate.js`
- `server/src/controllers/inventarioController.js`
- `server/src/routes/inventario.js`
- `admin/src/pages/InventarioPage.jsx`

---

## ✅ P5 — IMPORTACIÓN CSV DE PRODUCTOS — Completada 2026-04-16
**Estado**: Botón "Importar CSV/Excel" en ProductosPage, parseo con `xlsx`, preview de 50 filas, envío bulk al backend. Backend inserta con `ON CONFLICT DO NOTHING` y reporta creados/duplicados/errores.

**Qué hay que hacer:**
1. Admin: página o sección en ProductosPage con botón "Importar CSV/Excel"
2. El usuario sube el archivo, se parsea en el frontend con `xlsx`
3. Se muestra preview en tabla antes de confirmar
4. Se envía bulk al backend: `POST /productos/importar` con array de productos
5. Backend valida, inserta, reporta cuántos creados / cuántos duplicados

**Archivos a tocar:**
- `admin/src/pages/ProductosPage.jsx` — agregar sección importar
- `server/src/controllers/productosController.js` — agregar `importar()`
- `server/src/routes/productos.js` — registrar ruta

---

## ✅ P6 — CORTES PRO (FASE E) — Completada 2026-04-16
**Estado**: Widget "corte del día" con selector de fecha, totales consolidados y ventas por método. Top 10 productos en modal detalle. Exportar corte individual a Excel (3 hojas). Toggle "ocultar ef. esperado al cajero" por negocio — activo en POS.

**Qué falta:**
- Vista "Corte del día" en admin: suma de todos los turnos del día
- Opción de no mostrar el efectivo esperado al cajero (configurable)
- Top productos vendidos en el turno
- Exportar corte a PDF/Excel desde admin

**Archivos a tocar:**
- `server/src/controllers/cortesController.js`
- `admin/src/pages/CortesPage.jsx`

---

## ✅ P7 — REPORTES Y DASHBOARD PRO (FASE H) — Completada 2026-04-16
**Estado**: ReportesPage y backend ya existían. Agregado: reporte por departamento (backend + sección en página), botón "Exportar Excel" que genera 6 hojas (Resumen, Por método, Por cajero, Por departamento, Top productos, Por día).

**Qué falta:**
- Gráfica de ventas diarias últimos 7/30 días (Recharts)
- Filtro por rango de fechas
- Top 10 productos más vendidos
- Reporte de ventas por departamento
- Página `/reportes` separada del dashboard
- Exportar a Excel

**Archivos a tocar:**
- `admin/src/pages/DashboardPage.jsx`
- `admin/src/pages/ReportesPage.jsx` (NUEVO)
- `server/src/controllers/reportesController.js` (NUEVO)
- `server/src/routes/reportes.js` (NUEVO)

---

## ✅ P8 — PERMISOS GRANULARES (FASE I) — Completada 2026-04-26 (parcial)
**Estado**: Implementado y en uso. Backend valida con `verifyPermiso(clave)` (`server/src/middleware/auth.js`) en routes sensibles. Admin gestiona permisos vía `PERMISOS_TABS` en `UsuariosPage.jsx`. POS gatea botones con `usePermisos().puede('clave')` en VentaScreen, CorteScreen, ProductosScreen, InventarioScreen, ComprasScreen. `PERMISOS_DEFAULT` se aplica al crear cajero.

**Pendiente menor:**
- "Autorización temporal": cajero pide PIN de admin para ejecutar una acción sin permiso (no implementado)

---

## P9 — RECARGAS ELECTRÓNICAS (FASE F) — CRÍTICA PARA INGRESOS
**Estado**: 0% implementado. No existe ningún archivo.

**Qué hay que hacer:**
1. Registrarse con Taecel o SIPREL (gratis)
2. Tablas: `recargas`, `config_recargas`, `comisiones_recargas`
3. Backend: servicio de integración con API del proveedor, endpoints
4. POS: pantalla nueva `RecargasScreen` con selector de compañía + montos
5. Admin: configuración de API keys + reporte de recargas y ganancias

**Archivos nuevos:**
- `server/src/services/recargasService.js`
- `server/src/services/taecelAdapter.js`
- `server/src/controllers/recargasController.js`
- `server/src/routes/recargas.js`
- `pos/src/screens/RecargasScreen.jsx`
- `admin/src/pages/RecargasConfigPage.jsx`
- `admin/src/pages/RecargasReportePage.jsx`

---

## P10 — ELECTRON-BUILDER + INSTALADOR .EXE (FASE K)
**Estado**: `electron-builder` instalado pero sin ninguna configuración. El build falla.

**Qué hay que hacer:**
1. Agregar configuración en `pos/package.json` (appId, nombre, icono, directorios)
2. Crear script de build completo: `vite build` → `electron-builder`
3. Configurar URL del servidor en producción (variable de entorno)
4. Probar que el `.exe` instala y corre correctamente
5. Auto-update opcional con `electron-updater`

**Archivos a tocar:**
- `pos/package.json` — sección `build` de electron-builder
- `pos/src/main.js` — asegurar que lee URL del servidor desde env

---

## P11 — PAGO DE SERVICIOS (FASE G)
**Estado**: 0% implementado. Reutiliza infraestructura de Recargas (P9).
**Depende de**: P9 completado primero.

---

# ✅ COMPLETADO

---

## ✅ FASE 0 — Login + Apertura de Caja
- Pantalla de login con PIN para cajeros
- Modal de apertura de caja con efectivo inicial
- Flujo post-login con selección de negocio
- Indicador de caja sin abrir en barra de estado

## ✅ FASE A — Módulo de Clientes + Crédito/Fiado
- Tabla `clientes` con datos completos (nombre, teléfono, domicilio, RFC, etc.)
- Tabla `creditos` — venta fiada = crédito registrado
- Tabla `abonos` — pagos parciales o totales
- CRUD de clientes en admin (`ClientesPage`)
- CRUD de créditos en admin (`CreditosPage`)
- `ClientesScreen` en POS — búsqueda, estado de cuenta, registrar abono
- `CreditosScreen` en POS — gestión de créditos activos
- Flujo de cobro a crédito en VentaScreen (método `credito` y `fiado`)
- `ModalAsignarCliente` — vincular venta a cliente

## ✅ FASE B — Layout Maestro + Pantalla de Venta (Niveles 1-3)

### Layout maestro
- Header con nombre del cajero, negocio, estado de caja e indicador online/offline
- TabNavigation con atajos F1-F4
- ContextBar por tab activo
- Footer con reloj en tiempo real

### Pantalla de venta
- Campo de búsqueda con auto-foco y búsqueda por código/nombre
- Múltiples tickets simultáneos con pestañas (PestanasTickets)
- Tabla del carrito con edición de cantidad inline (TablaCarrito)
- ZonaTotales: total, pagó con, cambio, botones de acción
- F12 — Panel de cobro: efectivo, tarjeta, crédito, fiado, con búsqueda de cliente inline
- F5 — Nuevo ticket
- F6 — Guardar ticket como pendiente con nombre (`ModalTicketPendiente`)
- F7 — Entrada de efectivo en caja (`ModalMovimientoCaja`)
- F8 — Salida de efectivo en caja
- F9 — Verificador de precios (`ModalVerificador`)
- F10 — Buscador avanzado de productos (`ModalBuscar`)
- F11 / CTRL+M — Aplicar precio mayoreo al producto seleccionado
- INS — Modal Varios (código + cantidad)
- CTRL+P — Artículo común sin código (precio manual)
- CTRL+C — Asignar cliente a la venta
- DEL — Borrar artículo con confirmación
- Eliminar ticket completo con confirmación
- `ModalCambiarTicket` — lista de tickets abiertos para cambiar
- `ModalFiado` — captura nombre de cliente para fiar
- `ModalDevoluciones` — UI existe, **backend pendiente (ver P1)**

### Refactor técnico
- `useCart.js` — toda la lógica del carrito extraída de VentaScreen
- `InventarioScreen.jsx` — extraído de VentaScreen (288 LOC)
- `CorteScreen.jsx` — extraído de VentaScreen (144 LOC)
- VentaScreen reducido de 1084 → 684 LOC
- `api.js` (POS) — try/catch en todas las llamadas, devuelve `{ error }` en vez de lanzar

## ✅ FASE B — Backend de soporte
- Tabla `movimientos_caja` — entradas y salidas de efectivo
- `movimientosCajaController.js` + ruta registrada
- `ventasController.js` — registra venta, items, actualiza inventario, registra movimiento caja
- Soporte para métodos de pago: efectivo, tarjeta, transferencia, crédito, fiado

## ✅ FASE C — Productos Pro (parcial)
- Departamentos administrables — tabla `departamentos`, CRUD en admin, página `/departamentos`
- Cálculo automático de ganancia — campo `% Ganancia` en formulario, precio calculado en tiempo real
- Unidades simplificadas — solo Pieza y Caja
- `departamento_id` en tabla productos (migración aplicada)
- Columna Ganancia en tabla de productos del admin con % de margen
- Búsqueda en ProductosPage incluye departamento

## ✅ FASE D — Inventario Pro (parcial)
- Tipos de ajuste: ajuste general, merma, robo, dañado, error de captura
- Kardex por producto — modal con historial completo, saldo acumulado por window function SQL, colores por tipo de movimiento
- `InventarioPage` actualizada — botón Kardex + modal Kardex + selector tipo en modal ajuste
- `InventarioScreen` en POS — Entrada de mercancía + Carga inicial de inventario

## ✅ CAJEROS — Configuración POS (2026-04-18)
- `PERMISOS_DEFAULT` con los 15 permisos activos (igual que Eleventa) — se aplican automáticamente al crear un cajero nuevo
- Reactivar cajero — modal de confirmación antes de ejecutar el toggle; al confirmar ejecuta y cierra el formulario
- Guardar cajero — confirmación con nombre del cajero antes de guardar

**Archivos tocados:**
- `pos/src/screens/configuracion/CajerosSection.jsx`

---

## ✅ INFRAESTRUCTURA GENERAL
- Stack: Electron + React (POS), React + Vite (Admin), Node.js + Fastify (Backend), PostgreSQL
- Autenticación: PIN numérico para cajeros, JWT para admin web
- Offline: SQLite local en Electron con auto-sync al recuperar conexión
- Separación por `negocio_id` en todas las queries
- `migrate.js` idempotente con `CREATE TABLE IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS`
- Impresión térmica via `printer-client.js` (tickets de venta)
- Indicador online/offline con sync automático de pendientes
