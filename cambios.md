# Plan de implementación — Revisión POS

## Estado de sprints (2026-04-27)
- ✅ Sprint 1 — Reactivar cajeros: `await cargar()` en POS + manejo de errores en admin api.js
- ✅ Sprint 2 — Exportar CSV en Clientes: función `exportarClientes()` conectada al botón
- ✅ Sprint 3 — Permisos: `/recargas/procesar` sin `verifyPermiso`, defaults actualizados en ambas CajerosSection
- ✅ Sprint 4 — Departamentos inventario: JOIN con `departamentos` en backend, filtro por `departamento_id` en frontend
- ✅ Sprint 5 — Existencia en carrito: `useCart` usa `producto.stock_actual` del backend primero
- ✅ Sprint 6 — Estado de Cuenta rediseño: buscador grande, sin saldo en lista, Enter selecciona
- ✅ Sprint 7 — Cantidad en carrito: bloqueada manualmente, solo por escaneo
- ✅ Sprint 8 — Venta exitosa: nueva pantalla limpia con cambio visible y Enter para siguiente venta
- ✅ Sprint 9 — ModalCobrar: deuda en rojo con fecha más antigua al seleccionar cliente
- ✅ Sprint 10 — Clientes: Enter navega entre campos, último Enter guarda; botón Guardar azul cuando hay cambios
- ✅ Sprint 11 — Eliminar cliente requiere autorización admin (ModalAutorizacionAdmin + override token)
- ✅ Sprint 12 — Lucide React instalado; íconos en tabs, header, botones de acción, zona totales, configuración y 15+ modales

---

Instrucciones paso a paso, sin código, ordenadas por fase. Cada punto indica el archivo, qué cambiar y cómo abordarlo.

---

## FASE 1 — Bugs duros (desbloquean operación)

### 1.1 Reactivar cajeros no refresca estado
**Archivo:** `admin/src/pages/UsuariosPage.jsx` (también revisar versión en `pos/`)
- Localizar el handler `confirmToggle` que llama al endpoint PUT de activar/desactivar.
- Verificar que después del `await api.toggleUsuario(...)` se llame a la función `cargar()` (o equivalente) para recargar la lista.
- Si ya se llama, el problema es que el endpoint backend no actualiza el campo `activo` en BD. Revisar `server/src/controllers/usuarios.js` y confirmar que el UPDATE se ejecute con el valor invertido y que devuelva el registro actualizado.
- Asegurar que el `setConfirmToggle(null)` ocurra **después** del refresh, no antes.

### 1.2 Exportar Excel en Clientes no funciona
**Archivo:** `pos/src/screens/ClientesScreen.jsx` (línea ~214 botón sin handler)
- Replicar el patrón de `pos/src/components/inventario/TabReporteInventario.jsx` (función `exportarCSV`).
- Crear función `exportarClientes()` que genere un Blob CSV con encabezados: Folio, Nombre, Apellidos, Teléfono, Email, Saldo, Crédito habilitado.
- Asignar la función al `onClick` del botón existente.
- Renombrar etiqueta a "Exportar CSV" (Excel abre CSV nativamente).

### 1.3 Permisos: remodulación
**Archivos:**
- `server/src/routes/recargas.js` — quitar `verifyPermiso('vender_recargas')` del endpoint `/recargas/procesar`, dejar solo `verifyJWT`.
- `admin/src/pages/UsuariosPage.jsx` (constante `PERMISOS_TABS`) — definir lista de permisos **default ON** para cajeros nuevos.
- `pos/src/components/CajerosSection.jsx` y `admin/src/components/CajerosSection.jsx` — al crear cajero, pre-marcar los default ON.

**Default ON (operación diaria):** `vender_recargas`, `buscar_productos`, `usar_producto_comun`, `asignar_cliente`, `cobrar_ticket`, `ver_existencias`, `historial_ventas`, `cobrar_credito`.

**Default OFF (sensibles):** `eliminar_articulo_venta`, `aplicar_descuento`, `salida_efectivo`, `cancelar_devolver`, `corte_todos`, `cambiar_config`, `crear_productos`, `eliminar_productos`, `modificar_varios`, `ajustar_inventario`.

### 1.4 Departamento "Lácteos" zombi en Inventario
**Archivos:**
- `server/src/controllers/inventario.js` — modificar query `listarInventario` para hacer JOIN con tabla `departamentos` por `productos.departamento_id` y devolver `departamento_nombre`.
- `pos/src/components/inventario/TabReporteInventario.jsx` — reemplazar el `useMemo categorias` que deriva de `p.categoria` (string libre) por una llamada a `api.listarDepartamentos(negocio_id)` en `useEffect`.
- Cambiar el filtro `p.categoria === filtroCategoria` por `p.departamento_id === filtroCategoria`.
- Migración SQL: ejecutar manualmente un script que ponga `departamento_id = NULL` o lo asocie al departamento "Medicamento" en productos donde `categoria = 'Lácteos'` y no exista ese departamento real.

### 1.5 Existencia llega null en carrito
**Archivos:**
- `pos/src/hooks/useCart.js` — al agregar producto, si `stock_actual` viene null, hacer fallback a la tabla `inventario` (campo `cantidad`).
- `server/src/controllers/productos.js` — verificar que el endpoint usado al escanear (`buscarPorCodigo` o similar) haga LEFT JOIN con `inventario` filtrando por `negocio_id` y devuelva `stock_actual = COALESCE(inventario.cantidad, 0)`.

---

## FASE 2 — UX Crítico (afecta al cajero todo el día)

### 2.1 Buscador "Estado de Cuenta" rediseño
**Archivo:** `pos/src/screens/CreditosScreen.jsx` (función `renderEstadoCuenta`, líneas 167-209)
- Centrar el bloque buscador vertical y horizontalmente (flex con justify-center, align-center).
- Aumentar tamaño del input: ancho ~600px, padding 14px, fontSize 18.
- Agrandar título "Estado de Cuenta" a fontSize 28, fontWeight 800.
- **Eliminar el dropdown de resultados con saldo verde** que aparece debajo del input — se quita el bloque `{resultados.length > 0 && ...}`.
- Mantener solo: el usuario teclea, presiona Enter, y se busca el cliente (si hay 1 match exacto entra directo; si hay varios, mostrar lista mínima sin saldos, solo nombres).
- El reporte de saldos ya existe en la pestaña "Reporte" — no duplicar info.

### 2.2 Bloquear edición manual de cantidad en carrito
**Archivo:** `pos/src/components/venta/TablaCarrito.jsx` (líneas 51-62)
- Reemplazar el `<input type="number">` por un `<span>` que muestre `item.cantidad` con estilos del input pero sin ser editable.
- Eliminar `onChange` y `onClick stopPropagation`.
- La única vía para subir cantidad: re-escanear el código de barras (ya implementado en `useCart.agregarProducto`).
- Mantener el botón ✕ para eliminar el item completo.

### 2.3 ModalCobrar: mostrar deuda del cliente en rojo
**Archivos:**
- `server/src/controllers/clientes.js` — endpoint `buscarClientes` debe devolver `saldo_actual` y `fecha_credito_mas_antiguo` (MIN(fecha) de créditos no liquidados).
- `pos/src/components/venta/ModalCobrar.jsx` — al seleccionar cliente (en cualquier método de pago, no solo crédito), si `cliente.saldo_actual > 0`, renderizar debajo del nombre un bloque rojo: "Este cliente tiene una deuda de $XXX desde el DD/MM/YYYY".
- Estilo: color `#c02020`, fontSize 12, fontWeight 600, padding 6px, fondo `#fee`.

### 2.4 Pantalla "Venta exitosa"
**Archivos nuevos / modificados:**
- Crear `pos/src/components/venta/ModalVentaExitosa.jsx` — componente full-screen overlay con fondo verde claro (`#e6f7e6`), ícono check grande centrado, título "¡Venta exitosa!", subtítulo "Presiona Enter para nueva venta".
- Listener `useEffect` con `keydown` Enter → llama `onCerrar()`.
- En `pos/src/screens/VentaScreen.jsx`: tras el cobro exitoso (donde hoy se cierra `ModalCobrar`), mostrar `ModalVentaExitosa` por ~1.5 segundos o hasta que el usuario pulse Enter, luego limpiar carrito y volver al estado inicial.

---

## FASE 3 — Clientes (mejoras de formulario)

### 3.1 Navegación con Enter entre campos
**Archivo:** `pos/src/screens/ClientesScreen.jsx`
- Crear array de refs para cada input (`useRef` por campo o un objeto `refs.current[key]`).
- En cada `<input>` agregar `onKeyDown={e => e.key === 'Enter' && refs.current[siguienteCampo]?.focus()}`.
- Orden: nombre → apellidos → telefono → email → domicilio1 → domicilio2 → colonia → municipio → estado_residencia → codigo_postal → notas.
- En el último campo, Enter dispara `guardar()`.

### 3.2 Botón Guardar con color dinámico
**Archivo:** `pos/src/screens/ClientesScreen.jsx`
- Agregar `useState` `formOriginal` que guarde el snapshot al seleccionar cliente.
- Computed `dirty = JSON.stringify(form) !== JSON.stringify(formOriginal)`.
- Botón "Guardar": cuando `!dirty` → fondo gris (`#ccc`), cursor not-allowed, disabled. Cuando `dirty` → fondo azul (`#1e3a5f`), color blanco, hover activo.

### 3.3 Quitar guion del buscador previsualizador
**Archivo:** `pos/src/screens/CreditosScreen.jsx` (línea 194) — buscar render `{c.id} &nbsp; {c.nombre}`.
- Cambiar a solo `{c.nombre} {c.apellidos}` o `Folio: {c.id} — {c.nombre}` con formato más limpio.
- El usuario pidió **quitar el guion** que aparece junto al folio numérico.

### 3.4 Eliminar cliente/deuda con autorización admin
**Archivos:**
- `pos/src/screens/ClientesScreen.jsx` — al hacer click en "Eliminar cliente", abrir `ModalAutorizacionAdmin` (ya existe en `components/venta/`).
- Solo si la autorización pasa (admin ingresa contraseña correcta), ejecutar el DELETE.
- Aplicar mismo patrón al endpoint de **eliminar deuda/crédito** en `CreditosScreen.jsx` si existe esa acción.
- Backend: agregar `verifyPermiso('clientes_crud')` al DELETE de clientes; pero la doble validación con contraseña va en el frontend antes de llamar el endpoint.

---

## FASE 4 — Iconografía

### 4.1 Reemplazar emojis por íconos profesionales
- Instalar `lucide-react` (~1500 íconos SVG, tree-shakeable, sin dependencias pesadas).
- Crear archivo `pos/src/components/Icon.jsx` que reexporte los íconos usados con tamaño y color por defecto del POS.
- Reemplazar progresivamente:
  - `✓` → `<Check />`
  - `✕` → `<X />`
  - `📦` → `<Package />`
  - `🔍` → `<Search />`
  - `💰` → `<DollarSign />`
  - `👤` → `<User />`
  - `🛒` → `<ShoppingCart />`
- Hacer el reemplazo módulo por módulo (no todo de golpe), arrancar por VentaScreen y Modales que usa el cajero a diario.

---

## Orden de ejecución sugerido

1. **Fase 1 completa** (bugs duros) — un commit por punto.
2. **Fase 2.2 + 2.4** (cantidad bloqueada + venta exitosa) — alto impacto, bajo esfuerzo.
3. **Fase 2.1 + 2.3** (rediseños visuales).
4. **Fase 3** (formulario clientes) — un solo commit.
5. **Fase 4** (íconos) — al final, progresivo.

## Reglas durante implementación

- Antes de tocar `VentaScreen.jsx` o `useCart.js`: leer el archivo completo, son críticos.
- Cada cambio en backend que afecte respuesta de un endpoint: actualizar también el cliente que lo consume el mismo commit.
- No mezclar fases en un solo commit.
- Probar cada cambio con datos reales antes de pasar al siguiente punto.
