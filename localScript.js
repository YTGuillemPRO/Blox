import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, update, onValue, onDisconnect, remove, get } from 'firebase/database';

class LocalGameScript {
    constructor() {
        this.playerHealth = 100;
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

        document.getElementById('btn-play').addEventListener('click', () => {
            homeScreen.style.display = 'none';
            gameHud.style.display = 'block';
            window.GameHandler.startGame();
            this.setupMultiplayer();
        });
    }

    setupMultiplayer() {
        const user = this.auth.currentUser;
        if (!user) return;
        
        const playerName = user.email.split('@')[0];
        this.myId = user.uid;
        this.myFriends = []; // Cargar mis amigos
        
        // Cargar lista de amigos
        const friendsRef = ref(this.db, 'users/' + this.myId + '/friends');
        get(friendsRef).then((snapshot) => {
            if (snapshot.exists()) this.myFriends = Object.keys(snapshot.val());
        });
        onValue(friendsRef, (snapshot) => {
            this.myFriends = snapshot.exists() ? Object.keys(snapshot.val()) : [];
            this.updatePlayersListUI();
        });

        this.playerRef = ref(this.db, 'players/' + this.myId);
        onDisconnect(this.playerRef).remove();
        
        update(this.playerRef, {
            name: playerName,
            x: -35, y: 1, z: 0, ry: 0,
            chat: ""
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
                    }
                }
            }
            
            for (const id in window.GameHandler.otherPlayers) {
                if (!currentIds.includes(id)) {
                    window.GameHandler.removeRemotePlayer(id);
                }
            }
            
            this.updatePlayersListUI(); // Actualizar menú de pausa
        });

        setInterval(() => {
            if (window.GameHandler.player) {
                const p = window.GameHandler.player;
                update(this.playerRef, {
                    x: p.position.x, y: p.position.y, z: p.position.z,
                    ry: p.rotation.y
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
                    if (isPaused) {
                        pauseMenu.style.display = 'none';
                        window.GameHandler.isPaused = false;
                    } else {
                        pauseMenu.style.display = 'flex';
                        window.GameHandler.isPaused = true;
                        this.updatePlayersListUI();
                    }
                }
            }
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            pauseMenu.style.display = 'none';
            window.GameHandler.isPaused = false;
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            window.GameHandler.resetPlayer();
            pauseMenu.style.display = 'none';
            window.GameHandler.isPaused = false;
        });

        document.getElementById('btn-leave').addEventListener('click', () => {
            remove(this.playerRef); // Salir del servidor
            pauseMenu.style.display = 'none';
            window.GameHandler.isPaused = false;
            document.getElementById('game-hud').style.display = 'none';
            document.getElementById('home-screen').style.display = 'flex';
        });
    }

    updatePlayersListUI() {
        const listContainer = document.getElementById('server-players-list');
        listContainer.innerHTML = ''; // Limpiar
        
        if (!this.currentPlayersData) return;

        for (const id in this.currentPlayersData) {
            const player = this.currentPlayersData[id];
            const div = document.createElement('div');
            div.className = 'player-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.innerText = player.name + (id === this.myId ? " (Tú)" : "");
            
            div.appendChild(nameSpan);

            if (id !== this.myId) {
                const btn = document.createElement('button');
                btn.className = 'add-friend-btn';
                
                if (this.myFriends.includes(id)) {
                    btn.innerText = 'Amigos';
                    btn.disabled = true;
                    btn.style.background = '#555';
                } else {
                    btn.innerText = 'Agregar';
                    btn.addEventListener('click', () => this.addFriend(id));
                }
                div.appendChild(btn);
            }
            
            listContainer.appendChild(div);
        }
    }

    addFriend(friendId) {
        const friendsRef = ref(this.db, 'users/' + this.myId + '/friends');
        update(friendsRef, { [friendId]: true }).then(() => {
            console.log("Amigo agregado!");
            this.myFriends.push(friendId);
            this.updatePlayersListUI();
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
                    
                    if (this.playerRef) {
                        update(this.playerRef, { chat: text });
                        setTimeout(() => { update(this.playerRef, { chat: "" }); }, 4000);
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
