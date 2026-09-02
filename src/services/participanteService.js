// =====================================================
// Este archivo YA NO escribe en Firestore desde el cliente.
// Antes tenía una función `registrarParticipante` que aprobaba
// la participación y generaba números sin verificar ningún pago,
// escribiendo directo a Firestore desde el navegador. Eso es
// inseguro: cualquiera podía llamarla desde la consola del
// navegador y anotarse gratis. Todo el registro/aprobación real
// ahora pasa exclusivamente por las Cloud Functions
// (crearParticipantePendiente y verificarPago), que corren en el
// servidor con el Admin SDK.
//
// Este archivo solo expone el catálogo de promociones para la UI.
// =====================================================

const PROMOCIONES = [
  {
    id: "individual",
    cantidadNumeros: 1,
    precio: 1, // PRUEBA
    disponible: true,
  },
  {
    id: "duo",
    cantidadNumeros: 2,
    precio: 10000,
    disponible: false, // activar cuando tengas el link real de pago
  },
  {
    id: "pack5",
    cantidadNumeros: 3,
    precio: 15000,
    disponible: false, // activar cuando tengas el link real de pago
  },
];

export const obtenerPromociones = () => {
  return PROMOCIONES;
};