import { initializeApp } from 'firebase/app';

import { getAnalytics } from 'firebase/analytics';

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

import { getDatabase, ref, update, onValue, onDisconnect, remove } from 'firebase/database';


class LocalGameScript {

    constructor() {

        this.playerHealth = 100;

        this.currentGame = null;


        this.initFirebase();

        this.initUI();

        this.initChat();

        this.initGameCards();

        this.initMobileControls();

        this.initBackButton();

    }


    initFirebase() {

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

        this.db = getDatabase(app);


        const authScreen = document.getElementById('auth-screen');

        const homeScreen = document.getElementById('home-screen');

        const gameHud = document.getElementById('game-hud');

        const userDisplay = document.getElementById('user-display');

        const backBtn = document.getElementById('btn-back-lobby');


        onAuthStateChanged(this.auth, (user) => {

            if (user) {

                authScreen.style.display = 'none';

                if (this.currentGame) {

                    gameHud.style.display = 'block';

                    if (backBtn) backBtn.style.display = 'block';

                } else {

                    gameHud.style.display = 'none';

                    homeScreen.style.display = 'flex';

                    if (backBtn) backBtn.style.display = 'none';

                }

                userDisplay.innerText = user.email.split('@')[0];

            } else {

                authScreen.style.display = 'flex';

                homeScreen.style.display = 'none';

                gameHud.style.display = 'none';

                if (backBtn) backBtn.style.display = 'none';

            }

        });


        document.getElementById('btn-login').addEventListener('click', () => {

            document.getElementById('auth-error').innerText = '';

            const email = document.getElementById('email-input').value;

            const pass = document.getElementById('pass-input').value;

            signInWithEmailAndPassword(this.auth, email, pass).catch(() => {

                document.getElementById('auth-error').innerText = "Error: Credenciales incorrectos.";

            });

        });


        document.getElementById('btn-register').addEventListener('click', () => {

            document.getElementById('auth-error').innerText = '';

            const email = document.getElementById('email-input').value;

            const pass = document.getElementById('pass-input').value;

            createUserWithEmailAndPassword(this.auth, email, pass).catch((error) => {

                if (error.code === 'auth/email-already-in-use') document.getElementById('auth-error').innerText = "Error: Correo ya registrado.";

                else if (error.code === 'auth/weak-password') document.getElementById('auth-error').innerText = "Error: Mínimo 6 caracteres.";

                else document.getElementById('auth-error').innerText = "Error al registrar.";

            });

        });

    }


    initGameCards() {

        document.querySelectorAll('.game-card[data-game]').forEach(card => {

            card.addEventListener('click', () => {

                const gameId = card.dataset.game;

                this.startGame(gameId);

            });

        });

    }


    startGame(gameId) {

        if (!window.GameHandler) return;


        this.currentGame = gameId;


        // Carga la escena del juego

        const ok = window.GameHandler.loadGame(gameId);

        if (!ok) return;


        // Oculta lobby, muestra HUD

        document.getElementById('home-screen').style.display = 'none';

        document.getElementById('game-hud').style.display = 'block';

        const backBtn = document.getElementById('btn-back-lobby');

        if (backBtn) backBtn.style.display = 'block';


        this.setupMultiplayer(gameId);

    }


    returnToLobby() {

        // Cierra el juego y vuelve al lobby

        if (window.GameHandler?.loadGame) {

            window.GameHandler.loadGame(null); // cleanup

        }

        this.currentGame = null;

        if (this.playerRef) {

            remove(this.playerRef);

        }

        document.getElementById('home-screen').style.display = 'flex';

        document.getElementById('game-hud').style.display = 'none';

        const backBtn = document.getElementById('btn-back-lobby');

        if (backBtn) backBtn.style.display = 'none';

    }


    initBackButton() {

        document.getElementById('btn-back-lobby').addEventListener('click', () => {

            this.returnToLobby();

        });

    }


    setupMultiplayer(gameId) {

        const user = this.auth.currentUser;

        if (!user) return;

        const playerName = user.email.split('@')[0];

        this.myId = user.uid;

        this.playerRef = ref(this.db, 'players/' + this.myId);


        onDisconnect(this.playerRef).remove();


        update(this.playerRef, {

            name: playerName,

            game: gameId,

            x: 0, y: 1, z: 0, ry: 0,

            chat: ''

        });


        const playersRef = ref(this.db, 'players');

        onValue(playersRef, (snapshot) => {

            const data = snapshot.val();

            const currentIds = [];

            if (data) {

                for (const id in data) {

                    if (data[id].game !== gameId) continue;

                    currentIds.push(id);

                    if (id !== this.myId) window.GameHandler.updateRemotePlayer(id, data[id]);

                }

            }

            for (const id in window.GameHandler.otherPlayers) {

                if (!currentIds.includes(id)) window.GameHandler.removeRemotePlayer(id);

            }

        });


        if (this.syncInterval) clearInterval(this.syncInterval);

        this.syncInterval = setInterval(() => {

            if (window.GameHandler.player) {

                const p = window.GameHandler.player;

                update(this.playerRef, {

                    x: p.position.x, y: p.position.y, z: p.position.z,

                    ry: p.rotation.y,

                    game: gameId

                });

            }

        }, 100);

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

        if (!chatInput) return;

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


                    if (window.GameHandler?.showChatBubble) {

                        window.GameHandler.showChatBubble(text);

                    }


                    if (this.playerRef) {

                        update(this.playerRef, { chat: text });

                        setTimeout(() => {

                            update(this.playerRef, { chat: '' });

                        }, 4000);

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

        if (!base || !gameContainer) return;


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

            if (!window.GameHandler.joystick.active) return;

            e.preventDefault();

            const touch = e.touches ? e.touches[0] : e;

            const rect = base.getBoundingClientRect();

            let x = touch.clientX - (rect.left + rect.width / 2);

            let y = touch.clientY - (rect.top + rect.height / 2);

            const dist = Math.min(35, Math.sqrt(x * x + y * y));

            const angle = Math.atan2(y, x);

            thumb.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`;

            thumb.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;

            window.GameHandler.joystick.x = (Math.cos(angle) * dist) / 35;

            window.GameHandler.joystick.y = (Math.sin(angle) * dist) / 35;

        };

        const handleEnd = () => {

            window.GameHandler.joystick.active = false;

            window.GameHandler.joystick.x = 0; window.GameHandler.joystick.y = 0;

            thumb.style.left = '50%'; thumb.style.top = '50%';

        };


        base.addEventListener('touchstart', handleStart);

        base.addEventListener('touchmove', handleMove);

        base.addEventListener('touchend', handleEnd);


        let camTouchStart = null;

        gameContainer.addEventListener('touchstart', (e) => {

            if (e.target !== gameContainer && e.target.tagName !== 'CANVAS') return;

            camTouchStart = e.touches[0].clientX;

        });

        gameContainer.addEventListener('touchmove', (e) => {

            if (camTouchStart !== null && !window.GameHandler.joystick.active) {

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

            window.localScript.startGameLoops();

        }

    }, 100);

});

