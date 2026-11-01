// =====================================================================
// registro.js - registro diario, hormonas y calendario
// Los datos se guardan SOLO en este dispositivo (localStorage), separados
// por cuenta. Nada de esto se envía a Firebase.
//
// Estructura guardada:
//   transness:<uid>:registros     { "2026-11-01": { sel, hormonas, notas } }
//   transness:<uid>:tratamientos  [ { id, nombre, dosis, via, frecuencia } ]
//   transness:<uid>:ajustes       { ocultas: [ids de categorías] }
// =====================================================================
(function (T) {
    'use strict';

    const { el, icono, aISO, hoyISO, fechaLarga, mesAnio, horaActual } = T.util;

    const PREFIJO = 'transness';

    // ¿Se pueden añadir o editar registros de días anteriores?
    // false = los días pasados solo se ven; solo se añade en la fecha actual.
    const PERMITIR_EDITAR_DIAS_PASADOS = false;

    const estado = { uid: null, registros: {}, tratamientos: [], ajustes: { ocultas: [] } };
    const cal = { mes: null, seleccionado: null };

    // -----------------------------------------------------------------
    // Almacén local
    // -----------------------------------------------------------------
    function clave(uid, nombre) {
        return `${PREFIJO}:${uid}:${nombre}`;
    }

    function leer(uid, nombre, defecto) {
        try {
            const texto = localStorage.getItem(clave(uid, nombre));
            return texto ? JSON.parse(texto) : defecto;
        } catch (error) {
            console.error('No se pudo leer', nombre, error);
            return defecto;
        }
    }

    function escribir(nombre, valor) {
        if (!estado.uid) return false;
        try {
            localStorage.setItem(clave(estado.uid, nombre), JSON.stringify(valor));
            return true;
        } catch (error) {
            console.error('No se pudo guardar', nombre, error);
            return false;
        }
    }

    function marcarEstado(ok) {
        document.querySelectorAll('[data-estado-guardado]').forEach((p) => {
            p.textContent = ok
                ? 'Se guarda automáticamente en este dispositivo.'
                : 'No se pudo guardar en este dispositivo. Revisa el espacio o los permisos del navegador.';
            p.classList.toggle('nota-error', !ok);
        });
        return ok;
    }

    function iniciar(uid) {
        estado.uid = uid;
        estado.registros = leer(uid, 'registros', {});
        estado.tratamientos = leer(uid, 'tratamientos', []);
        const ajustes = leer(uid, 'ajustes', {});
        estado.ajustes = { ocultas: Array.isArray(ajustes.ocultas) ? ajustes.ocultas : [] };
        const ahora = new Date();
        cal.mes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        cal.seleccionado = hoyISO();
    }

    function limpiar() {
        estado.uid = null;
        estado.registros = {};
        estado.tratamientos = [];
        estado.ajustes = { ocultas: [] };
    }

    function borrarDatosLocales(uid) {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(`${PREFIJO}:${uid}:`))
            .forEach((k) => localStorage.removeItem(k));
    }

    function exportar() {
        return {
            app: 'transness',
            version: 1,
            exportado: new Date().toISOString(),
            registros: estado.registros,
            tratamientos: estado.tratamientos,
            ajustes: estado.ajustes
        };
    }

    // -----------------------------------------------------------------
    // Días
    // -----------------------------------------------------------------
    function obtenerDia(iso) {
        const d = estado.registros[iso];
        if (!d) return { sel: {}, hormonas: {}, notas: '' };
        return { sel: d.sel || {}, hormonas: d.hormonas || {}, notas: d.notas || '' };
    }

    function haySeleccion(dia) {
        return Object.values(dia.sel).some((lista) => Array.isArray(lista) && lista.length > 0);
    }

    function tieneContenido(dia) {
        return haySeleccion(dia) || Object.keys(dia.hormonas).length > 0 || dia.notas.trim() !== '';
    }

    function guardarDia(iso, dia) {
        // Se guarda una copia sin categorías vacías; el objeto "dia" del editor no se toca
        // (sus listas siguen enlazadas a los botones de la pantalla).
        const limpio = { sel: {}, hormonas: dia.hormonas, notas: dia.notas };
        Object.entries(dia.sel).forEach(([cat, lista]) => {
            if (lista.length) limpio.sel[cat] = lista;
        });
        if (tieneContenido(limpio)) estado.registros[iso] = limpio;
        else delete estado.registros[iso];
        return marcarEstado(escribir('registros', estado.registros));
    }

    function infoDia(iso) {
        const d = estado.registros[iso];
        if (!d) return { registro: false, hormona: false };
        const dia = obtenerDia(iso);
        return {
            registro: haySeleccion(dia) || dia.notas.trim() !== '',
            hormona: Object.keys(dia.hormonas).length > 0
        };
    }

    // -----------------------------------------------------------------
    // Editor del día (bloques desplegables)
    // -----------------------------------------------------------------
    function crearBloque(titulo, contenido, abierto) {
        const contador = el('span', { class: 'bloque-contador' });
        const resumen = el('summary', {}, el('span', { class: 'bloque-titulo', text: titulo }), contador);
        const det = el('details', { class: 'bloque', open: abierto }, resumen, contenido);
        return {
            det,
            actualizar(n) { contador.textContent = n > 0 ? String(n) : ''; }
        };
    }

    function bloqueCategoria(cat, dia, guardar) {
        const seleccion = dia.sel[cat.id] = dia.sel[cat.id] || [];
        const caja = el('div', { class: 'chips' });
        let bloque = null;

        const botones = cat.opciones.map((op) => {
            const boton = el('button', {
                type: 'button',
                class: 'chip',
                'aria-pressed': String(seleccion.includes(op.id))
            }, op.nombre);

            boton.addEventListener('click', () => {
                const i = seleccion.indexOf(op.id);
                if (i >= 0) {
                    seleccion.splice(i, 1);
                } else {
                    if (cat.unica) seleccion.length = 0;
                    seleccion.push(op.id);
                }
                botones.forEach((b, k) => {
                    b.setAttribute('aria-pressed', String(seleccion.includes(cat.opciones[k].id)));
                });
                bloque.actualizar(seleccion.length);
                guardar();
            });
            caja.append(boton);
            return boton;
        });

        bloque = crearBloque(cat.nombre, caja, seleccion.length > 0);
        bloque.actualizar(seleccion.length);
        return bloque.det;
    }

    function crearSelect(mapa, etiqueta) {
        const select = el('select', { class: 'custom-select', 'aria-label': etiqueta });
        Object.entries(mapa).forEach(([valor, nombre]) => select.append(el('option', { value: valor, text: nombre })));
        return select;
    }

    function bloqueHormonas(dia, guardar) {
        const cont = el('div', { class: 'hormonas' });
        const bloque = crearBloque('Hormonas', cont, true);

        function pintar() {
            cont.replaceChildren(
                el('p', { class: 'nota', text: 'Anota lo que te ha pautado tu profesional sanitario. Transness no da recomendaciones de dosis.' })
            );

            if (estado.tratamientos.length === 0) {
                cont.append(el('p', { class: 'vacio', text: 'Aún no has añadido ningún tratamiento.' }));
            }
            estado.tratamientos.forEach((t) => cont.append(filaTratamiento(t)));

            // Tomas de tratamientos que ya no están en la lista (se conservan en el historial)
            Object.entries(dia.hormonas)
                .filter(([id]) => !estado.tratamientos.some((t) => t.id === id))
                .forEach(([id, toma]) => cont.append(filaHuerfana(id, toma)));

            cont.append(zonaNuevoTratamiento());
            bloque.actualizar(Object.keys(dia.hormonas).length);
        }

        function filaTratamiento(t) {
            const toma = dia.hormonas[t.id];
            const detalle = [t.dosis, T.catalogo.vias[t.via], T.catalogo.frecuencias[t.frecuencia]]
                .filter(Boolean).join(' · ');

            const btnToma = el('button', {
                type: 'button',
                class: 'btn-toma',
                'aria-pressed': String(Boolean(toma))
            }, icono('check'), toma ? 'Tomada' : 'Marcar toma');

            btnToma.addEventListener('click', () => {
                if (dia.hormonas[t.id]) {
                    delete dia.hormonas[t.id];
                } else {
                    dia.hormonas[t.id] = { hora: horaActual(), nombre: t.nombre, dosis: t.dosis, via: t.via };
                }
                guardar();
                pintar();
            });

            const btnQuitar = el('button', {
                type: 'button',
                class: 'btn-icono',
                'aria-label': `Quitar ${t.nombre} de mis tratamientos`
            }, icono('trash'));

            btnQuitar.addEventListener('click', () => {
                if (!confirm(`¿Quitar "${t.nombre}" de tus tratamientos? Las tomas ya registradas se conservan.`)) return;
                estado.tratamientos = estado.tratamientos.filter((x) => x.id !== t.id);
                escribir('tratamientos', estado.tratamientos);
                pintar();
            });

            const acciones = el('div', { class: 'fila-trat-acciones' });
            if (toma) {
                const hora = el('input', { type: 'time', class: 'input-hora', value: toma.hora, 'aria-label': 'Hora de la toma' });
                hora.addEventListener('change', () => {
                    if (!hora.value) return;
                    dia.hormonas[t.id].hora = hora.value;
                    guardar();
                });
                acciones.append(hora);
            }
            acciones.append(btnToma, btnQuitar);

            return el('div', { class: 'fila-trat' },
                el('div', { class: 'fila-trat-info' },
                    el('strong', { text: t.nombre }),
                    el('span', { text: detalle })),
                acciones);
        }

        function filaHuerfana(id, toma) {
            const btn = el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Borrar esta toma' }, icono('trash'));
            btn.addEventListener('click', () => { delete dia.hormonas[id]; guardar(); pintar(); });
            return el('div', { class: 'fila-trat' },
                el('div', { class: 'fila-trat-info' },
                    el('strong', { text: toma.nombre || 'Tratamiento' }),
                    el('span', { text: `Tomada · ${toma.hora || ''}` })),
                el('div', { class: 'fila-trat-acciones' }, btn));
        }

        function zonaNuevoTratamiento() {
            const zona = el('div', { class: 'form-trat' });
            const abrir = el('button', { type: 'button', class: 'btn-texto' }, icono('plus'), 'Añadir tratamiento');
            abrir.addEventListener('click', () => zona.replaceChildren(formulario(zona)));
            zona.append(abrir);
            return zona;
        }

        function formulario(zona) {
            const nombre = el('input', { type: 'text', maxlength: '60', placeholder: 'Nombre (como en tu receta)', 'aria-label': 'Nombre del tratamiento' });
            const dosis = el('input', { type: 'text', maxlength: '40', placeholder: 'Dosis (opcional)', 'aria-label': 'Dosis' });
            const via = crearSelect(T.catalogo.vias, 'Vía de administración');
            const frecuencia = crearSelect(T.catalogo.frecuencias, 'Frecuencia');
            const error = el('p', { class: 'mensaje-error', role: 'alert', hidden: true });
            const btnGuardar = el('button', { type: 'button', class: 'btn-sign-in btn-compacto' }, 'Guardar tratamiento');
            const btnCancelar = el('button', { type: 'button', class: 'btn-texto' }, 'Cancelar');

            btnCancelar.addEventListener('click', pintar);
            btnGuardar.addEventListener('click', () => {
                const n = nombre.value.trim();
                if (!n) {
                    error.textContent = 'Escribe el nombre del tratamiento.';
                    error.hidden = false;
                    return;
                }
                estado.tratamientos.push({
                    id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
                    nombre: n,
                    dosis: dosis.value.trim(),
                    via: via.value,
                    frecuencia: frecuencia.value
                });
                escribir('tratamientos', estado.tratamientos);
                pintar();
            });

            return el('div', { class: 'form-trat-campos' },
                nombre, dosis, via, frecuencia, error,
                el('div', { class: 'form-trat-botones' }, btnGuardar, btnCancelar));
        }

        pintar();
        return bloque.det;
    }

    function bloqueNotas(dia, guardar) {
        const area = el('textarea', {
            class: 'notas',
            rows: '4',
            maxlength: '2000',
            placeholder: 'Cómo te has sentido, qué has notado…',
            'aria-label': 'Notas del día'
        });
        area.value = dia.notas;

        let temporizador = null;
        area.addEventListener('input', () => {
            dia.notas = area.value;
            clearTimeout(temporizador);
            temporizador = setTimeout(guardar, 400);
        });
        area.addEventListener('blur', () => {
            clearTimeout(temporizador);
            dia.notas = area.value;
            guardar();
        });

        return crearBloque('Notas', area, dia.notas.trim() !== '').det;
    }

    function renderEditor(contenedor, iso) {
        const dia = obtenerDia(iso);
        const guardar = () => guardarDia(iso, dia);
        const ocultas = estado.ajustes.ocultas;

        contenedor.replaceChildren();
        if (!ocultas.includes('hormonas')) contenedor.append(bloqueHormonas(dia, guardar));
        T.catalogo.categorias
            .filter((c) => !ocultas.includes(c.id))
            .forEach((c) => contenedor.append(bloqueCategoria(c, dia, guardar)));
        contenedor.append(bloqueNotas(dia, guardar));
        contenedor.append(el('p', {
            class: 'nota nota-guardado',
            'data-estado-guardado': '',
            text: 'Se guarda automáticamente en este dispositivo.'
        }));
    }

    // Vista de solo lectura (días anteriores)
    function renderResumen(contenedor, iso) {
        contenedor.replaceChildren();

        if (iso > hoyISO()) {
            contenedor.append(el('p', { class: 'vacio', text: 'Este día todavía no ha llegado.' }));
            return;
        }

        const dia = obtenerDia(iso);
        if (!tieneContenido(dia)) {
            contenedor.append(el('p', { class: 'vacio', text: 'Sin registro este día.' }));
            return;
        }

        const lista = el('dl', { class: 'resumen' });

        const tomas = Object.values(dia.hormonas);
        if (tomas.length) {
            lista.append(el('dt', { text: 'Hormonas' }));
            tomas.forEach((t) => {
                const partes = [t.nombre, t.dosis, T.catalogo.vias[t.via]].filter(Boolean).join(' · ');
                lista.append(el('dd', { text: `${partes}${t.hora ? ` — ${t.hora}` : ''}` }));
            });
        }

        T.catalogo.categorias.forEach((cat) => {
            const ids = dia.sel[cat.id] || [];
            if (!ids.length) return;
            const nombres = ids
                .map((id) => (cat.opciones.find((o) => o.id === id) || {}).nombre)
                .filter(Boolean).join(', ');
            lista.append(el('dt', { text: cat.nombre }), el('dd', { text: nombres }));
        });

        if (dia.notas.trim()) {
            lista.append(el('dt', { text: 'Notas' }), el('dd', { class: 'resumen-notas', text: dia.notas }));
        }

        contenedor.append(lista);
    }

    // -----------------------------------------------------------------
    // Pantalla "Hoy"
    // -----------------------------------------------------------------
    function renderHoy(contenedor) {
        const iso = hoyISO();
        const cuerpo = el('div');
        contenedor.replaceChildren(el('h2', { class: 'panel-dia-titulo', text: fechaLarga(iso) }), cuerpo);
        renderEditor(cuerpo, iso);
    }

    // -----------------------------------------------------------------
    // Pantalla "Calendario"
    // -----------------------------------------------------------------
    function renderPanelDia(contenedor) {
        const iso = cal.seleccionado;
        const hoy = hoyISO();
        const cuerpo = el('div');
        contenedor.replaceChildren(el('h2', { class: 'panel-dia-titulo', text: fechaLarga(iso) }), cuerpo);

        const editable = iso === hoy || (iso < hoy && PERMITIR_EDITAR_DIAS_PASADOS);
        if (editable) {
            renderEditor(cuerpo, iso);
        } else {
            renderResumen(cuerpo, iso);
            if (iso < hoy) {
                cuerpo.append(el('p', { class: 'nota', text: 'Los días anteriores solo se pueden consultar. Los registros nuevos se añaden en la fecha actual.' }));
            }
        }
    }

    function renderCalendario(contCal, contDia) {
        const ahora = new Date();
        const hoy = hoyISO();
        const anio = cal.mes.getFullYear();
        const mes = cal.mes.getMonth();
        const esMesActual = anio === ahora.getFullYear() && mes === ahora.getMonth();

        const volver = () => renderCalendario(contCal, contDia);

        const btnPrev = el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Mes anterior' }, icono('chevron-left'));
        const btnNext = el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Mes siguiente', disabled: esMesActual }, icono('chevron-right'));
        btnPrev.addEventListener('click', () => { cal.mes = new Date(anio, mes - 1, 1); volver(); });
        btnNext.addEventListener('click', () => { cal.mes = new Date(anio, mes + 1, 1); volver(); });

        const btnHoy = el('button', { type: 'button', class: 'btn-texto' }, 'Ir a hoy');
        btnHoy.addEventListener('click', () => {
            cal.mes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            cal.seleccionado = hoy;
            volver();
        });

        const cabecera = el('div', { class: 'cal-cabecera' },
            btnPrev, el('h2', { class: 'cal-mes', text: mesAnio(cal.mes) }), btnNext);

        const semana = el('div', { class: 'cal-semana', 'aria-hidden': 'true' });
        ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach((d) => semana.append(el('span', { text: d })));

        const rejilla = el('div', { class: 'cal-rejilla' });
        const diasMes = new Date(anio, mes + 1, 0).getDate();
        const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7; // semana desde lunes
        for (let i = 0; i < desfase; i++) rejilla.append(el('span', { class: 'dia-vacio' }));

        for (let d = 1; d <= diasMes; d++) {
            const iso = aISO(new Date(anio, mes, d));
            const info = infoDia(iso);
            const clases = ['dia'];
            if (iso === hoy) clases.push('dia-hoy');
            if (iso === cal.seleccionado) clases.push('dia-sel');

            const boton = el('button', {
                type: 'button',
                class: clases.join(' '),
                disabled: iso > hoy,
                'aria-label': fechaLarga(iso),
                'aria-pressed': String(iso === cal.seleccionado)
            },
            el('span', { class: 'dia-num', text: String(d) }),
            el('span', { class: 'dia-marcas' },
                info.registro ? el('i', { class: 'marca marca-registro' }) : null,
                info.hormona ? el('i', { class: 'marca marca-hormona' }) : null));

            boton.addEventListener('click', () => { cal.seleccionado = iso; volver(); });
            rejilla.append(boton);
        }

        const leyenda = el('p', { class: 'leyenda' },
            el('i', { class: 'marca marca-registro' }), ' Registro',
            el('i', { class: 'marca marca-hormona' }), ' Hormonas',
            btnHoy);

        contCal.replaceChildren(cabecera, semana, rejilla, leyenda);
        renderPanelDia(contDia);
    }

    // -----------------------------------------------------------------
    // Perfil → "Personalizar registro"
    // -----------------------------------------------------------------
    function renderAjustes(contenedor) {
        contenedor.replaceChildren(
            el('p', { class: 'nota', text: 'Elige qué categorías quieres ver en tu registro diario. Lo que ya hayas guardado no se borra.' })
        );
        T.catalogo.ocultables.forEach((c) => {
            const casilla = el('input', { type: 'checkbox', id: `aj-${c.id}` });
            casilla.checked = !estado.ajustes.ocultas.includes(c.id);
            casilla.addEventListener('change', () => {
                const ocultas = estado.ajustes.ocultas.filter((id) => id !== c.id);
                if (!casilla.checked) ocultas.push(c.id);
                estado.ajustes.ocultas = ocultas;
                escribir('ajustes', estado.ajustes);
            });
            contenedor.append(el('label', { class: 'check-fila', for: `aj-${c.id}` }, casilla, c.nombre));
        });
    }

    T.registro = {
        iniciar, limpiar, borrarDatosLocales, exportar,
        renderHoy, renderCalendario, renderAjustes,
        PERMITIR_EDITAR_DIAS_PASADOS
    };
})(window.Transness);