// =====================================================================
// datos.js - catálogo del registro diario
// Para añadir o cambiar opciones, edita solo este archivo.
// Los "id" se guardan en el registro: no los cambies si ya hay datos.
// =====================================================================
window.Transness = window.Transness || {};

(function (T) {
    'use strict';

    const categorias = [
        {
            id: 'cambios',
            nombre: 'Cambios que noto',
            opciones: [
                { id: 'voz', nombre: 'Voz' },
                { id: 'vello-facial', nombre: 'Vello facial' },
                { id: 'vello-corporal', nombre: 'Vello corporal' },
                { id: 'grasa', nombre: 'Distribución de la grasa' },
                { id: 'musculo', nombre: 'Musculatura' },
                { id: 'pecho', nombre: 'Pecho' },
                { id: 'piel-cambio', nombre: 'Piel' },
                { id: 'olor', nombre: 'Olor corporal' },
                { id: 'libido', nombre: 'Libido' },
                { id: 'sudoracion', nombre: 'Sudoración o sofocos' }
            ]
        },
        {
            id: 'sangrado',
            nombre: 'Sangrado',
            unica: true, // solo una opción a la vez
            opciones: [
                { id: 'manchado', nombre: 'Manchado' },
                { id: 'ligero', nombre: 'Ligero' },
                { id: 'medio', nombre: 'Medio' },
                { id: 'abundante', nombre: 'Abundante' }
            ]
        },
        {
            id: 'animo',
            nombre: 'Estado de ánimo',
            opciones: [
                { id: 'calma', nombre: 'Calma' },
                { id: 'alegria', nombre: 'Alegría' },
                { id: 'sensibilidad', nombre: 'Sensibilidad' },
                { id: 'ansiedad', nombre: 'Ansiedad' },
                { id: 'irritabilidad', nombre: 'Irritabilidad' },
                { id: 'tristeza', nombre: 'Tristeza' },
                { id: 'motivacion', nombre: 'Motivación' },
                { id: 'euforia-genero', nombre: 'Euforia de género' },
                { id: 'disforia', nombre: 'Disforia' }
            ]
        },
        {
            id: 'cuerpo',
            nombre: 'Cuerpo',
            opciones: [
                { id: 'colicos', nombre: 'Cólicos' },
                { id: 'dolor-cabeza', nombre: 'Dolor de cabeza' },
                { id: 'dolor-espalda', nombre: 'Dolor de espalda' },
                { id: 'sensibilidad-pecho', nombre: 'Sensibilidad en el pecho' },
                { id: 'hinchazon', nombre: 'Hinchazón' },
                { id: 'nauseas', nombre: 'Náuseas' }
            ]
        },
        {
            id: 'energia',
            nombre: 'Energía y sueño',
            opciones: [
                { id: 'energia-alta', nombre: 'Energía alta' },
                { id: 'energia-baja', nombre: 'Energía baja' },
                { id: 'fatiga', nombre: 'Fatiga' },
                { id: 'insomnio', nombre: 'Insomnio' },
                { id: 'buen-sueno', nombre: 'He dormido bien' }
            ]
        },
        {
            id: 'piel',
            nombre: 'Piel y cabello',
            opciones: [
                { id: 'piel-grasa', nombre: 'Piel grasa' },
                { id: 'piel-seca', nombre: 'Piel seca' },
                { id: 'acne', nombre: 'Acné' },
                { id: 'caida-cabello', nombre: 'Caída del cabello' }
            ]
        }
    ];

    const vias = {
        oral: 'Oral',
        sublingual: 'Sublingual',
        parche: 'Parche',
        gel: 'Gel',
        inyeccion: 'Inyección',
        implante: 'Implante',
        otra: 'Otra'
    };

    const frecuencias = {
        diaria: 'Diaria',
        '2dias': 'Cada 2 días',
        semanal: 'Semanal',
        quincenal: 'Cada 2 semanas',
        mensual: 'Mensual',
        otra: 'Otra'
    };

    // Categorías que la persona puede ocultar en "Personalizar registro"
    const ocultables = [{ id: 'hormonas', nombre: 'Hormonas' }]
        .concat(categorias.map((c) => ({ id: c.id, nombre: c.nombre })));

    T.catalogo = { categorias, vias, frecuencias, ocultables };
})(window.Transness);