import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, update, onValue, onDisconnect, remove, get } from 'firebase/database';

class LocalGameScript {
    constructor() {
        this.playerHealth = 100;
        this.playerKills = 0;
        this.initFirebase();
        this.initUI();
        this.initChat();
        this.initMobileControls();
        this.initPauseMenu();
        this.startGameLoops();
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

        document.getElementById('btn-play-pvp').addEventListener('click', () => {
            homeScreen.style.display = 'none';
            gameHud.style.display = 'block';
            window.GameHandler.startGameMode('pvp');
            this.setupMultiplayer();
            this.playerHealth = 100;
            this.playerKills = 0;
            this.updateUI();
        });

        document.getElementById('btn-play-lemons').addEventListener('click', () => {
            homeScreen.style.display = 'none';
            gameHud.style.display = 'block';
            window.GameHandler.startGameMode('lemons');
        });
    }

    // --- FILTRO DE PALABROTAS ---
    filterMessage(text) {
        const badWords = ["puta", "mierda", "joder", "cabron", "imbecil", "culo", "polla", "coño", "maricon", "puto", "puta"];
        let filtered = text.toLowerCase();
        badWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            filtered = filtered.replace(regex, '*'.repeat(word.length));
        });
        return filtered;
    }

    setupMultiplayer() {
        const user = this.auth.currentUser;
        if (!user) return;
        
        const playerName = user.email.split('@')[0];
        this.myId = user.uid;
        this.myFriends = [];
        this.lastHitProcessed = ""; // Para evitar procesar el mismo golpe dos veces
        
        const friendsRef = ref(this.db, 'users/' + this.myId + '/friends');
        get(friendsRef).then((snapshot) => { if (snapshot.exists()) this.myFriends = Object.keys(snapshot.val()); });
        onValue(friendsRef, (snapshot) => { this.myFriends = snapshot.exists() ? Object.keys(snapshot.val()) : []; this.updatePlayersListUI(); });

        this.playerRef = ref(this.db, 'players/' + this.myId);
        onDisconnect(this.playerRef).remove();
        
        update(this.playerRef, {
            name: playerName,
            x: -35, y: 1, z: 0, ry: 0,
            chat: "",
            hp: 100,
            kills: this.playerKills,
            lastHitBy: ""
        });

        const playersRef = ref(this.db, 'players');
        onValue(playersRef, (snapshot) => {
            const data = snapshot.val();
            this.currentPlayersData = data || {};
            const currentIds = [];
            
            if (data) {
                for (const id in data) {
                    currentIds.push(id);
                    if (id !== this.myId) {
                        window.GameHandler.updateRemotePlayer(id, data[id]);
                    } else {
                        // Si soy yo, comprobar si me han golpeado
                        if (data[id].lastHitBy && data[id].lastHitBy !== "" && data[id].lastHitBy !== this.lastHitProcessed) {
                            this.lastHitProcessed = data[id].lastHitBy;
                            window.GameHandler.takeDamage(10); // Recibir 10 de daño
                            this.playerHealth -= 10;
                            
                            if (this.playerHealth <= 0) {
                                // Morí
                                this.playerHealth = 100;
                                window.GameHandler.resetPlayer();
                                // Añadir kill al asesino
                                const killerId = data[id].lastHitBy;
                                if (this.currentPlayersData[killerId]) {
                                    const killerKills = (this.currentPlayersData[killerId].kills || 0) + 1;
                                    update(ref(this.db, 'players/' + killerId), { kills: killerKills });
                                }
                            }
                            
                            // Limpiar mi lastHitBy y actualizar mi vida
                            update(this.playerRef, { hp: this.playerHealth, lastHitBy: "" });
                            this.updateUI();
                        }
                    }
                }
            }
            
            for (const id in window.GameHandler.otherPlayers) {
                if (!currentIds.includes(id)) window.GameHandler.removeRemotePlayer(id);
            }
            this.updatePlayersListUI();
        });

        // Callback cuando mi personaje golpea a alguien
        window.GameHandler.onHitCallback = (targetId) => {
            if (targetId === "bot") {
                window.GameHandler.damageEnemy(20);
            } else {
                // Decirle a Firebase que le di a targetId
                update(ref(this.db, 'players/' + targetId), { lastHitBy: this.myId });
            }
        };

        // Callback cuando mato al bot
        window.GameHandler.onKillCallback = () => {
            this.playerKills++;
            this.updateUI();
        };

        setInterval(() => {
            if (window.GameHandler.player) {
                const p = window.GameHandler.player;
                update(this.playerRef, {
                    x: p.position.x, y: p.position.y, z: p.position.z,
                    ry: p.rotation.y,
                    kills: this.playerKills
                });
            }
        }, 100);
    }

    initPauseMenu() {
        const pauseMenu = document.getElementById('pause-menu');
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('game-hud').style.display === 'block') {
                    const isPaused = pauseMenu.style.display === 'flex';
                    if (isPaused) { pauseMenu.style.display = 'none'; window.GameHandler.isPaused = false; }
                    else { pauseMenu.style.display = 'flex'; window.GameHandler.isPaused = true; this.updatePlayersListUI(); }
                }
            }
        });

        document.getElementById('btn-resume').addEventListener('click', () => { pauseMenu.style.display = 'none'; window.GameHandler.isPaused = false; });
        document.getElementById('btn-reset').addEventListener('click', () => { window.GameHandler.resetPlayer(); pauseMenu.style.display = 'none'; window.GameHandler.isPaused = false; });
        document.getElementById('btn-leave').addEventListener('click', () => {
            if (this.playerRef) remove(this.playerRef);
            pauseMenu.style.display = 'none'; window.GameHandler.isPaused = false;
            window.GameHandler.cleanupGame();
            document.getElementById('game-hud').style.display = 'none';
            document.getElementById('home-screen').style.display = 'flex';
        });
    }

    updatePlayersListUI() {
        const listContainer = document.getElementById('server-players-list');
        listContainer.innerHTML = '';
        if (!this.currentPlayersData) return;

        for (const id in this.currentPlayersData) {
            const player = this.currentPlayersData[id];
            const div = document.createElement('div'); div.className = 'player-item';
            const nameSpan = document.createElement('span'); nameSpan.className = 'player-name';
            nameSpan.innerText = player.name + (id === this.myId ? " (Tú)" : "");
            div.appendChild(nameSpan);
            if (id !== this.myId) {
                const btn = document.createElement('button'); btn.className = 'add-friend-btn';
                if (this.myFriends.includes(id)) { btn.innerText = 'Amigos'; btn.disabled = true; btn.style.background = '#555'; }
                else { btn.innerText = 'Agregar'; btn.addEventListener('click', () => this.addFriend(id)); }
                div.appendChild(btn);
            }
            listContainer.appendChild(div);
        }
    }

    addFriend(friendId) {
        const friendsRef = ref(this.db, 'users/' + this.myId + '/friends');
        update(friendsRef, { [friendId]: true }).then(() => { this.myFriends.push(friendId); this.updatePlayersListUI(); });
    }

    initUI() {
        this.healthFill = document.getElementById('health-fill');
        this.killsCounter = document.getElementById('kills-counter');
        this.lbKills = document.getElementById('lb-kills');
        this.updateUI();
    }

    updateUI() {
        if (this.healthFill) this.healthFill.style.width = `${this.playerHealth}%`;
        if (this.killsCounter) this.killsCounter.innerText = this.playerKills;
        if (this.lbKills) this.lbKills.innerText = `${this.playerKills} Kills`;
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
                    
                    // Filtrar palabrotas
                    const cleanText = this.filterMessage(text);
                    
                    const msg = document.createElement('div');
                    msg.innerHTML = `<span style="color: #00a2ff; font-weight: bold;">${playerName}:</span> ${cleanText}`;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    if (window.GameHandler && window.GameHandler.showChatBubble) {
                        window.GameHandler.showChatBubble(cleanText);
                    }
                    
                    if (this.playerRef) {
                        update(this.playerRef, { chat: cleanText });
                        setTimeout(() => { update(this.playerRef, { chat: "" }); }, 4000);
                    }
                    chatInput.value = ''; chatInput.blur(); 
                } else { chatInput.blur(); }
            }
        });
    }

    initMobileControls() {
        const base = document.getElementById('joystick-base');
        const thumb = document.getElementById('joystick-thumb');
        const gameContainer = document.getElementById('game-container');
        let joyTouchId = null, joyStartX = 0, joyStartY = 0;
        let camTouchId = null, camLastX = 0, camLastY = 0;

        gameContainer.addEventListener('touchstart', (e) => {
            if (window.GameHandler.isPaused) return;
            for (let touch of e.changedTouches) {
                if (touch.target.tagName === 'BUTTON' || touch.target.tagName === 'INPUT') continue;
                if (touch.clientX < window.innerWidth / 2 && joyTouchId === null) {
                    joyTouchId = touch.identifier; joyStartX = touch.clientX; joyStartY = touch.clientY;
                    base.style.display = 'block'; base.style.left = (joyStartX - 60) + 'px'; base.style.top = (joyStartY - 60) + 'px';
                    thumb.style.left = '50%'; thumb.style.top = '50%'; window.GameHandler.joystick.active = true;
                } else if (touch.clientX >= window.innerWidth / 2 && camTouchId === null) {
                    camTouchId = touch.identifier; camLastX = touch.clientX; camLastY = touch.clientY;
                }
            }
        }, { passive: false });

        gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (window.GameHandler.isPaused) return;
            for (let touch of e.changedTouches) {
                if (touch.identifier === joyTouchId) {
                    let dx = touch.clientX - joyStartX; let dy = touch.clientY - joyStartY;
                    let dist = Math.min(50, Math.sqrt(dx*dx + dy*dy)); let angle = Math.atan2(dy, dx);
                    thumb.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`; thumb.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;
                    window.GameHandler.joystick.x = Math.cos(angle) * dist / 50; window.GameHandler.joystick.y = Math.sin(angle) * dist / 50;
                } else if (touch.identifier === camTouchId) {
                    let dx = touch.clientX - camLastX; let dy = touch.clientY - camLastY;
                    window.GameHandler.cameraAngle -= dx * 0.005;
                    window.GameHandler.cameraPitch = Math.max(-0.2, Math.min(0.8, window.GameHandler.cameraPitch + dy * 0.005));
                    camLastX = touch.clientX; camLastY = touch.clientY;
                }
            }
        }, { passive: false });

        const handleTouchEnd = (e) => {
            for (let touch of e.changedTouches) {
                if (touch.identifier === joyTouchId) { joyTouchId = null; window.GameHandler.joystick.active = false; window.GameHandler.joystick.x = 0; window.GameHandler.joystick.y = 0; base.style.display = 'none'; }
                else if (touch.identifier === camTouchId) { camTouchId = null; }
            }
        };
        gameContainer.addEventListener('touchend', handleTouchEnd);
        gameContainer.addEventListener('touchcancel', handleTouchEnd);
    }

    startGameLoops() { /* Reservado para futuros loops */ }
}

window.addEventListener('load', () => {
    const checkGameHandler = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(checkGameHandler);
            window.localScript = new LocalGameScript();
        }
    }, 100);
});
