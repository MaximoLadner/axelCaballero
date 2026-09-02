import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

export default async (req) => {
  console.log("========================================");
  console.log("=== VERIFICAR PAGO INICIADO ===");
  console.log("========================================");

  // ==========================================
  // SOLO POST
  // ==========================================

  if (req.method !== "POST") {
    console.log("Método recibido:", req.method);

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

  try {
    // ==========================================
    // LEER BODY
    // ==========================================

    const body = await req.json();

    console.log("Body recibido:", {
      participanteId: body?.participanteId,
    });

    const { participanteId } = body;

    if (!participanteId) {
      console.log("❌ Falta participanteId");

      return new Response(
        JSON.stringify({
          error: "Falta participanteId",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ==========================================
    // BUSCAR PARTICIPANTE
    // ==========================================

    const participanteRef = db
      .collection("participantes")
      .doc(participanteId);

    const participanteSnap =
      await participanteRef.get();

    console.log(
      "Participante existe:",
      participanteSnap.exists
    );

    if (!participanteSnap.exists) {
      console.log("❌ Participante no encontrado");

      return new Response(
        JSON.stringify({
          error: "Participante no encontrado",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const participante =
      participanteSnap.data();

    console.log(
      "Participante encontrado:",
      {
        nombre: participante.nombre,
        email: participante.email,
        montoEsperado:
          participante.montoEsperado,
        cantidadNumeros:
          participante.cantidadNumeros,
        estadoPago:
          participante.estadoPago,
        fechaInicioPago:
          participante.fechaInicioPago
            ?.toDate?.(),
      }
    );

    // ==========================================
    // SI YA ESTÁ APROBADO
    // ==========================================

    if (
      participante.estadoPago ===
      "aprobado"
    ) {
      console.log(
        "✅ El participante ya estaba aprobado"
      );

      return new Response(
        JSON.stringify({
          aprobado: true,
          numeros:
            participante.numeros || [],
          montoPagado:
            participante.montoPagado || 0,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ==========================================
    // MERCADO PAGO
    // ==========================================

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    console.log(
      "Mercado Pago token configurado:",
      !!accessToken
    );

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN en Netlify"
      );
    }

    console.log(
      "Consultando Mercado Pago..."
    );

    const respuestaMP = await fetch(
      "https://api.mercadopago.com/v1/payments/search?status=approved&sort=date_created&criteria=desc&limit=50",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(
      "Respuesta Mercado Pago:",
      respuestaMP.status,
      respuestaMP.statusText
    );

    const datosMP =
      await respuestaMP.json();

    if (!respuestaMP.ok) {
      console.log(
        "❌ Error Mercado Pago:",
        datosMP
      );

      throw new Error(
        `Mercado Pago respondió ${respuestaMP.status}`
      );
    }

    const pagos =
      datosMP.results || [];

    console.log(
      "Cantidad de pagos encontrados:",
      pagos.length
    );

    // ==========================================
    // DATOS PARA BUSCAR EL PAGO
    // ==========================================

    const fechaInicio =
      participante.fechaInicioPago
        ?.toDate?.() || new Date(0);

    const montoEsperado =
      Number(
        participante.montoEsperado
      );

    console.log(
      "Buscando coincidencia:",
      {
        monto: montoEsperado,
        desde: fechaInicio,
      }
    );

    // ==========================================
    // BUSCAR PAGO APROBADO
    //
    // IMPORTANTE:
    // NO usamos email del comprador.
    //
    // Buscamos:
    // 1. Estado approved
    // 2. Monto correcto
    // 3. Pago realizado después
    //    de que se creó el participante
    // ==========================================

    let pagoEncontrado = null;

    for (const pago of pagos) {
      const montoPago =
        Number(
          pago.transaction_amount
        );

      const fechaPago =
        new Date(
          pago.date_created
        );

      const montoCoincide =
        montoPago ===
        montoEsperado;

      const fechaCoincide =
        fechaPago >=
        fechaInicio;

      console.log(
        "Pago revisado:",
        {
          id: pago.id,
          monto:
            pago.transaction_amount,
          fecha:
            pago.date_created,
          email:
            pago.payer?.email,
          montoCoincide,
          fechaCoincide,
        }
      );

      if (
        montoCoincide &&
        fechaCoincide
      ) {
        pagoEncontrado = pago;
        break;
      }
    }

    // ==========================================
    // NO ENCONTRADO
    // ==========================================

    if (!pagoEncontrado) {
      console.log(
        "❌ NO SE ENCONTRÓ EL PAGO"
      );

      return new Response(
        JSON.stringify({
          aprobado: false,
          mensaje:
            "Todavía no se encontró un pago aprobado correspondiente.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    console.log(
      "========================================"
    );

    console.log(
      "✅ PAGO ENCONTRADO"
    );

    console.log(
      "Payment ID:",
      pagoEncontrado.id
    );

    console.log(
      "Monto:",
      pagoEncontrado.transaction_amount
    );

    console.log(
      "Fecha:",
      pagoEncontrado.date_created
    );

    console.log(
      "========================================"
    );

    // ==========================================
    // EVITAR USAR EL MISMO PAGO DOS VECES
    // ==========================================

    const paymentId =
      String(
        pagoEncontrado.id
      );

    console.log(
      "Comprobando si el paymentId ya fue utilizado..."
    );

    const pagoUsadoSnap =
      await db
        .collection("participantes")
        .where(
          "paymentId",
          "==",
          paymentId
        )
        .limit(1)
        .get();

    if (
      !pagoUsadoSnap.empty
    ) {
      const participantePagoUsado =
        pagoUsadoSnap.docs[0];

      console.log(
        "⚠️ Este pago ya fue utilizado por:",
        participantePagoUsado.id
      );

      // Si el pago ya pertenece al mismo participante,
      // no hacemos nada más.

      if (
        participantePagoUsado.id ===
        participanteId
      ) {
        console.log(
          "El pago pertenece al mismo participante."
        );
      } else {
        return new Response(
          JSON.stringify({
            aprobado: false,
            mensaje:
              "Este pago ya fue utilizado.",
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }
    }

    // ==========================================
    // ASIGNAR NÚMEROS
    // ==========================================

    console.log(
      "Iniciando transacción Firestore..."
    );

    const resultado =
      await db.runTransaction(
        async (transaction) => {
          // --------------------------------------
          // VOLVER A LEER PARTICIPANTE
          // --------------------------------------

          const participanteActual =
            await transaction.get(
              participanteRef
            );

          if (
            !participanteActual.exists
          ) {
            throw new Error(
              "El participante ya no existe."
            );
          }

          const datosActuales =
            participanteActual.data();

          // --------------------------------------
          // EVITAR DOBLE PROCESAMIENTO
          // --------------------------------------

          if (
            datosActuales.estadoPago ===
            "aprobado"
          ) {
            console.log(
              "El participante ya fue aprobado durante la transacción."
            );

            return {
              numeros:
                datosActuales.numeros ||
                [],
              montoPagado:
                datosActuales.montoPagado ||
                0,
            };
          }

          // --------------------------------------
          // CONFIGURACIÓN DEL SORTEO
          // --------------------------------------

          const configRef =
            db
              .collection(
                "configuracion"
              )
              .doc("sorteo");

          const configSnap =
            await transaction.get(
              configRef
            );

          const config =
            configSnap.exists
              ? configSnap.data()
              : {};

          let ultimoNumero =
            Number(
              config.ultimoNumero ||
                0
            );

          // --------------------------------------
          // CANTIDAD DE NÚMEROS
          // --------------------------------------

          const cantidad =
            Number(
              datosActuales
                .cantidadNumeros ||
                1
            );

          const nuevosNumeros =
            [];

          // --------------------------------------
          // GENERAR NÚMEROS
          // --------------------------------------

          for (
            let i = 0;
            i < cantidad;
            i++
          ) {
            ultimoNumero++;

            nuevosNumeros.push(
              ultimoNumero
            );
          }

          console.log(
            "Nuevos números:",
            nuevosNumeros
          );

          // --------------------------------------
          // ACTUALIZAR PARTICIPANTE
          // --------------------------------------

          transaction.update(
            participanteRef,
            {
              estadoPago:
                "aprobado",

              numeros:
                nuevosNumeros,

              montoPagado:
                pagoEncontrado.transaction_amount,

              paymentId:
                paymentId,

              fechaPago:
                FieldValue.serverTimestamp(),
            }
          );

          // --------------------------------------
          // ACTUALIZAR ÚLTIMO NÚMERO
          // --------------------------------------

          transaction.set(
            configRef,
            {
              ultimoNumero:
                ultimoNumero,
            },
            {
              merge: true,
            }
          );

          return {
            numeros:
              nuevosNumeros,

            montoPagado:
              pagoEncontrado.transaction_amount,
          };
        }
      );

    console.log(
      "========================================"
    );

    console.log(
      "✅ NÚMEROS ASIGNADOS:",
      resultado.numeros
    );

    console.log(
      "========================================"
    );

    // ==========================================
    // OBTENER PARTICIPANTE ACTUALIZADO
    // ==========================================

    const participanteFinal =
      await participanteRef.get();

    const datosFinales =
      participanteFinal.data();

    // ==========================================
    // EMAIL
    // ==========================================

    if (
      !datosFinales.emailEnviado
    ) {
      console.log(
        "Preparando envío de email..."
      );

      console.log(
        "Email destino:",
        datosFinales.email
      );

      await enviarEmailNumeros(
        datosFinales,
        resultado.numeros,
        resultado.montoPagado
      );

      await participanteRef.update({
        emailEnviado: true,
      });

      console.log(
        "✅ EMAIL ENVIADO CORRECTAMENTE"
      );
    } else {
      console.log(
        "El email ya había sido enviado."
      );
    }

    // ==========================================
    // RESPUESTA FINAL
    // ==========================================

    console.log(
      "========================================"
    );

    console.log(
      "🎉 VERIFICACIÓN COMPLETADA"
    );

    console.log(
      "========================================"
    );

    return new Response(
      JSON.stringify({
        aprobado: true,

        numeros:
          resultado.numeros,

        montoPagado:
          resultado.montoPagado,
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    // ==========================================
    // ERROR
    // ==========================================

    console.error(
      "========================================"
    );

    console.error(
      "❌ ERROR VERIFICAR PAGO:"
    );

    console.error(error);

    console.error(
      "========================================"
    );

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          "Error interno verificando el pago.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }
};

// ==================================================
// ENVIAR EMAIL
// ==================================================

async function enviarEmailNumeros(
  participante,
  numeros,
  montoPagado
) {
  console.log(
    "=== INICIANDO ENVÍO DE EMAIL ==="
  );

  const emailUser =
    process.env.EMAIL_USER;

  const emailPass =
    process.env.EMAIL_PASS;

  // -----------------------------------------------
  // VALIDAR CREDENCIALES
  // -----------------------------------------------

  if (!emailUser) {
    throw new Error(
      "Falta EMAIL_USER en Netlify"
    );
  }

  if (!emailPass) {
    throw new Error(
      "Falta EMAIL_PASS en Netlify"
    );
  }

  // -----------------------------------------------
  // CREAR TRANSPORTER
  // -----------------------------------------------

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

  // -----------------------------------------------
  // CREAR HTML DE NÚMEROS
  // -----------------------------------------------

  const numerosHTML =
    numeros
      .map(
        (numero) =>
          `
          <strong
            style="
              display:inline-block;
              font-size:24px;
              padding:10px 18px;
              margin:5px;
              border-radius:8px;
              background:#f2f2f2;
            "
          >
            ${numero}
          </strong>
          `
      )
      .join("");

  // -----------------------------------------------
  // ENVIAR
  // -----------------------------------------------

  await transporter.sendMail({
    from:
      `"Motor Win" <${emailUser}>`,

    to:
      participante.email,

    subject:
      "🎉 ¡Tus números de Motor Win!",

    html: `
      <div
        style="
          font-family:Arial,sans-serif;
          max-width:600px;
          margin:auto;
          padding:20px;
        "
      >

        <h2>
          ¡Pago confirmado,
          ${participante.nombre}!
        </h2>

        <p>
          Tu pago fue aprobado
          correctamente.
        </p>

        <p>
          Tus números para el
          sorteo son:
        </p>

        <div>
          ${numerosHTML}
        </div>

        <p>
          <strong>
            Monto pagado:
          </strong>
          $${montoPagado}
        </p>

        <p>
          El sorteo se realizará el
          <strong>
            jueves 24 de septiembre
            de 2026 a las 22:00 hs.
          </strong>
        </p>

        <p>
          ¡Mucha suerte! 🏎️🔥
        </p>

      </div>
    `,
  });

  console.log(
    "=== EMAIL ENVIADO ==="
  );
}