import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";

const PROMOCIONES = {
  individual: {
    cantidadNumeros: 1,
    precio: 1,
    activa: true,
  },

  duo: {
    cantidadNumeros: 2,
    precio: 10000,
    activa: false,
  },

  pack5: {
    cantidadNumeros: 3,
    precio: 15000,
    activa: false,
  },
};

export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Método no permitido",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const {
      nombre,
      email,
      telefono,
      promocionId,
    } = await req.json();

    if (!nombre || !email || !telefono || !promocionId) {
      return new Response(
        JSON.stringify({
          error: "Faltan datos obligatorios",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const promocion = PROMOCIONES[promocionId];

    if (!promocion || !promocion.activa) {
      return new Response(
        JSON.stringify({
          error:
            "Esa promoción no está disponible por el momento.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const participanteRef = db
      .collection("participantes")
      .doc();

    await participanteRef.set({
      nombre,
      email: email.trim().toLowerCase(),
      telefono,

      promocionId,

      cantidadNumeros: promocion.cantidadNumeros,
      montoEsperado: promocion.precio,

      numeros: [],

      estadoPago: "pendiente",
      emailEnviado: false,

      fechaRegistro: FieldValue.serverTimestamp(),
      fechaInicioPago: FieldValue.serverTimestamp(),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        participanteId: participanteRef.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error creando participante:",
      error
    );

    return new Response(
      JSON.stringify({
        error: "Error creando participante",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};