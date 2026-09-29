/**
 * Calcula si el carrito califica para alguna promo, agrupando por "nombre" de producto.
 * No depende de Firebase a propósito: es lógica de negocio pura, fácil de testear.
 * Devuelve un mapa { nombreProducto: { promo, cantidad } }.
 */
export function calcularPromosAplicables(items, promociones) {
  const porNombre = {};
  items.forEach((it) => {
    porNombre[it.nombre] = (porNombre[it.nombre] || 0) + it.cantidad;
  });

  const resultado = {};
  promociones.forEach((promo) => {
    const cantidad = porNombre[promo.aplicaANombre] || 0;
    if (cantidad >= promo.cantidadMinima) {
      resultado[promo.aplicaANombre] = { promo, cantidad };
    }
  });
  return resultado;
}
