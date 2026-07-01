class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;
        this.isChatFocused = false;

        this.initUI();
        this.initChat();
        this.startGameLoops();
    }

    initUI() {
        this.moneyDisplay = document.getElementById('money-amount');
        this.healthFill = document.getElementById('health-fill');
        this.updateUI();
    }

    updateUI() {
        this.moneyDisplay.innerText = `${this.playerMoney} R$`;
        this.healthFill.style.width = `${this.playerHealth}%`;
        
        // Cambiar color de vida si está baja (clásico rojo)
        if(this.playerHealth < 30) {
            this.healthFill.style.backgroundColor = '#CC0000';
        } else {
            this.healthFill.style.backgroundColor = '#00CC00';
        }
    }

    initChat() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        chatInput.addEventListener('focus', () => {
            this.isChatFocused = true;
        });

        chatInput.addEventListener('blur', () => {
            this.isChatFocused = false;
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim() !== '') {
                const msg = document.createElement('div');
                // Formato clásico: [Player_Clasic]: mensaje
                msg.innerHTML = `<b style="color: #000;">[Player_Clasic]:</b> ${chatInput.value}`;
                chatMessages.appendChild(msg);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                chatInput.value = '';
                chatInput.blur();
            }
        });
    }

    startGameLoops() {
        // Economía: ganar 10 R$ cada 3 segundos
        setInterval(() => {
            this.playerMoney += 10;
            this.updateUI();
        }, 3000);

        // Simulación de daño por entorno
        setTimeout(() => {
            this.playerHealth = 75;
            this.updateUI();
        }, 5000);
        
        setTimeout(() => {
            this.playerHealth = 20;
            this.updateUI();
        }, 10000);
    }
}

// Esperar a que el DOM y el GameHandler estén listos
window.addEventListener('load', () => {
    const checkGameHandler = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(checkGameHandler);
            console.log("Motor 3D listo. Iniciando LocalScript...");
            window.localScript = new LocalGameScript();
        }
    }, 100);
});
