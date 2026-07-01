class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;
        this.maxHealth = 100;
        this.playerName = 'Player_Clasic';

        this.initUI();
        this.initPanels();
        this.initChat();
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

        if (this.healthFill) {
            const pct = this.playerHealth / this.maxHealth;
            if (pct < 0.3) {
                this.healthFill.style.background = 'linear-gradient(to bottom, #ff5e5e 0%, #d63d3d 60%, #a82020 100%)';
            } else if (pct < 0.6) {
                this.healthFill.style.background = 'linear-gradient(to bottom, #ffce5e 0%, #f0a000 60%, #c47c00 100%)';
            } else {
                this.healthFill.style.background = 'linear-gradient(to bottom, #00e08a 0%, #00b06f 60%, #008c58 100%)';
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

    /* =============================================================
       PANELS (sidebar, players, game menu) — toggles con un click
       ============================================================= */
    initPanels() {
        // Hamburger → sidebar
        const burger = document.getElementById('rb-hamburger');
        const sb = document.getElementById('rb-sidebar');
        if (burger && sb) {
            burger.addEventListener('click', (e) => {
                e.stopPropagation();
                sb.classList.toggle('open');
                burger.classList.toggle('open');
                this.closeAllPanels(sb, burger);
            });
        }

        // Sidebar items (decorativos)
        document.querySelectorAll('.sb-item').forEach(item => {
            item.addEventListener('click', () => {
                if (sb) sb.classList.remove('open');
                if (burger) burger.classList.remove('open');
                const name = item.textContent.trim();
                this.sysMsg(`Abriendo <b>${this.escapeHTML(name)}</b>... (no implementado)`);
            });
        });

        // Players panel toggle
        const playersToggle = document.getElementById('players-toggle');
        const playersList = document.getElementById('players-list');
        if (playersToggle && playersList) {
            playersToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                playersList.classList.toggle('open');
                this.closeAllPanels(playersList);
            });
        }

        // Game menu toggle (botón ≡ Menú)
        const menuBtn = document.getElementById('rb-menu-btn');
        const gameMenu = document.getElementById('game-menu');
        if (menuBtn && gameMenu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                gameMenu.classList.toggle('open');
                this.closeAllPanels(gameMenu);
                // Mostrar/ocultar hint al abrir el menú
                const hint = document.getElementById('help-hint');
                if (hint) {
                    if (gameMenu.classList.contains('open')) {
                        hint.classList.add('show');
                        setTimeout(() => hint.classList.remove('show'), 3000);
                    }
                }
            });
        }

        // Acciones del menú
        document.querySelectorAll('.gm-item').forEach(item => {
            item.addEventListener('click', () => {
                const act = item.dataset.act;
                if (act === 'resume') {
                    gameMenu.classList.remove('open');
                } else if (act === 'leave') {
                    if (confirm('¿Seguro que quieres salir del juego?')) {
                        this.sysMsg('Has salido del juego.');
                        gameMenu.classList.remove('open');
                    }
                } else if (act === 'settings') {
                    this.sysMsg('Ajustes no disponibles todavía.');
                } else if (act === 'help') {
                    this.sysMsg('WASD para moverte. Espacio para saltar. Click en el juego para rotar la cámara.');
                }
            });
        });

        // Respawn
        const respawn = document.getElementById('respawn-btn');
        if (respawn) {
            respawn.addEventListener('click', () => {
                if (window.GameHandler?.respawn) window.GameHandler.respawn();
                this.playerHealth = this.maxHealth;
                this.updateUI();
                this.sysMsg('Has respawneado.');
            });
        }

        // Backpack (decorativo)
        const bp = document.getElementById('backpack-btn');
        if (bp) {
            bp.addEventListener('click', () => {
                this.sysMsg('Mochila: 2/9 espacios usados. (decorativo)');
            });
        }

        // ESC → toggle game menu
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Si un panel lateral está abierto, cerrarlo
                if (gameMenu?.classList.contains('open')) {
                    gameMenu.classList.remove('open');
                    e.preventDefault();
                    return;
                }
                if (sb?.classList.contains('open')) {
                    sb.classList.remove('open');
                    burger?.classList.remove('open');
                    e.preventDefault();
                    return;
                }
                if (playersList?.classList.contains('open')) {
                    playersList.classList.remove('open');
                    e.preventDefault();
                    return;
                }
                // Si no, abrir el menú
                if (gameMenu && !this.isChatFocused()) {
                    gameMenu.classList.toggle('open');
                    if (menuBtn) menuBtn.classList.add('show');
                }
            } else if (e.key === 'Enter' && !this.isChatFocused()) {
                // ENTER (sin chat abierto) → abrir chat
                const cc = document.getElementById('chat-container');
                if (cc && !cc.classList.contains('open')) {
                    cc.classList.add('open');
                    setTimeout(() => {
                        const ci = document.getElementById('chat-input');
                        if (ci) ci.focus();
                    }, 50);
                }
            }
        });

        // Click fuera de paneles → cerrarlos
        document.addEventListener('click', (e) => {
            if (gameMenu?.classList.contains('open')
                && !gameMenu.contains(e.target)
                && e.target !== menuBtn
                && !menuBtn?.contains(e.target)) {
                gameMenu.classList.remove('open');
            }
            if (playersList?.classList.contains('open')
                && !playersList.contains(e.target)
                && e.target !== playersToggle
                && !playersToggle?.contains(e.target)) {
                playersList.classList.remove('open');
            }
        });
    }

    closeAllPanels(except) {
        // Cierra otros paneles abiertos (excepto el que se acaba de abrir)
        const all = [
            document.getElementById('game-menu'),
            document.getElementById('players-list'),
        ];
        all.forEach(p => {
            if (p && p !== except && p.classList.contains('open')) {
                p.classList.remove('open');
            }
        });
    }

    isChatFocused() {
        const active = document.activeElement;
        return active && active.id === 'chat-input';
    }

    /* =============================================================
       CHAT — toggle pill <-> ventana
       ============================================================= */
    initChat() {
        const chatContainer = document.getElementById('chat-container');
        const chatToggle = document.getElementById('chat-toggle');
        const chatClose = document.getElementById('chat-close');
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');

        if (chatToggle && chatContainer) {
            chatToggle.addEventListener('click', () => {
                chatContainer.classList.add('open');
                setTimeout(() => chatInput?.focus(), 50);
            });
        }

        if (chatClose && chatContainer) {
            chatClose.addEventListener('click', () => {
                chatContainer.classList.remove('open');
                if (chatInput) chatInput.value = '';
            });
        }

        if (chatInput && chatMessages) {
            chatInput.addEventListener('keydown', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const text = chatInput.value.trim();
                    chatInput.value = '';

                    if (!text) {
                        chatContainer.classList.remove('open');
                        chatInput.blur();
                        return;
                    }

                    if (text.startsWith('/e ')) {
                        const emote = text.slice(3).trim();
                        if (window.GameHandler?.showChatBubble) {
                            window.GameHandler.showChatBubble(`* ${this.escapeHTML(emote)}`);
                        }
                        return;
                    }

                    const msg = document.createElement('div');
                    msg.innerHTML = `<b style="color:#1e90ff;">[${this.escapeHTML(this.playerName)}]:</b> ${this.escapeHTML(text)}`;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    if (window.GameHandler?.showChatBubble) {
                        window.GameHandler.showChatBubble(text);
                    }

                    // Mantener chat abierto tras enviar (estilo Roblox moderno)
                    setTimeout(() => chatInput.focus(), 50);
                } else if (e.key === 'Escape') {
                    chatInput.value = '';
                    chatContainer.classList.remove('open');
                    chatInput.blur();
                }
            });

            chatInput.addEventListener('focus', () => {
                if (document.pointerLockElement) document.exitPointerLock();
            });
        }
    }

    sysMsg(text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        const m = document.createElement('div');
        m.innerHTML = `<b style="color:#1e90ff;">[Sistema]:</b> ${text}`;
        chatMessages.appendChild(m);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* =============================================================
       GAME LOOPS — dinero pasivo, daño por entorno
       ============================================================= */
    startGameLoops() {
        setInterval(() => {
            this.playerMoney += 10;
            this.updateUI();
        }, 3000);

        setTimeout(() => {
            this.playerHealth = Math.max(0, this.playerHealth - 25);
            this.updateUI();
            this.sysMsg('Algo te ha golpeado... (-25 HP)');
        }, 5000);

        setTimeout(() => {
            this.playerHealth = 20;
            this.updateUI();
            this.sysMsg('Has caído al vacío... (-HP)');
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
