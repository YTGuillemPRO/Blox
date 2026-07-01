class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;
        this.maxHealth = 100;
        this.playerName = 'Player_Clasic';

        this.initUI();
        this.initChat();
        this.initGameButtons();
        this.syncPlayerName();
        this.startGameLoops();
    }

    initUI() {
        this.moneyDisplay = document.getElementById('money-amount');
        this.healthFill = document.getElementById('health-fill');
        this.healthLabel = document.getElementById('health-label');
        this.lbMoney = document.getElementById('lb-money');
        this.updateUI();
    }

    formatMoney(n) {
        return Number(n).toLocaleString('en-US');
    }

    updateUI() {
        const moneyStr = this.formatMoney(this.playerMoney);
        if (this.moneyDisplay) this.moneyDisplay.innerText = moneyStr;
        if (this.lbMoney) this.lbMoney.innerText = `${moneyStr} R$`;

        if (this.healthFill) {
            this.healthFill.style.width = `${(this.playerHealth / this.maxHealth) * 100}%`;
        }
        if (this.healthLabel) this.healthLabel.innerText = `${this.playerHealth}/${this.maxHealth}`;

        // Color dinámico de la barra
        if (this.healthFill) {
            const pct = this.playerHealth / this.maxHealth;
            if (pct < 0.3) {
                this.healthFill.style.background = 'linear-gradient(to bottom, #ff5e5e 0%, #d63d3d 60%, #a82020 100%)';
            } else if (pct < 0.6) {
                this.healthFill.style.background = 'linear-gradient(to bottom, #ffce5e 0%, #f0a000 60%, #c47c00 100%)';
            } else {
                this.healthFill.style.background = 'linear-gradient(to bottom, #00d68b 0%, #00b06f 60%, #008c58 100%)';
            }
        }
    }

    syncPlayerName() {
        if (window.GameHandler?.setPlayerName) {
            window.GameHandler.setPlayerName(this.playerName);
        }
    }

    escapeHTML(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    initChat() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        if (!chatInput || !chatMessages) return;

        const send = () => {
            const text = chatInput.value.trim();
            chatInput.value = '';
            chatInput.blur();

            if (!text) return;

            // Comandos especiales tipo Roblox
            if (text.startsWith('/e ')) {
                // Emote — placeholder: aparece como mensaje en globo
                const emote = text.slice(3).trim();
                if (window.GameHandler?.showChatBubble) {
                    window.GameHandler.showChatBubble(`* ${this.escapeHTML(emote)}`);
                }
                return;
            }

            // Mensaje normal al chat
            const msg = document.createElement('div');
            msg.innerHTML = `<b style="color:#1e90ff;">[${this.escapeHTML(this.playerName)}]:</b> ${this.escapeHTML(text)}`;
            chatMessages.appendChild(msg);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Globo 3D
            if (window.GameHandler?.showChatBubble) {
                window.GameHandler.showChatBubble(text);
            }
        };

        chatInput.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                send();
            } else if (e.key === 'Escape') {
                chatInput.value = '';
                chatInput.blur();
            }
        });

        // Auto-enfocar al hacer click en el chat
        chatInput.addEventListener('focus', () => {
            if (document.pointerLockElement) document.exitPointerLock();
        });

        // Limpiar marcadores visuales de daño en el chat (sistema)
        const sysMsg = () => {
            const m = document.createElement('div');
            m.innerHTML = `<b style="color:#1e90ff;">[Sistema]:</b> Algo te ha golpeado... (-25 HP)`;
            chatMessages.appendChild(m);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        this._systemMsg = sysMsg;
    }

    initGameButtons() {
        const buttons = document.querySelectorAll('.game-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const name = btn.textContent.trim();
                const chatMessages = document.getElementById('chat-messages');
                if (chatMessages) {
                    const m = document.createElement('div');
                    m.innerHTML = `<b style="color:#1e90ff;">[Sistema]:</b> Cambiando a <b>${this.escapeHTML(name)}</b>... (no implementado todavía)`;
                    chatMessages.appendChild(m);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            });
        });
    }

    startGameLoops() {
        // +10 R$ cada 3s (economía pasiva)
        setInterval(() => {
            this.playerMoney += 10;
            this.updateUI();
        }, 3000);

        // Daño simulado a los 5s
        setTimeout(() => {
            this.playerHealth = Math.max(0, this.playerHealth - 25);
            this.updateUI();
            if (this._systemMsg) this._systemMsg();
        }, 5000);

        // Más daño a los 10s
        setTimeout(() => {
            this.playerHealth = 20;
            this.updateUI();
            if (this._systemMsg) this._systemMsg();
        }, 10000);
    }
}

window.addEventListener('load', () => {
    const check = setInterval(() => {
        if (window.GameHandler && window.GameHandler.scene) {
            clearInterval(check);
            window.LocalGameScript = new LocalGameScript();
        }
    }, 100);
});
