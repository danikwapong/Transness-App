// CONFIGURACIÓN DE TU APP (Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyD6YRFoeeUqaynzDbcFd6_WGYZzZ9zauGw",
    authDomain: "transness-e19a6.firebaseapp.com",
    projectId: "transness-e19a6",
    storageBucket: "transness-e19a6.firebasestorage.app",
    messagingSenderId: "168829109896",
    appId: "1:168829109896:web:a6fb7bf636e840c180013d",
    measurementId: "G-WG9T1SNP65"
};

// INICIALIZAR FIREBASE
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELECCIÓN DE ELEMENTOS ---
    const botonPrivacidad = document.querySelector('.acceso-biometrico');
    const tarjetaLogin = document.querySelector('.tarjeta-login');
    const appContainer = document.querySelector('#app');
    const vistaLogin = document.getElementById('vista-login');
    const vistaRegistro = document.getElementById('vista-registro');
    const vistaDetalles = document.getElementById('vista-detalles');
    const linkRegistro = document.getElementById('link-a-registro');
    const linkLogin = document.getElementById('link-a-login');
    const inputPass = document.getElementById('reg-pass');
    const inputConfirm = document.getElementById('reg-pass-confirm');
    const mensajeReq = document.getElementById('mensaje-requisitos');
    const btnRegistrar = document.getElementById('btn-registrar-usuario');
    const selectorPronombres = document.getElementById('selector-pronombres');
    const btnFinalizar = document.getElementById('btn-finalizar');
    const btnGoogle = document.getElementById('btn-google');

    // --- 2. LÓGICA DE PRIVACIDAD Y COLORES ---
    botonPrivacidad.addEventListener('click', () => {
        tarjetaLogin.style.opacity = (tarjetaLogin.style.opacity === '0') ? '1' : '0';
        tarjetaLogin.style.pointerEvents = (tarjetaLogin.style.opacity === '0') ? 'none' : 'all';
        appContainer.classList.toggle('perfil-trans');
        appContainer.classList.toggle('perfil-nb');
    });

    // --- 3. NAVEGACIÓN ---
    linkRegistro.onclick = (e) => { e.preventDefault(); vistaLogin.style.display = 'none'; vistaRegistro.style.display = 'block'; };
    linkLogin.onclick = (e) => { e.preventDefault(); vistaRegistro.style.display = 'none'; vistaLogin.style.display = 'block'; };

    // --- 4. VALIDACIÓN CONTRASEÑA ---
    if (inputPass) {
        inputPass.addEventListener('input', () => {
            const pass = inputPass.value;
            const valida = pass.length >= 8 && /[A-Z]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
            mensajeReq.style.color = valida ? "#2ecc71" : "#e74c3c";
            mensajeReq.textContent = valida ? "¡Contraseña segura!" : "Mínimo 8 caracteres, una mayúscula y un carácter especial";
        });
    }

    // --- 5. PRONOMBRES Y COLORES DINÁMICOS ---
    selectorPronombres.addEventListener('change', () => {
        const v = selectorPronombres.value;

        if (v === 'ella') {
            appContainer.style.background = "linear-gradient(135deg, #ffafbd, #ffc3a0)";
            btnFinalizar.textContent = "Bienvenida a Transness";
        } else if (v === 'el') {
            appContainer.style.background = "linear-gradient(135deg, #2193b0, #6dd5ed)";
            btnFinalizar.textContent = "Bienvenido a Transness";
        } else {
            appContainer.style.background = "linear-gradient(135deg, #a8c0ff, #fbc2eb)";
            btnFinalizar.textContent = "Bienvenide a Transness";
        }
        
        btnFinalizar.style.transform = "scale(1.05)";
        setTimeout(() => btnFinalizar.style.transform = "scale(1)", 150);
    });

    // --- 6. LOGIN GOOGLE ---
    btnGoogle.onclick = (e) => {
        e.preventDefault();
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log("¡Éxito!", result.user.displayName);
                irADetalles();
            })
            .catch((error) => {
                console.error("Error Google:", error.message);
            });
    };

    function irADetalles() {
        vistaLogin.style.display = 'none';
        vistaRegistro.style.display = 'none';
        document.querySelector('.separador').style.display = 'none';
        document.querySelector('.social-grid').style.display = 'none';
        vistaDetalles.style.display = 'block';
    }

    btnRegistrar.onclick = (e) => {
        e.preventDefault();
        if (inputPass.value === inputConfirm.value && inputPass.value.length >= 8) {
            irADetalles();
        } else {
            alert("Revisa las contraseñas");
        }
    };

    // --- 7. BOTÓN FINALIZAR (GUARDAR EN FIRESTORE) ---
    btnFinalizar.onclick = async (e) => {
        e.preventDefault();
        const usuario = auth.currentUser;
        
        if (usuario) {
            try {
                const datosPerfil = {
                    nombreElegido: document.querySelector('input[placeholder="Tu nombre elegido"]').value,
                    pronombres: selectorPronombres.value,
                    fechaNacimiento: document.querySelector('input[type="date"]').value,
                    email: usuario.email,
                    uid: usuario.uid
                };

                await db.collection("usuarios").doc(usuario.uid).set(datosPerfil);
                console.log("Perfil guardado con éxito");
                
                // Llamamos a la función para mostrar el Dashboard con transición
                mostrarDashboard(usuario, datosPerfil);
                
            } catch (error) {
                console.error("Error al guardar:", error);
                alert("Error al guardar perfil");
            }
        } else {
            alert("Por favor, inicia sesión primero con Google");
        }
    };

    // --- 8. FUNCIÓN DASHBOARD (CON TRANSICIÓN) ---
    function mostrarDashboard(user, datosPerfil) {
        const tarjeta = document.querySelector('.tarjeta-login');
        const dashboard = document.getElementById('vista-dashboard');
        const marcaAgua = document.querySelector('.marca-agua-fondo');
        const biométrico = document.querySelector('.acceso-biometrico');

        // Aplicamos clase de desvanecimiento a la tarjeta (debes tenerla en CSS)
        if (tarjeta) tarjeta.classList.add('fade-out');
        if (marcaAgua) marcaAgua.style.opacity = '0.05';
        if (biométrico) biométrico.style.opacity = '0';

        // Esperamos a que termine la animación de salida
        setTimeout(() => {
            if (tarjeta) tarjeta.style.display = 'none';
            if (biométrico) biométrico.style.display = 'none';
            
            // Mostramos el dashboard con animación de entrada
            dashboard.style.display = 'block';
            dashboard.classList.add('fade-in-dashboard');
            dashboard.style.margin = 'auto'; 

            // Personalizamos los datos
            const saludo = document.getElementById('saludo-usuario');
            if (saludo) saludo.textContent = `Hola, ${datosPerfil.nombreElegido || user.displayName}`;
            
            if (user.photoURL) {
                const foto = document.getElementById('foto-perfil');
                foto.src = user.photoURL;
                foto.style.display = 'block';
            }
            console.log("Dashboard visible. ¡Aventura iniciada!");
        }, 600); 
    }
});