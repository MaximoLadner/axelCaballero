
import { useState } from "react";
import {
  registrarParticipante,
  obtenerPromociones,
} from "../services/participanteService";

import emailjs from "@emailjs/browser";

import logo from "../../public/logo.jpeg";

function Sorteo() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [numeros, setNumeros] = useState([]);
  const [montoPagado, setMontoPagado] = useState(0);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [promocionId, setPromocionId] = useState("");

  const promociones = obtenerPromociones();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!promocionId) {
      alert("Seleccioná una promoción.");
      return;
    }

    try {
      setProcesando(true);

      const resultado = await registrarParticipante({
        nombre,
        email,
        telefono,
        promocionId,
      });

      await emailjs.send(
        "service_ox6nl4h",
        "template_sorteo",
        {
          nombre: nombre,
          cantidadNumeros: resultado.cantidadNumeros,
          numeros: resultado.numeros.join(", "),
          montoPagado: resultado.montoPagado,
          to_email: email,
        },
        "DRdm2ePkprgMAafMZ"
      );

      setNumeros(resultado.numeros);
      setMontoPagado(resultado.montoPagado);
      setRegistrado(true);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al registrarte.");
    } finally {
      setProcesando(false);
    }
  };

  /*
   * ==========================================
   * PANTALLA DE ÉXITO
   * ==========================================
   */

  if (registrado) {
    return (
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1]">
        {/* NAVBAR */}
        <nav className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur border-b border-[#5b4039]">
          <div className="flex justify-between items-center w-full px-4 md:px-6 max-w-[1200px] mx-auto py-4">
            <div className="flex items-center gap-2 font-bold text-xl text-white">
              <img
  src={logo}
  alt="Autoloop"
  className="w-10 h-10 object-contain"
/>

<span>Autoloop</span>
            </div>
          </div>
        </nav>

        <main className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-2xl">

            <div className="bg-[#1a1a1a] border border-[#5b4039] rounded-2xl p-8 md:p-12 text-center shadow-2xl">

              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#ff5722]/10 border border-[#ff5722]/30 flex items-center justify-center">
                <span className="text-4xl">🎉</span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5b4039] text-[#ffb5a0] bg-[#1c1b1b] text-sm font-semibold mb-5">
                <span>✓</span>
                Participación confirmada
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
                ¡Ya estás participando!
              </h1>

              <p className="text-[#e4beb4] text-lg mb-8">
                Tu participación fue registrada correctamente.
                <br />
                También enviamos tus números a tu correo electrónico.
              </p>

              {/* MONTO */}
              <div className="bg-[#131313] border border-[#5b4039] rounded-xl p-6 mb-8">
                <p className="text-[#e4beb4] mb-2">
                  Importe de participación
                </p>

                <p className="text-3xl md:text-4xl font-bold text-[#ff5722]">
                  ${montoPagado.toLocaleString("es-AR")}
                </p>
              </div>

              {/* NÚMEROS */}
              <h2 className="text-xl font-bold text-white mb-5">
                Tus números
              </h2>

              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {numeros.map((numero) => (
                  <div
                    key={numero}
                    className="min-w-[70px] px-5 py-3 rounded-xl bg-[#ff5722] text-white text-xl font-extrabold shadow-lg shadow-[#ff5722]/20"
                  >
                    {numero}
                  </div>
                ))}
              </div>

              <div className="border-t border-[#5b4039] pt-6">
                <p className="text-[#e4beb4] text-sm">
                  🏍️ ¡Mucha suerte en el sorteo!
                </p>

                <p className="text-[#ab8980] text-sm mt-2">
                  Jueves 24 de septiembre de 2026 · 22:00 hs
                </p>
              </div>

            </div>

          </div>
        </main>
      </div>
    );
  }

  /*
   * ==========================================
   * LANDING + FORMULARIO
   * ==========================================
   */

  return (
    <div className="min-h-screen bg-[#131313] text-[#e5e2e1] antialiased">

      {/* =====================================
          NAVBAR
      ===================================== */}

      <nav className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur border-b border-[#5b4039]">
        <div className="flex justify-between items-center w-full px-4 md:px-6 max-w-[1200px] mx-auto py-4">

          {/* LOGO */}
          <a
            href="#inicio"
            className="flex items-center gap-2 font-extrabold text-xl text-white hover:opacity-80 transition"
          >
            <img
  src={logo}
  alt="Autoloop"
  className="w-10 h-10 object-contain"
/>

<span>Motor Win</span>
          </a>

          {/* NAV DESKTOP */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#inicio"
              className="text-[#ffb5a0] font-bold border-b-2 border-[#ff5722] pb-1"
            >
              Sorteo en vivo
            </a>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-3">

            <a
              href="#premios"
              className="hidden md:flex items-center gap-2 px-6 py-2 rounded-full bg-[#ff5722] text-white font-semibold hover:bg-[#e64a19] transition"
            >
              🏆 Ganadores
            </a>

            <button
              onClick={() => {
                setMostrarFormulario(true);

                setTimeout(() => {
                  document
                    .getElementById("formulario")
                    ?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="flex items-center gap-2 px-5 md:px-6 py-2 rounded-full border border-[#ff5722] text-[#ff5722] font-semibold hover:bg-[#ff5722] hover:text-white transition"
            >
              🎟️
              <span className="hidden sm:inline">
                Mis Números
              </span>
            </button>

          </div>
        </div>
      </nav>


      <main>

        {/* =====================================
            HERO
        ===================================== */}

        <section
          id="inicio"
          className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-20 flex flex-col md:flex-row items-center gap-12"
        >

          {/* TEXTO */}
          <div className="flex-1 flex flex-col items-start gap-6">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5b4039] text-[#ffb5a0] bg-[#1c1b1b] text-sm font-semibold">
              🎁
              ¡Nuevo Sorteo Disponible!
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white">
              Sorteo Triple{" "}
              <span className="text-[#ff5722]">
                Honda Wave
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-7 text-[#e4beb4] max-w-xl">
              Participá ahora y llevate una de las tres Honda Wave 0KM.
              Comprá tus chances y asegurá tu lugar en el sorteo más
              esperado del año.
            </p>

            <p className="text-base text-[#ab8980]">
              ¡Más números, más posibilidades de ganar!
            </p>


            {/* FECHA */}
            <div className="w-full mt-2 bg-[#1a1a1a] border border-[#5b4039] rounded-xl p-5 md:p-6 flex flex-col gap-5 relative overflow-hidden">

              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff5722] rounded-full blur-[60px] opacity-10" />

              <div className="flex flex-col gap-2 relative z-10">

                <div className="flex items-center gap-2 text-[#ffb5a0] font-semibold text-sm">
                  📅 Fecha del Sorteo
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-white text-lg md:text-xl font-bold">

                  <span>
                    Jueves 24 de Septiembre de 2026
                  </span>

                  <span className="hidden sm:inline text-[#5b4039]">
                    |
                  </span>

                  <span>
                    🕐 22:00 hs
                  </span>

                </div>
              </div>

              <button
                onClick={() =>
                  alert("Próximamente: enlace al sorteo en vivo por YouTube.")
                }
                className="w-full sm:w-fit flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#ff5722] text-[#ff5722] font-semibold hover:bg-[#ff5722]/10 transition relative z-10"
              >
                ▶️ Ver sorteo en vivo por YouTube
              </button>

            </div>


            {/* CTA */}
            <button
              onClick={() => {
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[#ff5722] text-white text-lg font-bold hover:bg-[#e64a19] transition shadow-lg shadow-[#ff5722]/30"
            >
              Participar Ahora
            </button>

          </div>


          {/* IMAGEN */}
          <div className="flex-1 w-full max-w-2xl relative rounded-2xl overflow-hidden border border-[#5b4039] shadow-2xl">

            <div className="relative w-full aspect-[1.79]">

              <img
                className="w-full h-full object-cover"
                alt="Honda Wave"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHy_0tAXaAUafREZ02gPa0Ct2VouIRTLk9u0MpwZiszUuVZ5xK1khlFD2sLRImp_9BY7uJfGenMZC8YeZMkR3YsQo26_W0JDRvg9E4tzjOjhdCrMpb9DDUSLnzsyhXdMVzdDNI-A3HItiHiyvKe9WQnU2g-lXBh0v3GEa4N1ghgBd7bovywntI6PItL_4Z_oT544QncJsuCVw2IKACHfReGZjLwq1mxdW4Nsep54QABnjv-jG_wprk"
              />

              <div className="absolute top-4 right-4 bg-[#ff5722] text-white font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                🎟️ Sorteo
              </div>

            </div>

          </div>

        </section>


        {/* =====================================
            CÓMO FUNCIONA
        ===================================== */}

        <section className="w-full bg-[#161616] py-20 border-y border-[#5b4039]">

          <div className="max-w-[1200px] mx-auto px-4 md:px-6">

            <div className="text-center mb-14">

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                ¿Cómo funciona?
              </h2>

              <p className="text-lg text-[#e4beb4]">
                Participar es muy fácil, seguí estos simples pasos.
              </p>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

              {[
                {
                  numero: "1",
                  icono: "🎟️",
                  titulo: "Elegí tus chances",
                  texto:
                    "Seleccioná cuántos números querés para el sorteo. Más chances = más probabilidades de ganar.",
                },
                {
                  numero: "2",
                  icono: "💳",
                  titulo: "Completá tus datos",
                  texto:
                    "Ingresá tus datos personales y elegí la promoción que quieras.",
                },
                {
                  numero: "3",
                  icono: "✅",
                  titulo: "Recibí tus números",
                  texto:
                    "Una vez registrada tu participación, recibirás automáticamente tus números por email.",
                },
                {
                  numero: "4",
                  icono: "🏆",
                  titulo: "¡Participá del sorteo!",
                  texto:
                    "El día del sorteo se eligen los ganadores en vivo por YouTube.",
                },
              ].map((paso) => (

                <div
                  key={paso.numero}
                  className="relative bg-[#1a1a1a] border border-[#5b4039] rounded-xl p-8 flex flex-col items-center text-center pt-12 hover:border-[#ff5722] transition"
                >

                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#ff5722] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {paso.numero}
                  </div>

                  <div className="w-16 h-16 rounded-xl bg-[#2a2a2a] flex items-center justify-center mb-6 border border-[#5b4039] text-3xl">
                    {paso.icono}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-4">
                    {paso.titulo}
                  </h3>

                  <p className="text-[#e4beb4] leading-relaxed">
                    {paso.texto}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>


        {/* =====================================
            PREMIOS
        ===================================== */}

       


        {/* =====================================
            PROMOCIONES
        ===================================== */}

        <section
          id="pricing"
          className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-20"
        >

          <div className="flex flex-col items-start mb-12">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#5b4039] text-[#ffb5a0] bg-[#1c1b1b] text-sm font-semibold mb-4">
              ⭐
              Opciones de Participación
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Seleccioná tus Chances
            </h2>

            <p className="text-lg text-[#e4beb4] mt-2">
              Elegí el pack que mejor se adapte a vos.
            </p>

          </div>


          {/* PROMOCIONES */}
          <div className="max-w-3xl flex flex-col gap-4">

            {promociones.map((promo, index) => {

              const seleccionada = promocionId === promo.id;

              const esPopular = promo.id === "duo";
              const esMejorValor = promo.id === "pack5";

              return (

                <label
                  key={promo.id}
                  className="cursor-pointer group"
                >

                  <div
                    className={`w-full rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 relative overflow-hidden ${
                      seleccionada
                        ? "border-[1.5px] border-[#ff5722] bg-gradient-to-r from-[#ff5722]/10 to-transparent shadow-[0_0_20px_rgba(255,87,34,0.1)]"
                        : "border border-[#5b4039] bg-[#1a1a1a] hover:border-[#ff5722]/50 hover:bg-[#202020]"
                    }`}
                  >

                    {/* BADGES */}
                    {esPopular && (
                      <div className="absolute top-0 right-0 bg-[#ff5722] text-white font-semibold text-xs px-4 py-1 rounded-bl-lg">
                        Más Popular
                      </div>
                    )}

                    {esMejorValor && (
                      <div className="absolute top-0 right-0 bg-[#353534] text-[#ffb5a0] font-semibold text-xs px-4 py-1 rounded-bl-lg border-b border-l border-[#5b4039]">
                        Mejor Valor
                      </div>
                    )}


                    <div className="flex items-center gap-4 mt-4 sm:mt-0">

                      {/* RADIO */}
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          seleccionada
                            ? "border-[#ff5722] bg-[#ff5722]/20"
                            : "border-[#5b4039]"
                        }`}
                      >

                        <div
                          className={`w-3 h-3 rounded-full ${
                            seleccionada
                              ? "bg-[#ff5722]"
                              : "bg-transparent"
                          }`}
                        />

                      </div>


                      <div className="flex flex-col">

                        <span className="text-xl font-bold text-white">

                          {promo.cantidadNumeros}{" "}
                          {promo.cantidadNumeros === 1
                            ? "Chance"
                            : "Chances"}

                          {esMejorValor && (
                            <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-[#2a1610] text-[#ff5722] border border-[#ff5722]/30">
                              BONUS
                            </span>
                          )}

                        </span>

                        <span className="text-[#e4beb4]">
                          para el sorteo
                        </span>

                      </div>

                    </div>


                    {/* PRECIO */}
                    <div className="text-2xl font-bold text-[#ff5722] mt-4 sm:mt-0">
                      ${promo.precio.toLocaleString("es-AR")}
                    </div>

                  </div>


                  <input
                    type="radio"
                    name="chance_selection"
                    value={promo.id}
                    checked={seleccionada}
                    onChange={() => {
                      setPromocionId(promo.id);
                      setMostrarFormulario(true);
                    }}
                    className="hidden"
                  />

                </label>

              );
            })}


            {/* =================================
                FORMULARIO
            ================================= */}

            {mostrarFormulario && (

              <div
                id="formulario"
                className="mt-8 bg-[#1a1a1a] border border-[#5b4039] rounded-2xl p-6 md:p-8"
              >

                <div className="mb-8">

                  <div className="flex items-center gap-3 mb-2">

                    <div className="w-10 h-10 rounded-lg bg-[#ff5722]/10 border border-[#ff5722]/30 flex items-center justify-center">
                      👤
                    </div>

                    <h3 className="text-2xl font-bold text-white">
                      Completá tus datos
                    </h3>

                  </div>

                  <p className="text-[#e4beb4]">
                    Necesitamos estos datos para registrar tu participación.
                  </p>

                </div>


                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >

                  {/* NOMBRE */}
                  <div>

                    <label className="block font-semibold text-white mb-2">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-[#131313] border border-[#5b4039] rounded-lg px-4 py-3 text-white outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] transition"
                      placeholder="Juan Pérez"
                    />

                  </div>


                  {/* EMAIL */}
                  <div>

                    <label className="block font-semibold text-white mb-2">
                      Email
                    </label>

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#131313] border border-[#5b4039] rounded-lg px-4 py-3 text-white outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] transition"
                      placeholder="juan@gmail.com"
                    />

                  </div>


                  {/* TELEFONO */}
                  <div>

                    <label className="block font-semibold text-white mb-2">
                      Teléfono
                    </label>

                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-[#131313] border border-[#5b4039] rounded-lg px-4 py-3 text-white outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] transition"
                      placeholder="3364..."
                    />

                  </div>


                  {/* RESUMEN */}
                  {promocionId && (

                    <div className="bg-[#131313] border border-[#5b4039] rounded-xl p-5">

                      <p className="text-sm text-[#ab8980] mb-1">
                        Promoción seleccionada
                      </p>

                      <div className="flex items-center justify-between gap-4">

                        <div>

                          <p className="text-white font-bold text-lg">
                            {promociones.find(
                              (p) => p.id === promocionId
                            )?.cantidadNumeros}{" "}
                            {promociones.find(
                              (p) => p.id === promocionId
                            )?.cantidadNumeros === 1
                              ? "Chance"
                              : "Chances"}
                          </p>

                        </div>

                        <p className="text-xl font-bold text-[#ff5722]">
                          $
                          {promociones
                            .find((p) => p.id === promocionId)
                            ?.precio.toLocaleString("es-AR")}
                        </p>

                      </div>

                    </div>

                  )}


                  {/* BOTON */}
                  <button
                    type="submit"
                    disabled={procesando}
                    className={`w-full px-8 py-4 rounded-lg text-white font-bold text-lg flex items-center justify-center gap-2 transition ${
                      procesando
                        ? "bg-[#7f2b16] cursor-not-allowed"
                        : "bg-[#ff5722] hover:bg-[#e64a19] shadow-lg shadow-[#ff5722]/30"
                    }`}
                  >

                    {procesando ? (
                      <>
                        <span className="animate-spin">
                          ⏳
                        </span>

                        Registrando...
                      </>
                    ) : (
                      <>
                        Continuar al Pago
                        <span>→</span>
                      </>
                    )}

                  </button>

                  <p className="text-center text-xs text-[#ab8980]">
                    Al continuar, tu participación será registrada y se
                    generarán tus números automáticamente.
                  </p>

                </form>

              </div>

            )}


            {/* BOTÓN SI TODAVÍA NO HAY FORMULARIO */}

            {!mostrarFormulario && (

              <button
                onClick={() => {
                  if (!promocionId) {
                    alert("Seleccioná una promoción.");
                    return;
                  }

                  setMostrarFormulario(true);

                  setTimeout(() => {
                    document
                      .getElementById("formulario")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }, 100);
                }}
                className="mt-4 w-full md:w-fit px-12 py-4 rounded-lg bg-[#ff5722] text-white font-bold text-lg hover:bg-[#e64a19] transition shadow-lg shadow-[#ff5722]/30 flex items-center justify-center gap-2"
              >
                Continuar al Pago
                <span>→</span>
              </button>

            )}

          </div>

        </section>

      </main>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="bg-[#0e0e0e] border-t border-[#5b4039] mt-10">

        <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-6 py-16 max-w-[1200px] mx-auto gap-8">

          <div className="flex flex-col items-center md:items-start gap-3">

            <div className="flex items-center gap-2 font-bold text-xl text-[#ffb5a0]">
  <img
    src={logo}
    alt="Autoloop"
    className="w-10 h-10 object-contain"
  />

  <span>Motor Win</span>
</div>

            <p className="text-[#ab8980] text-sm">
              © 2026 Motor Win. Todos los derechos reservados.
            </p>

          </div>


          <div className="flex flex-col md:flex-row items-center gap-6 text-sm font-semibold">

            <a
              href="#"
              className="text-[#e4beb4] hover:text-[#ffb5a0] transition"
            >
              Términos Legales
            </a>

            <a
              href="#"
              className="text-[#e4beb4] hover:text-[#ffb5a0] transition"
            >
              Contacto
            </a>

            <a
              href="#"
              className="text-[#e4beb4] hover:text-[#ffb5a0] transition"
            >
              ▶ Participar en YouTube
            </a>

          </div>

        </div>

      </footer>

    </div>
  );
}

export default Sorteo;

