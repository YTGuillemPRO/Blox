class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;

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
        
        if(this.playerHealth < 30) {
            this.healthFill.style.backgroundColor = '#CC0000';
        } else {
            this.healthFill.style.backgroundColor = '#00CC00';
        }
    }

    initChat() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        // Asegurarnos de que el input siempre reciba el evento keydown
        chatInput.addEventListener('keydown', (e) => {
            // e.stopPropagation() evita que otros listeners del documento interfieran
            e.stopPropagation(); 
            
            if (e.key === 'Enter') {
                e.preventDefault(); // Evita saltos de línea o comportamientos raros
                const text = chatInput.value.trim();
                
                if (text !== '') {
                    // 1. Añadir al historial del chat
                    const msg = document.createElement('div');
                    msg.innerHTML = `<b style="color: #000;">[Player_Clasic]:</b> ${text}`;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    // 2. Mostrar el globo de chat encima del personaje en 3D
                    if (window.GameHandler && window.GameHandler.showChatBubble) {
                        window.GameHandler.showChatBubble(text);
                    }
                    
                    // 3. Limpiar input y quitar foco
                    chatInput.value = '';
                    chatInput.blur(); 
                } else {
                    // Si está vacío y presiona enter, simplemente quitar el foco
                    chatInput.blur();
                }
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

window.addEventListener('load', () => {
    const checkGameHandler = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(checkGameHandler);
            console.log("Motor 3D listo. Iniciando LocalScript...");
            window.localScript = new LocalGameScript();
        }
    }, 100);
});
