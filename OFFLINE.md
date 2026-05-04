# Modo Offline — POS Electron

## Cómo funciona

El POS detecta automáticamente si hay conexión al servidor. Cuando no hay internet:

1. **Ventas** → Se guardan en SQLite local en la PC
2. **Cortes** → Se registran localmente
3. **Entradas de mercancía** → Se guardan localmente
4. **Búsqueda de productos** → Usa caché local
5. **Login** → Verifica contra caché de cajeros

Cuando **vuelve internet**, automáticamente sincroniza todos los datos pendientes al servidor (cada 2 minutos o al detectar conexión).

---

## Indicadores visuales

- **Login**: Badge rojo "SIN CONEXIÓN" si está offline
- **POS**: Badge rojo "SIN CONEXIÓN" en el header derecho si está offline
- **Operación**: Funciona exactamente igual, online u offline

---

## Bases de datos SQLite

### Local (en la PC)

Archivo: `~/.config/[app]/pdv.db` (Windows: `%APPDATA%/[app]/pdv.db`)

**Tablas:**
- `productos_cache` — caché de productos por negocio
- `cajeros_cache` — caché de cajeros para login offline
- `ventas_offline` — ventas pendientes de subir
- `cortes_offline` — cortes pendientes
- `entradas_offline` — entradas de mercancía pendientes
- `sync_log` — log de sincronizaciones

### Central (en el servidor)

PostgreSQL normal. Los datos sincronizados se insertan aquí como si nunca hubieran sido offline.

---

## Flujo de sincronización

### Al arrancar la app

1. Verifica conectividad
2. Si online:
   - Descarga caché de productos (todos los productos del negocio)
   - Descarga caché de cajeros (login offline)
   - Sincroniza datos pendientes

### Cada 30 segundos (monitor de conexión)

Verifica si hay internet. Si vuelve después de estar offline → sincroniza.

### Cada 2 minutos (auto-sync)

Intenta sincronizar datos pendientes. Si online, los sube. Si offline, espera.

### En tiempo real

Cada operación detecta si hay conexión:
- Online → API REST normal
- Offline → SQLite local

---

## Qué pasa si...

### Vendo sin internet
1. Venta se guarda en `ventas_offline` tabla
2. Se asigna ID local (auto-increment)
3. Cuando vuelve internet → POST al servidor
4. Servidor le asigna ID real y guarda

### Hago login sin internet
1. Verifica PIN contra `cajeros_cache`
2. Si PIN es correcto → permite entrar (sesión offline)
3. Session se guarda en localStorage

### Busco producto sin internet
1. Busca en `productos_cache` tabla
2. Muestra resultados del caché
3. Permitido agregar al carrito, los nombres/precios vienen del caché

### Cierro corte sin internet
1. Guarda en `cortes_offline` con `server_id = NULL`
2. Cuando vuelve online → POST al servidor
3. Servidor crea corte y retorna ID
4. Local marca como sincronizado

### Internet vuelve después de 5 horas offline
1. App detecta reconexión
2. Sincroniza TODO lo pendiente
3. Todas las ventas, cortes, entradas suben en batch
4. Marca todo como sincronizado

---

## Limitaciones

- **Búsqueda**: Solo encuentra productos en caché (no nuevos productos agregados al servidor mientras estaba offline)
- **Reportes**: Solo desde admin web (POS no reporta offline)
- **Facturación**: Si necesita CFDI/numeración, requiere internet en el momento

---

## Testing

### Simular offline:

**Opción 1:** Apagar servidor backend
```bash
# Antes
npm run dev

# Para test: Ctrl+C en terminal backend
```

**Opción 2:** Desconectar WiFi

**Opción 3:** En DevTools: Settings → Network → Offline

### Verificar:
1. Login → funciona
2. Buscar producto → funciona
3. Hacer venta → funciona (se guarda en BD local)
4. Hacer corte → funciona
5. Badge "SIN CONEXIÓN" aparece en UI

### Sincronizar:

1. Conectar internet nuevamente
2. Esperar 30 segundos o recargar app
3. Ver en servidor: todas las ventas están ahí

---

## Códigos de API

### Window APIs (Electron)

```js
// Conectividad
await window.dbAPI.checkConn()  // true/false

// Caché
await window.dbAPI.cacheProductos(negocioId)
await window.dbAPI.buscarProducto(q, negocioId)
await window.dbAPI.cacheCajero(nombre, pin, negocioId)
await window.dbAPI.loginOffline(nombre, pin, negocioId)

// Operaciones offline
await window.dbAPI.registrarVenta(venta)
await window.dbAPI.abrirCorte(corte)
await window.dbAPI.cerrarCorte(id, datos)
await window.dbAPI.registrarEntrada(entrada)
await window.dbAPI.registrarCargaInicial(carga)

// Sync
await window.dbAPI.obtenerPendientes()
await window.dbAPI.marcarSincronizado(tipo, id)
```

### API wrapper (React)

```js
import { api } from './api'

// Automáticamente online/offline
await api.loginCajero(...)
await api.buscarProducto(q, negocioId)
await api.registrarVenta(...)
await api.registrarEntrada(...)
await api.abrirCorte(...)
await api.cerrarCorte(...)
await api.registrarCargaInicial(...)

// Utilities
await api.checkConn()  // true/false
await api.syncPendientes()  // sincronizar ahora
await api.cacheProductos(negocioId)  // descargar caché
```

---

## Próximos pasos

- [ ] Endpoint batch en backend: `POST /ventas/batch` (más eficiente que uno por uno)
- [ ] Dashboard offline: mostrar ventas del día aunque no haya servidor
- [ ] Reportes offline: generar Excel sin servidor
