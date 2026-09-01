 const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { MercadoPagoConfig, Preference } = require("mercadopago");

setGlobalOptions({ maxInstances: 10 });

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preference = new Preference(client);

const { Payment } = require("mercadopago");

const payment = new Payment(client);

exports.crearPreferencia = onRequest(async (req, res) => {
  // Permitimos únicamente POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { promocionId } = req.body;

    const promociones = {
      individual: {
        nombre: "1 número - Sorteo Moto",
        cantidadNumeros: 1,
        precio: 1,
      },
      duo: {
        nombre: "2 números - Sorteo Moto",
        cantidadNumeros: 2,
        precio: 10000,
      },
      trio: {
        nombre: "3 números - Sorteo Moto",
        cantidadNumeros: 3,
        precio: 15000,
      },
    };

    const promocion = promociones[promocionId];

    if (!promocion) {
      return res.status(400).json({
        error: "Promoción inválida",
      });
    }

    const response = await preference.create({
  body: {
    items: [
      {
        id: promocionId,
        title: promocion.nombre,
        quantity: 1,
        unit_price: promocion.precio,
        currency_id: "ARS",
      },
    ],

    external_reference: promocionId,

    notification_url: process.env.MP_NOTIFICATION_URL,
  },
});

    logger.info("Preferencia creada", {
      preferenceId: response.id,
      promocionId,
    });

    return res.status(200).json({
      preferenceId: response.id,
      initPoint: response.init_point,
    });
  } catch (error) {
    logger.error("Error creando preferencia", error);

    return res.status(500).json({
      error: "No se pudo crear la preferencia de Mercado Pago",
    });
  }
});

exports.procesarPago = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido");
    }

    logger.info("Webhook recibido de Mercado Pago", {
      body: req.body,
      query: req.query,
    });

    const paymentId =
      req.body?.data?.id ||
      req.query?.["data.id"];

    const type =
      req.body?.type ||
      req.query?.type;

    if (type !== "payment" || !paymentId) {
      return res.status(200).send("Notificación ignorada");
    }

    const paymentData = await payment.get({
      id: paymentId,
    });

    logger.info("Pago consultado", {
      paymentId,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      amount: paymentData.transaction_amount,
    });

    return res.status(200).send("OK");
  } catch (error) {
    logger.error("Error procesando webhook", error);

    return res.status(500).send("Error");
  }
});