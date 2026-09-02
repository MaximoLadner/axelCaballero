
import { db } from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
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
        participante.fechaInicioPago?.toDate?.() ||
        participante.fechaInicioPago,
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

    console.log("=================================");
    console.log("FILTRO DE FECHA");
    console.log("=================================");
    console.log("Ignorando pagos anteriores a:", ayer.toISOString());

    // ==========================================
    // BUSCAR PAGOS APROBADOS EN MERCADO PAGO
    // ==========================================
    const urlMP =
      `https://api.mercadopago.com/v1/payments/search` +
      `?status=approved` +
      `&sort=date_created` +
      `&criteria=desc` +
      `&limit=50`;

    console.log("Consultando Mercado Pago...");

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

    // ==========================================
    // PAGOS RECIBIDOS
    // ==========================================
    const pagosRecibidos = dataMP.results || [];

    console.log(
      "Pagos recibidos desde Mercado Pago:",
      pagosRecibidos.length
    );

    // ==========================================
    // FILTRAR PAGOS DESDE AYER
    // ==========================================
    const pagos = pagosRecibidos.filter((payment) => {
      if (!payment.date_created) {
        return false;
      }

      const fechaPago = new Date(payment.date_created);

      return fechaPago >= ayer;
    });

    console.log(
      "Pagos después del filtro de ayer:",
      pagos.length
    );

    // ==========================================
    // MOSTRAR QUÉ PAGOS FUERON DESCARTADOS
    // ==========================================
    const pagosIgnorados = pagosRecibidos.filter((payment) => {
      if (!payment.date_created) {
        return true;
      }

      const fechaPago = new Date(payment.date_created);

      return fechaPago < ayer;
    });

    for (const payment of pagosIgnorados) {
      console.log("Pago ignorado por ser anterior a ayer:", {
        id: payment.id,
        monto: payment.transaction_amount,
        fecha: payment.date_created,
      });
    }

    // ==========================================
    // DATOS DEL PARTICIPANTE
    // ==========================================
    const montoEsperado = Number(participante.montoEsperado);

    const fechaInicio = participante.fechaInicioPago?.toDate
      ? participante.fechaInicioPago.toDate()
      : new Date(participante.fechaInicioPago);

    console.log("=================================");
    console.log("DATOS PARA COMPARAR");
    console.log("=================================");
    console.log({
      montoEsperado,
      fechaInicio,
    });

    // ==========================================
    // BUSCAR PAGO COMPATIBLE
    // ==========================================
    let pagoEncontrado = null;

    for (const payment of pagos) {
      const montoPago = Number(payment.transaction_amount);
      const fechaPago = new Date(payment.date_created);

      const montoCoincide = montoPago === montoEsperado;

      // Además de ser posterior a ayer,
      // debe ser posterior al momento en que
      // comenzó el pago de este participante.
      const fechaCoincide = fechaPago >= fechaInicio;

      console.log("Pago revisado:", {
        id: payment.id,
        monto: montoPago,
        fecha: payment.date_created,
        email: payment.payer?.email,
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
    // DATOS DEL PAGO ENCONTRADO
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

      // El pago ya pertenece a este participante
      if (participanteUsado.id === participanteId) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            aprobado: true,
            numeros: participante.numeros || [],
            mensaje:
              "El pago ya estaba asociado al participante",
          }),
        };
      }

      // El pago pertenece a otro participante
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
    const resultado = await db.runTransaction(
      async (transaction) => {
        const participanteActualSnap =
          await transaction.get(participanteRef);

        if (!participanteActualSnap.exists) {
          throw new Error("Participante no encontrado");
        }

        const participanteActual =
          participanteActualSnap.data();

        // Si ya fue aprobado mientras procesábamos
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

        const sorteoSnap = await transaction.get(
          sorteoRef
        );

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
      }
    );

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
            subject:
              "🎉 ¡Tus números de Motor Win!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

                <h1>🏎️ ¡Pago aprobado!</h1>

                <p>
                  Hola <strong>${participanteFinal.nombre}</strong> 👋
                </p>

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
                  <strong>
                    jueves 24 de septiembre de 2026 a las 22:00 hs.
                  </strong>
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

