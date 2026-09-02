import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

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

    const { participanteId } = await req.json();

    if (!participanteId) {
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

    // =====================================================
    // BUSCAR PARTICIPANTE
    // =====================================================

    const participanteRef = db
      .collection("participantes")
      .doc(participanteId);

    const participanteSnap = await participanteRef.get();

    if (!participanteSnap.exists) {
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

    const participante = participanteSnap.data();

    // =====================================================
    // SI YA ESTÁ APROBADO
    // =====================================================

    if (participante.estadoPago === "aprobado") {
      if (!participante.emailEnviado) {
        try {
          await enviarEmailNumeros(participante);

          await participanteRef.update({
            emailEnviado: true,
          });
        } catch (emailError) {
          console.error(
            "Error reintentando envío de email:",
            emailError
          );
        }
      }

      return new Response(
        JSON.stringify({
          aprobado: true,
          numeros: participante.numeros || [],
          montoPagado:
            participante.montoPagado ||
            participante.montoEsperado,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // MERCADO PAGO
    // =====================================================

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error(
        "MERCADOPAGO_ACCESS_TOKEN no configurado"
      );

      return new Response(
        JSON.stringify({
          error: "Mercado Pago no está configurado",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // BUSCAR PAGOS APROBADOS
    // =====================================================

    const respuesta = await fetch(
      "https://api.mercadopago.com/v1/payments/search" +
        "?status=approved" +
        "&sort=date_created" +
        "&criteria=desc" +
        "&limit=50",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!respuesta.ok) {
      const texto = await respuesta.text();

      console.error(
        "Mercado Pago respondió:",
        texto
      );

      return new Response(
        JSON.stringify({
          error: "Error consultando Mercado Pago",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const datos = await respuesta.json();

    const pagos = datos.results || [];

    // =====================================================
    // DATOS DEL PARTICIPANTE
    // =====================================================

    const emailParticipante =
      participante.email
        ?.trim()
        .toLowerCase();

    const montoEsperado =
      Number(participante.montoEsperado);

    let fechaInicio =
      new Date(Date.now() - 30 * 60 * 1000);

    if (
      participante.fechaInicioPago &&
      participante.fechaInicioPago.toDate
    ) {
      fechaInicio =
        participante.fechaInicioPago.toDate();
    }

    // =====================================================
    // BUSCAR PAGO
    // =====================================================

    const pagoEncontrado = pagos.find((pago) => {
      const monto =
        Number(pago.transaction_amount);

      const emailPago =
        pago.payer?.email
          ?.trim()
          .toLowerCase();

      const fechaPago =
        new Date(pago.date_created);

      const mismoMonto =
        monto === montoEsperado;

      const mismoEmail =
        emailPago === emailParticipante;

      const posterior =
        fechaPago >= fechaInicio;

      return (
        mismoMonto &&
        mismoEmail &&
        posterior
      );
    });

    // =====================================================
    // TODAVÍA NO PAGÓ
    // =====================================================

    if (!pagoEncontrado) {
      return new Response(
        JSON.stringify({
          aprobado: false,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // =====================================================
    // CONFIGURACIÓN DEL SORTEO
    // =====================================================

    const configuracionRef =
      db.collection("configuracion")
        .doc("sorteo");

    // =====================================================
    // TRANSACCIÓN
    // =====================================================

    const resultado =
      await db.runTransaction(
        async (transaction) => {
          const participanteActual =
            await transaction.get(
              participanteRef
            );

          const datosActuales =
            participanteActual.data();

          // Evitar duplicados
          if (
            datosActuales.estadoPago ===
            "aprobado"
          ) {
            return {
              numeros:
                datosActuales.numeros || [],

              montoPagado:
                datosActuales.montoPagado ||
                datosActuales.montoEsperado,

              yaEstaba: true,
            };
          }

          const configuracionSnap =
            await transaction.get(
              configuracionRef
            );

          let ultimoNumero = 0;

          if (configuracionSnap.exists) {
            ultimoNumero =
              configuracionSnap.data()
                .ultimoNumero || 0;
          }

          const cantidad =
            Number(
              datosActuales.cantidadNumeros
            );

          const numeros = [];

          for (
            let i = 1;
            i <= cantidad;
            i++
          ) {
            numeros.push(
              ultimoNumero + i
            );
          }

          const nuevoUltimoNumero =
            ultimoNumero + cantidad;

          transaction.update(
            participanteRef,
            {
              estadoPago: "aprobado",

              numeros,

              montoPagado:
                pagoEncontrado.transaction_amount,

              paymentId:
                String(pagoEncontrado.id),

              fechaPago:
                FieldValue.serverTimestamp(),
            }
          );

          transaction.set(
            configuracionRef,
            {
              ultimoNumero:
                nuevoUltimoNumero,
            },
            {
              merge: true,
            }
          );

          return {
            numeros,

            montoPagado:
              pagoEncontrado.transaction_amount,

            yaEstaba: false,
          };
        }
      );

    // =====================================================
    // ENVIAR EMAIL
    // =====================================================

    if (!resultado.yaEstaba) {
      try {
        await enviarEmailNumeros({
          ...participante,

          numeros:
            resultado.numeros,

          montoPagado:
            resultado.montoPagado,
        });

        await participanteRef.update({
          emailEnviado: true,
        });

      } catch (emailError) {
        console.error(
          "Error enviando email:",
          emailError
        );
      }
    }

    // =====================================================
    // RESPUESTA
    // =====================================================

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
    console.error(
      "Error verificando pago:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          "Error verificando pago",
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


// =====================================================
// EMAIL
// =====================================================

async function enviarEmailNumeros(
  participante
) {
  const emailUser =
    process.env.EMAIL_USER;

  const emailPass =
    process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error(
      "EMAIL_USER / EMAIL_PASS no configurados"
    );
  }

  const transporter =
    nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

  const numerosHtml =
    (participante.numeros || [])
      .map(
        (n) =>
          `<span style="
            display:inline-block;
            margin:4px;
            padding:10px 16px;
            background:#e21f26;
            color:#ffffff;
            font-weight:bold;
            border-radius:8px;
            font-size:18px;
          ">${n}</span>`
      )
      .join("");

  await transporter.sendMail({
    from: `"Motor Win" <${emailUser}>`,

    to: participante.email,

    subject:
      "¡Tu participación en el sorteo Motor Win fue confirmada!",

    html: `
      <div style="
        font-family:Arial,sans-serif;
        max-width:520px;
        margin:auto;
      ">

        <h2 style="color:#111;">
          ¡Gracias por participar,
          ${participante.nombre}!
        </h2>

        <p>
          Confirmamos tu pago de
          <strong>
            $${participante.montoPagado}
          </strong>.
        </p>

        <p>
          Estos son tus números
          para el sorteo:
        </p>

        <div style="margin:16px 0;">
          ${numerosHtml}
        </div>

        <p>
          📅 Sorteo:
          Jueves 24 de septiembre de 2026,
          22:00 hs, en vivo por YouTube.
        </p>

        <p>
          ¡Mucha suerte! 🏍️
        </p>

        <p style="
          color:#888;
          font-size:12px;
          margin-top:24px;
        ">
          Motor Win
        </p>

      </div>
    `,
  });
}