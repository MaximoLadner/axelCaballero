import { Link } from "react-router-dom";

export default function Terminos() {
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
            Términos y Condiciones
          </h1>

          <p className="text-gray-400">
            Última actualización: 2 de septiembre de 2026
          </p>
        </div>

        <div className="space-y-10 text-gray-300 leading-7">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Información general
            </h2>

            <p>
              Bienvenido a Motor Win. El acceso y utilización de este sitio
              implica la aceptación de los presentes Términos y Condiciones.
            </p>

            <p className="mt-4">
              Motor Win es una plataforma destinada a la gestión de
              participaciones en sorteos y a la comunicación de información
              relacionada con los mismos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Participación
            </h2>

            <p>
              Para participar, el usuario deberá completar correctamente los
              datos solicitados y realizar el procedimiento de pago indicado
              para el sorteo correspondiente.
            </p>

            <p className="mt-4">
              La participación quedará confirmada únicamente cuando el pago
              haya sido verificado y aprobado por Motor Win.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Datos proporcionados por el participante
            </h2>

            <p>
              El participante deberá proporcionar información verdadera,
              completa y actualizada. Motor Win podrá rechazar o invalidar una
              participación cuando los datos proporcionados sean falsos,
              incompletos o inconsistentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Comprobantes de pago
            </h2>

            <p>
              Cuando el procedimiento de participación requiera el envío de un
              comprobante, este deberá corresponder a una transferencia o pago
              real efectuado para el pedido correspondiente.
            </p>

            <p className="mt-4">
              Los comprobantes son analizados mediante sistemas automatizados
              de validación y posteriormente contrastados con la información
              correspondiente al pedido.
            </p>

            <p className="mt-4">
              Motor Win podrá rechazar comprobantes que presenten información
              inconsistente, adulterada, ilegible, incompleta, reutilizada o
              que no permita verificar correctamente la operación.
            </p>

            <p className="mt-4">
              Un mismo comprobante no podrá utilizarse para obtener múltiples
              participaciones.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Asignación de números
            </h2>

            <p>
              Los números de participación son asignados por el sistema de
              Motor Win de acuerdo con la disponibilidad existente al momento
              de generar el pedido.
            </p>

            <p className="mt-4">
              Una vez confirmado el pago, los números asignados serán enviados
              al correo electrónico informado por el participante.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Pagos
            </h2>

            <p>
              El participante deberá realizar el pago por el importe indicado
              para la promoción seleccionada.
            </p>

            <p className="mt-4">
              La recepción de un comprobante no implica por sí misma la
              aprobación del pago. La participación queda confirmada una vez
              finalizado el proceso de verificación.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Sorteo
            </h2>

            <p>
              Cada sorteo contará con sus propias condiciones, fecha, premio y
              mecanismo de determinación del ganador, los cuales deberán ser
              informados previamente a los participantes.
            </p>

            <p className="mt-4">
              La información específica de cada sorteo publicada en Motor Win
              forma parte de las condiciones aplicables a dicho sorteo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Ganadores y premios
            </h2>

            <p>
              El ganador deberá acreditar su identidad y cumplir con los
              requisitos establecidos para la entrega del premio.
            </p>

            <p className="mt-4">
              Motor Win podrá solicitar información adicional cuando resulte
              necesaria para verificar la identidad del ganador o gestionar la
              entrega del premio.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Conductas prohibidas
            </h2>

            <p>
              Está prohibido utilizar la plataforma para presentar comprobantes
              falsificados, adulterados o reutilizados, proporcionar
              información falsa, intentar manipular el sistema o realizar
              cualquier acción destinada a obtener participaciones de manera
              fraudulenta.
            </p>

            <p className="mt-4">
              En caso de detectar una conducta irregular, Motor Win podrá
              cancelar la participación correspondiente y adoptar las medidas
              que resulten pertinentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Disponibilidad del sitio
            </h2>

            <p>
              Motor Win procurará mantener el sitio disponible de forma
              continua, pero no garantiza que el servicio se encuentre libre
              de interrupciones, errores técnicos o situaciones ajenas a su
              control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Modificaciones
            </h2>

            <p>
              Motor Win podrá actualizar estos Términos y Condiciones cuando
              resulte necesario. Las modificaciones serán publicadas en esta
              misma página.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              12. Legislación aplicable
            </h2>

            <p>
              Estos términos se interpretarán de acuerdo con la legislación
              vigente de la República Argentina, sin perjuicio de los derechos
              que correspondan a los consumidores conforme a la normativa
              aplicable.
            </p>
          </section>

          <section className="border-t border-white/10 pt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              13. Contacto
            </h2>

            <p>
              Para realizar consultas relacionadas con estos Términos y
              Condiciones, podés comunicarte con nosotros a través de los
              canales de contacto publicados en el sitio.
            </p>
          </section>
        </div>

        {/* FOOTER LEGAL */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-6 text-sm">
          <Link
            to="/terminos"
            className="text-white hover:text-[#ff5722] transition"
          >
            Términos y condiciones
          </Link>

          <Link
            to="/privacidad"
            className="text-gray-400 hover:text-white transition"
          >
            Política de privacidad
          </Link>
        </div>
      </main>
    </div>
  );
}