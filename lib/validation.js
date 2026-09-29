import { z } from "zod";

/**
 * IMPORTANTE — por qué esto existe en dos capas:
 * Esta validación corre en el navegador (da feedback instantáneo y evita
 * que se guarde basura por error). PERO cualquiera puede abrir la consola
 * del navegador y llamar a Firestore directo, saltándose este archivo por
 * completo. La barrera real e infranqueable son las reglas de seguridad en
 * firestore.rules, que corren en el servidor de Google y validan los mismos
 * límites (largo de texto, rangos numéricos) sin importar por dónde llegue
 * el dato. Esta capa es para UX; firestore.rules es la que de verdad protege.
 */

// Bloquea intentos obvios de inyectar HTML/JS disfrazados de texto normal
// (nombres, usuarios de TikTok, etc.). No es "anti-hackers" per se —eso lo
// hacen las reglas de Firestore y el escapado automático de React— pero
// evita que texto claramente malicioso llegue a guardarse.
const SIN_CODIGO_SOSPECHOSO = /^(?!.*(<|>|javascript:|on\w+\s*=|<script)).*$/i;

const textoSeguro = (min, max, label) =>
  z
    .string()
    .trim()
    .min(min, `${label} es muy corto`)
    .max(max, `${label} es muy largo (máx ${max} caracteres)`)
    .regex(SIN_CODIGO_SOSPECHOSO, `${label} contiene caracteres no permitidos`);

export const clienteSchema = z
  .string()
  .trim()
  .max(60, "El usuario de TikTok es muy largo")
  .regex(SIN_CODIGO_SOSPECHOSO, "Ese campo contiene caracteres no permitidos")
  .optional()
  .or(z.literal(""));

export const cantidadSchema = z
  .number()
  .int("La cantidad debe ser un número entero")
  .positive("La cantidad debe ser mayor a 0")
  .max(1000, "Cantidad demasiado alta");

export const precioSchema = z
  .number()
  .finite()
  .min(0, "El precio no puede ser negativo")
  .max(100000, "El precio parece incorrecto (demasiado alto)");

export const medioPagoSchema = z.enum([
  "Transferencia",
  "Efectivo",
  "QR",
  "Tarjeta",
]);

export const tipoEntregaSchema = z.enum(["Recoge en tienda", "Envío a domicilio"]);

export const nuevoProductoSchema = z.object({
  sku: textoSeguro(3, 40, "El SKU"),
  nombre: textoSeguro(2, 80, "El nombre"),
  tipo: textoSeguro(2, 40, "El tipo"),
  color: textoSeguro(2, 40, "El color"),
  talla: textoSeguro(1, 10, "La talla"),
  precioVenta: precioSchema,
  stock: z.number().int().min(0).max(1000000),
});

export const cantidadCompraSchema = z
  .number()
  .int("La cantidad debe ser un número entero")
  .positive("La cantidad debe ser mayor a 0")
  .max(10000, "Cantidad demasiado alta");

export const stockMinimoSchema = z
  .number()
  .int("El stock mínimo debe ser un número entero")
  .min(0, "No puede ser negativo")
  .max(100000, "Valor demasiado alto");

export const margenSchema = z
  .number()
  .finite()
  .min(0, "El margen no puede ser negativo")
  .max(10, "El margen parece demasiado alto (¿lo pusiste como fracción, ej. 1 = 100%?)");

export const promocionSchema = z.object({
  nombre: textoSeguro(2, 60, "El nombre de la promo"),
  aplicaANombre: textoSeguro(2, 80, "El producto al que aplica"),
  cantidadMinima: z.number().int().positive("La cantidad mínima debe ser mayor a 0").max(1000),
  precioTotalPromo: precioSchema,
});

/**
 * Valida una línea de compra (producto existente o nuevo) antes de agregarla al carrito.
 */
export function validarLineaCompra({ isNew, nombre, tipo, color, talla, sku, cantidad, precioCompra, precioVentaInicial }) {
  const cant = cantidadCompraSchema.safeParse(cantidad);
  if (!cant.success) return { ok: false, error: cant.error.issues[0].message };

  const precio = precioSchema.safeParse(precioCompra);
  if (!precio.success) return { ok: false, error: "Precio de compra inválido." };

  if (isNew) {
    const r = nuevoProductoSchema.safeParse({
      sku, nombre, tipo, color, talla,
      precioVenta: precioVentaInicial,
      stock: 0,
    });
    if (!r.success) return { ok: false, error: r.error.issues[0].message };
  } else {
    const n = textoSeguro(1, 80, "El nombre").safeParse(nombre);
    if (!n.success) return { ok: false, error: n.error.issues[0].message };
  }

  return { ok: true };
}

export const itemVentaSchema = z.object({
  productoId: z.string().min(1),
  sku: textoSeguro(1, 40, "El SKU"),
  nombre: textoSeguro(1, 80, "El nombre"),
  talla: textoSeguro(1, 10, "La talla"),
  precio: precioSchema,
  cantidad: cantidadSchema,
});

/**
 * Valida el formulario completo de "Registrar venta" antes de tocar Firestore.
 * Devuelve { ok: true } o { ok: false, error: "mensaje legible" }.
 */
export function validarFormularioVenta({ items, medioPago, tipoEntrega, cliente }) {
  if (!items || items.length === 0) {
    return { ok: false, error: "Agrega al menos un producto a la venta." };
  }
  for (const it of items) {
    const r = itemVentaSchema.safeParse(it);
    if (!r.success) {
      return { ok: false, error: r.error.issues[0].message };
    }
  }
  const pago = medioPagoSchema.safeParse(medioPago);
  if (!pago.success) return { ok: false, error: "Elige un medio de pago válido." };

  const entrega = tipoEntregaSchema.safeParse(tipoEntrega);
  if (!entrega.success) return { ok: false, error: "Elige un tipo de entrega válido." };

  const cli = clienteSchema.safeParse(cliente ?? "");
  if (!cli.success) return { ok: false, error: cli.error.issues[0].message };

  return { ok: true };
}
