// =====================================================================
// Transness - app.js
// Secciones:
//   0. Configuración e inicialización de Firebase
//   1. Referencias al DOM
//   2. Utilidades (avisos, errores, vistas, validaciones)
//   3. Autenticación y sesión
//   4. Navegación (pantallas y menú inferior) y tema de color
//   5. Perfil y cuenta (editar, email, contraseña, exportar, soporte, eliminar)
//   6. Recursos (lista desde recursos.json)
//   7. Interfaz previa al acceso (logo y pronombres)
// El registro diario y el calendario están en js/registro.js
// =====================================================================

// ---------------------------------------------------------------------
// 0. CONFIGURACIÓN
// ---------------------------------------------------------------------
const EMAIL_SOPORTE = '';            // <- escribe aquí el correo de soporte (p. ej. 'soporte@tudominio.com')
const VERSION_APP = '0.2 (prototipo)';

const firebaseConfig = {
    apiKey: "AIzaSyD6YRFoeeUqaynzDbcFd6_WGYZzZ9zauGw",
    authDomain: "transness-e19a6.firebaseapp.com",
    projectId: "transness-e19a6",
    storageBucket: "transness-e19a6.firebasestorage.app",
    messagingSenderId: "168829109896",
    appId: "1:168829109896:web:a6fb7bf636e840c180013d",
    measurementId: "G-WG9T1SNP65"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const T = window.Transness;
    const { el } = T.util;

    // -----------------------------------------------------------------
    // 1. REFERENCIAS AL DOM
    // -----------------------------------------------------------------
    const $ = (id) => document.getElementById(id);

    const appContainer = document.querySelector('#app');
    const tarjeta = document.querySelector('.tarjeta-login');
    const botonLogo = document.querySelector('.acceso-biometrico');
    const separador = document.querySelector('.separador');
    const socialGrid = document.querySelector('.social-grid');
    const metaTema = document.querySelector('meta[name="theme-color"]');

    const vistas = {
        login: $('vista-login'),
        registro: $('vista-registro'),
        detalles: $('vista-detalles')
    };
    const mensajeError = $('mensaje-error');

    // Login / registro / detalles
    const loginEmail = $('login-email');
    const loginPass = $('login-pass');
    const btnLogin = $('btn-login');
    const regNombre = $('reg-nombre');
    const regEmail = $('reg-email');
    const regPass = $('reg-pass');
    const regConfirm = $('reg-pass-confirm');
    const mensajeReq = $('mensaje-requisitos');
    const btnRegistrar = $('btn-registrar-usuario');
    const detNombre = $('det-nombre');
    const selectorPronombres = $('selector-pronombres');
    const selectorExperiencia = $('selector-experiencia');
    const detFecha = $('det-fecha');
    const btnFinalizar = $('btn-finalizar');
    const btnGoogle = $('btn-google');

    // App
    const shell = $('shell');
    const shellTitulo = $('shell-titulo');
    const shellContenido = $('shell-contenido');

    // Perfil
    const perfilNombre = $('perfil-nombre');
    const perfilPronombres = $('perfil-pronombres');
    const perfilExperiencia = $('perfil-experiencia');
    const perfilFecha = $('perfil-fecha');

    // -----------------------------------------------------------------
    // 2. UTILIDADES
    // -----------------------------------------------------------------
    function mostrarError(texto) {
        mensajeError.textContent = texto;
        mensajeError.hidden = false;
    }

    function limpiarError() {
        mensajeError.textContent = '';
        mensajeError.hidden = true;
    }

    // Aviso dentro de un <p class="mensaje-error">: ok = true lo muestra en tono neutro
    function aviso(nodo, texto, ok) {
        nodo.textContent = texto || '';
        nodo.hidden = !texto;
        nodo.classList.toggle('aviso-ok', Boolean(ok) && Boolean(texto));
    }

    function traducirError(error) {
        const mensajes = {
            'app/falta-password': 'Escribe tu contraseña actual para confirmar.',
            'auth/invalid-email': 'El email no tiene un formato válido.',
            'auth/user-not-found': 'No existe ninguna cuenta con ese email.',
            'auth/wrong-password': 'Email o contraseña incorrectos.',
            'auth/invalid-credential': 'Email o contraseña incorrectos.',
            'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
            'auth/weak-password': 'La contraseña es demasiado débil.',
            'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
            'auth/network-request-failed': 'Error de red. Revisa tu conexión.',
            'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
            'auth/cancelled-popup-request': 'Cerraste la ventana de Google antes de terminar.',
            'auth/requires-recent-login': 'Por seguridad, vuelve a iniciar sesión y repite la acción.',
            'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase.'
        };
        return mensajes[error.code] ||
            `Ha ocurrido un error (${error.code || error.message}). Inténtalo de nuevo.`;
    }

    // Muestra una vista dentro de la tarjeta de acceso: 'login' | 'registro' | 'detalles'
    function mostrarVista(nombre) {
        Object.keys(vistas).forEach((clave) => {
            vistas[clave].style.display = (clave === nombre) ? 'block' : 'none';
        });
        const mostrarSocial = nombre !== 'detalles';
        separador.style.display = mostrarSocial ? '' : 'none';
        socialGrid.style.display = mostrarSocial ? '' : 'none';
        limpiarError();
    }

    function passwordSegura(pass) {
        return pass.length >= 8 && /[A-Z]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
    }

    function emailValido(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function proveedores(usuario) {
        const ids = usuario.providerData.map((p) => p.providerId);
        return { password: ids.includes('password'), google: ids.includes('google.com') };
    }

    // Vuelve a verificar la identidad (Firebase lo exige para acciones sensibles)
    async function reautenticar(usuario, password) {
        const { password: conPassword, google } = proveedores(usuario);
        if (conPassword) {
            if (!password) throw { code: 'app/falta-password' };
            const credencial = firebase.auth.EmailAuthProvider.credential(usuario.email, password);
            await usuario.reauthenticateWithCredential(credencial);
        } else if (google) {
            await usuario.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
        }
    }

    function descargarJSON(objeto, nombreArchivo) {
        const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.append(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // -----------------------------------------------------------------
    // 3. AUTENTICACIÓN Y SESIÓN
    // -----------------------------------------------------------------
    let usuarioActual = null;
    let perfilActual = null;

    $('link-a-registro').onclick = (e) => { e.preventDefault(); mostrarVista('registro'); };
    $('link-a-login').onclick = (e) => { e.preventDefault(); mostrarVista('login'); };

    regPass.addEventListener('input', () => {
        const segura = passwordSegura(regPass.value);
        mensajeReq.style.color = segura ? '#2ecc71' : '#e74c3c';
        mensajeReq.textContent = segura
            ? '¡Contraseña segura!'
            : 'Mínimo 8 caracteres, una mayúscula y un carácter especial';
    });

    // --- Registro con email ---
    btnRegistrar.onclick = async (e) => {
        e.preventDefault();
        limpiarError();

        const nombre = regNombre.value.trim();
        const email = regEmail.value.trim();
        const pass = regPass.value;

        if (!nombre) return mostrarError('Escribe tu nombre.');
        if (!emailValido(email)) return mostrarError('Escribe un email válido.');
        if (!passwordSegura(pass)) return mostrarError('La contraseña no cumple los requisitos.');
        if (pass !== regConfirm.value) return mostrarError('Las contraseñas no coinciden.');

        btnRegistrar.disabled = true;
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, pass);
            await cred.user.updateProfile({ displayName: nombre });
        } catch (error) {
            console.error('Error registro:', error);
            mostrarError(traducirError(error));
        } finally {
            btnRegistrar.disabled = false;
        }
    };

    // --- Login con email ---
    btnLogin.onclick = async (e) => {
        e.preventDefault();
        limpiarError();

        const email = loginEmail.value.trim();
        const pass = loginPass.value;
        if (!email || !pass) return mostrarError('Escribe tu email y tu contraseña.');

        btnLogin.disabled = true;
        try {
            await auth.signInWithEmailAndPassword(email, pass);
        } catch (error) {
            console.error('Error login:', error);
            mostrarError(traducirError(error));
        } finally {
            btnLogin.disabled = false;
        }
    };

    // --- Login con Google ---
    btnGoogle.onclick = async (e) => {
        e.preventDefault();
        limpiarError();
        try {
            await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        } catch (error) {
            console.error('Error Google:', error);
            mostrarError(traducirError(error));
        }
    };

    // --- Recuperar contraseña ---
    $('link-olvide').onclick = async (e) => {
        e.preventDefault();
        limpiarError();
        const email = loginEmail.value.trim();
        if (!emailValido(email)) {
            return mostrarError('Escribe tu email arriba y vuelve a pulsar "¿Olvidaste tu contraseña?".');
        }
        try {
            await auth.sendPasswordResetEmail(email);
            alert('Si existe una cuenta con ese email, te hemos enviado un enlace para restablecer la contraseña.');
        } catch (error) {
            console.error('Error reset:', error);
            mostrarError(traducirError(error));
        }
    };

    // --- Detalles de perfil (primer acceso) ---
    selectorPronombres.addEventListener('change', () => {
        const v = selectorPronombres.value;
        if (v === 'ella') btnFinalizar.textContent = 'Bienvenida a Transness';
        else if (v === 'el') btnFinalizar.textContent = 'Bienvenido a Transness';
        else btnFinalizar.textContent = 'Bienvenide a Transness';

        btnFinalizar.style.transform = 'scale(1.05)';
        setTimeout(() => { btnFinalizar.style.transform = 'scale(1)'; }, 150);
    });

    // Vista previa del color de fondo al elegir la experiencia
    selectorExperiencia.addEventListener('change', () => aplicarTema(selectorExperiencia.value));

    btnFinalizar.onclick = async (e) => {
        e.preventDefault();
        limpiarError();

        const usuario = auth.currentUser;
        if (!usuario) return mostrarError('Tu sesión ha caducado. Inicia sesión de nuevo.');

        const nombre = detNombre.value.trim();
        if (!nombre) return mostrarError('Escribe cómo quieres que te llamemos.');
        if (!selectorPronombres.value) return mostrarError('Selecciona tus pronombres.');
        if (!selectorExperiencia.value) return mostrarError('Selecciona una opción en "Mi experiencia".');

        const datosPerfil = {
            nombreElegido: nombre,
            pronombres: selectorPronombres.value,
            perfilVisual: selectorExperiencia.value,
            fechaNacimiento: detFecha.value || '',
            email: usuario.email,
            uid: usuario.uid,
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };

        btnFinalizar.disabled = true;
        try {
            await db.collection('usuarios').doc(usuario.uid).set(datosPerfil, { merge: true });
            entrarApp(usuario, datosPerfil);
        } catch (error) {
            console.error('Error al guardar:', error);
            mostrarError(`No se pudo guardar tu perfil (${error.code || error.message}).`);
        } finally {
            btnFinalizar.disabled = false;
        }
    };

    // --- Sesión persistente: decide qué pantalla mostrar ---
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            salirApp();
            mostrarVista('login');
            return;
        }

        try {
            const doc = await db.collection('usuarios').doc(user.uid).get();
            if (doc.exists) {
                const datos = doc.data();
                // Mantiene el email del perfil al día (p. ej. tras cambiarlo)
                if (datos.email !== user.email) {
                    db.collection('usuarios').doc(user.uid).set({ email: user.email }, { merge: true }).catch(() => {});
                    datos.email = user.email;
                }
                entrarApp(user, datos);
            } else {
                salirApp();
                detNombre.value = detNombre.value || user.displayName || regNombre.value.trim();
                mostrarVista('detalles');
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
            mostrarError(`No se pudo cargar tu perfil (${error.code || error.message}).`);
        }
    });

    // -----------------------------------------------------------------
    // 4. NAVEGACIÓN Y TEMA
    // -----------------------------------------------------------------
    const TEMAS = ['mtf', 'ftm', 'nb'];
    const COLOR_BARRA = { mtf: '#FAF0F4', ftm: '#EEF3F9', nb: '#F3F0F8' };
    const TITULOS = { hoy: 'Hoy', calendario: 'Calendario', comunidad: 'Comunidad', perfil: 'Perfil', recursos: 'Recursos' };

    // Cambia el color de fondo según la experiencia elegida (mtf | ftm | nb | neutro)
    function aplicarTema(valor) {
        TEMAS.forEach((t) => appContainer.classList.remove(`tema-${t}`));
        if (TEMAS.includes(valor)) appContainer.classList.add(`tema-${valor}`);
        if (metaTema) metaTema.setAttribute('content', COLOR_BARRA[valor] || '#FAFAF8');
    }

    function irAPantalla(nombre) {
        document.querySelectorAll('.pantalla').forEach((p) => {
            p.hidden = p.id !== `pantalla-${nombre}`;
        });

        const navActivo = nombre === 'recursos' ? 'comunidad' : nombre;
        document.querySelectorAll('.nav-item').forEach((boton) => {
            const activo = boton.dataset.pantalla === navActivo;
            boton.classList.toggle('activo', activo);
            if (activo) boton.setAttribute('aria-current', 'page');
            else boton.removeAttribute('aria-current');
        });

        shellTitulo.textContent = TITULOS[nombre] || '';
        shellContenido.scrollTop = 0;

        if (nombre === 'hoy') T.registro.renderHoy($('hoy-contenido'));
        if (nombre === 'calendario') T.registro.renderCalendario($('cal-contenedor'), $('cal-dia'));
        if (nombre === 'perfil') pintarPerfil();
        if (nombre === 'recursos') abrirRecursos();
    }

    document.querySelectorAll('.nav-item').forEach((boton) => {
        boton.addEventListener('click', () => irAPantalla(boton.dataset.pantalla));
    });

    function entrarApp(user, datos) {
        usuarioActual = user;
        perfilActual = datos;
        T.registro.iniciar(user.uid);
        aplicarTema(datos.perfilVisual);

        tarjeta.style.display = 'none';
        botonLogo.style.display = 'none';
        shell.style.display = 'flex';
        shell.classList.add('shell-entra');
        irAPantalla('hoy');
    }

    function salirApp() {
        shell.style.display = 'none';
        shell.classList.remove('shell-entra');
        tarjeta.style.display = '';
        tarjeta.classList.remove('tarjeta-oculta');
        botonLogo.style.display = '';
        T.registro.limpiar();
        usuarioActual = null;
        perfilActual = null;
        aplicarTema(null);
    }

    // -----------------------------------------------------------------
    // 5. PERFIL Y CUENTA
    // -----------------------------------------------------------------
    // Las mismas opciones del registro, copiadas a los selectores del perfil
    function copiarOpciones(origen, destino) {
        Array.from(origen.options)
            .filter((opcion) => opcion.value)
            .forEach((opcion) => destino.append(opcion.cloneNode(true)));
    }
    copiarOpciones(selectorPronombres, perfilPronombres);
    copiarOpciones(selectorExperiencia, perfilExperiencia);

    // Cada elemento completado suma un 20 %
    function calcularPerfilCompletado(datos) {
        const pasos = [
            true, // cuenta creada
            Boolean(datos.nombreElegido),
            Boolean(datos.pronombres),
            Boolean(datos.perfilVisual),
            Boolean(datos.fechaNacimiento)
        ];
        return Math.round((pasos.filter(Boolean).length / pasos.length) * 100);
    }

    function pintarPerfil() {
        const user = auth.currentUser;
        const datos = perfilActual || {};
        if (!user) return;

        const nombre = datos.nombreElegido || user.displayName || '';
        $('perfil-saludo').textContent = nombre ? `Hola, ${nombre}` : 'Hola';
        $('perfil-email-texto').textContent = user.email || '';

        // Avatar: foto de Google o inicial del nombre
        const foto = $('foto-perfil');
        const inicial = $('avatar-inicial');
        if (user.photoURL) {
            foto.src = user.photoURL;
            foto.hidden = false;
            inicial.textContent = '';
        } else {
            foto.hidden = true;
            inicial.textContent = (nombre || '?').trim().charAt(0).toUpperCase();
        }

        // Barra de progreso
        const porcentaje = calcularPerfilCompletado(datos);
        $('porcentaje-texto').textContent = `${porcentaje}%`;
        requestAnimationFrame(() => { $('barra-color').style.width = `${porcentaje}%`; });

        // Datos del formulario
        perfilNombre.value = datos.nombreElegido || '';
        perfilPronombres.value = datos.pronombres || '';
        perfilExperiencia.value = datos.perfilVisual || '';
        perfilFecha.value = datos.fechaNacimiento || '';

        // Email y contraseña solo se cambian en cuentas con contraseña
        const { password: conPassword } = proveedores(user);
        $('email-form').hidden = !conPassword;
        $('email-nota-google').hidden = conPassword;
        $('pass-form').hidden = !conPassword;
        $('pass-nota-google').hidden = conPassword;
        $('campo-pass-borrado').style.display = conPassword ? '' : 'none';

        ['aviso-perfil', 'aviso-email', 'aviso-pass', 'aviso-soporte', 'aviso-eliminar']
            .forEach((id) => aviso($(id), ''));
        ['email-nuevo', 'email-pass', 'pass-actual', 'pass-nueva', 'pass-confirmar', 'eliminar-pass']
            .forEach((id) => { $(id).value = ''; });

        T.registro.renderAjustes($('ajustes-registro'));
    }

    // --- Guardar datos personales ---
    $('btn-perfil-guardar').onclick = async () => {
        const avisoPerfil = $('aviso-perfil');
        aviso(avisoPerfil, '');
        const usuario = auth.currentUser;
        if (!usuario) return aviso(avisoPerfil, 'Tu sesión ha caducado. Inicia sesión de nuevo.');

        const nombre = perfilNombre.value.trim();
        if (!nombre) return aviso(avisoPerfil, 'Escribe cómo quieres que te llamemos.');
        if (!perfilPronombres.value) return aviso(avisoPerfil, 'Selecciona tus pronombres.');
        if (!perfilExperiencia.value) return aviso(avisoPerfil, 'Selecciona una opción en "Mi experiencia".');

        const cambios = {
            nombreElegido: nombre,
            pronombres: perfilPronombres.value,
            perfilVisual: perfilExperiencia.value,
            fechaNacimiento: perfilFecha.value || ''
        };

        const boton = $('btn-perfil-guardar');
        boton.disabled = true;
        try {
            await db.collection('usuarios').doc(usuario.uid).set(cambios, { merge: true });
            perfilActual = { ...perfilActual, ...cambios };
            aplicarTema(perfilActual.perfilVisual);
            pintarPerfil();
            aviso(avisoPerfil, 'Cambios guardados.', true);
        } catch (error) {
            console.error('Error al guardar perfil:', error);
            aviso(avisoPerfil, `No se pudieron guardar los cambios (${error.code || error.message}).`);
        } finally {
            boton.disabled = false;
        }
    };

    // --- Cambiar email ---
    $('btn-email-cambiar').onclick = async () => {
        const avisoEmail = $('aviso-email');
        aviso(avisoEmail, '');
        const usuario = auth.currentUser;
        if (!usuario) return;

        const nuevo = $('email-nuevo').value.trim();
        if (!emailValido(nuevo)) return aviso(avisoEmail, 'Escribe un email válido.');
        if (nuevo.toLowerCase() === (usuario.email || '').toLowerCase()) {
            return aviso(avisoEmail, 'Ese ya es tu email actual.');
        }

        const boton = $('btn-email-cambiar');
        boton.disabled = true;
        try {
            await reautenticar(usuario, $('email-pass').value);
            await usuario.verifyBeforeUpdateEmail(nuevo);
            $('email-pass').value = '';
            aviso(avisoEmail, `Te hemos enviado un enlace de verificación a ${nuevo}. El email cambiará cuando lo confirmes.`, true);
        } catch (error) {
            console.error('Error cambiando email:', error);
            aviso(avisoEmail, traducirError(error));
        } finally {
            boton.disabled = false;
        }
    };

    // --- Cambiar contraseña ---
    $('btn-pass-cambiar').onclick = async () => {
        const avisoPass = $('aviso-pass');
        aviso(avisoPass, '');
        const usuario = auth.currentUser;
        if (!usuario) return;

        const nueva = $('pass-nueva').value;
        if (!passwordSegura(nueva)) return aviso(avisoPass, 'La nueva contraseña no cumple los requisitos.');
        if (nueva !== $('pass-confirmar').value) return aviso(avisoPass, 'Las contraseñas nuevas no coinciden.');

        const boton = $('btn-pass-cambiar');
        boton.disabled = true;
        try {
            await reautenticar(usuario, $('pass-actual').value);
            await usuario.updatePassword(nueva);
            ['pass-actual', 'pass-nueva', 'pass-confirmar'].forEach((id) => { $(id).value = ''; });
            aviso(avisoPass, 'Contraseña actualizada.', true);
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            aviso(avisoPass, traducirError(error));
        } finally {
            boton.disabled = false;
        }
    };

    // --- Descargar mis registros ---
    $('btn-exportar').onclick = () => {
        const fecha = new Date().toISOString().slice(0, 10);
        descargarJSON(T.registro.exportar(), `transness-registros-${fecha}.json`);
    };

    // --- Contactar con soporte ---
    $('btn-soporte').onclick = () => {
        const avisoSoporte = $('aviso-soporte');
        if (!EMAIL_SOPORTE) {
            return aviso(avisoSoporte, 'El correo de soporte todavía no está configurado en la app.');
        }
        aviso(avisoSoporte, '');
        const asunto = encodeURIComponent('Soporte Transness');
        const cuerpo = encodeURIComponent(`\n\n---\nVersión de la app: ${VERSION_APP}`);
        window.location.href = `mailto:${EMAIL_SOPORTE}?subject=${asunto}&body=${cuerpo}`;
    };

    // --- Cerrar sesión ---
    $('btn-logout').onclick = async () => {
        try {
            await auth.signOut(); // onAuthStateChanged restaura el acceso
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    // --- Eliminar cuenta ---
    $('btn-eliminar-cuenta').onclick = async () => {
        const avisoEliminar = $('aviso-eliminar');
        aviso(avisoEliminar, '');
        const usuario = auth.currentUser;
        if (!usuario) return;

        const { password: conPassword } = proveedores(usuario);
        if (conPassword && !$('eliminar-pass').value) {
            return aviso(avisoEliminar, 'Escribe tu contraseña para confirmar.');
        }
        if (!confirm('¿Seguro que quieres eliminar tu cuenta? Se borrarán tu perfil y tus registros. No se puede deshacer.')) {
            return;
        }

        const boton = $('btn-eliminar-cuenta');
        boton.disabled = true;
        try {
            const uid = usuario.uid;
            await reautenticar(usuario, $('eliminar-pass').value);
            await db.collection('usuarios').doc(uid).delete();
            await usuario.delete();
            T.registro.borrarDatosLocales(uid);
            alert('Tu cuenta y tus datos se han eliminado.');
            // onAuthStateChanged devuelve a la pantalla de acceso
        } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            aviso(avisoEliminar, traducirError(error));
        } finally {
            boton.disabled = false;
        }
    };

    // -----------------------------------------------------------------
    // 6. RECURSOS (se leen de recursos.json)
    // -----------------------------------------------------------------
    // Nota: fetch() necesita un servidor (Live Server, hosting...).
    // No funciona abriendo index.html con doble clic (file://).
    let recursosDatos = null;
    let categoriaActiva = 'todos';

    const recursosFiltros = $('recursos-filtros');
    const recursosLista = $('recursos-lista');

    async function cargarRecursos() {
        if (recursosDatos) return recursosDatos;
        const respuesta = await fetch('recursos.json');
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        recursosDatos = await respuesta.json();
        return recursosDatos;
    }

    function urlSegura(url) {
        return typeof url === 'string' && /^https?:\/\//i.test(url);
    }

    function crearDato(etiqueta, valor, href) {
        const p = el('p', { class: 'recurso-dato' }, `${etiqueta}: `);
        if (href) {
            const a = el('a', { href, text: valor });
            if (href.startsWith('http')) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
            }
            p.append(a);
        } else {
            p.append(valor);
        }
        return p;
    }

    function crearTarjetaRecurso(recurso, nombresCategoria) {
        const tarjetaR = el('article', { class: 'tarjeta-recurso' }, el('h3', { text: recurso.nombre }));
        const meta = [nombresCategoria[recurso.categoria], recurso.ambito].filter(Boolean).join(' · ');
        tarjetaR.append(el('div', { class: 'recurso-meta', text: meta }));
        tarjetaR.append(el('p', { class: 'recurso-desc', text: recurso.descripcion }));

        if (recurso.telefono) tarjetaR.append(crearDato('Teléfono', recurso.telefono, `tel:${recurso.telefono.replace(/\s/g, '')}`));
        if (recurso.email) tarjetaR.append(crearDato('Email', recurso.email, `mailto:${recurso.email}`));
        if (urlSegura(recurso.web)) tarjetaR.append(crearDato('Web', 'Abrir página', recurso.web));
        if (recurso.direccion) tarjetaR.append(crearDato('Dirección', recurso.direccion));
        if (recurso.horario) tarjetaR.append(crearDato('Horario', recurso.horario));
        if (recurso.verificado === false) {
            tarjetaR.append(el('span', { class: 'recurso-por-confirmar', text: 'Dato por confirmar' }));
        }
        return tarjetaR;
    }

    function pintarRecursos() {
        const { categorias, recursos } = recursosDatos;
        const nombresCategoria = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));

        recursosFiltros.replaceChildren();
        [{ id: 'todos', nombre: 'Todos' }, ...categorias].forEach((cat) => {
            const chip = el('button', { type: 'button', class: 'chip-filtro', text: cat.nombre });
            if (cat.id === categoriaActiva) chip.classList.add('activo');
            chip.setAttribute('aria-pressed', String(cat.id === categoriaActiva));
            chip.onclick = () => { categoriaActiva = cat.id; pintarRecursos(); };
            recursosFiltros.append(chip);
        });

        const visibles = recursos.filter((r) => categoriaActiva === 'todos' || r.categoria === categoriaActiva);
        recursosLista.replaceChildren();
        if (visibles.length === 0) {
            recursosLista.append(el('p', { class: 'recursos-vacio', text: 'No hay recursos en esta categoría.' }));
            return;
        }
        visibles.forEach((r) => recursosLista.append(crearTarjetaRecurso(r, nombresCategoria)));
    }

    async function abrirRecursos() {
        recursosLista.replaceChildren(el('p', { class: 'recursos-vacio', text: 'Cargando…' }));
        try {
            await cargarRecursos();
            pintarRecursos();
        } catch (error) {
            console.error('Error cargando recursos:', error);
            recursosLista.replaceChildren(
                el('p', { class: 'recursos-vacio', text: 'No se pudieron cargar los recursos. Inténtalo de nuevo más tarde.' })
            );
        }
    }

    $('btn-ir-recursos').onclick = () => irAPantalla('recursos');
    $('btn-recursos-volver').onclick = () => irAPantalla('comunidad');

    // -----------------------------------------------------------------
    // 7. INTERFAZ PREVIA AL ACCESO
    // -----------------------------------------------------------------
    // Botón del logo: oculta/muestra la tarjeta y alterna el tono de fondo
    botonLogo.addEventListener('click', () => {
        tarjeta.classList.toggle('tarjeta-oculta');
        appContainer.classList.toggle('perfil-trans');
        appContainer.classList.toggle('perfil-nb');
    });
});