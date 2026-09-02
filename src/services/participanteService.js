
// =====================================================
// Catálogo de promociones para la UI.
// El registro y la aprobación de pagos se realizan
// exclusivamente desde el backend.
// =====================================================

const PROMOCIONES = [
  {
    id: "individual",
    cantidadNumeros: 1,
    precio: 7000,
    disponible: true,
  },
  {
    id: "duo",
    cantidadNumeros: 2,
    precio: 10000,
    disponible: true,
  },
  {
    id: "pack5",
    cantidadNumeros: 3,
    precio: 15000,
    disponible: true,
  },
];

export const obtenerPromociones = () => {
  return PROMOCIONES;
};
