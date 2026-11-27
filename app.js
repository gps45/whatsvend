/**
 * ============================================================================
 * WhatsVend - Controlador Principal (app.js)
 * ============================================================================
 * Conecta la vista con las interacciones:
 * - Portada <-> Catálogo.
 * - Scroll dinámico: barra compacta, categoría activa y resumen móvil al bajar.
 * - Modal de producto con reglas de extras y cálculo de precio en vivo.
 * - Modal "Ver más" con carga progresiva al bajar, deslizar de izquierda a
 *   derecha en móvil para volver, y ventana centrada con X o clic afuera en PC.
 * - Modal de carrito con modos de entrega, GPS, propinas y compartir enlace.
 * - Modal de información de WhatsVend con un único botón hacia tu WhatsApp.
 * ============================================================================
 */

(async function iniciarWhatsVend() {
  const slug = resolverSlugTiendaActual();
  const tiendaInfo = TIENDAS_WHATSAPPVEND[slug] || null;
  const datos = await cargarDatosTienda(tiendaInfo);
  const carrito = new GestorCarrito(slug);

  const appEl = document.getElementById('app');
  const modalBackdrop = document.getElementById('wv-modal-backdrop');
  const modalDialog = document.getElementById('wv-modal-dialog');

  // Aplica color principal y tipografía base desde Config
  if (datos.config.color_principal) {
    document.documentElement.style.setProperty(
      '--wv-primario',
      datos.config.color_principal
    );
  }
  if (datos.config.nombre_negocio) {
    document.title = `${datos.config.nombre_negocio} — WhatsVend`;
  }

  let vistaActual = 'catalogo'; // 'portada' | 'catalogo'
  let filtroBusqueda = '';
  let categoriaActiva = '';

  function render() {
    if (vistaActual === 'portada') {
      appEl.innerHTML = renderizarPortada(datos, carrito);
    } else {
      appEl.innerHTML = renderizarCatalogo(
        datos,
        carrito,
        filtroBusqueda,
        categoriaActiva
      );
      actualizarEstadoScroll();
    }
  }

  function actualizarEstadoScroll() {
    if (vistaActual !== 'catalogo') return;
    const sticky = document.getElementById('wv-sticky-header');
    if (!sticky) return;

    const y = window.scrollY || window.pageYOffset || 0;
    if (y > 80) {
      sticky.classList.add('is-compact');
    } else {
      sticky.classList.remove('is-compact');
    }

    if (y > 240) {
      sticky.classList.add('is-scrolled-past-hero');
    } else {
      sticky.classList.remove('is-scrolled-past-hero');
    }

    // Resalta la categoría visible en pantalla
    const bloques = document.querySelectorAll('.wv-seccion-bloque');
    bloques.forEach((bloq) => {
      const rect = bloq.getBoundingClientRect();
      if (rect.top <= 160 && rect.bottom > 160) {
        const idSec = bloq.getAttribute('data-seccion-id');
        if (idSec && idSec !== categoriaActiva) {
          categoriaActiva = idSec;
          document.querySelectorAll('.wv-cat-pill').forEach((pill) => {
            pill.classList.toggle(
              'is-active',
              pill.getAttribute('data-ir-seccion') === idSec
            );
          });
        }
      }
    });
  }

  window.addEventListener('scroll', actualizarEstadoScroll, { passive: true });

  // --------------------------------------------------------------------------
  // GESTIÓN DE MODALES
  // --------------------------------------------------------------------------
  function cerrarModal() {
    modalBackdrop.classList.remove('is-open', 'is-ver-mas-backdrop');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    modalDialog.classList.remove('is-ver-mas');
    modalDialog.style.transform = '';
    modalDialog.innerHTML = '';
  }

  // Cerrar al hacer clic en el fondo oscuro (costados en PC o fuera de la tarjeta)
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      cerrarModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) {
      cerrarModal();
    }
  });

  /**
   * Abre la ventana modal de un producto con sus reglas de extras, cantidad,
   * nota opcional y botón de agregar con texto editable.
   */
  function abrirModalProducto(productoId) {
    const prod = datos.productos.find((p) => p.id === productoId);
    if (!prod) return;

    const moneda = (datos.config.moneda || '$').trim();
    const textoBotonAgregar = (
      datos.config.texto_boton_modal_agregar || 'Agregar al pedido'
    ).trim();
    const permitirNota = esSi(datos.config.permitir_nota_producto, true);

    const extrasProd = datos.extras.filter((e) => e.producto_id === prod.id);
    const grupos = GestorCarrito.agruparReglasProducto(extrasProd);
    const seleccionIds = new Set();
    let cantidad = 1;

    modalDialog.classList.remove('is-ver-mas');
    modalBackdrop.classList.remove('is-ver-mas-backdrop');
    modalBackdrop.classList.add('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'false');

    function calcularPrecioUnitario() {
      let sumaExtras = 0;
      extrasProd.forEach((ex) => {
        if (seleccionIds.has(ex.id)) {
          sumaExtras += aNumero(ex.precio_extra, 0);
        }
      });
      return aNumero(prod.precio, 0) + sumaExtras;
    }

    function dibujarContenidoModal(mensajeError = '') {
      const precioUnit = calcularPrecioUnitario();
      const totalModal = (precioUnit * cantidad).toFixed(2);

      modalDialog.innerHTML = `
        <button type="button" class="wv-modal-cerrar" id="wv-btn-cerrar-modal" aria-label="Cerrar">&times;</button>
        ${
          prod.imagen
            ? `<img src="${escaparHtml(prod.imagen)}" alt="${escaparHtml(prod.nombre)}" style="width:100%; height:210px; object-fit:cover; border-radius:14px; margin-bottom:12px;" />`
            : ''
        }
        <h2 style="margin:0 0 6px;">${escaparHtml(prod.nombre)}</h2>
        ${prod.descripcion ? `<p style="margin:0 0 12px; color:var(--wv-texto-suave); font-size:0.9rem;">${escaparHtml(prod.descripcion)}</p>` : ''}

        ${grupos
          .map((grupo) => {
            const esUnica =
              grupo.max_seleccion === 1 ||
              (grupo.obligatorio && grupo.min_seleccion === 1 && grupo.max_seleccion === 1);
            const tipoInput = esUnica ? 'radio' : 'checkbox';
            const obligEtiqueta = grupo.obligatorio ? ' • Obligatorio' : ' • Opcional';
            const rangoEtiqueta =
              grupo.max_seleccion > 0
                ? ` (mín. ${grupo.min_seleccion}, máx. ${grupo.max_seleccion})`
                : grupo.min_seleccion > 0
                ? ` (mín. ${grupo.min_seleccion})`
                : '';

            return `
              <div class="wv-grupo-extras">
                <div class="wv-grupo-extras-titulo">
                  ${escaparHtml(grupo.regla_titulo)}
                  <span style="font-weight:500; font-size:0.78rem; color:var(--wv-texto-suave);">
                    ${escaparHtml(obligEtiqueta + rangoEtiqueta)}
                  </span>
                </div>
                ${grupo.opciones
                  .map((op) => {
                    const checked = seleccionIds.has(op.id) ? 'checked' : '';
                    const extraNum = aNumero(op.precio_extra, 0);
                    const extraTexto =
                      extraNum > 0 ? `+${moneda}${extraNum.toFixed(2)}` : 'Incluido';
                    return `
                      <label class="wv-opcion-extra-item" style="cursor:pointer;">
                        <span>
                          <input
                            type="${tipoInput}"
                            name="grupo_${escaparHtml(grupo.regla_titulo)}"
                            class="wv-input-extra"
                            data-extra-id="${escaparHtml(op.id)}"
                            data-regla-titulo="${escaparHtml(grupo.regla_titulo)}"
                            data-max-sel="${grupo.max_seleccion}"
                            ${checked}
                          />
                          ${escaparHtml(op.opcion)}
                        </span>
                        <strong style="font-size:0.84rem;">${extraTexto}</strong>
                      </label>
                    `;
                  })
                  .join('')}
              </div>
            `;
          })
          .join('')}

        ${
          permitirNota
            ? `<div style="margin-top:12px;">
                 <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:4px;">Nota especial (opcional)</label>
                 <input
                   type="text"
                   id="wv-nota-producto"
                   class="wv-buscador-input"
                   style="border-radius:10px;"
                   placeholder="Ej. Sin cebolla, bien cocido..."
                 />
               </div>`
            : ''
        }

        <div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px; gap:12px;">
          <div style="display:inline-flex; align-items:center; gap:10px; border:1px solid var(--wv-borde); border-radius:12px; padding:6px 10px;">
            <button type="button" id="wv-cant-menos" style="border:none; background:none; font-size:1.2rem; font-weight:700; cursor:pointer;">-</button>
            <strong id="wv-cant-valor">${cantidad}</strong>
            <button type="button" id="wv-cant-mas" style="border:none; background:none; font-size:1.2rem; font-weight:700; cursor:pointer;">+</button>
          </div>

          <button type="button" id="wv-btn-confirmar-producto" class="wv-btn-primario" style="flex:1;">
            <span>${escaparHtml(textoBotonAgregar)}</span>
            <span>${moneda}${totalModal}</span>
          </button>
        </div>

        ${
          mensajeError
            ? `<p style="color:#dc2626; font-size:0.84rem; font-weight:600; margin:10px 0 0;">${escaparHtml(mensajeError)}</p>`
            : ''
        }
      `;

      document
        .getElementById('wv-btn-cerrar-modal')
        .addEventListener('click', cerrarModal);

      document.getElementById('wv-cant-menos').addEventListener('click', () => {
        if (cantidad > 1) {
          cantidad--;
          dibujarContenidoModal();
        }
      });

      document.getElementById('wv-cant-mas').addEventListener('click', () => {
        cantidad++;
        dibujarContenidoModal();
      });

      modalDialog.querySelectorAll('.wv-input-extra').forEach((input) => {
        input.addEventListener('change', () => {
          const exId = input.getAttribute('data-extra-id');
          const regla = input.getAttribute('data-regla-titulo');
          const maxSel = parseInt(input.getAttribute('data-max-sel') || '0', 10);

          if (input.type === 'radio') {
            // Quita otras opciones del mismo grupo
            extrasProd
              .filter((e) => (e.regla_titulo || 'Opciones').trim() === regla)
              .forEach((e) => seleccionIds.delete(e.id));
            if (input.checked) seleccionIds.add(exId);
          } else {
            if (input.checked) {
              if (maxSel > 0) {
                const marcadasEnRegla = extrasProd.filter(
                  (e) =>
                    (e.regla_titulo || 'Opciones').trim() === regla &&
                    seleccionIds.has(e.id)
                ).length;
                if (marcadasEnRegla >= maxSel) {
                  input.checked = false;
                  dibujarContenidoModal(
                    `Solo puedes elegir máximo ${maxSel} opción(es) en "${regla}".`
                  );
                  return;
                }
              }
              seleccionIds.add(exId);
            } else {
              seleccionIds.delete(exId);
            }
          }
          dibujarContenidoModal();
        });
      });

      document
        .getElementById('wv-btn-confirmar-producto')
        .addEventListener('click', () => {
          const validacion = GestorCarrito.validarSelecciones(
            grupos,
            seleccionIds
          );
          if (!validacion.valido) {
            dibujarContenidoModal(validacion.mensaje);
            return;
          }

          const notaInput = document.getElementById('wv-nota-producto');
          const notaVal = notaInput ? notaInput.value : '';
          const extrasElegidos = extrasProd.filter((e) => seleccionIds.has(e.id));

          carrito.agregarItem(prod, cantidad, extrasElegidos, notaVal);
          cerrarModal();
          render();
        });
    }

    dibujarContenidoModal();
  }

  /**
   * Modal "Ver más" de una categoría:
   * - Carga progresiva al hacer scroll hacia abajo.
   * - En móvil: pantalla completa con gesto de deslizar de izquierda a derecha para volver.
   * - En PC: ventana más compacta centrada con botón X o clic en los costados.
   */
  function abrirModalVerMasCategoria(seccionId) {
    const sec = datos.secciones.find((s) => s.id === seccionId);
    if (!sec) return;

    const productosCat = datos.productos.filter(
      (p) => p.seccion_id === seccionId && esSi(p.disponible, true)
    );
    const estilo =
      (sec.estilo_modulo || 'cuadricula').toLowerCase() === 'lista'
        ? 'lista'
        : 'cuadricula';

    let cargados = Math.min(12, productosCat.length);

    modalDialog.classList.add('is-ver-mas');
    modalBackdrop.classList.add('is-open', 'is-ver-mas-backdrop');
    modalBackdrop.setAttribute('aria-hidden', 'false');

    function pintarListaVerMas() {
      const lote = productosCat.slice(0, cargados);
      const cardsHtml = lote
        .map((prod) => {
          const exProd = datos.extras.filter((e) => e.producto_id === prod.id);
          const tpl = renderizarTarjetaProducto(prod, datos.config, exProd);
          return estilo === 'lista' ? tpl.lista : tpl.cuadricula;
        })
        .join('');

      modalDialog.innerHTML = `
        <button type="button" class="wv-modal-cerrar" id="wv-cerrar-ver-mas" aria-label="Cerrar">&times;</button>
        <div style="font-size:0.75rem; color:var(--wv-texto-suave); margin-bottom:6px;">
          Desliza a la derecha en móvil o usa X / clic afuera para volver
        </div>
        <h2 style="margin:0 0 14px;">${escaparHtml(sec.titulo)} (${productosCat.length})</h2>
        <div class="${estilo === 'lista' ? 'wv-lista-productos' : 'wv-grid-productos'}">
          ${cardsHtml}
        </div>
        <div id="wv-ver-mas-estado" style="text-align:center; padding:16px; color:var(--wv-texto-suave); font-size:0.85rem;">
          ${
            cargados < productosCat.length
              ? 'Desplázate hacia abajo para cargar más productos...'
              : 'Mostrando todos los productos de esta categoría.'
          }
        </div>
      `;

      document
        .getElementById('wv-cerrar-ver-mas')
        .addEventListener('click', cerrarModal);

      // Enlaza clics en productos dentro del modal "Ver más"
      modalDialog.querySelectorAll('[data-abrir-producto]').forEach((el) => {
        el.addEventListener('click', () => {
          const idP = el.getAttribute('data-abrir-producto');
          abrirModalProducto(idP);
        });
      });

      modalDialog.querySelectorAll('[data-boton-producto]').forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const idP = btn.getAttribute('data-boton-producto');
          const tieneExtras = btn.getAttribute('data-tiene-extras') === '1';
          const prodObj = datos.productos.find((p) => p.id === idP);
          if (!prodObj) return;
          if (tieneExtras) {
            abrirModalProducto(idP);
          } else {
            carrito.agregarItem(prodObj, 1, [], '');
            render();
            pintarListaVerMas();
          }
        });
      });
    }

    pintarListaVerMas();

    // Carga progresiva al hacer scroll dentro del modal
    modalDialog.onscroll = () => {
      if (cargados >= productosCat.length) return;
      const cercaDelFinal =
        modalDialog.scrollTop + modalDialog.clientHeight >=
        modalDialog.scrollHeight - 120;
      if (cercaDelFinal) {
        cargados = Math.min(productosCat.length, cargados + 8);
        pintarListaVerMas();
      }
    };

    // Gesto táctil: deslizar de izquierda a derecha en móvil para regresar
    let inicioX = 0;
    let inicioY = 0;

    modalDialog.ontouchstart = (e) => {
      if (window.innerWidth >= 768) return;
      inicioX = e.touches[0].clientX;
      inicioY = e.touches[0].clientY;
    };

    modalDialog.ontouchmove = (e) => {
      if (window.innerWidth >= 768) return;
      const dx = e.touches[0].clientX - inicioX;
      const dy = e.touches[0].clientY - inicioY;
      if (dx > 25 && Math.abs(dx) > Math.abs(dy)) {
        modalDialog.style.transform = `translateX(${Math.min(dx, 140)}px)`;
      }
    };

    modalDialog.ontouchend = (e) => {
      if (window.innerWidth >= 768) return;
      const dx = e.changedTouches[0].clientX - inicioX;
      const dy = e.changedTouches[0].clientY - inicioY;
      modalDialog.style.transform = '';
      if (dx > 90 && Math.abs(dx) > Math.abs(dy)) {
        cerrarModal();
      }
    };
  }

  /**
   * Modal del Carrito / Checkout con modos de entrega, GPS, propinas y compartir.
   */
  function abrirModalCarrito() {
    const cfg = datos.config;
    const moneda = (cfg.moneda || '$').trim();
    const porcentajes = (cfg.propina_porcentajes || '0,5,10,15')
      .split(',')
      .map((p) => aNumero(p, 0))
      .filter((v, idx, arr) => !Number.isNaN(v) && arr.indexOf(v) === idx);

    modalDialog.classList.remove('is-ver-mas');
    modalBackdrop.classList.remove('is-ver-mas-backdrop');
    modalBackdrop.classList.add('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'false');

    function dibujarCarrito() {
      const itemsHtml =
        carrito.estado.items.length === 0
          ? `<p style="color:var(--wv-texto-suave); text-align:center; padding:20px 0;">Tu carrito está vacío.</p>`
          : carrito.estado.items
              .map(
                (it) => `
              <div style="border-bottom:1px solid var(--wv-borde); padding:10px 0; display:flex; justify-content:space-between; gap:10px;">
                <div>
                  <div style="font-weight:700;">${escaparHtml(it.nombre)}</div>
                  ${
                    it.extras && it.extras.length > 0
                      ? `<div style="font-size:0.78rem; color:var(--wv-texto-suave);">${escaparHtml(it.extras.map((e) => e.opcion).join(', '))}</div>`
                      : ''
                  }
                  ${it.nota ? `<div style="font-size:0.78rem; color:#2563eb;">Nota: ${escaparHtml(it.nota)}</div>` : ''}
                  <div style="font-weight:700; margin-top:4px;">${moneda}${(it.precioUnitario * it.cantidad).toFixed(2)}</div>
                </div>
                <div style="display:inline-flex; align-items:center; gap:8px; height:32px; border:1px solid var(--wv-borde); border-radius:8px; padding:0 6px;">
                  <button type="button" class="wv-item-delta" data-uid="${it.uid}" data-delta="-1" style="border:none; background:none; font-weight:700; cursor:pointer;">-</button>
                  <span>${it.cantidad}</span>
                  <button type="button" class="wv-item-delta" data-uid="${it.uid}" data-delta="1" style="border:none; background:none; font-weight:700; cursor:pointer;">+</button>
                </div>
              </div>
            `
              )
              .join('');

      const modosDisponibles = [];
      if (esSi(cfg.modo_domicilio, true)) modosDisponibles.push({ id: 'domicilio', label: 'A domicilio' });
      if (esSi(cfg.modo_retiro, true)) modosDisponibles.push({ id: 'retiro', label: 'Retiro en local' });
      if (esSi(cfg.modo_mesa, true)) modosDisponibles.push({ id: 'mesa', label: 'En mesa' });

      if (
        modosDisponibles.length > 0 &&
        !modosDisponibles.some((m) => m.id === carrito.estado.modoEntrega)
      ) {
        carrito.estado.modoEntrega = modosDisponibles[0].id;
      }

      const gpsActiva = Boolean(carrito.estado.gpsCoords);

      modalDialog.innerHTML = `
        <button type="button" class="wv-modal-cerrar" id="wv-cerrar-carrito" aria-label="Cerrar">&times;</button>
        <h2 style="margin:0 0 12px;">Tu pedido</h2>
        <div>${itemsHtml}</div>

        ${
          carrito.estado.items.length > 0
            ? `
          <div style="margin-top:14px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:6px;">Modo de entrega</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${modosDisponibles
                .map(
                  (m) => `
                <button
                  type="button"
                  class="wv-cat-pill wv-modo-btn ${carrito.estado.modoEntrega === m.id ? 'is-active' : ''}"
                  data-modo="${m.id}"
                >
                  ${m.label}
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          ${
            carrito.estado.modoEntrega === 'domicilio'
              ? `
            <div style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
              <input type="text" id="wv-cli-nombre" class="wv-buscador-input" style="border-radius:10px;" placeholder="Tu nombre" value="${escaparHtml(carrito.estado.clienteNombre)}" />
              <input type="tel" id="wv-cli-tel" class="wv-buscador-input" style="border-radius:10px;" placeholder="Tu teléfono / WhatsApp" value="${escaparHtml(carrito.estado.clienteTelefono)}" />
              <input type="text" id="wv-cli-dir" class="wv-buscador-input" style="border-radius:10px;" placeholder="Dirección de entrega" value="${escaparHtml(carrito.estado.direccion)}" />
              <button
                type="button"
                id="wv-btn-gps"
                class="wv-btn-secundario"
                style="background:${gpsActiva ? '#dcfce7' : 'var(--wv-superficie)'}; border-color:${gpsActiva ? '#16a34a' : 'var(--wv-borde)'}; color:${gpsActiva ? '#166534' : 'var(--wv-texto)'};"
              >
                ${gpsActiva ? '📍 Ubicación GPS adjunta' : '📍 Compartir mi ubicación GPS'}
              </button>
            </div>
          `
              : carrito.estado.modoEntrega === 'retiro'
              ? `
            <div style="margin-top:12px; background:var(--wv-superficie); padding:10px 12px; border-radius:10px; font-size:0.86rem;">
              ${escaparHtml(cfg.mensaje_retiro || 'Te esperamos en el local.')}
              <input type="text" id="wv-cli-nombre" class="wv-buscador-input" style="border-radius:10px; margin-top:8px;" placeholder="Nombre de quien retira" value="${escaparHtml(carrito.estado.clienteNombre)}" />
            </div>
          `
              : `
            <div style="margin-top:12px;">
              <input type="text" id="wv-cli-mesa" class="wv-buscador-input" style="border-radius:10px;" placeholder="Número de mesa" value="${escaparHtml(carrito.estado.mesaNumero)}" />
            </div>
          `
          }

          ${
            esSi(cfg.propina_activa, true)
              ? `
            <div style="margin-top:14px;">
              <div style="font-weight:700; font-size:0.88rem; margin-bottom:6px;">Propina</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${porcentajes
                  .map(
                    (pct) => `
                  <button
                    type="button"
                    class="wv-cat-pill wv-propina-btn ${aNumero(carrito.estado.porcentajePropina, 0) === pct ? 'is-active' : ''}"
                    data-pct="${pct}"
                  >
                    ${pct === 0 ? 'Sin propina' : `${pct}%`}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }

          <div style="margin-top:16px; border-top:1px solid var(--wv-borde); padding-top:12px; font-size:0.92rem;">
            <div style="display:flex; justify-content:space-between;">
              <span>Subtotal</span>
              <strong>${moneda}${carrito.obtenerSubtotal().toFixed(2)}</strong>
            </div>
            ${
              carrito.obtenerMontoPropina() > 0
                ? `<div style="display:flex; justify-content:space-between; margin-top:4px;">
                     <span>Propina (${carrito.estado.porcentajePropina}%)</span>
                     <strong>${moneda}${carrito.obtenerMontoPropina().toFixed(2)}</strong>
                   </div>`
                : ''
            }
            <div style="display:flex; justify-content:space-between; font-size:1.08rem; margin-top:6px;">
              <strong>Total</strong>
              <strong>${moneda}${carrito.obtenerTotalFinal().toFixed(2)}</strong>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
            <a
              id="wv-enviar-whatsapp"
              href="${carrito.construirUrlWhatsApp(cfg)}"
              target="_blank"
              rel="noopener noreferrer"
              class="wv-btn-primario"
              style="text-decoration:none; width:100%;"
            >
              Enviar pedido por WhatsApp
            </a>

            ${
              esSi(cfg.compartir_carrito_activo, true)
                ? `<button type="button" id="wv-compartir-link" class="wv-btn-secundario" style="width:100%;">
                     🔗 Copiar enlace del carrito para compartir
                   </button>`
                : ''
            }
          </div>
        `
            : ''
        }
      `;

      document
        .getElementById('wv-cerrar-carrito')
        .addEventListener('click', cerrarModal);

      modalDialog.querySelectorAll('.wv-item-delta').forEach((btn) => {
        btn.addEventListener('click', () => {
          const uid = btn.getAttribute('data-uid');
          const delta = parseInt(btn.getAttribute('data-delta'), 10);
          carrito.cambiarCantidad(uid, delta);
          render();
          dibujarCarrito();
        });
      });

      modalDialog.querySelectorAll('.wv-modo-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          carrito.estado.modoEntrega = btn.getAttribute('data-modo');
          carrito.guardarEnStorage();
          dibujarCarrito();
        });
      });

      modalDialog.querySelectorAll('.wv-propina-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          carrito.estado.porcentajePropina = aNumero(btn.getAttribute('data-pct'), 0);
          carrito.guardarEnStorage();
          dibujarCarrito();
        });
      });

      const inpNombre = document.getElementById('wv-cli-nombre');
      if (inpNombre) {
        inpNombre.addEventListener('input', () => {
          carrito.estado.clienteNombre = inpNombre.value;
          carrito.guardarEnStorage();
          const linkWa = document.getElementById('wv-enviar-whatsapp');
          if (linkWa) linkWa.href = carrito.construirUrlWhatsApp(cfg);
        });
      }

      const inpTel = document.getElementById('wv-cli-tel');
      if (inpTel) {
        inpTel.addEventListener('input', () => {
          carrito.estado.clienteTelefono = inpTel.value;
          carrito.guardarEnStorage();
          const linkWa = document.getElementById('wv-enviar-whatsapp');
          if (linkWa) linkWa.href = carrito.construirUrlWhatsApp(cfg);
        });
      }

      const inpDir = document.getElementById('wv-cli-dir');
      if (inpDir) {
        inpDir.addEventListener('input', () => {
          carrito.estado.direccion = inpDir.value;
          carrito.guardarEnStorage();
          const linkWa = document.getElementById('wv-enviar-whatsapp');
          if (linkWa) linkWa.href = carrito.construirUrlWhatsApp(cfg);
        });
      }

      const inpMesa = document.getElementById('wv-cli-mesa');
      if (inpMesa) {
        inpMesa.addEventListener('input', () => {
          carrito.estado.mesaNumero = inpMesa.value;
          carrito.guardarEnStorage();
          const linkWa = document.getElementById('wv-enviar-whatsapp');
          if (linkWa) linkWa.href = carrito.construirUrlWhatsApp(cfg);
        });
      }

      const btnGps = document.getElementById('wv-btn-gps');
      if (btnGps) {
        btnGps.addEventListener('click', () => {
          if (!navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización GPS.');
            return;
          }
          btnGps.textContent = 'Obteniendo ubicación...';
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              carrito.estado.gpsCoords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
              };
              carrito.guardarEnStorage();
              dibujarCarrito();
            },
            () => {
              btnGps.textContent = '📍 No se pudo obtener GPS (intenta de nuevo)';
            }
          );
        });
      }

      const btnCompartir = document.getElementById('wv-compartir-link');
      if (btnCompartir) {
        btnCompartir.addEventListener('click', async () => {
          const link = carrito.generarEnlaceCompartible();
          try {
            await navigator.clipboard.writeText(link);
            btnCompartir.textContent = '✅ Enlace copiado al portapapeles';
          } catch (_) {
            prompt('Copia este enlace para compartir el carrito:', link);
          }
        });
      }
    }

    dibujarCarrito();
  }

  /**
   * Modal de información del creador ("Desarrollado por WhatsVend") con un
   * único botón de WhatsApp para contratar el servicio.
   */
  function abrirModalWhatsVendInfo() {
    const info = WHATSAPP_CREADOR_CONFIG;
    const urlWaCreador = `https://wa.me/${(info.whatsappNumero || '').replace(
      /[^0-9]/g,
      ''
    )}?text=${encodeURIComponent(info.mensajePredeterminado || '')}`;

    modalDialog.classList.remove('is-ver-mas');
    modalBackdrop.classList.remove('is-ver-mas-backdrop');
    modalBackdrop.classList.add('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'false');

    modalDialog.innerHTML = `
      <button type="button" class="wv-modal-cerrar" id="wv-cerrar-wv-info" aria-label="Cerrar">&times;</button>
      <div class="wv-footer-logo-box" style="width:64px; height:48px; font-size:1.25rem; margin-bottom:12px;">WV</div>
      <div style="display:inline-block; background:#ffedd5; color:#9a3412; font-size:0.72rem; font-weight:800; padding:5px 10px; border-radius:8px; letter-spacing:0.04em;">
        ${escaparHtml(info.etiquetaSuperior)}
      </div>
      <h2 style="margin:10px 0 8px; font-size:1.55rem; line-height:1.15;">
        ${escaparHtml(info.titulo)}
      </h2>
      <p style="margin:0; color:var(--wv-texto-suave); font-size:0.92rem; line-height:1.45;">
        ${escaparHtml(info.descripcion)}
      </p>

      <div class="wv-whatsvend-pills">
        ${(info.beneficios || [])
          .map((b) => `<span class="wv-whatsvend-pill">${escaparHtml(b)}</span>`)
          .join('')}
      </div>

      <a
        href="${urlWaCreador}"
        target="_blank"
        rel="noopener noreferrer"
        class="wv-btn-whatsapp-creador"
        style="text-decoration:none;"
      >
        <span>💬 ${escaparHtml(info.textoBotonWhatsapp || 'WhatsApp')}</span>
      </a>
    `;

    document
      .getElementById('wv-cerrar-wv-info')
      .addEventListener('click', cerrarModal);
  }

  // --------------------------------------------------------------------------
  // DELEGACIÓN DE EVENTOS EN LA VISTA PRINCIPAL
  // --------------------------------------------------------------------------
  appEl.addEventListener('click', (e) => {
    const accionEl = e.target.closest('[data-accion]');
    if (accionEl) {
      const accion = accionEl.getAttribute('data-accion');
      if (accion === 'ir-catalogo') {
        vistaActual = 'catalogo';
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (accion === 'abrir-carrito') {
        abrirModalCarrito();
        return;
      }
      if (accion === 'toggle-buscador-movil') {
        const drawer = document.getElementById('wv-buscador-movil-drawer');
        if (drawer) drawer.classList.toggle('is-open');
        return;
      }
      if (accion === 'abrir-whatsvend-info') {
        abrirModalWhatsVendInfo();
        return;
      }
    }

    const catBtn = e.target.closest('[data-ir-seccion]');
    if (catBtn) {
      const idSec = catBtn.getAttribute('data-ir-seccion');
      categoriaActiva = idSec;
      const destino = document.getElementById(`sec-${idSec}`);
      if (destino) {
        destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const verMasBtn = e.target.closest('[data-abrir-ver-mas]');
    if (verMasBtn) {
      const idSec = verMasBtn.getAttribute('data-abrir-ver-mas');
      abrirModalVerMasCategoria(idSec);
      return;
    }

    const btnProd = e.target.closest('[data-boton-producto]');
    if (btnProd) {
      e.stopPropagation();
      const idProd = btnProd.getAttribute('data-boton-producto');
      const tieneExtras = btnProd.getAttribute('data-tiene-extras') === '1';
      const prodObj = datos.productos.find((p) => p.id === idProd);
      if (!prodObj) return;

      if (tieneExtras) {
        abrirModalProducto(idProd);
      } else {
        carrito.agregarItem(prodObj, 1, [], '');
        render();
      }
      return;
    }

    const abrirProdEl = e.target.closest('[data-abrir-producto]');
    if (abrirProdEl) {
      const idProd = abrirProdEl.getAttribute('data-abrir-producto');
      abrirModalProducto(idProd);
      return;
    }

    const ctaEl = e.target.closest('[data-cta-destino]');
    if (ctaEl) {
      const destino = ctaEl.getAttribute('data-cta-destino');
      const esInterno = ctaEl.getAttribute('data-cta-interno') === '1';
      if (!destino) return;
      if (esInterno) {
        const objetivo = document.querySelector(destino);
        if (objetivo) objetivo.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.open(destino, '_blank', 'noopener,noreferrer');
      }
    }
  });

  appEl.addEventListener('input', (e) => {
    if (e.target.classList.contains('wv-input-buscar')) {
      filtroBusqueda = e.target.value;
      const cursorPos = e.target.selectionStart;
      const estabaEnMovil = document
        .getElementById('wv-buscador-movil-drawer')
        ?.classList.contains('is-open');

      render();

      if (estabaEnMovil) {
        const drawer = document.getElementById('wv-buscador-movil-drawer');
        if (drawer) drawer.classList.add('is-open');
      }

      // Mantiene el foco y posición del cursor tras re-renderizar
      const inputs = Array.from(document.querySelectorAll('.wv-input-buscar'));
      const inputVisible = inputs.find((el) => el.offsetParent !== null);
      if (inputVisible) {
        inputVisible.focus();
        if (typeof cursorPos === 'number') {
          inputVisible.setSelectionRange(cursorPos, cursorPos);
        }
      }
    }
  });

  render();
})();
