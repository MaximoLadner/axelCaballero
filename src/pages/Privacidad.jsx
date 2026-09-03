import { Link } from "react-router-dom";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#0b0b0b]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-bold tracking-wide hover:opacity-80 transition"
          >
            <span className="text-[#ff5722]">MOTOR</span> WIN
          </Link>

          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="mb-12">
          <p className="text-[#ff5722] font-semibold uppercase tracking-wider text-sm mb-3">
            Información legal
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-5">
            Política de Privacidad
          </h1>

          <p className="text-gray-400">
            Última actualización: 2 de septiembre de 2026
          </p>
        </div>

        <div className="space-y-10 text-gray-300 leading-7">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Introducción
            </h2>

            <p>
              En Motor Win nos comprometemos a proteger la privacidad de las
              personas que utilizan nuestro sitio y a tratar sus datos
              personales de manera responsable.
            </p>

            <p className="mt-4">
              Esta Política de Privacidad explica qué información podemos
              recopilar, para qué la utilizamos y cuáles son los derechos de
              los usuarios respecto de sus datos personales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Datos que recopilamos
            </h2>

            <p>Durante el proceso de participación podemos solicitar:</p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Nombre y apellido.</li>
              <li>Dirección de correo electrónico.</li>
              <li>Número de teléfono.</li>
              <li>Información relacionada con el pedido.</li>
              <li>Información contenida en el comprobante de pago enviado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Finalidad del tratamiento
            </h2>

            <p>Los datos recopilados pueden utilizarse para:</p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Gestionar pedidos y participaciones.</li>
              <li>Asignar y confirmar números de participación.</li>
              <li>Verificar pagos y comprobantes.</li>
              <li>Enviar confirmaciones por correo electrónico.</li>
              <li>Comunicar información relacionada con los sorteos.</li>
              <li>Prevenir usos fraudulentos o indebidos de la plataforma.</li>
              <li>Atender consultas y solicitudes de los participantes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Comprobantes de pago
            </h2>

            <p>
              Los comprobantes enviados por los participantes pueden contener
              información relacionada con una operación de pago.
            </p>

            <p className="mt-4">
              Esta información se utiliza exclusivamente para verificar la
              operación correspondiente y detectar posibles usos fraudulentos,
              como la reutilización de un mismo comprobante.
            </p>

            <p className="mt-4">
              El procesamiento automatizado de los comprobantes puede utilizar
              servicios tecnológicos de terceros destinados al análisis de
              imágenes y extracción de información.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Servicios tecnológicos utilizados
            </h2>

            <p>
              Para el funcionamiento de la plataforma podemos utilizar
              proveedores tecnológicos que intervienen en el almacenamiento de
              información, procesamiento de comprobantes, envío de correos
              electrónicos y alojamiento de la aplicación.
            </p>

            <p className="mt-4">
              Estos servicios reciben únicamente la información necesaria para
              cumplir con la función técnica correspondiente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Conservación de los datos
            </h2>

            <p>
              Los datos serán conservados durante el tiempo necesario para
              cumplir las finalidades para las que fueron recopilados, atender
              obligaciones legales y resolver eventuales reclamos o
              controversias.
            </p>

            <p className="mt-4">
              Cuando los datos dejen de resultar necesarios para dichas
              finalidades, podrán ser eliminados o tratados de forma que ya no
              permitan identificar al titular, según corresponda.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Seguridad
            </h2>

            <p>
              Motor Win adopta medidas técnicas y organizativas destinadas a
              proteger la información contra accesos no autorizados,
              alteraciones, pérdida o uso indebido.
            </p>

            <p className="mt-4">
              No obstante, ningún sistema informático conectado a Internet
              puede garantizar seguridad absoluta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Confidencialidad
            </h2>

            <p>
              La información personal proporcionada por los usuarios no será
              comercializada ni utilizada para finalidades incompatibles con
              aquellas informadas en esta Política de Privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Correos electrónicos
            </h2>

            <p>
              El correo electrónico informado por el participante podrá ser
              utilizado para enviar confirmaciones relacionadas con su pedido,
              información sobre su participación y comunicaciones necesarias
              para la gestión del sorteo.
            </p>

            <p className="mt-4">
              Las comunicaciones promocionales, cuando correspondan, deberán
              contar con la autorización necesaria y podrán ser rechazadas por
              el usuario.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Derechos del titular de los datos
            </h2>

            <p>
              De acuerdo con la normativa argentina de protección de datos
              personales, el titular puede ejercer los derechos que
              correspondan sobre sus datos, incluyendo solicitar acceso,
              actualización, rectificación o supresión cuando resulte
              procedente.
            </p>

            <p className="mt-4">
              Las solicitudes podrán realizarse a través de los canales de
              contacto disponibles en el sitio.
            </p>

            <p className="mt-4">
              La normativa argentina reconoce además la acción de habeas data
              para acceder a información personal y solicitar, cuando
              corresponda, su rectificación, actualización, confidencialidad o
              supresión. :contentReference[oaicite:2]{index=2}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Cambios en esta política
            </h2>

            <p>
              Motor Win podrá modificar esta Política de Privacidad cuando
              resulte necesario. La versión actualizada será publicada en esta
              misma página.
            </p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              12. Contacto
            </h2>

            <p>
              Si tenés consultas relacionadas con el tratamiento de tus datos
              personales o querés ejercer alguno de tus derechos, podés
              comunicarte con nosotros mediante los canales de contacto
              publicados en Motor Win.
            </p>
          </section>
        </div>

        {/* FOOTER LEGAL */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-6 text-sm">
          <Link
            to="/terminos"
            className="text-gray-400 hover:text-white transition"
          >
            Términos y condiciones
          </Link>

          <Link
            to="/privacidad"
            className="text-white hover:text-[#ff5722] transition"
          >
            Política de privacidad
          </Link>
        </div>
      </main>
    </div>
  );
}