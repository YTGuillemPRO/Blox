import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

class LocalGameScript {
    constructor() {
        this.playerHealth = 100;
        this.initFirebaseAuth();
        this.initUI();
        this.initChat();
        this.initMobileControls();
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
        const userDisplay = document.getElementById('user-display');

        onAuthStateChanged(this.auth, (user) => {
            if (user) {
                authScreen.style.display = 'none';
                gameHud.style.display = 'none';
                homeScreen.style.display = 'flex';
                userDisplay.innerText = user.email.split('@')[0]; 
            } else {
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
                errorDisplay.innerText = "Error: Credenciales incorrectos.";
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

        document.getElementById('btn-play').addEventListener('click', () => {
            homeScreen.style.display = 'none';
            gameHud.style.display = 'block';
            window.GameHandler.startGame();
        });
    }

    initUI() {
        this.healthFill = document.getElementById('health-fill');
        this.updateUI();
    }

    updateUI() {
        if (!this.healthFill) return;
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

    initMobileControls() {
        const base = document.getElementById('joystick-base');
        const thumb = document.getElementById('joystick-thumb');
        const gameContainer = document.getElementById('game-container');
        
        const handleStart = (e) => {
            e.preventDefault();
            window.GameHandler.joystick.active = true;
            base.style.opacity = '1';
            const touch = e.touches ? e.touches[0] : e;
            base.style.left = (touch.clientX - 60) + 'px';
            base.style.bottom = 'auto';
            base.style.top = (touch.clientY - 60) + 'px';
            thumb.style.left = '50%'; thumb.style.top = '50%';
        };

        const handleMove = (e) => {
            if(!window.GameHandler.joystick.active) return;
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const rect = base.getBoundingClientRect();
            let x = touch.clientX - (rect.left + rect.width/2);
            let y = touch.clientY - (rect.top + rect.height/2);
            const dist = Math.min(35, Math.sqrt(x*x + y*y));
            const angle = Math.atan2(y, x);
            thumb.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`;
            thumb.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;
            window.GameHandler.joystick.x = (Math.cos(angle) * dist) / 35;
            window.GameHandler.joystick.y = (Math.sin(angle) * dist) / 35;
        };

        const handleEnd = (e) => {
            window.GameHandler.joystick.active = false;
            window.GameHandler.joystick.x = 0; window.GameHandler.joystick.y = 0;
            thumb.style.left = '50%'; thumb.style.top = '50%';
        };

        base.addEventListener('touchstart', handleStart);
        base.addEventListener('touchmove', handleMove);
        base.addEventListener('touchend', handleEnd);

        let camTouchStart = null;
        gameContainer.addEventListener('touchstart', (e) => {
            if(e.target !== gameContainer && e.target.tagName !== 'CANVAS') return;
            camTouchStart = e.touches[0].clientX;
        });
        gameContainer.addEventListener('touchmove', (e) => {
            if(camTouchStart !== null && !window.GameHandler.joystick.active) {
                const currentX = e.touches[0].clientX;
                window.GameHandler.cameraAngle -= (currentX - camTouchStart) * 0.005;
                camTouchStart = currentX;
            }
        });
        gameContainer.addEventListener('touchend', () => camTouchStart = null);
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
