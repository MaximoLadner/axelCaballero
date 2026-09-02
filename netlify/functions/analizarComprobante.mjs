
import { db } from "./firebase.mjs";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

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
// HANDLER
// =====================================================

export const handler = async (event) => {

  // ---------------------------------------------------
  // OPTIONS
  // ---------------------------------------------------

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }


  // ---------------------------------------------------
  // POST
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
    // API KEY
    // -------------------------------------------------

    if (!OPENROUTER_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "OPENROUTER_API_KEY no está configurada en Netlify.",
        }),
      };
    }


    // -------------------------------------------------
    // BODY
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
            "El JSON enviado no es válido.",
        }),
      };
    }


    const pedidoId =
      body.pedidoId;

    const imagen =
      body.imagen;


    // -------------------------------------------------
    // VALIDACIONES
    // -------------------------------------------------

    if (!pedidoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Falta el pedidoId.",
        }),
      };
    }


    if (!imagen) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error:
            "Falta la imagen del comprobante.",
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
            "No encontramos ese pedido.",
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
            "El pago ya fue aprobado anteriormente.",
        }),
      };
    }


    const montoEsperado =
      Number(pedido.monto);


    // -------------------------------------------------
    // PROMPT
    // -------------------------------------------------

    const prompt = `
Analizá esta imagen.

Quiero saber si es un comprobante real de una transferencia bancaria.

Extraé únicamente información que sea claramente visible.

Respondé ÚNICAMENTE con JSON válido.

Formato:

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

1. es_comprobante debe ser true solamente si la imagen parece un comprobante de transferencia.
2. monto debe ser el importe transferido.
3. titular_destino debe ser el nombre del destinatario.
4. cbu_destino debe ser el CBU/CVU/identificador de la cuenta destinataria si aparece.
5. fecha debe ser la fecha visible.
6. hora debe ser la hora visible.
7. estado debe indicar el estado de la transferencia.
8. confianza debe ser un número entre 0 y 100.
9. No inventes información.
10. Si un dato no aparece claramente, usá "".
11. No confundas los datos del emisor con los del destinatario.
`;


    // -------------------------------------------------
    // OPENROUTER
    // -------------------------------------------------

    const openRouterResponse =
      await fetch(
        OPENROUTER_URL,
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
            max_tokens: 1000,
          }),
        }
      );


    // -------------------------------------------------
    // RESPUESTA OPENROUTER
    // -------------------------------------------------

    const openRouterData =
      await openRouterResponse.json();


    if (!openRouterResponse.ok) {

      console.error(
        "OPENROUTER ERROR:",
        JSON.stringify(
          openRouterData
        )
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error:
            "OpenRouter rechazó la solicitud.",
          detalle:
            openRouterData?.error?.message ||
            "Error desconocido.",
        }),
      };
    }


    // -------------------------------------------------
    // TEXTO DE LA IA
    // -------------------------------------------------

    const contenido =
      openRouterData
        ?.choices?.[0]
        ?.message?.content;


    if (!contenido) {
      throw new Error(
        "OpenRouter no devolvió contenido."
      );
    }


    console.log(
      "RESPUESTA OPENROUTER:",
      contenido
    );


    // -------------------------------------------------
    // LIMPIAR RESPUESTA
    // -------------------------------------------------

    let texto =
      String(contenido).trim();


    if (
      texto.startsWith("```")
    ) {
      texto =
        texto
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();
    }


    // -------------------------------------------------
    // PARSEAR JSON
    // -------------------------------------------------

    let resultadoIA;

    try {

      resultadoIA =
        JSON.parse(texto);

    } catch {

      console.error(
        "JSON IA INVÁLIDO:",
        texto
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error:
            "La IA respondió en un formato inválido.",
          respuestaIA:
            texto,
        }),
      };
    }


    // =================================================
    // VALIDACIÓN
    // =================================================

    const montoDetectado =
      Number(
        resultadoIA.monto
      );


    const montoCorrecto =
      montoDetectado ===
      montoEsperado;


    const cbuDetectado =
      String(
        resultadoIA.cbu_destino || ""
      )
        .replace(/\s/g, "");


    const cbuCorrecto =
      cbuDetectado ===
      CBU_ESPERADO;


    const titularDetectado =
      String(
        resultadoIA.titular_destino || ""
      )
        .trim()
        .toLowerCase();


    const titularCorrecto =
      titularDetectado ===
      TITULAR_ESPERADO
        .toLowerCase();


    const esComprobante =
      resultadoIA.es_comprobante === true;


    const estado =
      String(
        resultadoIA.estado || ""
      )
        .toLowerCase();


    const transferenciaExitosa =
      estado.includes("complet") ||
      estado.includes("exit") ||
      estado.includes("realiz") ||
      estado.includes("aprob") ||
      estado.includes("confirm");


    const confianza =
      Number(
        resultadoIA.confianza || 0
      );


    const aprobado =
      esComprobante &&
      montoCorrecto &&
      cbuCorrecto &&
      titularCorrecto &&
      transferenciaExitosa &&
      confianza >= 70;


    // =================================================
    // APROBADO
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
            resultadoIA.titular_destino,

          cbu:
            cbuDetectado,

          fecha:
            resultadoIA.fecha || "",

          hora:
            resultadoIA.hora || "",

          estado:
            resultadoIA.estado || "",

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
              resultadoIA.titular_destino,

            fecha:
              resultadoIA.fecha || "",

            hora:
              resultadoIA.hora || "",
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

        comprobante: {

          monto:
            montoDetectado,

          titular:
            resultadoIA.titular_destino || "",

          cbu:
            cbuDetectado,

          fecha:
            resultadoIA.fecha || "",

          hora:
            resultadoIA.hora || "",

          estado:
            resultadoIA.estado || "",

          confianza,
        },

        validacion: {

          esComprobante,

          montoCorrecto,

          cbuCorrecto,

          titularCorrecto,

          transferenciaExitosa,

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
          "Error interno analizando el comprobante.",
      }),
    };
  }
};

