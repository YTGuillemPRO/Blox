class LocalGameScript {
    constructor() {
        this.playerMoney = 1000;
        this.playerHealth = 100;
        this.maxHealth = 100;
        this.playerName = 'Player_Clasic';
        this.currentGame = 'crossroads';

        this.games = [
            { id: 'crossroads', title: 'Crossroads', emoji: '🏙️', gradient: 'linear-gradient(135deg, #667eea, #764ba2)', creator: 'Roblox', players: '12,540 jugando', rating: 92, playable: true },
            { id: 'obby',       title: 'Mega Obby', emoji: '🟩', gradient: 'linear-gradient(135deg, #f093fb, #f5576c)', creator: 'Builderman', players: '34,210 jugando', rating: 78, playable: true },
            { id: 'tower',      title: 'Torre Infernal', emoji: '🏢', gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)', creator: 'Shedletsky', players: '8,920 jugando', rating: 85, playable: true },
            { id: 'soccer',     title: 'Cancha de Fútbol', emoji: '⚽', gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)', creator: 'Stickmaster', players: '5,640 jugando', rating: 88, playable: true },
            { id: 'diner',      title: 'Diner Familiar', emoji: '🍔', gradient: 'linear-gradient(135deg, #fa709a, #fee140)', creator: 'ChefMike', players: '2,130 jugando', rating: 95, playable: false },
            { id: 'adventure',  title: 'Aventura Épica', emoji: '⚔️', gradient: 'linear-gradient(135deg, #a8edea, #fed6e3)', creator: 'EpicDev', players: '19,300 jugando', rating: 89, playable: false },
            { id: 'house',      title: 'Casa de Lujo', emoji: '🏡', gradient: 'linear-gradient(135deg, #fddb92, #d1fdff)', creator: 'ArchitectPro', players: '4,210 jugando', rating: 96, playable: false },
            { id: 'kart',       title: 'Carrera Kart', emoji: '🏎️', gradient: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', creator: 'RaceKing', players: '7,890 jugando', rating: 81, playable: false },
            { id: 'tycoon',     title: 'Tycoon Minijuegos', emoji: '💰', gradient: 'linear-gradient(135deg, #ffeaa7, #fdcb6e)', creator: 'TycoonMaster', players: '15,400 jugando', rating: 87, playable: false },
            { id: 'obby2',      title: 'Obby de Lava', emoji: '🌋', gradient: 'linear-gradient(135deg, #ff6e7f, #bfe9ff)', creator: 'LavaKing', players: '11,050 jugando', rating: 84, playable: false },
            { id: 'prison',     title: 'Prisión Escape', emoji: '🔒', gradient: 'linear-gradient(135deg, #5f72be, #9921e8)', creator: 'EscapeArtist', players: '6,420 jugando', rating: 76, playable: false },
            { id: 'pool',       title: 'Fiesta Piscina', emoji: '🏊', gradient: 'linear-gradient(135deg, #00c6ff, #0072ff)', creator: 'PartyHost', players: '3,290 jugando', rating: 91, playable: false },
        ];

        this.profanityList = [
            'puta', 'puto', 'putas', 'putos', 'putita', 'putito',
            'mierda', 'mierdas', 'cabron', 'cabrones', 'cabrona',
            'coño', 'cojones', 'cojon', 'joder', 'jodido', 'jodida', 'jodete',
            'gilipollas', 'gilipolla', 'pendejo', 'pendeja', 'pendejos',
            'verga', 'vergas', 'carajo', 'carajos',
            'cagada', 'cagado', 'cagón', 'culero', 'culera',
            'chingar', 'chingada', 'chingado', 'chingados', 'chinga',
            'follar', 'follada', 'follado', 'zorra', 'zorras',
            'mamón', 'mamona', 'mamones', 'mames', 'mamey',
            'pollas', 'polla', 'porno',
            'fuck', 'fucking', 'fucker', 'shit', 'shitty', 'shits',
            'bitch', 'bitches', 'bitching', 'asshole', 'assholes',
            'dick', 'dicks', 'piss', 'pissed', 'cunt', 'cunts',
            'damn', 'damned', 'dammit', 'crap', 'crappy',
            'bastard', 'bastards', 'motherfucker',
            'idiota', 'idiotas',
        ];

        this.initUI();
        this.initDiscover();
        this.initPanels();
        this.initChat();
        this.initMinimap();
        this.syncPlayerName();
        this.setupGameEvents();
        this.startGameLoops();
    }

    censorText(text) {
        if (!text) return { text, dirty: false };
        let censored = text;
        let dirty = false;
        for (const word of this.profanityList) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            censored = censored.replace(regex, (matched) => {
                dirty = true;
                if (matched.length <= 2) return '*'.repeat(Math.max(1, matched.length));
                return matched[0] + '*'.repeat(Math.max(1, matched.length - 2)) + matched[matched.length - 1];
            });
        }
        return { text: censored, dirty };
    }

    escapeHTML(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    formatMoney(n) { return Number(n).toLocaleString('en-US'); }

    initUI() {
        this.moneyDisplay = document.getElementById('money-amount');
        this.healthFill = document.getElementById('health-fill');
        this.healthLabel = document.getElementById('health-label');
        this.lbMoney = document.getElementById('lb-money');
        this.gameTitle = document.getElementById('game-title-text');
        this.updateUI();
    }

    updateUI() {
        const moneyStr = this.formatMoney(this.playerMoney);
        if (this.moneyDisplay) this.moneyDisplay.innerText = moneyStr;
        if (this.lbMoney) this.lbMoney.innerText = `${moneyStr} R$`;
        if (this.healthFill) this.healthFill.style.width = `${(this.playerHealth / this.maxHealth) * 100}%`;
        if (this.healthLabel) this.healthLabel.innerText = `${this.playerHealth}/${this.maxHealth}`;
        if (this.healthFill) {
            const pct = this.playerHealth / this.maxHealth;
            if (pct < 0.3) this.healthFill.style.background = 'linear-gradient(to bottom, #ff5e5e, #d63d3d, #a82020)';
            else if (pct < 0.6) this.healthFill.style.background = 'linear-gradient(to bottom, #ffce5e, #f0a000, #c47c00)';
            else this.healthFill.style.background = 'linear-gradient(to bottom, #00e08a, #00b06f, #008c58)';
        }
    }

    syncPlayerName() {
        if (window.GameHandler?.setPlayerName) window.GameHandler.setPlayerName(this.playerName);
    }

    /* ==========================================================
       DISCOVER OVERLAY
       ========================================================== */
    initDiscover() {
        const overlay = document.getElementById('discover-overlay');
        const content = document.getElementById('discover-content');
        if (!overlay || !content) return;

        const featured = this.games[0];
        const popular = this.games.slice(0, 4);
        const all = this.games;

        content.innerHTML = `
            <div class="featured-card" data-game="${featured.id}">
                <div class="featured-thumb" style="background: ${featured.gradient}">
                    <span class="featured-emoji">${featured.emoji}</span>
                    <div class="featured-info">
                        <h1>${this.escapeHTML(featured.title)}</h1>
                        <p>👥 ${this.escapeHTML(featured.players)} &nbsp;·&nbsp; ⭐ ${featured.rating}% &nbsp;·&nbsp; Por ${this.escapeHTML(featured.creator)}</p>
                        <button class="featured-play">▶ Jugar ahora</button>
                    </div>
                </div>
            </div>

            <div class="discover-section">
                <h3 class="disc-title">⭐ Populares ahora</h3>
                <div class="disc-grid">${popular.map(g => this.gameCardHTML(g)).join('')}</div>
            </div>

            <div class="discover-section">
                <h3 class="disc-title">🎮 Más juegos</h3>
                <div class="disc-grid">${all.map(g => this.gameCardHTML(g)).join('')}</div>
            </div>
        `;

        content.querySelectorAll('[data-game]').forEach(card => {
            card.addEventListener('click', () => this.openGame(card.dataset.game));
        });

        const back = document.getElementById('discover-back');
        if (back) back.addEventListener('click', () => overlay.classList.remove('open'));

        const search = document.getElementById('discover-search');
        if (search) {
            search.addEventListener('input', () => {
                const q = search.value.trim().toLowerCase();
                content.querySelectorAll('.game-card').forEach(card => {
                    const t = (card.dataset.title || '').toLowerCase();
                    card.style.display = !q || t.includes(q) ? '' : 'none';
                });
                content.querySelectorAll('.discover-section').forEach(sec => {
                    const has = Array.from(sec.querySelectorAll('.game-card')).some(c => c.style.display !== 'none');
                    sec.style.display = has ? '' : 'none';
                });
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                overlay.classList.remove('open');
                e.preventDefault();
            }
        });
    }

    gameCardHTML(g) {
        return `
            <div class="game-card ${g.playable ? 'playable' : 'soon'}" data-game="${g.id}" data-title="${this.escapeHTML(g.title)}">
                <div class="game-thumb" style="background: ${g.gradient}">
                    <span class="game-emoji">${g.emoji}</span>
                    ${g.playable ? '<span class="play-badge">▶ JUGABLE</span>' : '<span class="soon-badge">PRÓXIMAMENTE</span>'}
                </div>
                <div class="game-info">
                    <div class="game-title-2">${this.escapeHTML(g.title)}</div>
                    <div class="game-creator">Por ${this.escapeHTML(g.creator)}</div>
                    <div class="game-stats">
                        <span>👥 ${this.escapeHTML(g.players)}</span>
                        <span>⭐ ${g.rating}%</span>
                    </div>
                </div>
            </div>
        `;
    }

    openGame(id) {
        const game = this.games.find(g => g.id === id);
        if (!game) return;
        if (!game.playable) {
            this.sysMsg(`<b>${this.escapeHTML(game.title)}</b> aún no disponible. Próximamente.`);
            return;
        }
        document.getElementById('discover-overlay')?.classList.remove('open');
        if (document.pointerLockElement) document.exitPointerLock();
        this.loadGame(id);
    }

    loadGame(id) {
        if (!window.GameHandler) return;
        window.GameHandler.loadGame(id);
        this.currentGame = id;
        const game = this.games.find(g => g.id === id);
        if (game && this.gameTitle) this.gameTitle.textContent = game.title;
        this.playerHealth = this.maxHealth;
        this.updateUI();
        if (window.GameHandler.chatLabel) window.GameHandler.chatLabel.element.style.display = 'none';
        this.sysMsg(`Cargando <b>${this.escapeHTML(game.title)}</b>... ¡a jugar!`);
    }

    /* ==========================================================
       GAME EVENTS — confetti, banner, damage flash
       ========================================================== */
    setupGameEvents() {
        window.addEventListener('player-fell', () => {
            this.playerHealth = Math.max(0, this.playerHealth - 15);
            this.updateUI();
            this.flashDamage();
            this.sysMsg('💀 ¡Caíste al vacío! Volviendo al inicio (-15 HP)');
        });

        window.addEventListener('player-won', (e) => {
            this.playerMoney += 500;
            this.updateUI();
            const titles = {
                obby: '🎉 ¡Obby completado! +500 R$',
                tower: '🏆 ¡Cima de la Torre alcanzada! +500 R$',
            };
            this.sysMsg(titles[e.detail] || '🎉 ¡Victoria! +500 R$');
            this.celebrate();
            setTimeout(() => {
                if (window.GameHandler?.trophyPos !== undefined) window.GameHandler.trophyPos = null;
            }, 500);
        });

        window.addEventListener('player-scored', (e) => {
            this.playerMoney += 100;
            this.updateUI();
            const side = e.detail === 'left' ? 'izquierda' : 'derecha';
            this.sysMsg(`⚽ ¡GOOOOL! Portería ${side}. +100 R$`);
            this.celebrate(false);
        });
    }

    celebrate(fullVictory = true) {
        const pos = window.GameHandler?.player?.position;
        if (!pos) return;

        // Confetti
        const colors = fullVictory
            ? [0xff0044, 0x44ff66, 0x4488ff, 0xffff44, 0xff44ff, 0x44ffff]
            : [0x4cd964, 0x44ffff, 0xffff44, 0xffffff];

        if (window.GameHandler.emitParticles) {
            const p = pos.clone();
            p.y += 4;
            for (const c of colors) {
                window.GameHandler.emitParticles(p, {
                    count: fullVictory ? 22 : 18,
                    color: c,
                    size: 0.55,
                    speed: 12,
                    lifetime: fullVictory ? 2.7 : 2,
                    gravity: 13,
                    upwardBias: 0.7,
                    spread: 0.9
                });
            }
        }

        // Floating text
        if (window.GameHandler.showFloatingText) {
            const text = fullVictory ? '+500 R$' : '¡GOOOL! +100 R$';
            const color = fullVictory ? '#4cd964' : '#44ffaa';
            window.GameHandler.showFloatingText(text, color, pos);
        }

        if (fullVictory) this.showVictoryBanner();
    }

    showVictoryBanner() {
        const banner = document.createElement('div');
        banner.innerHTML = '🏆 ¡VICTORIA!';
        banner.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0.5);
            background: linear-gradient(135deg, #ffd700, #ff8800);
            color: white;
            font: 800 60px 'Source Sans Pro';
            text-shadow: 0 4px 0 rgba(0,0,0,0.5), 0 0 30px rgba(255,200,0,0.6);
            padding: 20px 60px;
            border-radius: 18px;
            border: 4px solid white;
            box-shadow: 0 12px 40px rgba(255,140,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4);
            pointer-events: none;
            z-index: 250;
            letter-spacing: 6px;
            opacity: 0;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;
        document.body.appendChild(banner);
        requestAnimationFrame(() => {
            banner.style.opacity = '1';
            banner.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        setTimeout(() => {
            banner.style.transition = 'all 0.5s ease-in';
            banner.style.opacity = '0';
            banner.style.transform = 'translate(-50%, -60%) scale(0.7)';
        }, 1700);
        setTimeout(() => banner.remove(), 2300);
    }

    flashDamage() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: radial-gradient(circle, rgba(255,0,0,0.5), rgba(255,0,0,0.1));
            pointer-events: none;
            z-index: 50;
            opacity: 1;
            transition: opacity 0.6s ease-out;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.style.opacity = '0', 80);
        setTimeout(() => overlay.remove(), 700);
    }

    /* ==========================================================
       PANELS
       ========================================================== */
    initPanels() {
        const burger = document.getElementById('rb-hamburger');
        const sb = document.getElementById('rb-sidebar');
        if (burger && sb) {
            burger.addEventListener('click', (e) => {
                e.stopPropagation();
                sb.classList.toggle('open');
                burger.classList.toggle('open');
                this.closeAllPanels(sb);
            });
        }

        document.querySelectorAll('.sb-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.textContent.trim();
                if (sb) sb.classList.remove('open');
                if (burger) burger.classList.remove('open');
                if (name.includes('Descubrir')) {
                    document.getElementById('discover-overlay')?.classList.add('open');
                    return;
                }
                this.sysMsg(`Abriendo <b>${this.escapeHTML(name)}</b>... (no implementado)`);
            });
        });

        const playersToggle = document.getElementById('players-toggle');
        const playersList = document.getElementById('players-list');
        if (playersToggle && playersList) {
            playersToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                playersList.classList.toggle('open');
                this.closeAllPanels(playersList);
            });
        }

        const menuBtn = document.getElementById('rb-menu-btn');
        const gameMenu = document.getElementById('game-menu');
        if (menuBtn && gameMenu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                gameMenu.classList.toggle('open');
                this.closeAllPanels(gameMenu);
                const hint = document.getElementById('help-hint');
                if (gameMenu.classList.contains('open') && hint) {
                    hint.classList.add('show');
                    setTimeout(() => hint.classList.remove('show'), 3500);
                }
            });
        }

        document.querySelectorAll('.gm-item').forEach(item => {
            item.addEventListener('click', () => {
                const act = item.dataset.act;
                if (act === 'resume') gameMenu.classList.remove('open');
                else if (act === 'leave') {
                    if (confirm('¿Seguro que quieres salir del juego?')) {
                        this.sysMsg('Has salido del juego.');
                        gameMenu.classList.remove('open');
                    }
                } else if (act === 'settings') this.sysMsg('Ajustes del juego no disponibles.');
                else if (act === 'help') this.sysMsg('WASD moverse · Espacio saltar · Click derecho + arrastrar rotar cámara · Enter chat · ESC menú');
            });
        });

        const respawn = document.getElementById('respawn-btn');
        if (respawn) {
            respawn.addEventListener('click', () => {
                if (window.GameHandler?.respawn) window.GameHandler.respawn();
                this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 25);
                this.updateUI();
                this.sysMsg('↻ Has respawneado (+25 HP).');
            });
        }

        const bp = document.getElementById('backpack-btn');
        if (bp) bp.addEventListener('click', () => this.sysMsg('Mochila: 2/9 usados. (decorativo)'));

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('discover-overlay')?.classList.contains('open')) {
                    document.getElementById('discover-overlay').classList.remove('open');
                    e.preventDefault();
                    return;
                }
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
                if (gameMenu && !this.isChatFocused()) gameMenu.classList.toggle('open');
            } else if (e.key === 'Enter' && !this.isChatFocused() && !this.isUiOpen()) {
                const cc = document.getElementById('chat-container');
                if (cc && !cc.classList.contains('open')) {
                    cc.classList.add('open');
                    setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
                }
            }
        });

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

    isUiOpen() {
        return !!document.getElementById('discover-overlay')?.classList.contains('open')
            || !!document.getElementById('game-menu')?.classList.contains('open')
            || !!document.getElementById('rb-sidebar')?.classList.contains('open')
            || !!document.getElementById('players-list')?.classList.contains('open');
    }

    closeAllPanels(except) {
        const all = [
            document.getElementById('game-menu'),
            document.getElementById('players-list'),
        ];
        all.forEach(p => {
            if (p && p !== except && p.classList.contains('open')) p.classList.remove('open');
        });
    }

    isChatFocused() {
        const active = document.activeElement;
        return active && (active.id === 'chat-input' || active.id === 'discover-search');
    }

    /* ==========================================================
       CHAT (con censura)
       ========================================================== */
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
                    const rawText = chatInput.value.trim();
                    chatInput.value = '';
                    if (!rawText) {
                        chatContainer.classList.remove('open');
                        chatInput.blur();
                        return;
                    }
                    const { text: cleanText, dirty } = this.censorText(rawText);
                    if (rawText.startsWith('/e ')) {
                        const emote = this.censorText(rawText.slice(3).trim()).text;
                        if (window.GameHandler?.showChatBubble) {
                            window.GameHandler.showChatBubble(`* ${emote}`);
                        }
                        return;
                    }
                    const censoredBadge = dirty
                        ? ' <span style="color:#ff9966;font-size:11px;">(censurado)</span>'
                        : '';
                    const msg = document.createElement('div');
                    msg.innerHTML = `<b style="color:#1e90ff;">[${this.escapeHTML(this.playerName)}]:</b> ${this.escapeHTML(cleanText)}${censoredBadge}`;
                    chatMessages.appendChild(msg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    if (window.GameHandler?.showChatBubble) {
                        window.GameHandler.showChatBubble(cleanText);
                    }
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

    /* ==========================================================
       MINIMAPA — dibuja el radar circular
       ========================================================== */
    initMinimap() {
        const canvas = document.getElementById('minimap');
        if (!canvas) return;
        this.minimapCtx = canvas.getContext('2d');
        this.minimapCanvas = canvas;
        this.coordsDisplay = document.getElementById('minimap-coords');
        this.drawMinimap();
        setInterval(() => this.drawMinimap(), 80);
    }

    drawMinimap() {
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        const gh = window.GameHandler;
        if (!ctx || !canvas || !gh || !gh.player) return;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2, cy = h / 2;
        ctx.clearRect(0, 0, w, h);

        // Fondo según juego
        const game = gh.currentGame;
        if (game === 'soccer') ctx.fillStyle = '#2e8b57';
        else if (game === 'tower') ctx.fillStyle = '#1a3320';
        else ctx.fillStyle = '#1e3818';
        ctx.fillRect(0, 0, w, h);

        // Grid sutil
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 28) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let i = 0; i < h; i += 28) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        // Objetos estáticos
        const scale = 1.6;
        const px = gh.player.position.x;
        const pz = gh.player.position.z;

        if (gh.staticObjects) {
            for (const obj of gh.staticObjects) {
                const pos = obj.mesh.position;
                const dx = (pos.x - px) * scale;
                const dz = (pos.z - pz) * scale;
                const sx = cx + dx;
                const sy = cy + dz;
                const dist = Math.hypot(sx - cx, sy - cy);
                if (dist > w / 2 - 4) continue;
                ctx.fillStyle = obj.color || '#888';
                const sz = (obj.size || 4) * scale;
                if (sz < 2) {
                    ctx.fillRect(sx - 1, sy - 1, 2, 2);
                } else if (sz < 5) {
                    ctx.beginPath(); ctx.arc(sx, sy, sz / 2, 0, Math.PI * 2); ctx.fill();
                } else {
                    ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz);
                }
            }
        }

        // Cono de visión (cámara)
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, w / 2 - 4, gh.cameraYaw - 0.5, gh.cameraYaw + 0.5);
        ctx.closePath();
        ctx.fill();

        // Player
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

        // Triángulo de dirección
        const yaw = gh.player.rotation.y;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(yaw) * 14, cy + Math.cos(yaw) * 14);
        ctx.lineTo(cx - Math.sin(yaw + 2.6) * 6, cy - Math.cos(yaw + 2.6) * 6);
        ctx.lineTo(cx - Math.sin(yaw - 2.6) * 6, cy - Math.cos(yaw - 2.6) * 6);
        ctx.closePath(); ctx.fill();

        // Coordenadas en pantalla
        if (this.coordsDisplay) {
            this.coordsDisplay.textContent = `${Math.round(px)}, ${Math.round(pz)}`;
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

    startGameLoops() {
        setInterval(() => {
            this.playerMoney += 10;
            this.updateUI();
            if (window.GameHandler?.showFloatingText) {
                const p = window.GameHandler.player.position;
                const pos = new (window.THREE || { Vector3: function () { this.x=0;this.y=0;this.z=0;this.copy=()=>this;this.clone=()=>this; } })().constructor?.() || { x: p.x, y: p.y, z: p.z };
                pos.x = p.x + (Math.random() - 0.5) * 2;
                pos.y = 2.5 + Math.random();
                pos.z = p.z + (Math.random() - 0.5) * 2;
                window.GameHandler.showFloatingText('+10', '#88ddaa', pos);
            }
        }, 3000);
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
