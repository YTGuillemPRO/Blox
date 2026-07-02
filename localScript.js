import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

class LocalGameScript {
    constructor() {
        this.playerHealth = 100;

        this.initFirebaseAuth();
        this.initUI();
        this.initChat();
        this.startGameLoops();
    }

    initFirebaseAuth() {
        const firebaseConfig = {
            apiKey: "AIzaSyD7BPG3viR2fnD34hHqSHrIRLUORnPrl68",
            authDomain: "bloxyy.firebaseapp.com",
            projectId: "bloxyy",
            storageBucket: "bloxyy.firebasestorage.app",
            messagingSenderId: "217371623536",
            appId: "1:217371623536:web:e7ab52060f1db10c19b4b5",
            measurementId: "G-10E5LGZGG1"
        };

        const app = initializeApp(firebaseConfig);
        getAnalytics(app);
        this.auth = getAuth(app);

        const authScreen = document.getElementById('auth-screen');
        const homeScreen = document.getElementById('home-screen');
        const gameHud = document.getElementById('game-hud');
        const errorDisplay = document.getElementById('auth-error');
        const welcomeText = document.getElementById('welcome-user');

        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                // Logueado: Ir a Home Screen
                authScreen.style.display = 'none';
                gameHud.style.display = 'none';
                homeScreen.style.display = 'flex';
            } else {
                // No logueado: Mostrar Login
                authScreen.style.display = 'flex';
                homeScreen.style.display = 'none';
                gameHud.style.display = 'none';
            }
        });

        document.getElementById('btn-login').addEventListener('click', () => {
            errorDisplay.innerText = '';
            const email = document.getElementById('email-input').value;
            const pass = document.getElementById('pass-input').value;
            signInWithEmailAndPassword(this.auth, email, pass).catch(() => {
                errorDisplay.innerText = "Error: Correo o contraseña incorrectos.";
            });
        });

        document.getElementById('btn-register').addEventListener('click', () => {
            errorDisplay.innerText = '';
            const email = document.getElementById('email-input').value;
            const pass = document.getElementById('pass-input').value;
            createUserWithEmailAndPassword(this.auth, email, pass).catch((error) => {
                if(error.code === 'auth/email-already-in-use') errorDisplay.innerText = "Error: Correo ya registrado.";
                else if(error.code === 'auth/weak-password') errorDisplay.innerText = "Error: Mínimo 6 caracteres.";
                else errorDisplay.innerText = "Error al registrar.";
            });
        });

        // Botón JUGAR (Inicio -> Juego 3D)
        document.getElementById('btn-play').addEventListener('click', () => {
            homeScreen.style.display = 'none';
            gameHud.style.display = 'block';
            window.GameHandler.startGame(); // Iniciar el mundo 3D
        });
    }

    initUI() {
        this.healthFill = document.getElementById('health-fill');
        this.updateUI();
    }

    updateUI() {
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
                } else { chatInput.blur(); }
            }
        });
    }

    startGameLoops() {
        setTimeout(() => { this.playerHealth = 75; this.updateUI(); }, 5000);
    }
}

window.addEventListener('load', () => {
    const checkGameHandler = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(checkGameHandler);
            window.localScript = new LocalGameScript();
        }
    }, 100);
});
