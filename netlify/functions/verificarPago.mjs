import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

export default async (req) => {
  console.log("=== VERIFICAR PAGO INICIADO ===");

  if (req.method !== "POST") {
    console.log("Método recibido:", req.method);

    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();

    console.log("Body recibido:", {
      participanteId: body?.participanteId,
    });

    const { participanteId } = body;

    if (!participanteId) {
      console.log("Falta participanteId");

      return new Response(
        JSON.stringify({
          error: "Falta participanteId",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const participanteRef = db
      .collection("participantes")
      .doc(participanteId);

    const participanteSnap = await participanteRef.get();

    console.log("Participante existe:", participanteSnap.exists);

    if (!participanteSnap.exists) {
      return new Response(
        JSON.stringify({
          error: "Participante no encontrado",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const participante = participanteSnap.data();

    console.log("Participante encontrado:", {
      email: participante.email,
      montoEsperado: participante.montoEsperado,
      estadoPago: participante.estadoPago,
      fechaInicioPago: participante.fechaInicioPago?.toDate?.(),
    });

    if (participante.estadoPago === "aprobado") {
      console.log("El participante ya estaba aprobado");

      return new Response(
        JSON.stringify({
          aprobado: true,
          numeros: participante.numeros || [],
          montoPagado: participante.montoPagado || 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    console.log(
      "Mercado Pago token configurado:",
      !!accessToken
    );

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN en Netlify"
      );
    }

    console.log("Consultando Mercado Pago...");

    const respuestaMP = await fetch(
      "https://api.mercadopago.com/v1/payments/search?status=approved&sort=date_created&criteria=desc&limit=50",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log(
      "Respuesta Mercado Pago:",
      respuestaMP.status,
      respuestaMP.statusText
    );

    const datosMP = await respuestaMP.json();

    console.log(
      "Cantidad de pagos encontrados:",
      datosMP.results?.length || 0
    );

    if (!respuestaMP.ok) {
      console.log("Error Mercado Pago:", datosMP);

      throw new Error(
        `Mercado Pago respondió ${respuestaMP.status}`
      );
    }

    const fechaInicio =
      participante.fechaInicioPago?.toDate?.() || new Date(0);

    const emailParticipante =
      participante.email?.trim().toLowerCase();

    const montoEsperado =
      Number(participante.montoEsperado);

    console.log("Buscando coincidencia:", {
      email: emailParticipante,
      monto: montoEsperado,
      desde: fechaInicio,
    });

    const pagoEncontrado = datosMP.results?.find((pago) => {
      const montoCoincide =
        Number(pago.transaction_amount) === montoEsperado;

      const emailPago =
        pago.payer?.email?.trim().toLowerCase();

      const emailCoincide =
        emailPago === emailParticipante;

      const fechaPago =
        new Date(pago.date_created);

      const fechaCoincide =
        fechaPago >= fechaInicio;

      console.log("Pago revisado:", {
        id: pago.id,
        monto: pago.transaction_amount,
        email: emailPago,
        fecha: pago.date_created,
        montoCoincide,
        emailCoincide,
        fechaCoincide,
      });

      return (
        montoCoincide &&
        emailCoincide &&
        fechaCoincide
      );
    });

    if (!pagoEncontrado) {
      console.log("❌ NO SE ENCONTRÓ EL PAGO");

      return new Response(
        JSON.stringify({
          aprobado: false,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ PAGO ENCONTRADO:", pagoEncontrado.id);

    const resultado = await db.runTransaction(
      async (transaction) => {
        const participanteActual =
          await transaction.get(participanteRef);

        const datosActuales =
          participanteActual.data();

        if (datosActuales.estadoPago === "aprobado") {
          return {
            numeros: datosActuales.numeros || [],
            montoPagado:
              datosActuales.montoPagado || 0,
          };
        }

        const configRef = db
          .collection("configuracion")
          .doc("sorteo");

        const configSnap =
          await transaction.get(configRef);

        const config =
          configSnap.exists
            ? configSnap.data()
            : {};

        let ultimoNumero =
          Number(config.ultimoNumero || 0);

        const cantidad =
          Number(
            datosActuales.cantidadNumeros || 1
          );

        const nuevosNumeros = [];

        for (let i = 0; i < cantidad; i++) {
          ultimoNumero++;
          nuevosNumeros.push(ultimoNumero);
        }

        transaction.update(
          participanteRef,
          {
            estadoPago: "aprobado",
            numeros: nuevosNumeros,
            montoPagado:
              pagoEncontrado.transaction_amount,
            paymentId: String(pagoEncontrado.id),
            fechaPago:
              FieldValue.serverTimestamp(),
          }
        );

        transaction.set(
          configRef,
          {
            ultimoNumero,
          },
          { merge: true }
        );

        return {
          numeros: nuevosNumeros,
          montoPagado:
            pagoEncontrado.transaction_amount,
        };
      }
    );

    console.log(
      "Números asignados:",
      resultado.numeros
    );

    const participanteFinal =
      await participanteRef.get();

    const datosFinales =
      participanteFinal.data();

    if (!datosFinales.emailEnviado) {
      console.log(
        "Enviando email a:",
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

      console.log("✅ Email enviado");
    }

    return new Response(
      JSON.stringify({
        aprobado: true,
        numeros: resultado.numeros,
        montoPagado: resultado.montoPagado,
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
      "❌ ERROR VERIFICAR PAGO:",
      error
    );

    return new Response(
      JSON.stringify({
        error: error.message,
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


async function enviarEmailNumeros(
  participante,
  numeros,
  montoPagado
) {
  const transporter =
    nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

  const numerosHTML = numeros
    .map(
      (numero) =>
        `<strong style="font-size:24px;">${numero}</strong>`
    )
    .join(" - ");

  await transporter.sendMail({
    from: `"Motor Win" <${process.env.EMAIL_USER}>`,
    to: participante.email,
    subject: "🎉 ¡Tus números de Motor Win!",
    html: `
      <div style="font-family:Arial,sans-serif;">
        <h2>¡Pago confirmado, ${participante.nombre}!</h2>

        <p>Tu pago fue aprobado correctamente.</p>

        <p>Tus números para el sorteo son:</p>

        <p>${numerosHTML}</p>

        <p><strong>Monto pagado:</strong> $${montoPagado}</p>

        <p>
          El sorteo se realizará el
          <strong>jueves 24 de septiembre de 2026 a las 22:00 hs.</strong>
        </p>

        <p>
          ¡Mucha suerte! 🏎️🔥
        </p>
      </div>
    `,
  });
}