import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import db from "../firebase/firestore";

const participantesRef = collection(db, "participantes");

const configuracionRef = doc(db, "configuracion", "sorteo");

const PROMOCIONES = [
  {
    id: "individual",
    cantidadNumeros: 1,
    precio: 7000,
  },
  {
    id: "duo",
    cantidadNumeros: 2,
    precio: 10000,
  },
  {
    id: "pack5",
    cantidadNumeros: 3,
    precio: 15000,
  },
  
];

export const obtenerPromociones = () => {
  return PROMOCIONES;
};

export const registrarParticipante = async (participante) => {
  try {
    const promocion = PROMOCIONES.find(
      (promo) => promo.id === participante.promocionId
    );

    if (!promocion) {
      throw new Error("La promoción seleccionada no existe.");
    }

    // Creamos el ID del participante antes de iniciar la transacción.
    const participanteRef = doc(participantesRef);

    const resultado = await runTransaction(db, async (transaction) => {
      // Obtenemos el contador actual.
      const configuracionSnapshot = await transaction.get(configuracionRef);

      let ultimoNumero = 0;

      if (configuracionSnapshot.exists()) {
        ultimoNumero = configuracionSnapshot.data().ultimoNumero || 0;
      }

      // El primer número será ultimoNumero + 1.
      const primerNumero = ultimoNumero + 1;

      // Generamos los números consecutivos.
      const numeros = [];

      for (
        let i = 0;
        i < promocion.cantidadNumeros;
        i++
      ) {
        numeros.push(primerNumero + i);
      }

      // Nuevo último número.
      const nuevoUltimoNumero =
        ultimoNumero + promocion.cantidadNumeros;

      // Guardamos al participante.
      transaction.set(participanteRef, {
        nombre: participante.nombre,
        email: participante.email,
        telefono: participante.telefono,

        promocionId: promocion.id,
        cantidadNumeros: promocion.cantidadNumeros,
        montoPagado: promocion.precio,

        numeros,

        estadoPago: "aprobado",

        fechaRegistro: serverTimestamp(),
      });

      // Actualizamos el contador.
      transaction.set(configuracionRef, {
        ultimoNumero: nuevoUltimoNumero,
      });

      return {
        id: participanteRef.id,
        numeros,
        cantidadNumeros: promocion.cantidadNumeros,
        montoPagado: promocion.precio,
      };
    });

    return resultado;
  } catch (error) {
    console.error("Error registrando participante:", error);
    throw error;
  }
};