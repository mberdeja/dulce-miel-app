# Seguridad — qué se hizo y qué falta

Ningún sistema es "100% seguro" — eso no lo puede prometer nadie de forma honesta.
Lo que sí puedo decirte con precisión es **exactamente qué se revisó, qué se
corrigió, y qué queda pendiente** para cuando escales.

## ✅ Lo que se revisó y quedó resuelto

**1. Credenciales/secretos hardcodeados**
Escaneo completo del código (patrones de API keys de Google, tokens tipo `sk-`,
contraseñas literales, llaves privadas). Resultado: **0 encontrados**. La config
de Firebase ya vivía en variables de entorno (`NEXT_PUBLIC_FIREBASE_*`) desde la
fase 1; se confirmó que sigue así en todos los archivos nuevos.

Nota técnica importante: el `apiKey` de Firebase **no es un secreto que haya que
esconder** — Google lo diseñó para ser público (viaja al navegador de cualquier
visitante). La seguridad real de Firebase no depende de ocultar esa key, sino de
las **reglas de Firestore** (punto 3). Igual la dejamos en variable de entorno
por buena práctica y para no tener que tocar código si cambia.

**2. Dependencia con vulnerabilidad crítica**
`npm audit` encontró que Next.js 14.2.5 tenía **una vulnerabilidad crítica**
publicada (múltiples CVEs: DoS, bypass de autorización, SSRF, etc.). Se
actualizó a **Next.js 16.3.6**, la versión estable más reciente sin
vulnerabilidades conocidas. Confirmado con `npm audit`: **0 vulnerabilidades**.

**3. Roles reales a nivel de base de datos (no solo de interfaz)**
Antes, cualquier usuario logueado podía leer/escribir todo. Ahora
`firestore.rules` aplica:
- Un Admin puede editar cualquier cosa (precios, productos, promociones, usuarios).
- Un Vendedor puede **crear** productos y **modificar el stock** (al vender o
  comprar), pero **no puede cambiar precios** de un producto existente.
- Solo un Admin puede leer/escribir la colección `usuarios` (nadie se autoasigna rol).
- Una venta se crea con el UID real de quien la registra — nadie puede firmar
  una venta a nombre de otra persona.
- Una persona desactivada (`activo: false` en su documento de usuario) pierde
  acceso a todo, aunque su login de Firebase siga funcionando.

**4. Validación estricta de inputs**
Se agregó `zod` con límites de largo, tipo y rango en cada campo (cantidad,
precio, medio de pago, tipo de entrega, usuario de TikTok). Los campos de texto
libre rechazan patrones típicos de inyección (`<script>`, `javascript:`,
`onerror=`, etc.) — probado con tests automatizados (ver abajo).

**Importante — por qué hay DOS capas de validación:** la de `zod` corre en el
navegador y es para UX (avisa al instante). La que de verdad protege es
`firestore.rules`, porque corre en el servidor de Google y no se puede saltar
abriendo la consola del navegador. Si algún día agregás un formulario nuevo,
las reglas también necesitan su propio chequeo de esos campos — no alcanza con
agregar validación solo del lado del cliente.

## 🧪 Pruebas que corrí antes de armar el zip

```
npm install   → 0 vulnerabilidades (antes: 1 crítica + 1 alta)
npm run build → compila sin errores, genera las 4 rutas (/, /login, /ventas, /_not-found)
npm test      → 12/12 pruebas automatizadas pasan, incluyendo:
                - rechaza <script>, javascript:, onerror= disfrazados de texto normal
                - rechaza cantidades y precios negativos o en cero
                - rechaza medios de pago fuera de la lista permitida
                - la promo automática calcula bien con distintos escenarios de carrito
```

## ⚠️ Lo que NO cubre esta revisión (para que lo tengas presente)

- **No es un pentest profesional.** Es una revisión de código + pruebas
  automatizadas, no una auditoría externa. Si en algún momento vas a manejar
  pagos con tarjeta directamente (no solo registrar que "pagó con tarjeta") o
  a escalar a un volumen grande, contratá una auditoría de seguridad real.
- **No hay límite de intentos de login** (rate limiting) todavía — Firebase Auth
  tiene protecciones básicas propias contra fuerza bruta, pero no hemos agregado
  una capa extra.
- **No hay 2FA (doble factor)** para las cuentas de Admin/Vendedor.
- **App Check** (la capa de Firebase que verifica que las peticiones vienen de
  tu app real y no de un script automatizado) no está activado todavía — es
  recomendable antes de manejar volumen alto.
- Compras, Precios, Inventario, Resumen y Pedidos **todavía no existen como
  código real** (solo Ventas) — cuando los construyamos, cada uno necesita su
  propio paso por reglas + validación, igual que hicimos acá.

## Cómo dar de alta a un usuario con rol (por ahora, manual)

En la consola de Firebase:
1. **Authentication** → Agregar usuario (email + contraseña).
2. Copiá el **UID** que Firebase le asignó.
3. **Firestore Database** → colección `usuarios` → documento nuevo con **ese UID
   como ID del documento** → campos:
   ```
   nombre: "Ana Pérez"
   email: "ana@dulcemiel.bo"
   rol: "vendedor"        // o "admin"
   activo: true
   ```

Sin este documento, la persona puede hacer login pero la app la va a bloquear
("tu cuenta todavía no tiene un rol asignado").
