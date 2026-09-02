const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");
const nodemailer = require("nodemailer");

initializeApp();

const db = getFirestore();

// =====================================================
// PROMOCIONES
// Mientras estamos probando, SOLO "individual" está activa.
// Cuando tengas los links reales de duo/pack5, poné activa: true.
// =====================================================
const PROMOCIONES = {
  individual: {
    cantidadNumeros: 1,
    precio: 1, // PRUEBA
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

// =====================================================
// CREAR PARTICIPANTE PENDIENTE
// (todavía no se registra "de verdad" ni se genera nada:
// solo queda anotado como pendiente hasta que se confirme el pago)
// =====================================================

exports.crearParticipantePendiente = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      const { nombre, email, telefono, promocionId } = req.body;

      if (!nombre || !email || !telefono || !promocionId) {
        return res.status(400).json({
          error: "Faltan datos obligatorios",
        });
      }

      const promocion = PROMOCIONES[promocionId];

      if (!promocion || !promocion.activa) {
        return res.status(400).json({
          error: "Esa promoción no está disponible por el momento.",
        });
      }

      const participanteRef = db.collection("participantes").doc();

      await participanteRef.set({
        nombre,
        email,
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

      return res.status(200).json({
        ok: true,
        participanteId: participanteRef.id,
      });
    } catch (error) {
      console.error("Error creando participante:", error);

      return res.status(500).json({
        error: "Error creando participante",
      });
    }
  }
);

// =====================================================
// VERIFICAR PAGO EN MERCADO PAGO
// Acá es donde REALMENTE se confirma la participación:
// solo si Mercado Pago tiene un pago aprobado que matchea
// (monto + email + posterior al inicio del pago) se generan
// los números y se manda el mail. Nunca antes.
// =====================================================

exports.verificarPago = onRequest(
  {
    region: "southamerica-east1",
    cors: true,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      const { participanteId } = req.body;

      if (!participanteId) {
        return res.status(400).json({
          error: "Falta participanteId",
        });
      }

      const participanteRef = db
        .collection("participantes")
        .doc(participanteId);

      const participanteSnap = await participanteRef.get();

      if (!participanteSnap.exists) {
        return res.status(404).json({
          error: "Participante no encontrado",
        });
      }

      let participante = participanteSnap.data();

      // ===============================================
      // SI YA ESTÁ APROBADO
      // (por si el polling vuelve a pegarle después de aprobado,
      // o si el envío de mail había fallado la primera vez)
      // ===============================================

      if (participante.estadoPago === "aprobado") {
        if (!participante.emailEnviado) {
          try {
            await enviarEmailNumeros(participante);
            await participanteRef.update({ emailEnviado: true });
          } catch (emailError) {
            console.error("Error reintentando envío de email:", emailError);
          }
        }

        return res.status(200).json({
          aprobado: true,
          numeros: participante.numeros || [],
          montoPagado:
            participante.montoPagado || participante.montoEsperado,
        });
      }

      // ===============================================
      // ACCESS TOKEN
      // ===============================================

      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

      if (!accessToken) {
        console.error("MERCADOPAGO_ACCESS_TOKEN no configurado");

        return res.status(500).json({
          error: "Mercado Pago no está configurado",
        });
      }

      // ===============================================
      // BUSCAR PAGOS APROBADOS
      // ===============================================

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
        console.error("Mercado Pago respondió:", texto);

        return res.status(500).json({
          error: "Error consultando Mercado Pago",
        });
      }

      const datos = await respuesta.json();
      const pagos = datos.results || [];

      // ===============================================
      // DATOS DEL PARTICIPANTE
      // ===============================================

      const emailParticipante = participante.email?.trim().toLowerCase();
      const montoEsperado = Number(participante.montoEsperado);

      let fechaInicio = new Date(Date.now() - 30 * 60 * 1000);

      if (
        participante.fechaInicioPago &&
        participante.fechaInicioPago.toDate
      ) {
        fechaInicio = participante.fechaInicioPago.toDate();
      }

      // ===============================================
      // BUSCAR PAGO QUE MATCHEE
      // ===============================================

      const pagoEncontrado = pagos.find((pago) => {
        const monto = Number(pago.transaction_amount);
        const emailPago = pago.payer?.email?.trim().toLowerCase();
        const fechaPago = new Date(pago.date_created);

        const mismoMonto = monto === montoEsperado;
        const mismoEmail = emailPago === emailParticipante;
        const posterior = fechaPago >= fechaInicio;

        return mismoMonto && mismoEmail && posterior;
      });

      // ===============================================
      // TODAVÍA NO PAGÓ -> no se registra nada, no se manda nada
      // ===============================================

      if (!pagoEncontrado) {
        return res.status(200).json({
          aprobado: false,
        });
      }

      // ===============================================
      // PAGO CONFIRMADO -> recién ahora se generan los números
      // ===============================================

      const configuracionRef = db.collection("configuracion").doc("sorteo");

      const resultado = await db.runTransaction(async (transaction) => {
        const participanteActual = await transaction.get(participanteRef);
        const datosActuales = participanteActual.data();

        // Evita generar números dos veces si dos verificaciones
        // llegan casi al mismo tiempo.
        if (datosActuales.estadoPago === "aprobado") {
          return {
            numeros: datosActuales.numeros,
            montoPagado: datosActuales.montoPagado,
            yaEstaba: true,
          };
        }

        const configuracionSnap = await transaction.get(configuracionRef);

        let ultimoNumero = 0;

        if (configuracionSnap.exists) {
          ultimoNumero = configuracionSnap.data().ultimoNumero || 0;
        }

        const cantidad = Number(datosActuales.cantidadNumeros);
        const numeros = [];

        for (let i = 1; i <= cantidad; i++) {
          numeros.push(ultimoNumero + i);
        }

        const nuevoUltimoNumero = ultimoNumero + cantidad;

        transaction.update(participanteRef, {
          estadoPago: "aprobado",
          numeros,
          montoPagado: pagoEncontrado.transaction_amount,
          paymentId: String(pagoEncontrado.id),
          fechaPago: FieldValue.serverTimestamp(),
        });

        transaction.set(
          configuracionRef,
          { ultimoNumero: nuevoUltimoNumero },
          { merge: true }
        );

        return {
          numeros,
          montoPagado: pagoEncontrado.transaction_amount,
          yaEstaba: false,
        };
      });

      // ===============================================
      // RECIÉN ACÁ SE MANDA EL EMAIL
      // (una sola vez, solo si esta llamada fue la que aprobó)
      // ===============================================

      if (!resultado.yaEstaba) {
        try {
          await enviarEmailNumeros({
            ...participante,
            numeros: resultado.numeros,
            montoPagado: resultado.montoPagado,
          });

          await participanteRef.update({ emailEnviado: true });
        } catch (emailError) {
          console.error("Error enviando email:", emailError);
          // No hacemos fallar la respuesta: el participante ya quedó
          // registrado y con sus números igual. El próximo polling
          // reintentará el envío (ver bloque de "SI YA ESTÁ APROBADO").
        }
      }

      // ===============================================
      // RESPUESTA
      // ===============================================

      return res.status(200).json({
        aprobado: true,
        numeros: resultado.numeros,
        montoPagado: resultado.montoPagado,
      });
    } catch (error) {
      console.error("Error verificando pago:", error);

      return res.status(500).json({
        error: "Error verificando pago",
      });
    }
  }
);

// =====================================================
// ENVÍO DE EMAIL CON LOS NÚMEROS
// Usa Gmail + "contraseña de aplicación" (no tu contraseña normal).
// Configurá EMAIL_USER y EMAIL_PASS como variables de entorno
// de la función (ver instrucciones abajo).
// =====================================================

async function enviarEmailNumeros(participante) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER / EMAIL_PASS no configurados");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  const numerosHtml = (participante.numeros || [])
    .map(
      (n) =>
        `<span style="display:inline-block;margin:4px;padding:10px 16px;background:#e21f26;color:#ffffff;font-weight:bold;border-radius:8px;font-size:18px;">${n}</span>`
    )
    .join("");

  await transporter.sendMail({
    from: `"Motor Win" <${emailUser}>`,
    to: participante.email,
    subject: "¡Tu participación en el sorteo Motor Win fue confirmada!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <h2 style="color:#111;">¡Gracias por participar, ${participante.nombre}!</h2>
        <p>Confirmamos tu pago de <strong>$${participante.montoPagado}</strong>.</p>
        <p>Estos son tus números para el sorteo:</p>
        <div style="margin:16px 0;">${numerosHtml}</div>
        <p>📅 Sorteo: Jueves 24 de septiembre de 2026, 22:00 hs, en vivo por YouTube.</p>
        <p>¡Mucha suerte! 🏍️</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">Motor Win</p>
      </div>
    `,
  });
}