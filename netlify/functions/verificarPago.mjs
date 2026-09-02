
import { db } from "./firebase.js";
import {
  FieldValue,
} from "firebase-admin/firestore";
import nodemailer from "nodemailer";

export const handler = async (event) => {
  try {
    // ==========================================
    // SOLO POST
    // ==========================================
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: "Método no permitido",
        }),
      };
    }

    // ==========================================
    // DATOS RECIBIDOS
    // ==========================================
    const { participanteId } = JSON.parse(event.body || "{}");

    if (!participanteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Falta participanteId",
        }),
      };
    }

    // ==========================================
    // BUSCAR PARTICIPANTE
    // ==========================================
    const participanteRef = db
      .collection("participantes")
      .doc(participanteId);

    const participanteSnap = await participanteRef.get();

    if (!participanteSnap.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Participante no encontrado",
        }),
      };
    }

    const participante = participanteSnap.data();

    console.log("=================================");
    console.log("PARTICIPANTE ENCONTRADO");
    console.log("=================================");
    console.log({
      id: participanteId,
      email: participante.email,
      montoEsperado: participante.montoEsperado,
      estadoPago: participante.estadoPago,
      fechaInicioPago:
        participante.fechaInicioPago?.toDate?.() || participante.fechaInicioPago,
    });

    // ==========================================
    // SI YA ESTÁ APROBADO
    // ==========================================
    if (participante.estadoPago === "aprobado") {
      return {
        statusCode: 200,
        body: JSON.stringify({
          aprobado: true,
          numeros: participante.numeros || [],
          mensaje: "El pago ya había sido aprobado",
        }),
      };
    }

    // ==========================================
    // MERCADO PAGO TOKEN
    // ==========================================
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno"
      );
    }

    // ==========================================
    // FECHA DE AYER
    // ==========================================
    const ahora = new Date();

    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    const fechaDesdeMP = ayer.toISOString();

    console.log("=================================");
    console.log("BUSCANDO PAGOS EN MERCADO PAGO");
    console.log("=================================");
    console.log("Buscar desde:", fechaDesdeMP);

    // ==========================================
    // BUSCAR PAGOS APROBADOS DESDE AYER
    // ==========================================
    const urlMP =
      `https://api.mercadopago.com/v1/payments/search` +
      `?status=approved` +
      `&sort=date_created` +
      `&criteria=desc` +
      `&begin_date=${encodeURIComponent(fechaDesdeMP)}` +
      `&limit=50`;

    const responseMP = await fetch(urlMP, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!responseMP.ok) {
      const errorText = await responseMP.text();

      console.error("Error Mercado Pago:", errorText);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Error consultando Mercado Pago",
          detalle: errorText,
        }),
      };
    }

    const dataMP = await responseMP.json();

    const pagos = dataMP.results || [];

    console.log("Cantidad de pagos encontrados:", pagos.length);

    // ==========================================
    // DATOS DEL PARTICIPANTE
    // ==========================================
    const montoEsperado = Number(participante.montoEsperado);

    const fechaInicio = participante.fechaInicioPago?.toDate
      ? participante.fechaInicioPago.toDate()
      : new Date(participante.fechaInicioPago);

    console.log("Monto esperado:", montoEsperado);
    console.log("Fecha desde participante:", fechaInicio);

    // ==========================================
    // BUSCAR PAGO CORRESPONDIENTE
    // ==========================================
    let pagoEncontrado = null;

    for (const payment of pagos) {
      const montoPago = Number(payment.transaction_amount);
      const fechaPago = new Date(payment.date_created);

      const montoCoincide = montoPago === montoEsperado;
      const fechaCoincide = fechaPago >= fechaInicio;

      console.log("=================================");
      console.log("PAYMENT");
      console.log("=================================");
      console.log({
        id: payment.id,
        monto: montoPago,
        email: payment.payer?.email,
        fecha: payment.date_created,
        montoCoincide,
        fechaCoincide,
      });

      if (montoCoincide && fechaCoincide) {
        pagoEncontrado = payment;
        break;
      }
    }

    // ==========================================
    // NO SE ENCONTRÓ PAGO
    // ==========================================
    if (!pagoEncontrado) {
      console.log("No se encontró ningún pago compatible.");

      return {
        statusCode: 200,
        body: JSON.stringify({
          aprobado: false,
          mensaje: "Pago todavía no encontrado",
        }),
      };
    }

    // ==========================================
    // DATOS DEL PAGO
    // ==========================================
    const paymentId = String(pagoEncontrado.id);
    const montoPagado = Number(
      pagoEncontrado.transaction_amount
    );

    console.log("=================================");
    console.log("PAGO ENCONTRADO");
    console.log("=================================");
    console.log({
      paymentId,
      montoPagado,
      email: pagoEncontrado.payer?.email,
      fecha: pagoEncontrado.date_created,
    });

    // ==========================================
    // VERIFICAR QUE EL PAYMENT ID NO ESTÉ USADO
    // ==========================================
    const pagoUsadoSnap = await db
      .collection("participantes")
      .where("paymentId", "==", paymentId)
      .limit(1)
      .get();

    if (!pagoUsadoSnap.empty) {
      const participanteUsado = pagoUsadoSnap.docs[0];

      // Si el pago ya pertenece a ESTE participante
      if (participanteUsado.id === participanteId) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            aprobado: true,
            numeros: participante.numeros || [],
            mensaje: "El pago ya estaba asociado al participante",
          }),
        };
      }

      // Si pertenece a OTRO participante
      console.log(
        "El paymentId ya fue utilizado por otro participante:",
        participanteUsado.id
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          aprobado: false,
          mensaje: "Este pago ya fue utilizado",
        }),
      };
    }

    // ==========================================
    // ASIGNAR NÚMEROS EN UNA TRANSACCIÓN
    // ==========================================
    const resultado = await db.runTransaction(async (transaction) => {
      const participanteActualSnap =
        await transaction.get(participanteRef);

      if (!participanteActualSnap.exists) {
        throw new Error("Participante no encontrado");
      }

      const participanteActual =
        participanteActualSnap.data();

      // Si mientras tanto otro proceso ya lo aprobó
      if (participanteActual.estadoPago === "aprobado") {
        return {
          yaAprobado: true,
          numeros: participanteActual.numeros || [],
        };
      }

      // ==========================================
      // CONFIGURACIÓN DEL SORTEO
      // ==========================================
      const sorteoRef = db
        .collection("configuracion")
        .doc("sorteo");

      const sorteoSnap = await transaction.get(sorteoRef);

      if (!sorteoSnap.exists) {
        throw new Error(
          "No existe configuracion/sorteo"
        );
      }

      const sorteo = sorteoSnap.data();

      let ultimoNumero = Number(
        sorteo.ultimoNumero || 0
      );

      const cantidadNumeros = Number(
        participanteActual.cantidadNumeros || 1
      );

      // ==========================================
      // GENERAR NÚMEROS
      // ==========================================
      const numeros = [];

      for (let i = 0; i < cantidadNumeros; i++) {
        ultimoNumero++;
        numeros.push(ultimoNumero);
      }

      // ==========================================
      // ACTUALIZAR PARTICIPANTE
      // ==========================================
      transaction.update(participanteRef, {
        numeros,
        estadoPago: "aprobado",
        paymentId,
        montoPagado,
        fechaPago: FieldValue.serverTimestamp(),
      });

      // ==========================================
      // ACTUALIZAR ÚLTIMO NÚMERO
      // ==========================================
      transaction.update(sorteoRef, {
        ultimoNumero,
      });

      return {
        yaAprobado: false,
        numeros,
      };
    });

    // ==========================================
    // SI YA ESTABA APROBADO
    // ==========================================
    if (resultado.yaAprobado) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          aprobado: true,
          numeros: resultado.numeros,
        }),
      };
    }

    const numerosAsignados = resultado.numeros;

    // ==========================================
    // ENVIAR EMAIL
    // ==========================================
    try {
      const participanteFinalSnap =
        await participanteRef.get();

      const participanteFinal =
        participanteFinalSnap.data();

      if (
        participanteFinal &&
        participanteFinal.emailEnviado !== true
      ) {
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailUser || !emailPass) {
          console.error(
            "Faltan EMAIL_USER o EMAIL_PASS"
          );
        } else {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: emailUser,
              pass: emailPass,
            },
          });

          const numerosTexto =
            numerosAsignados.join(", ");

          await transporter.sendMail({
            from: `"Motor Win" <${emailUser}>`,
            to: participanteFinal.email,
            subject: "🎉 ¡Tus números de Motor Win!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
                
                <h1>🏎️ ¡Pago aprobado!</h1>

                <p>Hola <strong>${participanteFinal.nombre}</strong> 👋</p>

                <p>
                  Tu pago fue confirmado correctamente.
                </p>

                <p>
                  Estos son tus números para el sorteo:
                </p>

                <div style="
                  background: #111;
                  color: #fff;
                  padding: 20px;
                  border-radius: 10px;
                  text-align: center;
                  font-size: 28px;
                  font-weight: bold;
                  margin: 20px 0;
                ">
                  ${numerosTexto}
                </div>

                <p>
                  🏁 El sorteo se realizará el
                  <strong>jueves 24 de septiembre de 2026 a las 22:00 hs.</strong>
                </p>

                <p>
                  ¡Mucha suerte! 🍀
                </p>

                <p>
                  <strong>Motor Win</strong>
                </p>

              </div>
            `,
          });

          await participanteRef.update({
            emailEnviado: true,
          });

          console.log(
            "Email enviado correctamente a:",
            participanteFinal.email
          );
        }
      }
    } catch (emailError) {
      console.error(
        "Error enviando email:",
        emailError
      );
    }

    // ==========================================
    // RESPUESTA FINAL
    // ==========================================
    return {
      statusCode: 200,
      body: JSON.stringify({
        aprobado: true,
        numeros: numerosAsignados,
        montoPagado,
        paymentId,
      }),
    };
  } catch (error) {
    console.error(
      "ERROR GENERAL verificarPago:",
      error
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Error verificando pago",
        detalle: error.message,
      }),
    };
  }
};

