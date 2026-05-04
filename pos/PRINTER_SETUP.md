# Integración Impresora Térmica Blackpos WW-5888T

## Hardware
- **Modelo**: Blackpos WW-5888T
- **Interfaz**: USB
- **Ancho papel**: 58mm
- **Caracteres por línea**: 32 caracteres máximo
- **Cajón**: RJ11 (se activa con comando ESC/POS)

## Instalación de Dependencias

Ya está en `package.json`:
```bash
npm install usb
```

En Windows, puede requerir Visual C++ Build Tools para compilar la dependencia.

## Archivos de Implementación

### Electron Main Process
- **`electron/printer-service.js`**: Clase `PrinterService` con métodos ESC/POS
  - Conexión USB automática
  - Impresión de tickets formateados
  - Apertura de cajón

- **`electron/main.js`**: IPC handlers
  - `printer:connect` - Conectar impresora
  - `printer:disconnect` - Desconectar
  - `printer:print-ticket` - Imprimir ticket
  - `printer:open-drawer` - Abrir cajón

- **`electron/preload.js`**: Exposición segura de APIs
  - `window.printerAPI.connect()`
  - `window.printerAPI.disconnect()`
  - `window.printerAPI.printTicket(venta)`
  - `window.printerAPI.openDrawer()`

### React Component
- **`src/printer-client.js`**: Wrapper para llamadas IPC desde React
  - Importar en componentes con `import { printTicket, openCashDrawer } from '../printer-client'`

- **`src/screens/VentaScreen.jsx`**: Integración en flujo de cobro
  - Al cobrar exitoso, imprime ticket automáticamente
  - Abre cajón si pago es en efectivo

## Flujo de Impresión

```
Cajero selecciona método pago
         ↓
Presiona F1/F2 (Cobrar)
         ↓
Backend registra venta
         ↓
React llama printTicket()
         ↓
Main process (Electron) conecta USB
         ↓
Imprime ticket con ESC/POS
         ↓
Si efectivo → abre cajón
         ↓
Muestra confirmación en POS
```

## Formato del Ticket (58mm)

```
        ABARROTES
     [NOMBRE NEGOCIO]
   [FECHA Y HORA ACTUAL]
................................
PRODUCTOS
Leche Lala 1L    x2      $48.00
  $24.00/u
Pan Bimbo        x1      $32.00
Coca-Cola        x3      $54.00
................................
                 Subtotal: $134.00
                Descuento: $0.00
          TOTAL: $134.00
Método: Efectivo
          Recibido: $150.00
            Cambio: $16.00
................................
      ¡Gracias por su compra!


```

## Códigos ESC/POS Utilizados

| Comando | Bytes | Función |
|---------|-------|---------|
| ESC @ | 1B 40 | Reset impresora |
| ESC t | 1B 74 | Set character code table |
| ESC a | 1B 61 | Align (0=left, 1=center, 2=right) |
| GS ! | 1D 21 | Set font size (0=normal, 1=2x ancho, 2=2x alto, 3=2x todo) |
| ESC E | 1B 45 | Bold on/off |
| ESC p | 1B 70 | Open cash drawer |
| GS V | 1D 56 | Cut paper |

## Testing sin Impresora Real

Para probar sin hardware:
1. Comentar la línea `await printer.connect()` en funciones IPC
2. Los comandos se ejecutarán sin error
3. Mensajes indicarán que se "imprimió" el ticket

## Debugging

El servicio de impresora registra errores en consola:
- Abrir DevTools: F12 en la app (dev mode)
- Ver console en Developer Tools de Electron
- Errores comunes:
  - "No printer found": USB no detecta dispositivo
  - "No output endpoint found": Impresora conectada pero no reconocida como USB device
  - Timeout: Impresora desconectada durante impresión

## Configuración Admin Web (Pendiente)

En la pantalla de Negocios → Configuración:
- [ ] Toggle: "Abrir cajón automáticamente" (abrir_caja_al_cobrar)
- [ ] Select: "Impresora térmica conectada a:"
  - Opción: USB (automático)
  - Opción: Red (futuro)
  - Opción: Ninguna (desactivar)
