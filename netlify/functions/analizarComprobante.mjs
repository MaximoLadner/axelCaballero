
import { db } from "./firebase.mjs";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const MODELO = "google/gemini-2.5-flash";

// =====================================================
// EMAILJS (envío de mail al aprobar el pago)
// =====================================================

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

const EMAILJS_URL =
  "https://api.emailjs.com/api/v1.0/email/send";

// =====================================================
// DATOS DE LA CUENTA DESTINO
// =====================================================

// IMPORTANTE:
// Si vas a usar Mercado Pago, reemplazá estos datos
// por el CVU y titular reales de tu cuenta.

const CUENTA_ESPERADA = "0000003100058277014581";

const TITULAR_ESPERADO = "Máximo Ladner";

// Confianza mínima para aprobar
const CONFIANZA_MINIMA = 80;


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
// ENVIAR EMAIL DE CONFIRMACIÓN
// =====================================================
//
// Se llama SOLO cuando el pago queda aprobado. Si falla,
// no debe romper la respuesta al usuario: el pago ya está
// aprobado en Firestore, el mail es un "extra". Por eso
// va en su propio try/catch y solo logueamos el error.
// =====================================================

async function enviarEmailConfirmacion(pedido) {

  if (
    !EMAILJS_SERVICE_ID ||
    !EMAILJS_TEMPLATE_ID ||
    !EMAILJS_PUBLIC_KEY ||
    !EMAILJS_PRIVATE_KEY
  ) {
    console.error(
      "EMAILJS: faltan variables de entorno (EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY / EMAILJS_PRIVATE_KEY). No se envía el mail."
    );
    return;
  }

  try {

    const numerosFormateados = Array.isArray(pedido.numeros)
      ? pedido.numeros.join("\n")
      : "";

    const respuestaEmail = await fetch(EMAILJS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        // La Private Key como accessToken permite llamar a la API
        // desde un servidor (sin depender del check de origen del navegador).
        accessToken: EMAILJS_PRIVATE_KEY,
        template_params: {
          nombre: pedido.nombre || "",
          // "email" no aparece como texto visible en tu plantilla, pero
          // EmailJS lo necesita para resolver el campo "To Email" del template.
          email: pedido.email || "",
          time: new Date().toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
          }),
          cantidadNumeros: pedido.cantidadNumeros || 0,
          numeros: numerosFormateados,
          montoPagado: pedido.monto || 0,
        },
      }),
    });

    if (!respuestaEmail.ok) {
      const detalleError = await respuestaEmail.text();
      console.error(
        "EMAILJS ERROR:",
        respuestaEmail.status,
        detalleError
      );
    } else {
      console.log("EMAILJS: mail enviado a", pedido.email);
    }

  } catch (error) {
    console.error("EMAILJS EXCEPCIÓN:", error);
  }
}


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

    // =================================================
    // API KEY
    // =================================================

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


    // =================================================
    // BODY
    // =================================================

    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "El JSON enviado no es válido.",
        }),
      };
    }


    const pedidoId = body.pedidoId;
    const imagen = body.imagen;


    // =================================================
    // VALIDACIONES
    // =================================================

    if (!pedidoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Falta el pedidoId.",
        }),
      };
    }


    if (!imagen) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Falta la imagen del comprobante.",
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


    // =================================================
    // BUSCAR PEDIDO
    // =================================================

    const pedidoRef = db
      .collection("pedidos")
      .doc(pedidoId);

    const pedidoSnap = await pedidoRef.get();


    if (!pedidoSnap.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "No encontramos ese pedido.",
        }),
      };
    }


    const pedido = pedidoSnap.data();


    // =================================================
    // SI YA ESTÁ APROBADO
    // =================================================
    //
    // Nunca se manda el mail acá: si ya está aprobado,
    // significa que el mail ya se mandó la primera vez.
    // Esto evita mails duplicados si el usuario reenvía
    // el comprobante o refresca la página.
    // =================================================

    if (pedido.estadoPago === "aprobado") {
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


    const montoEsperado = Number(pedido.monto);


    // =================================================
    // PROMPT PARA GEMINI
    // =================================================

    const prompt = `
Analizá cuidadosamente esta imagen.

Determina si es un comprobante de una transferencia
o pago.

Extraé únicamente información que sea claramente visible.
NO inventes ningún dato.

Es MUY IMPORTANTE distinguir entre los datos del EMISOR
y los datos del DESTINATARIO.

El campo "titular_destino" debe contener solamente el
nombre de la persona o entidad que RECIBE el dinero.

El campo "cbu_destino" debe contener solamente el
CBU, CVU o identificador de la cuenta que RECIBE el dinero.

Si el comprobante muestra claramente que la transferencia
fue realizada, completada, exitosa, aprobada o enviada,
podés indicar ese estado.

Si el estado no aparece claramente, dejalo como "".

Respondé ÚNICAMENTE con JSON válido.

Formato exacto:

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

1. es_comprobante:
   true solamente si la imagen parece ser un comprobante
   de transferencia o pago.

2. monto:
   debe ser el importe transferido.

3. titular_destino:
   debe ser el destinatario del dinero.

4. cbu_destino:
   debe ser el CBU, CVU o identificador de la cuenta
   destinataria si aparece.

5. fecha:
   fecha visible en el comprobante.

6. hora:
   hora visible en el comprobante.

7. estado:
   si se puede determinar claramente, usar por ejemplo:
   "completada", "realizada", "exitosa", "aprobada"
   o "confirmada".

   Si no se puede determinar claramente:
   "".

8. confianza:
   número entre 0 y 100 indicando qué tan segura es
   la interpretación de la imagen.

9. No inventes información.

10. Si un dato no aparece claramente, usá "".

11. No confundas los datos del emisor con los del
    destinatario.

12. Prestá especial atención al monto y a la cuenta
    destinataria.

13.Prestá ESPECIAL ATENCIÓN al horario, si pasaron mas de 3 min desde que se realizó la transferencia, el comprobante no es válido.

14.Prestá ESPECIAL ATENCION de que el comprobante no este modificado por algun editos de imagenes, revisa bien los numeros que no esten borrado o adulterados, si el comprobante esta adulterado no es válido.
`;


    // =================================================
    // ENVIAR A OPENROUTER
    // =================================================

    const openRouterResponse = await fetch(
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

          // Evita gastar créditos innecesariamente
          max_tokens: 1000,
        }),
      }
    );


    // =================================================
    // RESPUESTA OPENROUTER
    // =================================================

    const openRouterData =
      await openRouterResponse.json();


    if (!openRouterResponse.ok) {

      console.error(
        "OPENROUTER ERROR:",
        JSON.stringify(openRouterData)
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


    // =================================================
    // TEXTO DE LA IA
    // =================================================

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


    // =================================================
    // LIMPIAR RESPUESTA
    // =================================================

    let texto = String(contenido).trim();


    if (texto.startsWith("```")) {

      texto = texto
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    }


    // =================================================
    // PARSEAR JSON
    // =================================================

    let resultadoIA;

    try {

      resultadoIA = JSON.parse(texto);

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
    // DATOS EXTRAÍDOS
    // =================================================

    const montoDetectado =
      Number(resultadoIA.monto || 0);


    const titularDetectado =
      String(
        resultadoIA.titular_destino || ""
      )
        .trim()
        .toLowerCase();


    const cuentaDetectada =
      String(
        resultadoIA.cbu_destino || ""
      )
        .replace(/\s/g, "")
        .replace(/-/g, "");


    const confianza =
      Number(resultadoIA.confianza || 0);


    // =================================================
    // VALIDACIONES
    // =================================================

    const esComprobante =
      resultadoIA.es_comprobante === true;


    const montoCorrecto =
      montoDetectado === montoEsperado;


    const titularCorrecto =
      titularDetectado ===
      TITULAR_ESPERADO
        .trim()
        .toLowerCase();


    const cuentaCorrecta =
      cuentaDetectada ===
      CUENTA_ESPERADA
        .replace(/\s/g, "")
        .replace(/-/g, "");


    const confianzaValida =
      confianza >= CONFIANZA_MINIMA;


    // =================================================
    // ESTADO
    // =================================================

    const estado =
      String(
        resultadoIA.estado || ""
      )
        .trim()
        .toLowerCase();


    const transferenciaExitosa =
      estado.includes("complet") ||
      estado.includes("exit") ||
      estado.includes("realiz") ||
      estado.includes("aprob") ||
      estado.includes("confirm");


    // =================================================
    // LOG DE VALIDACIÓN
    // =================================================

    console.log(
      "VALIDACIÓN COMPROBANTE:",
      JSON.stringify({
        esComprobante,
        montoEsperado,
        montoDetectado,
        montoCorrecto,
        titularEsperado: TITULAR_ESPERADO,
        titularDetectado:
          resultadoIA.titular_destino || "",
        titularCorrecto,
        cuentaEsperada: CUENTA_ESPERADA,
        cuentaDetectada,
        cuentaCorrecta,
        confianza,
        confianzaValida,
        estado:
          resultadoIA.estado || "",
        transferenciaExitosa,
      })
    );


    // =================================================
    // APROBACIÓN FINAL
    // =================================================

    const aprobado =
      esComprobante &&
      montoCorrecto &&
      titularCorrecto &&
      cuentaCorrecta &&
      confianzaValida;


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
            resultadoIA.titular_destino || "",

          cbu:
            cuentaDetectada,

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


      console.log(
        "PAGO APROBADO:",
        pedidoId
      );


      // =============================================
      // ENVIAR MAIL DE CONFIRMACIÓN (EmailJS)
      // =============================================
      //
      // Usamos "pedido" (lo que ya estaba en Firestore
      // desde crearPedido.mjs) porque ahí están nombre,
      // email, numeros, cantidadNumeros y monto reales.
      // Si esto falla, NO rompe la respuesta al usuario:
      // el pago ya quedó aprobado igual.
      // =============================================

      await enviarEmailConfirmacion(pedido);


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
              resultadoIA.titular_destino || "",

            fecha:
              resultadoIA.fecha || "",

            hora:
              resultadoIA.hora || "",

            // FIX: antes el frontend no recibía los números
            // asignados, así que no podía mostrarlos.
            numeros:
              pedido.numeros || [],

          },

        }),
      };
    }


    // =================================================
    // RECHAZADO
    // =================================================

    console.log(
      "PAGO RECHAZADO:",
      pedidoId
    );


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
            cuentaDetectada,

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

          cuentaCorrecta,

          titularCorrecto,

          transferenciaExitosa,

          confianzaValida,

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
