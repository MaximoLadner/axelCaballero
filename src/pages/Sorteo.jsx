import { useEffect, useRef, useState } from "react";
import emailjs from "@emailjs/browser";

import {
  obtenerPromociones,
} from "../services/participanteService";

import logo from "../../public/logo.jpeg";
import foto2 from "../../public/foto2.jpeg";
import foto3 from "../../public/foto3.jpeg";
import foto4 from "../../public/foto4.jpeg";
import foto5 from "../../public/foto5.jpeg";
import {
  FaFacebookF,
  FaInstagram,
  FaGoogle,
} from "react-icons/fa";
import { Link } from "wouter";

// ==========================================
// CARRUSEL DEL HERO
// ==========================================
// Definido fuera del componente para no recrear
// el array en cada render.
const IMAGENES_CARRUSEL = [foto2, foto3, foto4, foto5];

// ==========================================
// EMAILJS (mail de confirmación al aprobar el pago)
// ==========================================
// La Public Key NO es secreta, está pensada para vivir
// en el frontend (a diferencia de una API key normal).
const EMAILJS_SERVICE_ID = "service_ox6nl4h";
const EMAILJS_TEMPLATE_ID = "template_sorteo";
const EMAILJS_PUBLIC_KEY = "DRdm2ePkprgMAafMZ";

function Sorteo() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // ==========================================
  // FIX: el chat arranca CERRADO. Antes arrancaba
  // en `true` y, apenas se mostraba la pantalla de
  // "pedido realizado", se abría solo y tapaba el
  // CBU / monto / pasos a seguir (sobre todo en mobile).
  // ==========================================
  const [mostrarChat, setMostrarChat] = useState(false);
  const [pedidoRealizado, setPedidoRealizado] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [pedidoId, setPedidoId] = useState("");
  const [monto, setMonto] = useState(0);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [promocionId, setPromocionId] = useState("");

  const promociones = obtenerPromociones();

  const [comprobante, setComprobante] = useState(null);
  const [analizandoComprobante, setAnalizandoComprobante] = useState(false);
  const [resultadoPago, setResultadoPago] = useState(null);
  const inputComprobanteRef = useRef(null);

  // ==========================================
  // CARRUSEL DEL HERO
  // ==========================================

  const [indiceCarrusel, setIndiceCarrusel] = useState(0);

  const irSiguiente = () => {
    setIndiceCarrusel(
      (prev) => (prev + 1) % IMAGENES_CARRUSEL.length
    );
  };

  const irAnterior = () => {
    setIndiceCarrusel(
      (prev) =>
        (prev - 1 + IMAGENES_CARRUSEL.length) %
        IMAGENES_CARRUSEL.length
    );
  };

  // Autoplay: cambia de foto sola cada 4 segundos
  useEffect(() => {

    const intervalo = setInterval(() => {
      setIndiceCarrusel(
        (prev) => (prev + 1) % IMAGENES_CARRUSEL.length
      );
    }, 4000);

    return () => clearInterval(intervalo);

  }, []);

  // ==========================================
  // FIX: bloquear el scroll del body cuando el
  // popup del formulario está abierto (mobile y
  // desktop), para que no se pueda scrollear el
  // fondo detrás del modal.
  // ==========================================

  useEffect(() => {

    if (mostrarFormulario) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };

  }, [mostrarFormulario]);

  // ==========================================
  // DATOS DE TRANSFERENCIA
  // ==========================================

  const DATOS_TRANSFERENCIA = {
    banco: "Mercado Pago",
    cbu: "0000003100058277014581",
    alias: "maximoladner",
    titular: "Maximo Ladner",
  };

  // ==========================================
  // CREAR PEDIDO
  // ==========================================
  //
  // IMPORTANTE: esto NO reserva números todavía. El pedido queda
  // "pendiente de pago". Los números se generan y se envían por
  // email recién cuando el comprobante es verificado y aprobado
  // (eso se resuelve del lado del backend, en crearPedido.mjs /
  // analizarComprobante.mjs).
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!promocionId) {
      alert("Seleccioná una promoción.");
      return;
    }

    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      alert("Completá todos tus datos.");
      return;
    }

    try {
      setProcesando(true);

      const respuesta = await fetch(
        "/.netlify/functions/crearPedido",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            email,
            telefono,
            promocionId,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo crear el pedido."
        );
      }

      // ==========================================
      // GUARDAR DATOS DEL PEDIDO
      // ==========================================

      setPedidoId(datos.pedidoId);
      setMonto(datos.monto || 0);

      localStorage.setItem(
        "pedidoId",
        datos.pedidoId
      );

      localStorage.setItem(
        "datosPedido",
        JSON.stringify({
          pedidoId: datos.pedidoId,
          nombre,
          email,
          telefono,
          promocionId,
          monto: datos.monto || 0,
        })
      );

      // ==========================================
      // CERRAR EL POPUP Y MOSTRAR PANTALLA DEL PEDIDO
      // ==========================================

      setProcesando(false);
      setMostrarFormulario(false);
      setPedidoRealizado(true);

      // ==========================================
      // FIX: el scroll al tope se pedía ANTES de que
      // React terminara de renderizar la nueva pantalla
      // de "pedido realizado", así que el navegador
      // scrolleaba al tope de la pantalla VIEJA y, apenas
      // se pintaba la nueva (mucho más alta), quedabas
      // viendo la mitad/el final en vez del principio
      // (sobre todo en mobile). Con requestAnimationFrame
      // (doble, para asegurar que ya pintó) el scroll se
      // aplica recién cuando el contenido nuevo ya está
      // en el DOM.
      // ==========================================

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
          });
        });
      });

    } catch (error) {
      console.error(
        "Error creando pedido:",
        error
      );

      alert(
        error.message ||
          "No se pudo crear el pedido."
      );

      setProcesando(false);
    }
  };

  
// ==========================================
// ANALIZAR COMPROBANTE
// ==========================================

const analizarComprobante = async (archivo) => {

  if (!archivo) {
    return;
  }

  if (!archivo.type.startsWith("image/")) {
    alert("El comprobante debe ser una imagen.");
    return;
  }

  // Límite razonable para no mandar archivos gigantes
  if (archivo.size > 8 * 1024 * 1024) {
    alert("La imagen es demasiado grande. Máximo 8 MB.");
    return;
  }

  try {

    setAnalizandoComprobante(true);
    setResultadoPago(null);

    // ------------------------------------------
    // CONVERTIR IMAGEN A BASE64
    // ------------------------------------------

    const base64 =
      await new Promise((resolve, reject) => {

        const reader =
          new FileReader();

        reader.onload = () =>
          resolve(reader.result);

        reader.onerror = () =>
          reject(
            new Error(
              "No se pudo leer la imagen."
            )
          );

        reader.readAsDataURL(archivo);
      });


    // ------------------------------------------
    // ENVIAR A NETLIFY FUNCTION
    // ------------------------------------------

    const respuesta =
      await fetch(
        "/.netlify/functions/analizarComprobante",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pedidoId,
            imagen: base64,
          }),
        }
      );


    const datos =
      await respuesta.json();


    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
        "No se pudo analizar el comprobante."
      );
    }


    // ------------------------------------------
    // GUARDAR RESULTADO
    // ------------------------------------------

    setResultadoPago(datos);


    if (datos.aprobado) {

      // ==========================================
      // ENVIAR MAIL DE CONFIRMACIÓN (EmailJS, desde el navegador)
      // ==========================================
      //
      // Solo mandamos el mail si vienen números en la respuesta.
      // Si el pedido ya estaba aprobado de antes (ver
      // analizarComprobante.mjs), el backend no manda "numeros"
      // en ese caso, así que evitamos reenviar el mail.
      // ==========================================

      if (datos.comprobante?.numeros?.length > 0) {

        try {

          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              nombre,
              email,
              cantidadNumeros:
                datos.comprobante.cantidadNumeros,
              numeros:
                datos.comprobante.numeros.join("\n"),
              montoPagado:
                datos.comprobante.monto,
              time: new Date().toLocaleString("es-AR", {
                timeZone: "America/Argentina/Buenos_Aires",
              }),
            },
            EMAILJS_PUBLIC_KEY
          );

        } catch (errorEmail) {

          console.error(
            "Error enviando email de confirmación:",
            errorEmail
          );

          // No cortamos el flujo: el pago ya está aprobado en el
          // backend igual, el mail es un extra. El usuario ya ve
          // sus números en pantalla aunque el mail falle.
        }

      }

      alert(
        "¡Pago aprobado! Te enviamos tus números por email."
      );

    } else {

      alert(
        datos.mensaje ||
        "No pudimos validar el comprobante."
      );
    }


  } catch (error) {

    console.error(
      "Error analizando comprobante:",
      error
    );

    alert(
      error.message ||
      "No se pudo analizar el comprobante."
    );

  } finally {

    setAnalizandoComprobante(false);

    if (
      inputComprobanteRef.current
    ) {
      inputComprobanteRef.current.value = "";
    }
  }
};


// ==========================================
// SELECCIONAR COMPROBANTE
// ==========================================

const handleSeleccionarComprobante = (
  e
) => {

  const archivo =
    e.target.files?.[0];

  if (!archivo) {
    return;
  }

  setComprobante(archivo);

  analizarComprobante(archivo);
};



  // ==========================================
  // COPIAR CBU
  // ==========================================

  const copiarCBU = async () => {
    try {
      await navigator.clipboard.writeText(
        DATOS_TRANSFERENCIA.cbu
      );

      alert("CBU copiado correctamente.");
    } catch (error) {
      console.error(
        "Error copiando CBU:",
        error
      );

      alert(
        "No se pudo copiar el CBU."
      );
    }
  };

  const copiarAlias = async () => {
    try {
      await navigator.clipboard.writeText(
        DATOS_TRANSFERENCIA.alias
      );

      alert("Alias copiado correctamente.");
    } catch (error) {
      console.error(
        "Error copiando Alias:",
        error
      );

      alert(
        "No se pudo copiar el CBU."
      );
    }
  };

  // ==========================================
  // ABRIR POPUP DE FORMULARIO
  // ==========================================
  //
  // FIX: antes esto hacía scrollIntoView hasta el
  // formulario (que vivía embebido más abajo en la
  // página). Ahora el formulario es un popup centrado
  // en pantalla, así que ya no hace falta scrollear:
  // simplemente se abre el modal.
  // ==========================================

  const abrirFormulario = (idPromo) => {

    if (idPromo) {
      setPromocionId(idPromo);
    }

    if (!idPromo && !promocionId) {
      alert("Primero seleccioná una promoción.");
      return;
    }

    setMostrarFormulario(true);
  };

  // ==========================================
  // VOLVER A LA TIENDA (reset completo)
  // ==========================================

  const volverATienda = () => {
    setPedidoRealizado(false);
    setMostrarFormulario(false);
    setPromocionId("");
    setPedidoId("");
    setMonto(0);
    setNombre("");
    setEmail("");
    setTelefono("");
    setComprobante(null);
    setResultadoPago(null);
    setAnalizandoComprobante(false);
    setMostrarChat(false);
  };

  // ==========================================
  // PANTALLA PEDIDO REALIZADO
  // ==========================================

  if (pedidoRealizado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">

        {/* NAVBAR */}

        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a]">

          <div className="flex justify-between items-center w-full px-4 md:px-6 max-w-[1200px] mx-auto py-4">

            <a
              href="#"
              className="flex items-center gap-2 font-extrabold text-xl text-white"
            >
              <img
                src={logo}
                alt="Motor Win"
                className="w-10 h-10 object-contain"
              />

              <span>
                Motor Win
              </span>
            </a>

          </div>

        </nav>


        {/* CONTENIDO */}

        <main className="px-4 py-12 md:py-16">

          <div className="max-w-3xl mx-auto">

            {/* CABECERA */}

            <div className="text-center mb-10">

              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#e21f26]/10 border border-[#e21f26]/30 flex items-center justify-center">

                <span className="text-4xl">
                  🎉
                </span>

              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#e21f26]/30 text-[#ff6259] bg-[#141414] text-sm font-semibold mb-5">

                ✓ Pedido registrado

              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">

                ¡Ya casi! Falta el pago

              </h1>

              <p className="text-[#c9c9c9] text-lg">

                Tu pedido quedó registrado, pero todavía no tenés números asignados.
                <br />

                Primero transferí el monto indicado abajo y subí el comprobante.
                Una vez que lo verifiquemos, te enviamos tus números por email a{" "}
                <strong className="text-white">{email}</strong>.

              </p>

            </div>


            {/* TRANSFERENCIA — lo primero que hay que ver */}

            <div className="bg-[#141414] border border-[#e21f26]/40 rounded-2xl p-6 md:p-8 mb-6">

              <div className="mb-6">

                <div className="flex items-center gap-3 mb-2">

                  <div className="w-11 h-11 rounded-xl bg-[#e21f26]/10 border border-[#e21f26]/30 flex items-center justify-center text-xl">
                    💳
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    1. Transferí a esta cuenta (tienes 3 minutos para hacerlo o el comprobante no sera valido)
                  </h2>

                </div>

                <p className="text-[#c9c9c9]">
                  Transferí exactamente el importe de tu pedido a la siguiente cuenta.
                </p>

              </div>


              <div className="space-y-4">

                {/* BANCO */}

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">

                  <p className="text-[#8a8a8a] text-sm mb-1">
                    Banco / billetera
                  </p>

                  <p className="text-white font-bold text-lg">
                    {DATOS_TRANSFERENCIA.banco}
                  </p>

                </div>


                {/* CBU */}

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">

                  <p className="text-[#8a8a8a] text-sm mb-2">
                    CBU
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                    <p className="text-white font-bold break-all flex-1">
                      {DATOS_TRANSFERENCIA.cbu}
                    </p>

                    <button
                      onClick={copiarCBU}
                      className="shrink-0 px-4 py-2 rounded-lg border border-[#e21f26] text-[#e21f26] font-semibold hover:bg-[#e21f26] hover:text-white transition"
                    >
                      📋 Copiar CBU
                    </button>

                  </div>

                </div>

                {/* Alias */}

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">

                  <p className="text-[#8a8a8a] text-sm mb-2">
                    Alias
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                    <p className="text-white font-bold break-all flex-1">
                      {DATOS_TRANSFERENCIA.alias}
                    </p>

                    <button
                      onClick={copiarAlias}
                      className="shrink-0 px-4 py-2 rounded-lg border border-[#e21f26] text-[#e21f26] font-semibold hover:bg-[#e21f26] hover:text-white transition"
                    >
                      📋 Copiar alias
                    </button>

                  </div>

                </div>



                {/* TITULAR */}

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">

                  <p className="text-[#8a8a8a] text-sm mb-1">
                    Titular
                  </p>

                  <p className="text-white font-bold text-lg">
                    {DATOS_TRANSFERENCIA.titular}
                  </p>

                </div>


                {/* MONTO */}

                <div className="bg-[#e21f26]/5 border border-[#e21f26]/20 rounded-xl p-5">

                  <div className="flex justify-between items-center gap-4">

                    <div>

                      <p className="text-[#8a8a8a] text-sm">
                        Importe exacto
                      </p>

                      <p className="text-white font-semibold">
                        Transferí este monto
                      </p>

                    </div>

                    <p className="text-2xl md:text-3xl font-extrabold text-[#e21f26]">
                      ${monto.toLocaleString("es-AR")}
                    </p>

                  </div>

                </div>

              </div>

            </div>


            {/* DATOS DEL PEDIDO */}

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 mb-6">

              <div className="flex items-center justify-between gap-4 mb-6">

                <div>

                  <p className="text-[#8a8a8a] text-sm">
                    Número de pedido
                  </p>

                  <p className="text-white font-bold text-xl">
                    #{pedidoId}
                  </p>

                </div>


                <div className="text-right">

                  <p className="text-[#8a8a8a] text-sm">
                    Estado
                  </p>

                  <span className="inline-flex mt-1 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold">
                    Pendiente de pago
                  </span>

                </div>

              </div>


              <div className="border-t border-[#2a2a2a] pt-5">

                <p className="text-[#8a8a8a] text-sm mb-1">
                  Monto a transferir
                </p>

                <p className="text-3xl font-extrabold text-[#e21f26]">
                  ${monto.toLocaleString("es-AR")}
                </p>

              </div>

            </div>


            {/* TUS NÚMEROS — todavía no existen, se avisa cómo se entregan */}

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 mb-6">

              <div className="text-center">

                <div className="text-4xl mb-3">
                  🔒
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  2. Subí el comprobante para recibir tus números
                </h2>

                <p className="text-[#c9c9c9]">
                  Tus números se generan recién cuando confirmamos que el comprobante
                  es válido. Te los mandamos por email a{" "}
                  <strong className="text-white">{email || "tu correo"}</strong>.
                </p>

              </div>

            </div>


            {/* AVISO */}

            <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5 mb-6">

              <p className="text-white font-semibold mb-2">
                📸 Después de transferir
              </p>

              <p className="text-[#c9c9c9] text-sm leading-relaxed">
                Guardá una captura del comprobante y enviala por el chat.
                Vamos a verificar que sea original y coincida con el monto de tu
                pedido antes de asignarte números.
              </p>

            </div>


            {/* CHAT (en la página) */}

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 mb-6">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                <div>

                  <h2 className="text-xl font-bold text-white mb-2">
                    ¿Necesitás ayuda?
                  </h2>

                  <p className="text-[#c9c9c9] text-sm">
                    Podés consultar sobre tu pedido #{pedidoId}
                    y enviar tu comprobante por el chat.
                  </p>

                </div>


                {/* FIX: este botón antes no existía (div vacío),
                    era la única forma de reabrir el chat una vez cerrado */}
                <button
                  onClick={() => setMostrarChat(true)}
                  className="shrink-0 w-full sm:w-auto px-6 py-3 rounded-lg bg-[#e21f26] text-white font-semibold hover:bg-[#b3161c] transition whitespace-nowrap"
                >
                  💬 {mostrarChat ? "Chat abierto" : "Abrir chat"}
                </button>

              </div>

            </div>


            {/* EMAIL */}

            <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 mb-8">

              <div className="flex items-start gap-4">

                <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-xl shrink-0">
                  📧
                </div>

                <div>

                  <h2 className="text-xl font-bold text-white mb-2">
                    También podés enviar el comprobante por email
                  </h2>

                  <p className="text-[#c9c9c9] text-sm leading-relaxed">

                    Mandanos el comprobante indicando tu número de pedido:

                    <strong className="text-white">
                      {" "}#{pedidoId}
                    </strong>

                  </p>

                  <a
                    href={`mailto:sorteoscaballeros@gmail.com?subject=Comprobante%20pedido%20%23${pedidoId}`}
                    className="inline-block mt-4 text-[#ff6259] font-semibold hover:text-white transition"
                  >
                    sorteoscaballeros@gmail.com
                  </a>

                </div>

              </div>

            </div>


            {/* VOLVER */}

            <div className="text-center">

              <button
                onClick={volverATienda}
                className="px-6 py-3 rounded-lg border border-[#2a2a2a] text-[#c9c9c9] hover:border-[#e21f26] hover:text-white transition"
              >
                ← Volver a la tienda
              </button>

            </div>

          </div>

        </main>


        {/* FIX: botón flotante (FAB) para abrir el chat cuando está cerrado.
            Antes, si el usuario lo cerraba, no había forma de volver a
            abrirlo desde acá abajo. */}

        {!mostrarChat && (

          <button
            onClick={() => setMostrarChat(true)}
            aria-label="Abrir chat de ayuda"
            className="fixed bottom-5 right-5 z-[100] w-14 h-14 rounded-full bg-[#e21f26] text-white text-2xl shadow-2xl shadow-black/40 flex items-center justify-center hover:bg-[#b3161c] transition"
          >
            💬
          </button>

        )}


        {/* CHAT FLOTANTE */}

    

{mostrarChat && (

  // FIX: en mobile ahora usa left-4/right-4/bottom-4 en vez de
  // w-[calc(100vw-40px)] pegado a un solo borde, y baja un poco el
  // max-h para que no tape toda la pantalla. Como además ya no se
  // abre solo, el usuario siempre ve primero los datos de transferencia.
  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-[100] sm:w-[390px] max-h-[70vh] sm:max-h-[75vh] bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">

    {/* HEADER */}

    <div className="bg-[#0a0a0a] border-b border-[#2a2a2a] px-5 py-4 flex items-center justify-between">

      <div className="flex items-center gap-3">

        <div className="w-10 h-10 rounded-full bg-[#e21f26] flex items-center justify-center">
          🤖
        </div>

        <div>

          <p className="text-white font-bold">
            Motor Win
          </p>

          <p className="text-xs text-[#8a8a8a]">
            Asistencia para tu pedido
          </p>

        </div>

      </div>


      {/* CERRAR */}

      <button
        onClick={() =>
          setMostrarChat(false)
        }
        className="text-[#8a8a8a] hover:text-white text-xl transition"
      >
        ✕
      </button>

    </div>


    {/* MENSAJES */}

    <div className="flex-1 overflow-y-auto p-5">

      {/* MENSAJE INICIAL */}

      <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl rounded-tl-sm p-4">

        <p className="text-white font-semibold mb-2">
          👋 ¡Hola!
        </p>

        <p className="text-[#c9c9c9] text-sm leading-relaxed">

          Todavía no tenés números asignados.

          <br />

          Realizá la transferencia por el monto indicado y enviá acá el
          comprobante para que verifiquemos el pago y te mandemos tus
          números por email.

        </p>


        {/* PEDIDO */}

        <div className="mt-4 bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a2a]">

          <p className="text-[#8a8a8a] text-xs">
            Pedido
          </p>

          <p className="text-white font-bold">
            #{pedidoId}
          </p>

        </div>

      </div>


      {/* ESTADO: ANALIZANDO */}

      {analizandoComprobante && (

        <div className="mt-4 flex justify-start">

          <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-2xl rounded-tl-sm p-4 max-w-[90%]">

            <div className="flex items-center gap-3">

              <div className="w-7 h-7 border-4 border-[#2a2a2a] border-t-[#e21f26] rounded-full animate-spin" />

              <div>

                <p className="text-white font-semibold text-sm">
                  Analizando comprobante...
                </p>

                <p className="text-[#8a8a8a] text-xs mt-1">
                  Verificando los datos de la transferencia.
                </p>

              </div>

            </div>

          </div>

        </div>

      )}


      {/* RESULTADO APROBADO */}

      {resultadoPago?.aprobado && (

        <div className="mt-4 flex justify-start">

          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl rounded-tl-sm p-4 max-w-[90%]">

            <p className="text-green-400 font-bold mb-2">
              ✅ ¡Pago aprobado!
            </p>

            <p className="text-[#c9c9c9] text-sm leading-relaxed">

              Tu transferencia fue validada correctamente.

              <br />

              Te enviamos tus números asignados a{" "}
              <strong className="text-white">{email}</strong>.

            </p>


            {resultadoPago.comprobante && (

              <div className="mt-3 bg-[#0a0a0a] border border-green-500/20 rounded-lg p-3">

                <p className="text-[#8a8a8a] text-xs">
                  Monto detectado
                </p>

                <p className="text-white font-bold">
                  $
                  {Number(
                    resultadoPago.comprobante.monto
                  ).toLocaleString("es-AR")}
                </p>

              </div>

            )}

            {/* FIX: antes el backend no mandaba los números, así que
                nunca se mostraban acá. Ahora analizarComprobante.mjs
                los incluye en comprobante.numeros. */}

            {resultadoPago.comprobante?.numeros?.length > 0 && (

              <div className="mt-3 bg-[#0a0a0a] border border-green-500/20 rounded-lg p-3">

                <p className="text-[#8a8a8a] text-xs mb-2">
                  Tus números
                </p>

                <div className="flex flex-wrap gap-2">

                  {resultadoPago.comprobante.numeros.map((numero) => (

                    <span
                      key={numero}
                      className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-300 font-mono text-sm"
                    >
                      {numero}
                    </span>

                  ))}

                </div>

              </div>

            )}

          </div>

        </div>

      )}


      {/* RESULTADO RECHAZADO */}

      {resultadoPago &&
        !resultadoPago.aprobado &&
        !analizandoComprobante && (

        <div className="mt-4 flex justify-start">

          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl rounded-tl-sm p-4 max-w-[90%]">

            <p className="text-red-400 font-bold mb-2">
              ❌ Comprobante no validado
            </p>

            <p className="text-[#c9c9c9] text-sm leading-relaxed">

              {resultadoPago.mensaje ||
                "No pudimos confirmar la transferencia con este comprobante."}

            </p>

            <p className="text-[#8a8a8a] text-xs mt-3">
              Podés enviar otro comprobante para volver a intentarlo.
            </p>

          </div>

        </div>

      )}

    </div>


    {/* FOOTER */}

    <div className="border-t border-[#2a2a2a] p-4 bg-[#0f0f0f]">

      {/* INPUT OCULTO */}

      <input
        ref={inputComprobanteRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleSeleccionarComprobante}
        className="hidden"
      />


      {/* BOTÓN ENVIAR */}

      {!analizandoComprobante &&
        !resultadoPago?.aprobado && (

        <button
          onClick={() =>
            inputComprobanteRef.current?.click()
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#e21f26] text-white font-bold hover:bg-[#b3161c] transition"
        >

          📎

          {resultadoPago
            ? "Enviar otro comprobante"
            : "Enviar comprobante"}

        </button>

      )}


      {/* ANALIZANDO */}

      {analizandoComprobante && (

        <div className="text-center">

          <p className="text-[#c9c9c9] text-sm">
            🤖 La IA está analizando tu comprobante...
          </p>

          <p className="text-[#666] text-xs mt-1">
            Esto puede tardar unos segundos.
          </p>

        </div>

      )}


      {/* APROBADO */}

      {resultadoPago?.aprobado && (

        <div className="text-center">

          <p className="text-green-400 text-sm font-semibold">
            ✓ Pago confirmado
          </p>

          <p className="text-[#666] text-xs mt-1">
            Revisá tu email — ahí te llegan tus números.
          </p>

        </div>

      )}

    </div>

  </div>

)}

      </div>
    );
  }


  // ==========================================
  // LANDING
  // ==========================================

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased">

      {/* NAVBAR */}

      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#2a2a2a]">

        <div className="flex justify-between items-center w-full px-4 md:px-6 max-w-[1200px] mx-auto py-4">

          <a
            href="#inicio"
            className="flex items-center gap-2 font-extrabold text-xl text-white hover:opacity-80 transition"
          >

            <img
              src={logo}
              alt="Motor Win"
              className="w-10 h-10 object-contain"
            />

            <span>
              Motor Win
            </span>

          </a>


          <div className="hidden md:flex items-center gap-8">

            <a
              href="#inicio"
              className="text-[#ff6259] font-bold border-b-2 border-[#e21f26] pb-1"
            >
              Sorteo en vivo
            </a>

          </div>


          

        </div>

      </nav>


      <main>

        {/* HERO */}

        <section
          id="inicio"
          className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-20 flex flex-col md:flex-row items-center gap-12"
        >

          <div className="flex-1 flex flex-col items-start gap-6">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2a2a] text-[#ff6259] bg-[#141414] text-sm font-semibold">
              🎁 ¡Nuevo Sorteo Disponible!
            </div>


            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-white">

              Sorteo de una{" "}

              <span className="text-[#e21f26]">
                Honda Wave
              </span>

            </h1>


            <p className="text-lg md:text-xl leading-7 text-[#c9c9c9] max-w-xl">

              Participá ahora y llevate una  Honda Wave.<br />
              Comprá tus chances y asegurá tu lugar en el sorteo más
              esperado del año.

            </p>


            <p className="text-base text-[#8a8a8a]">
              ¡Más números, más posibilidades de ganar!
            </p>


            {/* FECHA */}

            <div className="w-full mt-2 bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 md:p-6 flex flex-col gap-5 relative overflow-hidden">

              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#e21f26] rounded-full blur-[60px] opacity-10" />

              <div className="flex flex-col gap-2 relative z-10">

                <div className="flex items-center gap-2 text-[#ff6259] font-semibold text-sm">
                  📅 Fecha del Sorteo
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 text-white text-lg md:text-xl font-bold">

                  <span>
                    Sabado 3 de Octubre de 2026 
                  </span>

                  <span className="hidden sm:inline text-[#2a2a2a]">
                    |
                  </span>

                  <span>
                    🕐 22:00 hs
                  </span>

                </div>

              </div>


              <a href="https://www.instagram.com/motorwin_/" target="_blank" 
                
                className="w-full sm:w-fit flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-[#e21f26] text-[#e21f26] font-semibold hover:bg-[#e21f26]/10 transition relative z-10"
              >
                ▶️ Ver sorteo en vivo por Instagram
              </a>

            </div>


            <button
              onClick={() => {

                document
                  .getElementById("pricing")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });

              }}
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[#e21f26] text-white text-lg font-bold hover:bg-[#b3161c] transition shadow-lg shadow-[#e21f26]/30"
            >
              Participar Ahora
            </button>

          </div>


          {/* IMAGEN - CARRUSEL */}

          <div className="flex-1 w-full max-w-2xl relative rounded-2xl overflow-hidden border border-[#2a2a2a] shadow-2xl">

            <div className="relative w-full aspect-[1.79]">

              {/* FOTOS (se van mostrando/ocultando con opacidad) */}

              {IMAGENES_CARRUSEL.map((imagen, index) => (

                <img
                  key={index}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                    index === indiceCarrusel
                      ? "opacity-100"
                      : "opacity-0"
                  }`}
                  alt={`Honda Wave ${index + 1}`}
                  src={imagen}
                />

              ))}


              <div className="absolute top-4 right-4 bg-[#e21f26] text-white font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-10">
                🎟️ Sorteo
              </div>


              {/* FLECHA ANTERIOR */}

              <button
                onClick={irAnterior}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 text-white text-xl flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-black/70 transition"
              >
                ‹
              </button>


              {/* FLECHA SIGUIENTE */}

              <button
                onClick={irSiguiente}
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 text-white text-xl flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-black/70 transition"
              >
                ›
              </button>


              {/* PUNTOS INDICADORES */}

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">

                {IMAGENES_CARRUSEL.map((_, index) => (

                  <button
                    key={index}
                    onClick={() => setIndiceCarrusel(index)}
                    aria-label={`Ir a la foto ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      index === indiceCarrusel
                        ? "w-6 bg-[#e21f26]"
                        : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />

                ))}

              </div>

            </div>

          </div>

        </section>


        {/* COMO FUNCIONA */}

        <section className="w-full bg-[#111111] py-20 border-y border-[#2a2a2a]">

          <div className="max-w-[1200px] mx-auto px-4 md:px-6">

            <div className="text-center mb-14">

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                ¿Cómo funciona?
              </h2>

              <p className="text-lg text-[#c9c9c9]">
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
                    "Seleccioná cuántos números querés para el sorteo.",
                },
                {
                  numero: "2",
                  icono: "👤",
                  titulo: "Completá tus datos",
                  texto:
                    "Ingresá tus datos personales para generar tu pedido.",
                },
                {
                  numero: "3",
                  icono: "💳",
                  titulo: "Realizá la transferencia",
                  texto:
                    "Transferí el importe indicado en los datos de tu pedido.",
                },
                {
                  numero: "4",
                  icono: "📸",
                  titulo: "Enviá el comprobante",
                  texto:
                    "Verificamos tu pago y te mandamos los números por email. (REBISAR CASILLA DE SPAM)",
                },
              ].map((paso) => (

                <div
                  key={paso.numero}
                  className="relative bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center text-center pt-12 hover:border-[#e21f26] transition"
                >

                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#e21f26] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {paso.numero}
                  </div>

                  <div className="w-16 h-16 rounded-xl bg-[#1c1c1c] flex items-center justify-center mb-6 border border-[#2a2a2a] text-3xl">
                    {paso.icono}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-4">
                    {paso.titulo}
                  </h3>

                  <p className="text-[#c9c9c9] leading-relaxed">
                    {paso.texto}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>


        {/* PROMOCIONES */}

        <section
          id="pricing"
          className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-20"
        >

          <div className="flex flex-col items-start mb-12">

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2a2a] text-[#ff6259] bg-[#141414] text-sm font-semibold mb-4">
              ⭐ Opciones de Participación
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Seleccioná tus Chances
            </h2>

            <p className="text-lg text-[#c9c9c9] mt-2">
              Elegí el pack que mejor se adapte a vos.
            </p>

          </div>


          <div className="max-w-3xl flex flex-col gap-4">

            {promociones.map((promo) => {

              const seleccionada =
                promocionId === promo.id;

              const esDisponible =
                promo.disponible !== false;

              const esPopular =
                promo.id === "duo";

              const esMejorValor =
                promo.id === "pack5";

              return (

                <label
                  key={promo.id}
                  className={
                    esDisponible
                      ? "cursor-pointer group"
                      : "cursor-not-allowed"
                  }
                >

                  <div
                    className={`w-full rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 relative overflow-hidden ${
                      !esDisponible
                        ? "border border-[#2a2a2a] bg-[#101010] opacity-50"
                        : seleccionada
                        ? "border-[1.5px] border-[#e21f26] bg-gradient-to-r from-[#e21f26]/10 to-transparent shadow-[0_0_20px_rgba(226,31,38,0.15)]"
                        : "border border-[#2a2a2a] bg-[#141414] hover:border-[#e21f26]/50 hover:bg-[#1a1a1a]"
                    }`}
                  >

                    {!esDisponible && (
                      <div className="absolute top-0 right-0 bg-[#1c1c1c] text-[#8a8a8a] font-semibold text-xs px-4 py-1 rounded-bl-lg border-b border-l border-[#2a2a2a]">
                        Próximamente
                      </div>
                    )}

                    {esDisponible && esPopular && (
                      <div className="absolute top-0 right-0 bg-[#e21f26] text-white font-semibold text-xs px-4 py-1 rounded-bl-lg">
                        Más Popular
                      </div>
                    )}

                    {esDisponible && esMejorValor && (
                      <div className="absolute top-0 right-0 bg-[#1c1c1c] text-[#ff6259] font-semibold text-xs px-4 py-1 rounded-bl-lg border-b border-l border-[#2a2a2a]">
                        Mejor Valor
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-4 sm:mt-0">

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          seleccionada
                            ? "border-[#e21f26] bg-[#e21f26]/20"
                            : "border-[#2a2a2a]"
                        }`}
                      >

                        <div
                          className={`w-3 h-3 rounded-full ${
                            seleccionada
                              ? "bg-[#e21f26]"
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

                          {esDisponible &&
                            esMejorValor && (
                              <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-[#2a0f0e] text-[#e21f26] border border-[#e21f26]/30">
                                BONUS
                              </span>
                            )}

                        </span>

                        <span className="text-[#c9c9c9]">
                          para el sorteo
                        </span>

                      </div>

                    </div>


                    <div className="text-2xl font-bold text-[#e21f26] mt-4 sm:mt-0">
                      ${promo.precio.toLocaleString("es-AR")}
                    </div>

                  </div>


                  <input
                    type="radio"
                    name="chance_selection"
                    value={promo.id}
                    checked={seleccionada}
                    disabled={!esDisponible}
                    onChange={() => {

                      if (!esDisponible) return;

                      abrirFormulario(promo.id);

                    }}
                    className="hidden"
                  />

                </label>

              );

            })}


            {!mostrarFormulario && (

              <button
                onClick={() => abrirFormulario()}
                className="mt-4 w-full md:w-fit px-12 py-4 rounded-lg bg-[#e21f26] text-white font-bold text-lg hover:bg-[#b3161c] transition shadow-lg shadow-[#e21f26]/30 flex items-center justify-center gap-2"
              >

                Continuar
                <span>→</span>

              </button>

            )}

          </div>

        </section>

      </main>


      {/* ==========================================
          POPUP DEL FORMULARIO
          ==========================================
          FIX: antes el formulario se insertaba embebido
          en el medio de la página (debajo de las
          promociones) y se hacía scrollIntoView hasta él.
          Ahora es un popup centrado que se abre apenas se
          elige una promoción, sin mover el scroll de la
          página de fondo.
      ========================================== */}

      {mostrarFormulario && (

        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarFormulario(false)}
        >

          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >

            {/* CERRAR */}

            <button
              onClick={() => setMostrarFormulario(false)}
              aria-label="Cerrar"
              className="absolute top-4 right-4 text-[#8a8a8a] hover:text-white text-2xl leading-none transition"
            >
              ✕
            </button>

            <div className="mb-8 pr-8">

              <div className="flex items-center gap-3 mb-2">

                <div className="w-10 h-10 rounded-lg bg-[#e21f26]/10 border border-[#e21f26]/30 flex items-center justify-center">
                  👤
                </div>

                <h3 className="text-2xl font-bold text-white">
                  Completá tus datos
                </h3>

              </div>

              <p className="text-[#c9c9c9]">
                Necesitamos estos datos para generar tu pedido.
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
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white outline-none focus:border-[#e21f26] focus:ring-1 focus:ring-[#e21f26] transition"
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
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white outline-none focus:border-[#e21f26] focus:ring-1 focus:ring-[#e21f26] transition"
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
                  onChange={(e) =>
                    setTelefono(e.target.value)
                  }
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white outline-none focus:border-[#e21f26] focus:ring-1 focus:ring-[#e21f26] transition"
                  placeholder="3364..."
                />

              </div>


              {/* PROMOCIÓN (elegible también acá adentro) */}

              <div>

                <label className="block font-semibold text-white mb-2">
                  Promoción
                </label>

                <div className="grid grid-cols-1 gap-2">

                  {promociones
                    .filter((p) => p.disponible !== false)
                    .map((promo) => {

                      const seleccionada =
                        promocionId === promo.id;

                      return (

                        <button
                          type="button"
                          key={promo.id}
                          onClick={() =>
                            setPromocionId(promo.id)
                          }
                          className={`w-full text-left rounded-lg border px-4 py-3 flex items-center justify-between transition ${
                            seleccionada
                              ? "border-[#e21f26] bg-[#e21f26]/10"
                              : "border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#e21f26]/50"
                          }`}
                        >

                          <span className="text-white font-semibold">

                            {promo.cantidadNumeros}{" "}

                            {promo.cantidadNumeros === 1
                              ? "Chance"
                              : "Chances"}

                          </span>

                          <span className="text-[#e21f26] font-bold">
                            ${promo.precio.toLocaleString("es-AR")}
                          </span>

                        </button>

                      );

                    })}

                </div>

              </div>


              {/* RESUMEN */}

              {promocionId && (

                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-5">

                  <p className="text-sm text-[#8a8a8a] mb-1">
                    Promoción seleccionada
                  </p>

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-white font-bold text-lg">

                        {
                          promociones.find(
                            (p) =>
                              p.id === promocionId
                          )?.cantidadNumeros
                        }{" "}

                        {
                          promociones.find(
                            (p) =>
                              p.id === promocionId
                          )?.cantidadNumeros === 1
                            ? "Chance"
                            : "Chances"
                        }

                      </p>

                    </div>

                    <p className="text-xl font-bold text-[#e21f26]">

                      $

                      {promociones
                        .find(
                          (p) =>
                            p.id === promocionId
                        )
                        ?.precio.toLocaleString(
                          "es-AR"
                        )}

                    </p>

                  </div>

                </div>

              )}


              {/* BOTÓN */}

              <button
                type="submit"
                disabled={procesando}
                className={`w-full px-8 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition ${
                  procesando
                    ? "bg-[#4d1210] text-[#d98f8b] cursor-not-allowed"
                    : "bg-[#e21f26] text-white hover:bg-[#b3161c] shadow-lg shadow-[#e21f26]/30"
                }`}
              >

                {procesando ? (
                  <>
                    <span className="animate-spin">
                      ⏳
                    </span>

                    Creando pedido...
                  </>
                ) : (
                  <>
                    Crear pedido
                    <span>→</span>
                  </>
                )}

              </button>


              <p className="text-center text-xs text-[#8a8a8a]">

                Al continuar vas a ver los datos para hacer la transferencia.
                Tus números se asignan y te llegan por email recién después
                de que verifiquemos el comprobante de pago.

              </p>

            </form>

          </div>

        </div>

      )}


      {/* FOOTER */}

      <footer className="bg-[#000000] border-t border-white/10">

        <div className="max-w-7xl mx-auto px-6 py-14">

          <div className="flex flex-col md:flex-row justify-between gap-10">

            <div className="max-w-sm">

              <div className="flex items-center gap-3 mb-4">

                <img
                  src={logo}
                  alt="Motor Win"
                  className="w-10 h-10 object-contain"
                />

                Motor Win

              </div>

              <p className="text-gray-400 leading-relaxed">

                La plataforma donde la pasión por los autos
                se convierte en oportunidades.

              </p>

            </div>


            <div>

              <h3 className="text-white font-semibold text-lg mb-5">
                Seguinos
              </h3>

              <div className="flex gap-3">

                <a
                  href="mailto:sorteoscaballeros@gmail.com"
                  aria-label="Gmail"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-[#e21f26] hover:text-white hover:border-[#e21f26] transition-all duration-300 hover:-translate-y-1"
                >
                  <FaGoogle size={18} />
                </a>


                <a
                  href="https://www.instagram.com/motorwin_/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-[#e21f26] hover:text-white hover:border-[#e21f26] transition-all duration-300 hover:-translate-y-1"
                >
                  <FaInstagram size={19} />
                </a>


                <a
                  href="https://www.facebook.com/iara.salvatierra.12"
                  aria-label="Facebook"
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:bg-[#e21f26] hover:text-white hover:border-[#e21f26] transition-all duration-300 hover:-translate-y-1"
                >
                  <FaFacebookF size={17} />
                </a>

              </div>

            </div>

          </div>


          <div className="border-t border-white/10 my-10" />


          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Motor Win. Todos los derechos reservados.
            </p>

            

          </div>

        </div>

      </footer>

    </div>
  );
}

export default Sorteo;