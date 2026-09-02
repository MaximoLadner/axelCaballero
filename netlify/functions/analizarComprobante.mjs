
import { db } from "./firebase.mjs";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const MODELO =
  "google/gemini-2.5-flash";

const CBU_ESPERADO =
  "0000129400000007350191";

const TITULAR_ESPERADO =
  "Servygest Provincia";


// =====================================================
// CORS
// =====================================================

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};


// =====================================================
// FUNCIÓN
// =====================================================

export const handler = async (event) => {

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
    // VALIDAR API KEY
    // -------------------------------------------------

    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "Falta configurar OPENROUTER_API_KEY en Netlify."
      );
    }


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
          error:
            "El cuerpo de la solicitud no es válido.",
        }),
      };
    }


    const {
      pedidoId,
      imagen,
    } = body;


    // -------------------------------------------------
    // VALIDACIONES
    // -------------------------------------------------

    if (!pedidoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Falta el número de pedido.",
        }),
      };
    }


    if (!imagen) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Falta el comprobante.",
        }),
      };
    }


    if (
      typeof imagen !== "string" ||
      !imagen.startsWith("data:image/")
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "El archivo enviado no es una imagen válida.",
        }),
      };
    }


    // -------------------------------------------------
    // BUSCAR PEDIDO
    // -------------------------------------------------

    const pedidoRef =
      db
        .collection("pedidos")
        .doc(pedidoId);

    const pedidoSnap =
      await pedidoRef.get();


    if (!pedidoSnap.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error:
            "No encontramos el pedido indicado.",
        }),
      };
    }


    const pedido =
      pedidoSnap.data();


    // -------------------------------------------------
    // SI YA ESTÁ APROBADO
    // -------------------------------------------------

    if (
      pedido.estadoPago === "aprobado"
    ) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          aprobado: true,
          mensaje:
            "Este pedido ya tiene el pago aprobado.",
        }),
      };
    }


    // -------------------------------------------------
    // MONTO REAL DEL PEDIDO
    // -------------------------------------------------

    const montoEsperado =
      Number(pedido.monto);


    if (
      !montoEsperado ||
      montoEsperado <= 0
    ) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "El pedido no tiene un monto válido.",
        }),
      };
    }


    // -------------------------------------------------
    // PROMPT PARA LA IA
    // -------------------------------------------------

    const prompt = `
Analizá cuidadosamente este comprobante de transferencia bancaria.

Necesitamos extraer exclusivamente información visible en la imagen.

Devolvé ÚNICAMENTE un JSON válido, sin markdown, sin explicaciones y sin texto adicional.

Formato obligatorio:

{
  "es_comprobante": true,
  "monto": 0,
  "titular_destino": "",
  "cbu_destino": "",
  "fecha": "",
  "hora": "",
  "estado": "",
  "confianza": 0
}

Reglas:

- "es_comprobante": true solamente si realmente parece un comprobante de transferencia.
- "monto": importe transferido como número.
- "titular_destino": nombre del destinatario de la transferencia.
- "cbu_destino": CBU/CVU/identificador de la cuenta destinataria si aparece.
- "fecha": fecha de la transferencia si aparece.
- "hora": hora si aparece.
- "estado": estado que aparece en el comprobante, por ejemplo "completada", "exitosa", "realizada", "aprobada", etc.
- "confianza": número entre 0 y 100 indicando qué tan seguro estás de la extracción.
- Si un dato no aparece claramente, dejalo como string vacío.
- No inventes datos.
- No confundas el CBU del emisor con el del destinatario.
- No confundas el monto con el saldo disponible.
`;

    
    // -------------------------------------------------
    // OPENROUTER
    // -------------------------------------------------

    const respuesta =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization":
              `Bearer ${OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              "https://axelcaballero.netlify.app",

            "X-Title":
              "Motor Win",
          },

          body: JSON.stringify({
            model: MODELO,

            messages: [
              {
                role: "user",

                content: [
                  {
                    type: "text",
                    text: prompt,
                  },

                  {
                    type: "image_url",

                    image_url: {
                      url: imagen,
                    },
                  },
                ],
              },
            ],

            temperature: 0,
          }),
        }
      );


    const datosIA =
      await respuesta.json();


    // -------------------------------------------------
    // ERROR OPENROUTER
    // -------------------------------------------------

    if (!respuesta.ok) {

      console.error(
        "ERROR OPENROUTER:",
        datosIA
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error:
            "No se pudo analizar el comprobante con la IA.",
          detalle:
            datosIA?.error?.message ||
            "Error desconocido de OpenRouter.",
        }),
      };
    }


    // -------------------------------------------------
    // OBTENER RESPUESTA
    // -------------------------------------------------

    const contenido =
      datosIA
        ?.choices?.[0]
        ?.message?.content;


    if (!contenido) {
      throw new Error(
        "OpenRouter no devolvió una respuesta válida."
      );
    }


    // -------------------------------------------------
    // LIMPIAR JSON
    // -------------------------------------------------

    let textoJSON =
      contenido
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim();


    let comprobante;

    try {

      comprobante =
        JSON.parse(textoJSON);

    } catch (error) {

      console.error(
        "RESPUESTA IA NO JSON:",
        contenido
      );

      throw new Error(
        "La IA no devolvió un formato válido."
      );
    }


    // =================================================
    // VALIDACIÓN DEL COMPROBANTE
    // =================================================

    const montoDetectado =
      Number(
        comprobante.monto
      );


    const montoCorrecto =
      montoDetectado ===
      montoEsperado;


    const cbuDetectado =
      String(
        comprobante.cbu_destino || ""
      )
        .replace(/\s/g, "")
        .trim();


    const cbuCorrecto =
      cbuDetectado ===
      CBU_ESPERADO;


    const titularDetectado =
      String(
        comprobante.titular_destino || ""
      )
        .trim()
        .toLowerCase();


    const titularCorrecto =
      titularDetectado ===
      TITULAR_ESPERADO.toLowerCase();


    const esComprobante =
      comprobante.es_comprobante === true;


    const estadoTransferencia =
      String(
        comprobante.estado || ""
      )
        .toLowerCase();


    const transferenciaExitosa =
      [
        "completada",
        "completado",
        "exitosa",
        "exitoso",
        "realizada",
        "realizado",
        "aprobada",
        "aprobado",
        "confirmada",
        "confirmado",
      ].some(
        (estado) =>
          estadoTransferencia.includes(
            estado
          )
      );


    const confianza =
      Number(
        comprobante.confianza || 0
      );


    // -------------------------------------------------
    // DECISIÓN FINAL
    // -------------------------------------------------

    const aprobado =
      esComprobante &&
      montoCorrecto &&
      cbuCorrecto &&
      titularCorrecto &&
      transferenciaExitosa &&
      confianza >= 70;


    // =================================================
    // APROBAR PEDIDO
    // =================================================

    if (aprobado) {

      await pedidoRef.update({

        estadoPago:
          "aprobado",

        estado:
          "confirmado",

        comprobanteAnalizado:
          true,

        comprobanteResultado: {
          monto:
            montoDetectado,

          titular:
            comprobante.titular_destino,

          cbu:
            cbuDetectado,

          fecha:
            comprobante.fecha || "",

          hora:
            comprobante.hora || "",

          estado:
            comprobante.estado || "",

          confianza,
        },

        fechaPago:
          new Date(),
      });


      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({

          ok: true,

          aprobado: true,

          mensaje:
            "¡Pago aprobado! Tu participación quedó confirmada.",

          comprobante: {
            monto:
              montoDetectado,

            titular:
              comprobante.titular_destino,

            fecha:
              comprobante.fecha,

            hora:
              comprobante.hora,
          },
        }),
      };
    }


    // =================================================
    // RECHAZADO
    // =================================================

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({

        ok: true,

        aprobado: false,

        mensaje:
          "No pudimos validar el comprobante.",

        motivos: {

          esComprobante,

          montoCorrecto,

          cbuCorrecto,

          titularCorrecto,

          transferenciaExitosa,

          confianza,
        },

        comprobante: {

          monto:
            montoDetectado,

          titular:
            comprobante.titular_destino || "",

          cbu:
            cbuDetectado,

          fecha:
            comprobante.fecha || "",

          hora:
            comprobante.hora || "",

          estado:
            comprobante.estado || "",

          confianza,
        },
      }),
    };


  } catch (error) {

    console.error(
      "ERROR ANALIZANDO COMPROBANTE:",
      error
    );


    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          error.message ||
          "No se pudo analizar el comprobante.",
      }),
    };
  }
};
````
