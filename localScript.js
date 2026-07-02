import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;

        this.initFirebaseAuth();
        this.initUI();
        this.initChat();
        this.startGameLoops();
    }

    initFirebaseAuth() {
        // Tu configuración de Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyD7BPG3viR2fnD34hHqSHrIRLUORnPrl68",
            authDomain: "bloxyy.firebaseapp.com",
            projectId: "bloxyy",
            storageBucket: "bloxyy.firebasestorage.app",
            messagingSenderId: "217371623536",
            appId: "1:217371623536:web:e7ab52060f1db10c19b4b5",
            measurementId: "G-10E5LGZGG1"
        };

        // Inicializar Firebase y Analytics
        const app = initializeApp(firebaseConfig);
        getAnalytics(app); // Inicializar Analytics
        this.auth = getAuth(app);

        const authScreen = document.getElementById('auth-screen');
        const gameHud = document.getElementById('game-hud');
        const errorDisplay = document.getElementById('auth-error');

        // Escuchar cambios en el estado de autenticación
        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                // Usuario logueado: Ocultar login, mostrar juego
                authScreen.style.opacity = '0';
                setTimeout(() => { 
                    authScreen.style.display = 'none'; 
                    gameHud.style.display = 'block'; 
                }, 500);
            } else {
                // Usuario no logueado: Mostrar login
                authScreen.style.display = 'flex';
                authScreen.style.opacity = '1';
                gameHud.style.display = 'none';
            }
        });

        // Botón Iniciar Sesión
        document.getElementById('btn-login').addEventListener('click', () => {
            errorDisplay.innerText = '';
            const email = document.getElementById('email-input').value;
            const pass = document.getElementById('pass-input').value;
            
            signInWithEmailAndPassword(this.auth, email, pass)
                .catch((error) => {
                    errorDisplay.innerText = "Error: Correo o contraseña incorrectos.";
                });
        });

        // Botón Crear Cuenta
        document.getElementById('btn-register').addEventListener('click', () => {
            errorDisplay.innerText = '';
            const email = document.getElementById('email-input').value;
            const pass = document.getElementById('pass-input').value;

            createUserWithEmailAndPassword(this.auth, email, pass)
                .catch((error) => {
                    if(error.code === 'auth/email-already-in-use') {
                        errorDisplay.innerText = "Error: Este correo ya está registrado.";
                    } else if(error.code === 'auth/weak-password') {
                        errorDisplay.innerText = "Error: La contraseña debe tener al menos 6 caracteres.";
                    } else {
                        errorDisplay.innerText = "Error al registrar. Revisa los datos.";
                    }
                });
        });
    }

    initUI() {
        this.moneyDisplay = document.getElementById('money-amount');
        this.healthFill = document.getElementById('health-fill');
        this.updateUI();
    }

    updateUI() {
        this.moneyDisplay.innerText = `${this.playerMoney}$`;
        this.healthFill.style.width = `${this.playerHealth}%`;
        this.healthFill.style.background = this.playerHealth < 30 ? '#ff4757' : '#2ed573';
    }

    initChat() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (text !== '') {
                    // Obtener el email del usuario actual para el chat
                    const user = this.auth.currentUser;
                    const playerName = user ? user.email.split('@')[0] : "Player";
                    
                    const msg = document.createElement('div');
                    msg.innerHTML = `<span style="color: #00a2ff; font-weight: bold;">${playerName}:</span> ${text}`;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    if (window.GameHandler && window.GameHandler.showChatBubble) {
                        window.GameHandler.showChatBubble(text);
                    }
                    chatInput.value = '';
                    chatInput.blur(); 
                } else {
                    chatInput.blur();
                }
            }
        });
    }

    startGameLoops() {
        setInterval(() => { this.playerMoney += 10; this.updateUI(); }, 3000);
        setTimeout(() => { this.playerHealth = 75; this.updateUI(); }, 5000);
        setTimeout(() => { this.playerHealth = 20; this.updateUI(); }, 10000);
    }
}

window.addEventListener('load', () => {
    const checkGameHandler = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(checkGameHandler);
            console.log("Motor 3D listo. Iniciando LocalScript...");
            window.localScript = new LocalGameScript();
        }
    }, 100);
});
