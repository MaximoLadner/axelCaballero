const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const { MercadoPagoConfig, Preference } = require("mercadopago");

setGlobalOptions({ maxInstances: 10 });

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preference = new Preference(client);

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