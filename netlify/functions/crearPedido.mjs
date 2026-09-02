
import { db } from "./firebase.mjs";
import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
} from "firebase-admin/firestore";

// =====================================================
// PROMOCIONES
// =====================================================

const PROMOCIONES = {
  individual: {
    cantidadNumeros: 1,
    precio: 7000,
  },

  duo: {
    cantidadNumeros: 2,
    precio: 10000,
  },

  pack5: {
    cantidadNumeros: 3,
    precio: 15000,
  },
};


// =====================================================
// CONFIGURACIÓN
// =====================================================

const NUMERO_INICIAL = 1;
const NUMERO_MAXIMO = 999999;


// =====================================================
// HELPERS
// =====================================================

function generarNumero(numero) {
  return String(numero).padStart(6, "0");
}


function generarPedidoId() {
  // Ejemplo: MW-20260902-48321

  const fecha = new Date();

  const año = fecha.getFullYear();

  const mes = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    fecha.getDate()
  ).padStart(2, "0");

  const random = Math.floor(
    10000 + Math.random() * 90000
  );

  return `MW-${año}${mes}${dia}-${random}`;
}


// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

export const handler = async (event) => {

  // ---------------------------------------------------
  // CORS
  // ---------------------------------------------------

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };


  // ---------------------------------------------------
  // PREFLIGHT
  // ---------------------------------------------------

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }


  // ---------------------------------------------------
  // SOLO POST
  // ---------------------------------------------------

  if (event.httpMethod !== "POST") {

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Método no permitido.",
      }),
    };

  }


  try {

    // -------------------------------------------------
    // LEER BODY
    // -------------------------------------------------

    let body;

    try {

      body = JSON.parse(
        event.body || "{}"
      );

    } catch {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "El cuerpo de la solicitud no es válido.",
        }),
      };

    }


    const {
      nombre,
      email,
      telefono,
      promocionId,
    } = body;


    // -------------------------------------------------
    // VALIDACIONES
    // -------------------------------------------------

    if (
      !nombre ||
      !email ||
      !telefono ||
      !promocionId
    ) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Nombre, email, teléfono y promoción son obligatorios.",
        }),
      };

    }


    // -------------------------------------------------
    // VALIDAR PROMOCIÓN DESDE SERVIDOR
    // -------------------------------------------------

    const promocion =
      PROMOCIONES[promocionId];


    if (!promocion) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "La promoción seleccionada no existe.",
        }),
      };

    }


    // -------------------------------------------------
    // REFERENCIA A CONFIGURACIÓN DEL SORTEO
    // -------------------------------------------------

    const configuracionRef = doc(
      db,
      "configuracion",
      "sorteo"
    );


    // -------------------------------------------------
    // GENERAR PEDIDO
    // -------------------------------------------------

    const pedidoId =
      generarPedidoId();


    const pedidoRef = doc(
      db,
      "pedidos",
      pedidoId
    );


    // -------------------------------------------------
    // TRANSACCIÓN
    // -------------------------------------------------

    const resultado =
      await runTransaction(
        db,
        async (transaction) => {

          const configuracionSnap =
            await transaction.get(
              configuracionRef
            );


          let ultimoNumero =
            configuracionSnap.exists
              ? configuracionSnap.data()
                  .ultimoNumero || 0
              : 0;


          const primerNumero =
            ultimoNumero + 1;


          const ultimoNumeroNecesario =
            ultimoNumero +
            promocion.cantidadNumeros;


          // -------------------------------------------
          // VALIDAR LÍMITE
          // -------------------------------------------

          if (
            ultimoNumeroNecesario >
            NUMERO_MAXIMO
          ) {

            throw new Error(
              "No quedan números disponibles para esta promoción."
            );

          }


          // -------------------------------------------
          // GENERAR NÚMEROS
          // -------------------------------------------

          const numeros = [];

          for (
            let i = 1;
            i <= promocion.cantidadNumeros;
            i++
          ) {

            numeros.push(
              generarNumero(
                ultimoNumero + i
              )
            );

          }


          // -------------------------------------------
          // ACTUALIZAR ÚLTIMO NÚMERO
          // -------------------------------------------

          transaction.set(
            configuracionRef,
            {
              ultimoNumero:
                ultimoNumeroNecesario,
            },
            {
              merge: true,
            }
          );


          // -------------------------------------------
          // CREAR PEDIDO
          // -------------------------------------------

          transaction.set(
            pedidoRef,
            {
              pedidoId,

              nombre:
                String(nombre).trim(),

              email:
                String(email)
                  .trim()
                  .toLowerCase(),

              telefono:
                String(telefono).trim(),

              promocionId,

              cantidadNumeros:
                promocion.cantidadNumeros,

              monto:
                promocion.precio,

              numeros,

              estado:
                "pendiente",

              estadoPago:
                "pendiente",

              fechaCreacion:
                serverTimestamp(),

              fechaInicioPago:
                serverTimestamp(),
            }
          );


          return {
            pedidoId,
            numeros,
            monto: promocion.precio,
            cantidadNumeros:
              promocion.cantidadNumeros,
          };

        }
      );


    // -------------------------------------------------
    // RESPUESTA
    // -------------------------------------------------

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,

        pedidoId:
          resultado.pedidoId,

        numeros:
          resultado.numeros,

        monto:
          resultado.monto,

        cantidadNumeros:
          resultado.cantidadNumeros,

        estado:
          "pendiente",
      }),
    };


  } catch (error) {

    console.error(
      "ERROR CREANDO PEDIDO:",
      error
    );


    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          error.message ||
          "No se pudo crear el pedido.",
      }),
    };

  }
};

