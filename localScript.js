class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;

        this.initAuthMockup(); // <-- Cambia esto a tu código de Firebase luego
        this.initUI();
        this.initChat();
        this.startGameLoops();
    }

    initAuthMockup() {
        const authScreen = document.getElementById('auth-screen');
        const gameHud = document.getElementById('game-hud');

        document.getElementById('btn-login').addEventListener('click', () => {
            // Aquí iría: firebase.auth().signInWithEmailAndPassword(email, pass)...
            authScreen.style.opacity = '0';
            setTimeout(() => { authScreen.style.display = 'none'; gameHud.style.display = 'block'; }, 500);
        });

        document.getElementById('btn-register').addEventListener('click', () => {
            // Aquí iría: firebase.auth().createUserWithEmailAndPassword(email, pass)...
            alert('Función lista para conectar con Firebase Auth');
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
                    const msg = document.createElement('div');
                    msg.innerHTML = `<span style="color: #00a2ff; font-weight: bold;">Player_Clasic:</span> ${text}`;
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
        setInterval(() => {
            this.playerMoney += 10;
            this.updateUI();
        }, 3000);

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
