# Dulce Miel — App (Ventas, fase 1)

Primer módulo real conectado a Firebase: **login con roles reales (Admin/Vendedor)**
y **Ventas** (búsqueda/filtros, carrito, promo automática, descuenta stock y guarda
la venta en Firestore de verdad, con reglas de seguridad que validan todo del lado
del servidor). Compras, Precios, Inventario, Resumen y Pedidos van en las
siguientes fases.

📄 Antes de dar acceso a alguien más, leé **SECURITY.md** — dice exactamente qué
se revisó, qué se corrigió (incluyendo una vulnerabilidad crítica de Next.js que
ya está parchada) y qué falta.

## 1) Configurar Firebase

En tu proyecto de Firebase (el que ya creaste):

1. **Authentication** → habilitá el proveedor "Correo electrónico/contraseña".
   Creá ahí mismo tu primer usuario (tu email + una contraseña).
2. **Firestore Database** → creala en modo producción si no existe.
3. **Dale rol a tu usuario** (si no hacés esto, la app te va a bloquear el acceso):
   copiá el UID de tu usuario (pestaña Authentication) y creá un documento en la
   colección `usuarios` con ese UID como ID del documento:
   ```
   nombre: "Melissa Berdeja"
   email: "tu-correo@ejemplo.com"
   rol: "admin"
   activo: true
   ```
4. Cargá manualmente (por ahora, a mano desde la consola de Firestore) al menos un
   par de documentos de prueba en la colección **`productos`**, con esta forma exacta:

   ```
   sku: "DM-BAS-NEG-S"
   nombre: "Básica manga cero"
   tipo: "Polera"
   color: "Negro"
   talla: "S"
   precioVenta: 65
   stock: 8
   ```

   Y opcionalmente una promo en **`promociones`**:

   ```
   nombre: "3x100 Bs Básicas"
   aplicaANombre: "Básica manga cero"
   cantidadMinima: 3
   precioTotalPromo: 100
   activa: true
   ```

5. En **Configuración del proyecto → Tus apps**, agregá una app Web si no la tenés,
   y copiá los valores del SDK.
6. Copiá `.env.local.example` a `.env.local` y pegá ahí esos valores.
7. Subí `firestore.rules` desde la consola de Firestore (pestaña "Reglas") o con
   `firebase deploy --only firestore:rules` si tenés la CLI. **Sin este paso, las
   reglas de seguridad nuevas no se aplican** — seguirían las que tenías antes.

## 2) Probar en tu computadora (opcional antes de subir a Vercel)

```
npm install
npm test        # corre las pruebas automatizadas (deberían pasar 12/12)
npm run build   # confirma que compila sin errores
npm run dev
```

Abrí http://localhost:3000 — te va a pedir login.

## 3) Subir a GitHub y desplegar en Vercel

1. Creá un repo nuevo en GitHub y subí esta carpeta (`git init`, `git add .`,
   `git commit -m "fase 1: ventas"`, `git push`).
2. En Vercel: **Add New → Project** → importá ese repo.
3. En **Environment Variables**, cargá las mismas 6 variables de tu `.env.local`
   (Vercel no lee ese archivo, hay que pegarlas ahí a mano).
4. Deploy. Vercel te da una URL tipo `dulce-miel-app.vercel.app`.

## Qué falta (próximas fases)

- Pantallas de Compras, Precios, Inventario, Resumen y Pedidos conectadas igual que Ventas.
- Una pantalla para dar de alta usuarios y asignarles rol, en vez de crearlos a mano
  desde la consola de Firebase.
- App Check y 2FA para Admin (ver SECURITY.md, sección de pendientes).
