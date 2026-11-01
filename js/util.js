// =====================================================================
// util.js - utilidades comunes (espacio de nombres global: Transness)
// =====================================================================
window.Transness = window.Transness || {};

(function (T) {
    'use strict';

    // Crea un elemento DOM: el('div', { class: 'x', text: 'hola' }, hijo1, hijo2)
    // Usa textContent, así que nunca interpreta HTML del usuario.
    function el(etiqueta, props, ...hijos) {
        const nodo = document.createElement(etiqueta);
        Object.entries(props || {}).forEach(([clave, valor]) => {
            if (valor === null || valor === undefined || valor === false) return;
            if (clave === 'class') nodo.className = valor;
            else if (clave === 'text') nodo.textContent = valor;
            else nodo.setAttribute(clave, valor === true ? '' : valor);
        });
        hijos.flat().forEach((hijo) => {
            if (hijo === null || hijo === undefined || hijo === false) return;
            nodo.append(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
        });
        return nodo;
    }

    // Icono de línea del sprite definido en index.html (#i-nombre)
    function icono(nombre) {
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'icono');
        svg.setAttribute('aria-hidden', 'true');
        const uso = document.createElementNS(NS, 'use');
        uso.setAttribute('href', `#i-${nombre}`);
        svg.append(uso);
        return svg;
    }

    // Fechas en formato local "AAAA-MM-DD" (sin problemas de zona horaria)
    function aISO(fecha) {
        const a = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        return `${a}-${m}-${d}`;
    }

    function desdeISO(iso) {
        const [a, m, d] = iso.split('-').map(Number);
        return new Date(a, m - 1, d);
    }

    function hoyISO() {
        return aISO(new Date());
    }

    function capitalizar(texto) {
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    const formatoLargo = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const formatoMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

    function fechaLarga(iso) {
        return capitalizar(formatoLargo.format(desdeISO(iso)));
    }

    function mesAnio(fecha) {
        return capitalizar(formatoMes.format(fecha));
    }

    function horaActual() {
        const f = new Date();
        return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
    }

    T.util = { el, icono, aISO, desdeISO, hoyISO, fechaLarga, mesAnio, horaActual, capitalizar };
})(window.Transness);