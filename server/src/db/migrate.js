require('dotenv').config()
const pool = require('./client')

const schema = `
-- Tabla: negocios
CREATE TABLE IF NOT EXISTS negocios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  pin VARCHAR(6),
  pin_hash TEXT,
  password_hash TEXT,
  rol VARCHAR(20) NOT NULL DEFAULT 'cajero',
  negocio_id INT REFERENCES negocios(id),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo_barras VARCHAR(50) UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  precio_mayoreo DECIMAL(10,2),
  costo DECIMAL(10,2),
  categoria VARCHAR(100),
  unidad VARCHAR(20) DEFAULT 'pieza',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: inventario
CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  cantidad DECIMAL(10,2) DEFAULT 0,
  alerta_minima DECIMAL(10,2) DEFAULT 10,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(producto_id, negocio_id)
);

-- Tabla: movimientos_inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id SERIAL PRIMARY KEY,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  referencia_id INT,
  usuario_id INT REFERENCES usuarios(id),
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  cajero_id INT REFERENCES usuarios(id),
  corte_id INT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10,2) DEFAULT 0,
  descuento DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  metodo_pago VARCHAR(20) DEFAULT 'efectivo',
  efectivo_recibido DECIMAL(10,2),
  cambio DECIMAL(10,2),
  estado VARCHAR(20) DEFAULT 'completada',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: venta_items
CREATE TABLE IF NOT EXISTS venta_items (
  id SERIAL PRIMARY KEY,
  venta_id INT REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id),
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  descuento DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Tabla: cortes_caja
CREATE TABLE IF NOT EXISTS cortes_caja (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  cajero_id INT REFERENCES usuarios(id),
  apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cierre TIMESTAMP,
  efectivo_inicial DECIMAL(10,2),
  efectivo_esperado DECIMAL(10,2),
  efectivo_contado DECIMAL(10,2),
  diferencia DECIMAL(10,2),
  notas TEXT,
  estado VARCHAR(20) DEFAULT 'abierto'
);

-- Tabla: entradas_mercancia
CREATE TABLE IF NOT EXISTS entradas_mercancia (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id),
  proveedor VARCHAR(100),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT
);

-- Tabla: entradas_mercancia_items
CREATE TABLE IF NOT EXISTS entradas_mercancia_items (
  id SERIAL PRIMARY KEY,
  entrada_id INT REFERENCES entradas_mercancia(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id),
  cantidad DECIMAL(10,2) NOT NULL,
  costo_unitario DECIMAL(10,2)
);

-- Tabla: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  negocio_id INT REFERENCES negocios(id),
  accion VARCHAR(100),
  tabla VARCHAR(50),
  referencia_id INT,
  datos_antes JSONB,
  datos_despues JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: movimientos_caja (entradas/salidas de efectivo que no son ventas)
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id),
  corte_id INT REFERENCES cortes_caja(id),
  tipo VARCHAR(10) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  email VARCHAR(100),
  limite_credito DECIMAL(10,2) DEFAULT 0,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: creditos (una venta fiada = un crédito)
CREATE TABLE IF NOT EXISTS creditos (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) NOT NULL,
  venta_id INT REFERENCES ventas(id) NOT NULL,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  monto_original DECIMAL(10,2) NOT NULL,
  saldo_pendiente DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: abonos (pagos parciales o totales de un crédito)
CREATE TABLE IF NOT EXISTS abonos (
  id SERIAL PRIMARY KEY,
  credito_id INT REFERENCES creditos(id) NOT NULL,
  cliente_id INT REFERENCES clientes(id) NOT NULL,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id),
  monto DECIMAL(10,2) NOT NULL,
  comentarios TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Columnas extra en clientes (agregadas en upgrade)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS apellidos VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS domicilio1 TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS domicilio2 TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS colonia VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_residencia VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS credito_habilitado BOOLEAN DEFAULT false;

-- Tabla: departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- departamento_id en productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS departamento_id INT REFERENCES departamentos(id);

-- Tabla: devoluciones
CREATE TABLE IF NOT EXISTS devoluciones (
  id SERIAL PRIMARY KEY,
  venta_id INT REFERENCES ventas(id) NOT NULL,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  usuario_id INT REFERENCES usuarios(id),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: devolucion_items
CREATE TABLE IF NOT EXISTS devolucion_items (
  id SERIAL PRIMARY KEY,
  devolucion_id INT REFERENCES devoluciones(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id),
  cantidad DECIMAL(10,2) NOT NULL
);

-- Folios de ticket por negocio
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS folio_prefijo VARCHAR(10) DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS folio_siguiente INT DEFAULT 1;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS folio VARCHAR(20);

-- Pago mixto (efectivo + tarjeta)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_tarjeta DECIMAL(10,2) DEFAULT 0;

-- Impuestos
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS iva_porcentaje DECIMAL(5,2) DEFAULT 16.00;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS aplica_iva BOOLEAN DEFAULT false;
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS iva DECIMAL(10,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS iva_total DECIMAL(10,2) DEFAULT 0;

-- Máximo de stock por producto/negocio (sugerencia de compra)
ALTER TABLE inventario ADD COLUMN IF NOT EXISTS maximo INT;

-- Configuración de corte: ocultar efectivo esperado al cajero (anti-trampas)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ocultar_efectivo_esperado BOOLEAN DEFAULT false;

-- Permisos granulares por cajero
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '{}';

-- Sprint 3 / S4 (2026-04-26): lockout por intentos fallidos
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_inicio TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP;

-- Sprint 3 / S6 (2026-04-26): revocación de JWT (logout)
CREATE TABLE IF NOT EXISTS tokens_revocados (
  jti TEXT PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  revocado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expira_en TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_revocados_expira ON tokens_revocados(expira_en);

-- Configuración del ticket por negocio
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ticket_nombre VARCHAR(100);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ticket_slogan VARCHAR(150);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ticket_telefono VARCHAR(30);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS ticket_pie TEXT DEFAULT '¡Gracias por su compra!';

-- Tabla: proveedores (catálogo global, sin negocio_id — los productos son globales)
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  contacto VARCHAR(100),
  telefono VARCHAR(30),
  email VARCHAR(100),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- proveedor_id en entradas (mantiene proveedor string por retrocompatibilidad)
ALTER TABLE entradas_mercancia ADD COLUMN IF NOT EXISTS proveedor_id INT REFERENCES proveedores(id);

-- Tabla: companias_recarga (catálogo de compañías de recarga y servicios)
CREATE TABLE IF NOT EXISTS companias_recarga (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'recarga',
  montos JSONB DEFAULT '[]',
  comision_porcentaje DECIMAL(5,2) DEFAULT 3.00,
  comision_fija DECIMAL(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  orden INT DEFAULT 0
);

-- Tabla: recargas (historial de recargas y pagos de servicios)
CREATE TABLE IF NOT EXISTS recargas (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  cajero_id INT REFERENCES usuarios(id),
  corte_id INT REFERENCES cortes_caja(id),
  compania_id INT REFERENCES companias_recarga(id),
  tipo VARCHAR(20) NOT NULL,
  numero_destino VARCHAR(50) NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  comision DECIMAL(10,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'completada',
  referencia_proveedor VARCHAR(100),
  error_mensaje TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: config_recargas (configuración del módulo por negocio)
CREATE TABLE IF NOT EXISTS config_recargas (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE UNIQUE,
  activo BOOLEAN DEFAULT true,
  api_key TEXT,
  api_secret TEXT,
  modo VARCHAR(20) DEFAULT 'mock',
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed de compañías (idempotente)
INSERT INTO companias_recarga (nombre, tipo, montos, comision_porcentaje, comision_fija, orden) VALUES
  ('Telcel',       'recarga',  '[10,20,30,50,100,150,200,300,500]', 0, 3, 1),
  ('AT&T',         'recarga',  '[10,20,30,50,100,200]',             0, 3, 2),
  ('Movistar',     'recarga',  '[10,20,30,50,100]',                 0, 3, 3),
  ('Unefon',       'recarga',  '[10,20,30,50,100]',                 0, 3, 4),
  ('Virgin Mobile','recarga',  '[10,20,30,50,100]',                 0, 3, 5),
  ('CFE',          'servicio', '[]',                                0, 5, 6),
  ('Telmex',       'servicio', '[]',                                0, 5, 7),
  ('Izzi',         'servicio', '[]',                                0, 5, 8),
  ('Totalplay',    'servicio', '[]',                                0, 5, 9),
  ('Sky',          'servicio', '[]',                                0, 5, 10)
ON CONFLICT (nombre) DO NOTHING;

-- Actualizar comisiones si ya estaban insertadas con valores viejos
UPDATE companias_recarga SET comision_porcentaje = 0, comision_fija = 3 WHERE tipo = 'recarga' AND comision_fija = 0;
UPDATE companias_recarga SET comision_porcentaje = 0, comision_fija = 5 WHERE tipo = 'servicio' AND comision_fija = 0;

-- Proveedor por defecto en productos (para catálogo)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_id INT REFERENCES proveedores(id);

-- Tabla: lista_compras (productos pendientes de resurtir)
CREATE TABLE IF NOT EXISTS lista_compras (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  proveedor_id INT REFERENCES proveedores(id),
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(negocio_id, producto_id)
);

-- Tabla: promociones (precios especiales por cantidad)
CREATE TABLE IF NOT EXISTS promociones (
  id SERIAL PRIMARY KEY,
  negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  cantidad_desde DECIMAL(10,2) NOT NULL DEFAULT 0,
  cantidad_hasta DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_promo DECIMAL(10,2) NOT NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: ordenes_compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id SERIAL PRIMARY KEY,
  negocio_id INT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  proveedor_id INT REFERENCES proveedores(id),
  proveedor_nombre VARCHAR(200),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  entrada_id INT REFERENCES entradas_mercancia(id),
  creada_en TIMESTAMPTZ DEFAULT NOW(),
  recibida_en TIMESTAMPTZ
);

-- Tabla: ordenes_compra_items
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad_pedida DECIMAL(10,2) NOT NULL,
  costo_unitario DECIMAL(10,2)
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_inventario_negocio ON inventario(negocio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_negocio ON ventas(negocio_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_negocio ON movimientos_inventario(negocio_id);
CREATE INDEX IF NOT EXISTS idx_recargas_negocio ON recargas(negocio_id);
CREATE INDEX IF NOT EXISTS idx_recargas_fecha ON recargas(creado_en);
CREATE INDEX IF NOT EXISTS idx_usuarios_negocio ON usuarios(negocio_id);

-- Sprint 2 / E3 (2026-04-26): preservar descuento global del ticket (no solo el monto)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento_global JSONB;

-- Sprint 1 / M2 (2026-04-26): índices compuestos para queries frecuentes (filtro + orden)
CREATE INDEX IF NOT EXISTS idx_ventas_negocio_fecha ON ventas(negocio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movinv_producto_fecha ON movimientos_inventario(producto_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_creditos_cliente_estado ON creditos(cliente_id, estado);
CREATE INDEX IF NOT EXISTS idx_audit_negocio_fecha ON audit_logs(negocio_id, creado_en DESC);

-- Usuario Admin para POS (rol admin con PIN, login en cualquier negocio)
INSERT INTO usuarios (nombre, pin, rol, negocio_id, permisos, activo)
SELECT 'Admin', '1234', 'admin', NULL, '{}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE nombre = 'Admin' AND pin IS NOT NULL);

-- Rol supervisor: columna rol ya es VARCHAR(20), solo añadir campo de config
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS supervisor_salida_efectivo BOOLEAN DEFAULT false;

-- Campo notas en audit_logs para acciones que requieren justificación
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS notas TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id, creado_en DESC);

-- Desactivar cajero Maria de demo (mantiene FKs intactas)
UPDATE usuarios SET activo = false WHERE nombre = 'Maria' AND rol = 'cajero';

-- Sprint Corte UI (2026-04-30): historial de cortes (cajero / dia / cierre)
-- Híbrido: columnas planas para listado + JSONB con snapshot completo para reimprimir.
CREATE TABLE IF NOT EXISTS historial_cortes (
  id            SERIAL PRIMARY KEY,
  corte_id      INT REFERENCES cortes_caja(id) ON DELETE SET NULL,
  tipo          VARCHAR(20) NOT NULL,
  cajero_id     INT REFERENCES usuarios(id),
  cajero_nombre VARCHAR(120) NOT NULL,
  negocio_id    INT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  total_ventas  DECIMAL(10,2) DEFAULT 0,
  diferencia    DECIMAL(10,2),
  snapshot      JSONB NOT NULL,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historial_cortes_negocio_fecha
  ON historial_cortes(negocio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_cortes_cajero
  ON historial_cortes(cajero_id, creado_en DESC);

-- Límite configurable de cortes de cajero por día (default 3)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS max_cortes_cajero_dia INT DEFAULT 3;

-- Método de pago por abono (necesario para el bloque "Abonos en efectivo" del corte)
ALTER TABLE abonos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo';

-- Sprint 1 Configuración: RFC y símbolo de moneda por negocio
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS rfc VARCHAR(15);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS moneda_simbolo VARCHAR(5) DEFAULT '$';

-- Catálogo global de unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id     SERIAL PRIMARY KEY,
  clave  VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(50) NOT NULL,
  activo BOOLEAN DEFAULT true
);
INSERT INTO unidades_medida (clave, nombre) VALUES
  ('PZA','Pieza'),('KG','Kilogramo'),('LT','Litro'),
  ('MT','Metro'),('CJA','Caja'),('DOC','Docena'),
  ('GR','Gramo'),('ML','Mililitro'),('PAQ','Paquete'),('SRV','Servicio')
ON CONFLICT (clave) DO NOTHING;

-- Sprint 2 Configuración: Seguridad de sesión
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS sesion_inactividad_min INT DEFAULT 30;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS pin_max_intentos INT DEFAULT 5;

-- Sprint 2 Configuración: Política de devoluciones
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS devolucion_dias INT DEFAULT 30;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS devolucion_requiere_auth BOOLEAN DEFAULT false;

-- Sprint 2 Configuración: Alertas de stock
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS stock_alerta_global INT DEFAULT 5;

-- Sprint 2 Configuración: Límite de crédito global (default para clientes nuevos)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS credito_limite_default DECIMAL(10,2) DEFAULT 500;

-- Sprint 2 Configuración: Lector de códigos de barras
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS scanner_prefijo VARCHAR(10) DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS scanner_sufijo VARCHAR(10) DEFAULT '';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS scanner_enter_auto BOOLEAN DEFAULT true;

-- Sprint 4 Configuración: Compras y proveedores
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS compras_notif_email VARCHAR(100);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS compras_aprobacion_requerida BOOLEAN DEFAULT false;

-- Sprint 4 Configuración: Respaldo automático
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS backup_frecuencia VARCHAR(20) DEFAULT 'semanal';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS backup_email VARCHAR(100);

-- Sprint 5: Lotes y caducidades (farmacia)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS controla_lote BOOLEAN DEFAULT false;
ALTER TABLE negocios  ADD COLUMN IF NOT EXISTS vencidos_bloquear BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS producto_lotes (
  id              SERIAL PRIMARY KEY,
  producto_id     INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  negocio_id      INT NOT NULL REFERENCES negocios(id)  ON DELETE CASCADE,
  lote            VARCHAR(50) NOT NULL,
  fecha_caducidad DATE,
  cantidad        DECIMAL(10,2) DEFAULT 0,
  creado_en       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(producto_id, negocio_id, lote)
);
CREATE INDEX IF NOT EXISTS idx_lotes_caducidad ON producto_lotes(negocio_id, fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_lotes_producto  ON producto_lotes(producto_id, negocio_id);

ALTER TABLE venta_items            ADD COLUMN IF NOT EXISTS lote_id        INT REFERENCES producto_lotes(id);
ALTER TABLE entradas_mercancia_items ADD COLUMN IF NOT EXISTS lote          VARCHAR(50);
ALTER TABLE entradas_mercancia_items ADD COLUMN IF NOT EXISTS fecha_caducidad DATE;

-- Sprint 3 Configuración: Terminal de pago (TPV)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS terminal_tipo VARCHAR(20) DEFAULT 'manual';
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS terminal_api_key TEXT;

-- Sprint 3 Configuración: Cajón de dinero
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS cajon_activo BOOLEAN DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS cajon_pin INT DEFAULT 0;

-- Sprint 3 Configuración: Impresora de tickets
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS impresora_nombre VARCHAR(100);
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS impresora_corte_auto BOOLEAN DEFAULT true;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS impresora_copias INT DEFAULT 1;

-- Formas de pago habilitadas por negocio
CREATE TABLE IF NOT EXISTS formas_pago_negocio (
  id                  SERIAL PRIMARY KEY,
  negocio_id          INT NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  clave               VARCHAR(30) NOT NULL,
  nombre              VARCHAR(50) NOT NULL,
  activo              BOOLEAN DEFAULT true,
  requiere_referencia BOOLEAN DEFAULT false,
  UNIQUE(negocio_id, clave)
);

-- Fase 4: CHECK constraint en ventas.metodo_pago (normaliza filas previas antes de agregar)
DO $$
BEGIN
  UPDATE ventas
  SET metodo_pago = 'efectivo'
  WHERE metodo_pago NOT IN ('efectivo','tarjeta','mixto','credito','transferencia');

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ventas_metodo_pago') THEN
    ALTER TABLE ventas ADD CONSTRAINT chk_ventas_metodo_pago
      CHECK (metodo_pago IN ('efectivo','tarjeta','mixto','credito','transferencia'));
  END IF;
END $$;

-- Fase 1 integridad: idempotency_key para sync offline seguro (evita duplicados en reconexión flaky)
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(36);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_idempotency_key
  ON ventas(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Fase 1 integridad: unicidad de folio por negocio (dos cajeros offline no pueden colisionar)
CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_negocio_folio
  ON ventas(negocio_id, folio) WHERE folio IS NOT NULL;

-- Fase 1 integridad: índice explícito en venta_items(venta_id) — FK en PG no garantiza índice
CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);

-- Licenciamiento: una fila por cliente/licencia
CREATE TABLE IF NOT EXISTS licencias (
  id               SERIAL PRIMARY KEY,
  clave            VARCHAR(20) NOT NULL UNIQUE,
  cliente_nombre   VARCHAR(200),
  email            VARCHAR(100),
  plan             VARCHAR(20) NOT NULL DEFAULT 'basico',
  max_maquinas     INT NOT NULL DEFAULT 1,
  fecha_inicio     DATE DEFAULT CURRENT_DATE,
  fecha_expiracion DATE,
  activa           BOOLEAN DEFAULT true,
  notas            TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- Licenciamiento: una fila por PC registrada
CREATE TABLE IF NOT EXISTS licencia_maquinas (
  id                  SERIAL PRIMARY KEY,
  licencia_id         INT NOT NULL REFERENCES licencias(id) ON DELETE CASCADE,
  hardware_id         VARCHAR(64) NOT NULL,
  hostname            VARCHAR(100),
  primera_activacion  TIMESTAMPTZ DEFAULT NOW(),
  ultima_validacion   TIMESTAMPTZ DEFAULT NOW(),
  activa              BOOLEAN DEFAULT true,
  UNIQUE(licencia_id, hardware_id)
);

CREATE INDEX IF NOT EXISTS idx_licencias_clave ON licencias(clave);
CREATE INDEX IF NOT EXISTS idx_licencia_maquinas_lic ON licencia_maquinas(licencia_id);

-- ============================================================
-- Multi-tenant: productos por negocio (aislamiento estricto)
-- Cada negocio mantiene su propio catálogo. Mismo código de barras
-- puede coexistir en distintos negocios (Coca-Cola en farmacia y
-- en jerseys son filas distintas con su propio precio/costo).
-- ============================================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS negocio_id INT REFERENCES negocios(id) ON DELETE CASCADE;

-- Backfill: asignar negocio según primer registro de inventario que tenga el producto
UPDATE productos p
SET negocio_id = sub.negocio_id
FROM (
  SELECT DISTINCT ON (producto_id) producto_id, negocio_id
  FROM inventario
  ORDER BY producto_id, negocio_id ASC
) sub
WHERE p.id = sub.producto_id AND p.negocio_id IS NULL;

-- Productos huérfanos (sin inventario) → primer negocio existente
UPDATE productos
SET negocio_id = (SELECT MIN(id) FROM negocios)
WHERE negocio_id IS NULL;

-- Una vez backfilleados, exigir negocio_id NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='productos' AND column_name='negocio_id' AND is_nullable='YES')
     AND NOT EXISTS (SELECT 1 FROM productos WHERE negocio_id IS NULL) THEN
    ALTER TABLE productos ALTER COLUMN negocio_id SET NOT NULL;
  END IF;
END $$;

-- Reemplazar UNIQUE(codigo_barras) global por UNIQUE(codigo_barras, negocio_id)
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_codigo_barras_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'productos_codigo_barras_negocio_key') THEN
    ALTER TABLE productos ADD CONSTRAINT productos_codigo_barras_negocio_key
      UNIQUE (codigo_barras, negocio_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_productos_negocio ON productos(negocio_id, activo);

-- ============================================================
-- Mercado Pago: estado autoritativo de payment-intents
-- Alimentado por el webhook (notification_url). El POS lee de aquí
-- en vez de pollear MP directamente, evitando que un cobro aprobado
-- en la terminal quede colgado en el POS.
-- ============================================================
CREATE TABLE IF NOT EXISTS mp_intent_estados (
  intent_id      VARCHAR(64) PRIMARY KEY,
  estado         VARCHAR(40),
  payment_id     VARCHAR(64),
  payment_state  VARCHAR(40),
  monto          DECIMAL(10,2),
  raw            JSONB,
  recibido_en    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mp_intent_actualizado ON mp_intent_estados(actualizado_en DESC);

-- Trigger: mantener actualizado_en actualizado en UPDATE (productos, inventario, clientes, config_recargas)
CREATE OR REPLACE FUNCTION fn_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['productos','inventario','clientes','config_recargas','mp_intent_estados']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_' || t || '_actualizado_en'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_actualizado_en BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_actualizar_timestamp()',
        t, t
      );
    END IF;
  END LOOP;
END $$;
`

const migrate = async () => {
  try {
    console.log('Iniciando migraciones...')
    await pool.query(schema)
    console.log('✓ Migraciones completadas correctamente')
    process.exit(0)
  } catch (err) {
    console.error('✗ Error en migraciones:', err.message)
    process.exit(1)
  }
}

migrate()
