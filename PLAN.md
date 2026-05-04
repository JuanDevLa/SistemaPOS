# Plan: Punto de Venta para Comercio Minorista

## Contexto del proyecto

- **Tipo de negocio**: Comercio minorista — abarrotes, farmacia, miscelánea, ferretería chica, etc.
- **Negocios**: 2 negocios (Farmacia Noriega + Crucero Independencia), inventario separado por negocio
- **Hardware por negocio**: 1 PC Windows + escáner de código de barras + impresora de tickets (por confirmar modelo)
- **Objetivo**: App de escritorio Windows por negocio + panel admin web para la dueña, accesible remotamente

---

## Cómo funciona en la práctica

### Códigos de barras

Los productos de consumo (refrescos, botanas, medicamentos, limpieza, etc.) ya traen un código de barras impreso en el empaque — son las rayitas EAN-13, no un QR. Ese número es único por producto a nivel mundial.

El escáner lee ese número, el sistema busca el producto y lo agrega al carrito. El cajero no escribe nada.

Si el escáner lee un código desconocido, el sistema avisa y permite registrar el producto en ese momento.

### El primer día — carga inicial

El primer día no se hace una venta normal. Se hace un **conteo de inventario inicial**:

1. El encargado abre la pantalla de "Carga inicial"
2. Escanea cada producto, registra nombre, precio y cantidad actual
3. Al terminar, el sistema ya conoce todo el catálogo y el stock

Esta misma pantalla sirve después para hacer conteos físicos periódicos (auditorías de inventario).

### Cuando llega el proveedor

El encargado abre "Entrada de mercancía", escribe el nombre del proveedor y escanea lo que llegó con las cantidades. El sistema suma eso al inventario automáticamente y guarda el registro de quién recibió, cuándo y qué llegó.

La dueña lo puede ver desde el admin para verificar que lo que reporta cada negocio coincide con lo que llegó.

### Ciclo completo del negocio

| Acción | Qué mueve |
|--------|-----------|
| Carga inicial | Registra productos + inventario desde cero |
| Entrada de proveedor | Suma cantidades al inventario |
| Venta | Resta del inventario, suma a caja |
| Corte de caja | Cuadra el dinero del día |

---

## Arquitectura general

```
Internet
    |
[VPS central]  ← PostgreSQL + API Fastify
    |
┌─────────────────────────────────────────┐
|              |              |            |
[Negocio 1]  [Negocio 2]  [Negocio 3]   [Dueña]
App Electron  App Electron  App Electron  Navegador
(pantalla     (pantalla     (pantalla     (admin web,
 completa)     completa)     completa)    desde donde sea)
```

- **POS**: App de escritorio Windows (Electron + React), pantalla completa, arranca con Windows
- **Admin**: Aplicación web en el navegador, accesible desde celular o computadora
- **Servidor**: VPS (~$5-10/mes) con PostgreSQL + API Fastify

---

## Stack tecnológico

| Parte          | Tecnología            | Razón                                        |
|----------------|-----------------------|----------------------------------------------|
| API / Servidor | Node.js + Fastify     | Ligero, rápido, fácil de mantener            |
| Base de datos  | PostgreSQL en VPS     | Robusto, relacional, un solo lugar           |
| Admin web      | React + Vite          | Accesible desde cel/compu, sin instalar      |
| POS escritorio | Electron + React      | App Windows real, pantalla completa          |
| Auth cajero    | PIN numérico          | Rápido, sin teclado                          |
| Auth dueña     | Usuario + contraseña  | Segura para acceso remoto                    |

---

## Estructura de carpetas

```
puntodeventa/
├── server/               # API REST + base de datos
│   ├── src/
│   │   ├── routes/       # Endpoints por módulo
│   │   ├── controllers/  # Lógica de negocio
│   │   ├── models/       # Modelos de datos
│   │   ├── middleware/   # Auth, validación
│   │   └── db/           # Conexión y migraciones PostgreSQL
│   ├── package.json
│   └── .env
│
├── admin/                # Panel web de administración (dueña)
│   ├── src/
│   │   ├── pages/        # Dashboard, inventario, reportes, usuarios
│   │   ├── components/
│   │   ├── api/          # Llamadas al servidor
│   │   └── context/      # Estado global (auth, negocio activo)
│   └── package.json
│
└── pos/                  # App de escritorio Electron por negocio
    ├── src/
    │   ├── screens/      # Venta, productos, corte de caja, entrada mercancía
    │   ├── components/
    │   └── api/          # Llamadas al servidor central
    ├── electron/         # Main process, configuración de ventana
    └── package.json
```

---

## Base de datos (PostgreSQL)

### Tabla: `negocios`
```sql
id                    SERIAL PRIMARY KEY
nombre                VARCHAR(100)
direccion             TEXT
activo                BOOLEAN DEFAULT true
abrir_caja_al_cobrar  BOOLEAN DEFAULT true   -- Abre cajón al cobrar en efectivo
creado_en             TIMESTAMP
```

### Tabla: `usuarios`
```sql
id            SERIAL PRIMARY KEY
nombre        VARCHAR(100)
pin           VARCHAR(6)       -- PIN numérico para cajeros
password_hash TEXT             -- Solo para dueña/admin en web
rol           VARCHAR(20)      -- 'admin', 'supervisor', 'cajero'
negocio_id    INT REFERENCES negocios(id)  -- NULL = acceso a todos
activo        BOOLEAN DEFAULT true
creado_en     TIMESTAMP
```

### Tabla: `productos`
```sql
id              SERIAL PRIMARY KEY
codigo_barras   VARCHAR(50) UNIQUE
nombre          VARCHAR(200)
descripcion     TEXT
precio          DECIMAL(10,2)
costo           DECIMAL(10,2)    -- Precio de compra al proveedor
categoria       VARCHAR(100)
unidad          VARCHAR(20)      -- pieza, kg, litro, caja, etc.
activo          BOOLEAN DEFAULT true
creado_en       TIMESTAMP
actualizado_en  TIMESTAMP
```

### Tabla: `inventario`
```sql
id              SERIAL PRIMARY KEY
producto_id     INT REFERENCES productos(id)
negocio_id      INT REFERENCES negocios(id)
cantidad        DECIMAL(10,2)
alerta_minima   DECIMAL(10,2)
actualizado_en  TIMESTAMP
UNIQUE(producto_id, negocio_id)
```

### Tabla: `movimientos_inventario`
```sql
id            SERIAL PRIMARY KEY
producto_id   INT REFERENCES productos(id)
negocio_id    INT REFERENCES negocios(id)
tipo          VARCHAR(30)      -- 'venta', 'entrada', 'ajuste', 'carga_inicial'
cantidad      DECIMAL(10,2)    -- positivo = entrada, negativo = salida
referencia_id INT              -- ID de la venta o entrada de mercancía
usuario_id    INT REFERENCES usuarios(id)
notas         TEXT
creado_en     TIMESTAMP
```

### Tabla: `ventas`
```sql
id                  SERIAL PRIMARY KEY
negocio_id          INT REFERENCES negocios(id)
cajero_id           INT REFERENCES usuarios(id)
corte_id            INT REFERENCES cortes_caja(id)
fecha               TIMESTAMP
subtotal            DECIMAL(10,2)
descuento           DECIMAL(10,2)
total               DECIMAL(10,2)
metodo_pago         VARCHAR(20)  -- 'efectivo', 'tarjeta', 'transferencia', 'mixto'
efectivo_recibido   DECIMAL(10,2)
cambio              DECIMAL(10,2)
estado              VARCHAR(20)  -- 'completada', 'cancelada', 'devolucion'
```

### Tabla: `venta_items`
```sql
id               SERIAL PRIMARY KEY
venta_id         INT REFERENCES ventas(id)
producto_id      INT REFERENCES productos(id)
cantidad         DECIMAL(10,2)
precio_unitario  DECIMAL(10,2)
descuento        DECIMAL(10,2) DEFAULT 0
subtotal         DECIMAL(10,2)
```

### Tabla: `cortes_caja`
```sql
id                  SERIAL PRIMARY KEY
negocio_id          INT REFERENCES negocios(id)
cajero_id           INT REFERENCES usuarios(id)
apertura            TIMESTAMP
cierre              TIMESTAMP
efectivo_inicial    DECIMAL(10,2)
efectivo_esperado   DECIMAL(10,2)
efectivo_contado    DECIMAL(10,2)
diferencia          DECIMAL(10,2)
notas               TEXT
estado              VARCHAR(20)  -- 'abierto', 'cerrado'
```

### Tabla: `entradas_mercancia`
```sql
id            SERIAL PRIMARY KEY
negocio_id    INT REFERENCES negocios(id)
usuario_id    INT REFERENCES usuarios(id)
proveedor     VARCHAR(100)
fecha         TIMESTAMP
notas         TEXT
```

### Tabla: `entradas_mercancia_items`
```sql
id               SERIAL PRIMARY KEY
entrada_id       INT REFERENCES entradas_mercancia(id)
producto_id      INT REFERENCES productos(id)
cantidad         DECIMAL(10,2)
costo_unitario   DECIMAL(10,2)
```

### Tabla: `audit_logs`
```sql
id            SERIAL PRIMARY KEY
usuario_id    INT REFERENCES usuarios(id)
negocio_id    INT REFERENCES negocios(id)
accion        VARCHAR(100)   -- 'cambio_precio', 'cancelacion_venta', 'ajuste_inventario'
tabla         VARCHAR(50)
referencia_id INT
datos_antes   JSONB
datos_despues JSONB
creado_en     TIMESTAMP
```

---

## Fases de desarrollo

### Fase 0 — Setup ✓ COMPLETADA
- [x] Crear estructura de carpetas (server/, admin/, pos/)
- [x] package.json en cada parte
- [x] Configurar servidor Node.js + Fastify base
- [x] Conectar PostgreSQL y correr migraciones
- [x] Variables de entorno (.env)
- [x] Script de clean y seed de datos de prueba

### Fase 1 — Backend core ✓ COMPLETADA
- [x] Autenticación: login admin (JWT), login cajero (PIN por negocio)
- [x] CRUD productos (con códigos manuales tipo FRIJOL)
- [x] Inventario por negocio con alertas de stock bajo
- [x] Registro de ventas + descuento automático de inventario
- [x] Cortes de caja con cálculo de diferencias
- [x] Entradas de mercancía (Opción C: cantidad manual + proveedor + timestamp)
- [x] Movimientos de inventario (log: carga_inicial, venta, entrada, ajuste, devolución)
- [x] Endpoints protegidos con JWT

### Fase 2 — App Electron POS (EN PROGRESO - 70%)
- [x] Setup Electron + React + Vite
- [x] Pantalla de login con PIN numérico (4 dígitos)
- [x] Pantalla de venta con estilo Windows Forms clásico
  - [x] Panel izquierdo: búsqueda y grid de productos (código, descripción, precio)
  - [x] Panel derecho: carrito, total grande, métodos de pago
  - [x] Modal de cobro (Efectivo, Crédito, Tarjeta, Vale)
  - [x] Cálculo de cambio automático
  - [x] Confirmación de venta con ticket
- [x] Integración API con servidor backend
- [x] Atajos de teclado:
  - [x] Enter → Login
  - [x] F1 → Tab Ventas
  - [x] F2 → Tab Entrada Mercancía
  - [x] F3 → Tab Carga Inicial
  - [x] F4 → Tab Corte de Caja
  - [x] F5 → Nueva venta
  - [x] F12 → Abrir panel de cobro
  - [x] F1/F2 en cobro → Confirmar
  - [x] ESC → Cerrar modal
  - [x] Delete → Quitar último item
- [x] Pantalla de entrada de mercancía (funcional) ✅ COMPLETADA
  - [x] Campo para nombre del proveedor
  - [x] Búsqueda/escaneo de productos con resultados en tiempo real
  - [x] Selección de producto (resaltado en verde)
  - [x] Campos cantidad y precio que pagamos
  - [x] Tabla de productos en entrada con subtotal automático
  - [x] Total de entrada en tiempo real
  - [x] Guardar entrada → actualiza inventario automáticamente
  - [x] Flujo ágil: escanea → selecciona → cantidad → precio → agregar
- [x] Pantalla de carga inicial de inventario (funcional) ✅ COMPLETADA
  - [x] Búsqueda/escaneo de productos
  - [x] Selección de producto (resaltado en verde)
  - [x] Campos cantidad y alerta mínima
  - [x] Tabla de productos en carga con detalles
  - [x] Guardar carga → registra en movimientos_inventario como carga_inicial
- [x] Pantalla de corte de caja (funcional) ✅ COMPLETADA
  - [x] Abrir turno con efectivo inicial
  - [x] Cerrar turno con efectivo contado + notas opcionales
  - [x] Cálculo automático de diferencia (esperado vs contado)
  - [x] Resumen del cierre con indicador de sobrante/faltante
- [ ] Integración con impresora térmica (modelo por confirmar)

### Fase 3 — Admin web ✓ COMPLETADA
- [x] Setup React + Vite ✅
- [x] Login dueña ✅
- [x] Dashboard: ventas del día por negocio + consolidado ✅
- [x] Gestión de productos y precios ✅ (listar, buscar, crear, editar, desactivar)
- [x] Ver inventario por negocio ✅
- [x] Historial de movimientos (entradas, salidas, ajustes) ✅
- [x] Historial de ventas con filtros ✅
- [x] Cortes de caja: ver todos los cortes y diferencias ✅
- [x] Gestión de usuarios ✅
- [x] Exportar reportes a CSV/Excel ✅ (botones individuales + consolidado con 9 hojas)

### Fase 4 — Deploy (1 sesión)
- [ ] Configurar VPS (Railway o DigitalOcean)
- [ ] Deploy API + PostgreSQL
- [ ] Deploy admin web
- [ ] Generar instalador .exe del POS para cada negocio
- [ ] Configurar backups automáticos de base de datos

### Fase 5 — Extras (según necesidad)
- [ ] Descuentos y promociones con fecha límite
- [ ] Fiado / crédito a clientes
- [ ] Control de caducidades
- [ ] Alertas de stock bajo (correo o WhatsApp)
- [ ] Importación masiva de productos desde CSV

### Fase 2.5 — Impresora + Caja Registradora + Terminal de Pago
- [x] Integración con impresora térmica Blackpos WW-5888T (58mm USB, ESC/POS) ✅
  - [x] Impresión de tickets (nombre negocio, hora, productos, total, método pago, cambio) ✅
  - [x] Formato: 58mm, máximo 32 caracteres por línea ✅
  - [x] Apertura automática de caja registradora ✅
    - [x] Campo en tabla `negocios`: `abrir_caja_al_cobrar` (boolean, DEFAULT true) ✅
    - [x] Admin web puede activar/desactivar ✅
    - [x] POS abre caja solo en pagos en efectivo (comando ESC p por USB) ✅
- [ ] Integración con Terminal Mercado Pago Point Smart 2
  - [ ] API oficial de Point Integration
  - [ ] Envío automático de monto desde POS a terminal
  - [ ] El cajero selecciona "Tarjeta" → monto aparece en terminal → cliente paga → respuesta automática
  - [ ] Comisión: ~2.99% sin mensualidad
  - [ ] Backend: nuevo endpoint POST /cobrar-tarjeta para comunicar con terminal
  - [ ] Flujo: POS manda monto → API Mercado Pago → Terminal recibe → POS espera respuesta

---

## Interfaz del POS (pantalla del cajero)

```
┌─────────────────────────────────────────────────┐
│  Negocio Norte  |  Cajero: María  |  12:34 pm   │
├──────────────────┬──────────────────────────────┤
│                  │  CARRITO                      │
│  [Buscar por     │  ─────────────────────────── │
│   nombre o       │  Leche Lala 1L  x2   $48.00  │
│   escanear]      │  Pan Bimbo      x1   $32.00  │
│                  │  Coca-Cola      x3   $54.00  │
│  [Teclado        │  ─────────────────────────── │
│   numérico para  │  Subtotal:           $134.00  │
│   cantidad]      │  Descuento:            $0.00  │
│                  │  TOTAL:              $134.00  │
│                  │                               │
│                  │  [Efectivo] [Tarjeta] [Trans] │
│                  │                               │
│                  │  Recibido: $___  Cambio: $__  │
│                  │                               │
│                  │         [COBRAR]              │
└──────────────────┴──────────────────────────────┘
```

---

## Resumen de las sesiones

### Sesión anterior (2026-04-10 - Inicio)
- Fase 0 (Setup) — 100%
- Fase 1 (Backend) — 100%
- Fase 2 (Electron POS) — 50% (pantalla de venta funcional)

### Sesión actual (2026-04-10 - Continuación)

#### Completado ✅
- **Pantalla de Entrada de Mercancía** — FUNCIONAL Y OPTIMIZADA
  - Flujo ágil de escaneo: busca/escanea → selecciona → ingresa cantidad y precio
  - Producto seleccionado resaltado en verde
  - Campos: proveedor, cantidad, costo unitario (precio que pagamos)
  - Cada producto muestra: cantidad × precio = subtotal
  - Total de entrada en tiempo real
  - Validaciones: proveedor requerido, cantidad válida, mínimo 1 producto
  - Integración con backend: POST /entradas (actualiza inventario automáticamente)
  - Mensajes de confirmación/error

#### Estado actual (Fase 2.5 + 3 — 95% completada)
- Backend: Todos los endpoints listos
- App POS: 
  - ✅ Pantalla de venta (100%)
  - ✅ Pantalla de entrada de mercancía (100%)
  - ✅ Pantalla de carga inicial (100%)
  - ✅ Pantalla de corte de caja (100%)
  - ✅ Impresión de tickets con impresora térmica (100%)
  - ✅ Apertura de caja registradora (100%)
- Admin web:
  - ✅ Dashboard + ventas + usuarios + productos + inventario + movimientos + cortes (100%)
  - ✅ Exportar reportes Excel (100%)

#### Proximas tareas
1. **Integración Terminal Mercado Pago Point Smart 2** — pendiente compra hardware (stubs listos)
2. **Deploy en VPS** — Railway o DigitalOcean
3. **Generar instalador .exe del POS**

### Fase 6 — Modo Offline ✓ COMPLETADA
- [x] SQLite local en Electron ✅
- [x] IPC channels para operaciones offline ✅
- [x] Wrapper online/offline en api.js ✅
- [x] Login offline (caché de cajeros) ✅
- [x] Búsqueda offline (caché de productos) ✅
- [x] Ventas/cortes/entradas offline ✅
- [x] Auto-sync cuando vuelve internet ✅
- [x] Monitor de conectividad (30s) ✅
- [x] Indicador visual "Sin conexión" ✅
- [x] Documentación (OFFLINE.md) ✅

## Pendiente por confirmar

- [x] Modelo de impresora: **Blackpos WW-5888T (58mm USB, cajón RJ11)** ✅
- [x] ¿Abrir caja automática al cobrar? — SI, configurable por admin ✅
- [x] ¿Terminal de pago integrada? — SI, Mercado Pago Point Smart 2 ✅
- [ ] ¿Maneja productos por peso (kg) o solo por pieza? — ya soportado en schema
- [ ] ¿Maneja fiado/crédito a clientes? — ya está el campo metodo_pago, puede implementarse en Fase 3
- [ ] ¿Necesita control de caducidades? — Fase 5 (extras)
- [ ] ¿Quiere alertas de stock bajo (y por qué canal)? — Fase 5 (extras)

---

## Sprint Corte UI — réplica eleventa (2026-04-30)

**Cambios de schema** (en `server/src/db/migrate.js`, idempotentes):

- Tabla `historial_cortes` (híbrido):
  - `id, corte_id (nullable), tipo ('cajero'|'dia'|'cierre'), cajero_id, cajero_nombre, negocio_id, total_ventas, diferencia, snapshot JSONB, creado_en`
  - Índices `(negocio_id, creado_en DESC)` y `(cajero_id, creado_en DESC)`
- `negocios.max_cortes_cajero_dia INT DEFAULT 3` — límite configurable de cortes parciales por cajero/día
- `abonos.metodo_pago VARCHAR(20) DEFAULT 'efectivo'` — necesario para el bloque "Abonos en efectivo"

**Endpoints nuevos**:

- `GET /cortes/snapshot?negocio_id=&cajero_id=&tipo=cajero|dia[&fecha=]` — calcula en vivo todos los bloques (ventas/ganancia/abonos/devoluciones/departamentos/top clientes) sin cerrar el corte
- `POST /historial-cortes` — guarda snapshot en historial, valida `max_cortes_cajero_dia` (admin lo salta)
- `GET /historial-cortes?negocio_id=&...` — lista para la sub-pestaña Historial
- `GET /historial-cortes/:id` — snapshot completo para reimprimir

**Frontend**: `pos/src/screens/CorteScreen.jsx` reescrita como orquestador. Componentes nuevos en `pos/src/components/corte/`: `CorteBody`, `SeccionLista`, `ModalCerrarTurno`, `HistorialCortes`. Hook `useCorteSnapshot`.

**Impresión**: `printer-service.js → printCorteSnapshot(snapshot, opciones)` reutilizable para corte de cajero, corte del día y cierre.

**Configuración → Cortes**: tarjeta nueva en POS y Admin web, edita `max_cortes_cajero_dia` por negocio.
