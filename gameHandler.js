import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// 🍋 SELL LEMONS — Clase fusionada
class SellLemonsGame {
    constructor(handler) {
        this.handler = handler; this.scene = handler.scene; this.objects = []; this.lemons = [];
        this.money = 0; this.inventory = 0; this.moneyPerLemon = 5; this.pickupRadius = 4;
        this.treeLevel = 1; this.autoSeller = false; this.autoSellInterval = null;
        this.treePos = new THREE.Vector3(-18, 0, -10); this.standPos = new THREE.Vector3(18, 0, 12);
        this.playerSpawn = new THREE.Vector3(0, 1, 0); this.sellZoneRadius = 6;
    }
    add(obj) { this.scene.add(obj); this.objects.push(obj); }
    build() { this.buildTree(); this.buildStand(); this.buildDecorations(); this.spawnLemons(); this.buildHud(); this.start(); }
    buildTree() {
        const tree = new THREE.Group(); const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4423 }); const leafMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4, 10), trunkMat); trunk.position.y = 2; trunk.castShadow = true; tree.add(trunk);
        const leafData = [[0,4,0,2.2],[1.6,4.5,0.6,1.6],[-1.5,4.4,-0.6,1.7],[1,5.2,-1.2,1.5],[-1,5.1,1.2,1.5],[0,5.8,0,1.8],[1.8,4,-1.6,1.3],[-1.8,4,1.4,1.3]];
        for (const [x, y, z, r] of leafData) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), leafMat); leaf.position.set(x, y, z); leaf.castShadow = true; tree.add(leaf); }
        tree.position.copy(this.treePos); this.add(tree);
    }
    buildStand() {
        const stand = new THREE.Group(); const woodMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 }); const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); const awningMat = new THREE.MeshStandardMaterial({ color: 0xff3344 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 2.4), woodMat); counter.position.y = 1.4; counter.castShadow = true; stand.add(counter);
        const legGeo = new THREE.BoxGeometry(0.35, 1.4, 0.35);
        for (const [x, y, z] of [[-3, 0.7, -1], [3, 0.7, -1], [-3, 0.7, 1], [3, 0.7, 1]]) { const leg = new THREE.Mesh(legGeo, darkWoodMat); leg.position.set(x, y, z); stand.add(leg); }
        const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 3, 6);
        for (const [x, z] of [[-3, -1], [3, -1], [-3, 1], [3, 1]]) { const post = new THREE.Mesh(postGeo, darkWoodMat); post.position.set(x, 3.7, z); stand.add(post); }
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff }); const awning = new THREE.Group();
        for (let i = 0; i < 8; i++) { const stripe = new THREE.Mesh(new THREE.BoxGeometry(7 / 8, 0.15, 2.6), i % 2 === 0 ? awningMat : stripeMat); stripe.position.set(-3.5 + (i + 0.5) * (7 / 8), 5.3, 0); awning.add(stripe); }
        stand.add(awning); stand.position.copy(this.standPos); this.add(stand);
        this.sellIndicator = new THREE.Mesh(new THREE.CylinderGeometry(this.sellZoneRadius, this.sellZoneRadius, 0.1, 24), new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0.15 }));
        this.sellIndicator.position.copy(this.standPos); this.sellIndicator.position.y = 0.05; this.add(this.sellIndicator);
    }
    buildDecorations() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777 }); const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
        const decor = [[8,0,-6,'rock'],[-10,0,5,'bush'],[12,0,-4,'bush'],[-12,0,-14,'rock'],[5,0,-15,'bush'],[-3,0,14,'rock'],[10,0,18,'bush'],[-15,0,16,'rock']];
        for (const [x, y, z, type] of decor) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(type === 'rock' ? 0.7 : 1.0, 8, 6), type === 'rock' ? rockMat : bushMat); mesh.position.set(x, y + (type === 'rock' ? 0.3 : 0.5), z); mesh.castShadow = true; this.add(mesh); }
        const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff176 })); sun.position.set(60, 80, -60); this.add(sun);
        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.05 }); const clouds = [[30, 50, -40], [-40, 55, 20], [50, 60, 30], [-20, 65, -50]];
        for (const [x, y, z] of clouds) { const cloud = new THREE.Group(); const parts = [[0,0,0,3], [2.5,0.5,-0.5,2.4], [-2.5,0,0.5,2.2], [1,1,0.5,1.8], [-1,-0.5,0,1.5]]; for (const [cx, cy, cz, r] of parts) { const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat); sphere.position.set(cx, cy, cz); cloud.add(sphere); } cloud.position.set(x, y, z); this.add(cloud); }
    }
    spawnLemons() {
        const lemonMat = new THREE.MeshStandardMaterial({ color: 0xffe44d, emissive: 0xaa8800, emissiveIntensity: 0.15 }); const count = this.treeLevel === 1 ? 8 : this.treeLevel === 2 ? 14 : 20;
        for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2; const radius = 1 + Math.random() * 1.8; const x = this.treePos.x + Math.cos(angle) * radius; const z = this.treePos.z + Math.sin(angle) * radius; const y = 3.5 + Math.random() * 1.8; const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), lemonMat); lemon.position.set(x, y, z); lemon.castShadow = true; lemon.userData.isLemon = true; lemon.userData.collected = false; this.add(lemon); this.lemons.push(lemon); }
    }
    start() { this.handler.createPlayer(0x1e7ad6, 0xffcc4d, 0x1e7ad6, 0x7fb539); this.handler.player.position.copy(this.playerSpawn); }
    onClick(worldPoint) { if (!this.handler.player) return false; const px = this.handler.player.position; let picked = false; let nearest = null; let nearestDist = Infinity; for (const lemon of this.lemons) { if (lemon.userData.collected) continue; const dx = lemon.position.x - px.x; const dy = lemon.position.y - px.y; const dz = lemon.position.z - px.z; const d = Math.sqrt(dx*dx + dy*dy + dz*dz); if (d < this.pickupRadius && d < nearestDist) { nearest = lemon; nearestDist = d; } } if (nearest) { nearest.userData.collected = true; this.scene.remove(nearest); this.inventory++; this.showToast(`+1 🍋`); picked = true; this.updateHud(); } return picked; }
    sellInventory() { if (this.inventory === 0) return; const earned = this.inventory * this.moneyPerLemon; this.money += earned; this.inventory = 0; this.showToast(`+$${earned} 💰`); this.updateHud(); }
    buyUpgrade(upgradeId) { let cost = 0; if (upgradeId === 'tree2') cost = 100; else if (upgradeId === 'tree3') cost = 350; else if (upgradeId === 'autoSeller') cost = 250; else return false; if (this.money < cost) return false; if (upgradeId === 'tree2' && this.treeLevel < 2) { this.money -= cost; this.treeLevel = 2; this.respawnLemons(); return true; } if (upgradeId === 'tree3' && this.treeLevel < 3) { this.money -= cost; this.treeLevel = 3; this.respawnLemons(); return true; } if (upgradeId === 'autoSeller' && !this.autoSeller) { this.money -= cost; this.autoSeller = true; this.startAutoSeller(); return true; } return false; }
    respawnLemons() { for (const lemon of this.lemons) this.scene.remove(lemon); this.lemons = []; this.spawnLemons(); }
    startAutoSeller() { this.stopAutoSeller(); this.autoSellInterval = setInterval(() => { if (this.inventory > 0) { const earned = this.inventory * this.moneyPerLemon; this.money += earned; this.inventory = 0; this.showToast(`Auto-Venta: +$${earned} 🤖`); this.updateHud(); } }, 4000); }
    stopAutoSeller() { if (this.autoSellInterval) { clearInterval(this.autoSellInterval); this.autoSellInterval = null; } }
    update() { if (!this.handler.player) return; const px = this.handler.player.position; const distToStand = Math.hypot(px.x - this.standPos.x, px.z - this.standPos.z); const sellBtn = document.getElementById('lemon-sell-btn'); if (sellBtn) { const shouldShow = distToStand < this.sellZoneRadius && this.inventory > 0; sellBtn.style.display = shouldShow ? 'block' : 'none'; if (shouldShow) sellBtn.textContent = `💰 VENDER ${this.inventory} x $${this.moneyPerLemon} = +$${this.inventory * this.moneyPerLemon}`; } if (this.sellIndicator) { const pulse = 0.12 + Math.sin(Date.now() * 0.003) * 0.05; this.sellIndicator.material.opacity = pulse; this.sellIndicator.material.color.setHex(distToStand < this.sellZoneRadius ? 0x4cd964 : 0xffcc00); } }
    buildHud() { const slot = document.getElementById('game-specific-hud'); if (!slot) return; slot.innerHTML = ''; const moneyEl = document.createElement('div'); moneyEl.className = 'hud-lemon-money'; moneyEl.id = 'lemon-money'; moneyEl.textContent = '$0'; slot.appendChild(moneyEl); const infoEl = document.createElement('div'); infoEl.className = 'hud-lemon-info'; infoEl.id = 'lemon-info'; infoEl.innerHTML = '🍋 <span id="lemon-inv">0</span> &nbsp; 🌳 Nivel <span id="lemon-tree">1</span>'; slot.appendChild(infoEl); const sellBtn = document.createElement('button'); sellBtn.className = 'hud-lemon-sell-btn'; sellBtn.id = 'lemon-sell-btn'; sellBtn.textContent = '💰 VENDER'; slot.appendChild(sellBtn); const shopBtn = document.createElement('button'); shopBtn.className = 'hud-lemon-shop-btn'; shopBtn.id = 'lemon-shop-btn'; shopBtn.textContent = '🛒 Tienda'; slot.appendChild(shopBtn); const modal = document.createElement('div'); modal.className = 'lemon-shop-modal'; modal.id = 'lemon-shop-modal'; modal.innerHTML = `<div class="lemon-shop-box"><h2>🛒 Tienda</h2><p class="shop-money">💰 $<span id="shop-money-amount">0</span></p><div class="upgrade"><strong>🌳 Árbol Nivel 2</strong><p>14 limones por cosecha.</p><button class="upgrade-btn" data-id="tree2">$100</button></div><div class="upgrade"><strong>🌳 Árbol Nivel 3</strong><p>20 limones por cosecha.</p><button class="upgrade-btn" data-id="tree3">$350</button></div><div class="upgrade"><strong>🤖 Vendedor Automático</strong><p>Vende tus limones cada 4s.</p><button class="upgrade-btn" data-id="autoSeller">$250</button></div><button class="close-shop" id="close-shop">← Volver al juego</button></div>`; slot.appendChild(modal); const toast = document.createElement('div'); toast.className = 'lemon-toast'; toast.id = 'lemon-toast'; document.body.appendChild(toast); sellBtn.addEventListener('click', () => this.sellInventory()); shopBtn.addEventListener('click', () => { modal.classList.add('open'); document.getElementById('shop-money-amount').textContent = this.money; this.refreshShopButtons(); }); document.getElementById('close-shop').addEventListener('click', () => modal.classList.remove('open')); modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); }); slot.querySelectorAll('.upgrade-btn').forEach(btn => { btn.addEventListener('click', () => { const id = btn.dataset.id; const ok = this.buyUpgrade(id); if (ok) { btn.disabled = true; btn.classList.add('owned'); btn.textContent = '✓ Comprado'; document.getElementById('shop-money-amount').textContent = this.money; this.refreshShopButtons(); this.updateHud(); } else { btn.textContent = '✗ Sin dinero'; setTimeout(() => { this.refreshShopButtons(); }, 800); } }); }); this.onCanvasClick = (e) => { if (e.button !== 0) return; const mouse = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1); const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, this.handler.camera); const hits = ray.intersectObjects(this.lemons.filter(l => !l.userData.collected)); if (hits.length > 0) this.onClick(hits[0].object.position); }; this.handler.renderer.domElement.addEventListener('click', this.onCanvasClick); this.updateHud(); }
    refreshShopButtons() { document.querySelectorAll('.upgrade-btn').forEach(btn => { const id = btn.dataset.id; let bought = false; if (id === 'tree2') bought = this.treeLevel >= 2; if (id === 'tree3') bought = this.treeLevel >= 3; if (id === 'autoSeller') bought = this.autoSeller; if (bought) { btn.classList.add('owned'); btn.disabled = true; btn.textContent = '✓ Comprado'; } else { btn.classList.remove('owned'); btn.disabled = false; btn.textContent = id === 'tree2' ? '$100' : id === 'tree3' ? '$350' : '$250'; } }); }
    updateHud() { const moneyEl = document.getElementById('lemon-money'); const invEl = document.getElementById('lemon-inv'); const treeEl = document.getElementById('lemon-tree'); const shopMoney = document.getElementById('shop-money-amount'); if (moneyEl) moneyEl.textContent = `$${this.money}`; if (invEl) invEl.textContent = this.inventory; if (treeEl) treeEl.textContent = this.treeLevel; if (shopMoney && document.getElementById('lemon-shop-modal').classList.contains('open')) shopMoney.textContent = this.money; }
    showToast(text) { const toast = document.getElementById('lemon-toast'); if (!toast) return; toast.textContent = text; toast.classList.add('show'); clearTimeout(this._toastT); this._toastT = setTimeout(() => toast.classList.remove('show'), 1500); }
    cleanup() { for (const obj of this.objects) this.scene.remove(obj); this.objects = []; this.lemons = []; if (this.handler.renderer?.domElement && this.onCanvasClick) this.handler.renderer.domElement.removeEventListener('click', this.onCanvasClick); this.stopAutoSeller(); const slot = document.getElementById('game-specific-hud'); if (slot) slot.innerHTML = ''; const toast = document.getElementById('lemon-toast'); if (toast) toast.remove(); }
}

// 🎮 MOTOR PRINCIPAL BLOX
class GameHandler {
    constructor() {
        this.scene = null; this.otherPlayers = {}; this.isPaused = false; this.currentGameMode = null; this.activeGame = null;
        this.init(); this.animate();
    }

    init() {
        this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x87CEEB); this.scene.fog = new THREE.Fog(0x87CEEB, 60, 250);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); this.camera.position.set(0, 15, 25);
        this.renderer = new THREE.WebGLRenderer({ antialias: true }); this.renderer.setSize(window.innerWidth, window.innerHeight); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        this.labelRenderer = new CSS2DRenderer(); this.labelRenderer.setSize(window.innerWidth, window.innerHeight); this.labelRenderer.domElement.style.position = 'absolute'; this.labelRenderer.domElement.style.top = '0px'; this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('game-container').appendChild(this.labelRenderer.domElement);
        this.keys = {}; this.joystick = { x: 0, y: 0, active: false }; this.cameraAngle = 0; this.cameraPitch = 0.3; this.isDragging = false; this.lastTouch = { x: 0, y: 0 }; this.audioCtx = null;
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true); window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        this.renderer.domElement.addEventListener('mousedown', (e) => { if(e.button === 2 && !this.isPaused) { this.isDragging = true; this.lastTouch.x = e.clientX; this.lastTouch.y = e.clientY; } });
        window.addEventListener('mousemove', (e) => { if(this.isDragging) { this.cameraAngle -= (e.clientX - this.lastTouch.x) * 0.005; this.cameraPitch = Math.max(-0.2, Math.min(0.8, this.cameraPitch + (e.clientY - this.lastTouch.y) * 0.005)); this.lastTouch.x = e.clientX; this.lastTouch.y = e.clientY; } });
        window.addEventListener('mouseup', () => this.isDragging = false); this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('loading-screen').style.display = 'none';
    }

    setupArena() {
        const baseGeo = new THREE.BoxGeometry(100, 1, 100); const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#4a6b2a'; ctx.fillRect(0, 0, 512, 512); ctx.strokeStyle = '#3a5520'; ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke(); }
        const baseTexture = new THREE.CanvasTexture(canvas); baseTexture.wrapS = THREE.RepeatWrapping; baseTexture.wrapT = THREE.RepeatWrapping; baseTexture.repeat.set(15, 15);
        this.baseplate = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ map: baseTexture })); this.baseplate.position.y = -0.5; this.baseplate.receiveShadow = true; this.scene.add(this.baseplate);
        const river = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 100), new THREE.MeshStandardMaterial({ color: 0x0044aa })); river.position.y = 0; river.receiveShadow = true; this.scene.add(river);
        this.createCastle(-35, 0, 0x0033cc); this.createCastle(35, 0, 0xcc0000);
    }

    createCastle(x, z, teamColor) {
        const castle = new THREE.Group(); const stoneMat = new THREE.MeshStandardMaterial({ color: 0xBFC7CC }); const redMat = new THREE.MeshStandardMaterial({ color: 0xE91D2D }); const teamMat = new THREE.MeshStandardMaterial({ color: teamColor }); const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });
        const towerGeo = new THREE.BoxGeometry(8, 20, 8); const positions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];
        positions.forEach(p => {
            const tower = new THREE.Mesh(towerGeo, stoneMat); tower.position.set(p[0], 10, p[1]); tower.castShadow = true; tower.receiveShadow = true; castle.add(tower);
            for(let i = -3; i <= 3; i += 2) { const cren = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat); cren.position.set(p[0] + i, 21, p[1] + 3.5); castle.add(cren); const cren2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat); cren2.position.set(p[0] + 3.5, 21, p[1] + i); castle.add(cren2); const cren3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat); cren3.position.set(p[0] + i, 21, p[1] - 3.5); castle.add(cren3); const cren4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat); cren4.position.set(p[0] - 3.5, 21, p[1] + i); castle.add(cren4); }
            const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 4), redMat); roof.position.set(p[0], 25, p[1]); roof.castShadow = true; castle.add(roof);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6), woodMat); pole.position.set(p[0], 32, p[1]); castle.add(pole);
            const flag = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.1), teamMat); flag.position.set(p[0] + 2, 33, p[1]); castle.add(flag);
        });
        const wallGeo = new THREE.BoxGeometry(22, 10, 2);
        const wall1 = new THREE.Mesh(wallGeo, stoneMat); wall1.position.set(0, 5, -15); castle.add(wall1);
        const wall2 = new THREE.Mesh(wallGeo, stoneMat); wall2.position.set(0, 5, 15); castle.add(wall2);
        const wall3 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall3.position.set(-15, 5, 0); castle.add(wall3);
        const wall4 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall4.position.set(15, 5, 0); castle.add(wall4);
        const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 28), teamMat); floor.position.y = 0.5; floor.receiveShadow = true; castle.add(floor);
        castle.position.set(x, 0, z); this.scene.add(castle);
    }

    startGameMode(mode) {
        this.cleanupGame(); this.currentGameMode = mode; this.initAudio();
        if (mode === 'pvp') {
            this.setupArena(); this.createPlayer(0x0033cc, 0xffcc00, 0xffcc00, 0x001a33); this.player.position.set(-35, 1, 0);
            this.createEnemy(); this.setupCombat(); document.getElementById('attack-btn').style.display = 'flex';
        } else if (mode === 'lemons') {
            document.getElementById('attack-btn').style.display = 'none'; this.activeGame = new SellLemonsGame(this); this.activeGame.build();
        }
    }

    cleanupGame() {
        if (this.activeGame) { this.activeGame.cleanup(); this.activeGame = null; }
        while(this.scene.children.length > 0) { this.scene.remove(this.scene.children[0]); }
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); dirLight.position.set(50, 100, 50); dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048; dirLight.shadow.camera.left = -80; dirLight.shadow.camera.right = 80; dirLight.shadow.camera.top = 80; dirLight.shadow.camera.bottom = -80;
        this.scene.add(dirLight);
        this.player = null; this.enemy = null; this.otherPlayers = {};
        const hud = document.getElementById('game-specific-hud'); if(hud) hud.innerHTML = '';
    }

    resetPlayer() { if(this.player) { if(this.currentGameMode === 'pvp') this.player.position.set(-35, 1, 0); if(this.currentGameMode === 'lemons') this.player.position.set(0, 1, 0); this.player.rotation.y = 0; } }
    initAudio() { if(!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

    createPlayer(colorTorso, colorHead, colorArm, colorLeg) {
        this.player = new THREE.Group();
        this.torsoMat = new THREE.MeshStandardMaterial({ color: colorTorso });
        this.headMat = new THREE.MeshStandardMaterial({ color: colorHead });
        this.armMat = new THREE.MeshStandardMaterial({ color: colorArm });
        this.legMat = new THREE.MeshStandardMaterial({ color: colorLeg });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), this.torsoMat); torso.position.y = 3; torso.castShadow = true; this.player.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), this.headMat); head.position.y = 4.6; head.castShadow = true; this.player.add(head);
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftArm = new THREE.Mesh(armGeo, this.armMat); leftArm.position.set(-1.5, 3, 0); leftArm.castShadow = true; this.player.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, this.armMat); rightArm.position.set(1.5, 3, 0); rightArm.castShadow = true; this.player.add(rightArm);
        const legGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftLeg = new THREE.Mesh(legGeo, this.legMat); leftLeg.position.set(-0.5, 1, 0); leftLeg.castShadow = true; this.player.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, this.legMat); rightLeg.position.set(0.5, 1, 0); rightLeg.castShadow = true; this.player.add(rightLeg);
        this.player.rightArmRef = rightArm;
        
        if(this.currentGameMode === 'pvp') {
            this.sword = new THREE.Group();
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), new THREE.MeshStandardMaterial({ color: 0x333333 })); handle.position.y = -0.5;
            const guard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 })); guard.position.y = 0.1;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.1), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.9, roughness: 0.1 })); blade.position.y = 2.8;
            this.sword.add(handle, guard, blade); this.sword.position.set(0, -0.8, 0); this.sword.rotation.x = Math.PI; this.player.rightArmRef.add(this.sword);
        }
        const chatDiv = document.createElement('div'); chatDiv.className = 'chat-bubble-3d';
        this.chatLabel = new CSS2DObject(chatDiv); this.chatLabel.position.set(0, 3, 0); this.player.add(this.chatLabel);
        this.scene.add(this.player);
    }

    createEnemy() {
        this.enemy = this.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000);
        this.enemy.position.set(35, 1, 0); this.scene.add(this.enemy);
        this.enemyHp = 100;
    }

    createR6Character(colorTorso, colorHead, colorArm, colorLeg) {
        const group = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: colorTorso })); torso.position.y = 3; torso.castShadow = true; group.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: colorHead })); head.position.y = 4.6; head.castShadow = true; group.add(head);
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm })); leftArm.position.set(-1.5, 3, 0); leftArm.castShadow = true; group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm })); rightArm.position.set(1.5, 3, 0); rightArm.castShadow = true; group.add(rightArm);
        const legGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg })); leftLeg.position.set(-0.5, 1, 0); leftLeg.castShadow = true; group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg })); rightLeg.position.set(0.5, 1, 0); rightLeg.castShadow = true; group.add(rightLeg);
        group.rightArmRef = rightArm;
        return group;
    }

    playSwordSound() {
        if(!this.audioCtx) return; const ctx = this.audioCtx;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate); const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2);
        const source = ctx.createBufferSource(); source.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.setValueAtTime(1200, ctx.currentTime); filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2); filter.Q.value = 3;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.8, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        source.connect(filter).connect(gain).connect(ctx.destination); source.start();
    }

    setupCombat() {
        this.isAttacking = false;
        const attackAction = () => { if(!this.isAttacking && !this.isPaused) this.attack(); };
        window.addEventListener('mousedown', (e) => { if(e.button === 0 && this.currentGameMode === 'pvp') attackAction(); });
        const btn = document.getElementById('attack-btn');
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); attackAction(); });
        btn.addEventListener('click', attackAction);
    }

    attack() {
        this.isAttacking = true; this.playSwordSound(); 
        // Comprobar si golpeamos a alguien
        const hitId = this.checkAttackHit();
        if (hitId && this.onHitCallback) {
            this.onHitCallback(hitId);
        }
        let progress = 0;
        const attackInterval = setInterval(() => {
            progress += 0.15; this.player.rightArmRef.rotation.x = -Math.PI/2 * Math.sin(progress * Math.PI);
            if(progress >= 1) { clearInterval(attackInterval); this.player.rightArmRef.rotation.x = 0; this.isAttacking = false; }
        }, 20);
    }

    checkAttackHit() {
        const attackRange = 6;
        const playerForward = new THREE.Vector3();
        this.player.getWorldDirection(playerForward);
        playerForward.y = 0; playerForward.normalize();

        // Comprobar enemigo bot
        if (this.enemy) {
            const dist = this.player.position.distanceTo(this.enemy.position);
            if (dist < attackRange) {
                const dirToEnemy = new THREE.Vector3().subVectors(this.enemy.position, this.player.position).normalize();
                if (playerForward.dot(dirToEnemy) > 0.3) {
                    return "bot";
                }
            }
        }

        // Comprobar otros jugadores
        for (const id in this.otherPlayers) {
            const p = this.otherPlayers[id].mesh;
            const dist = this.player.position.distanceTo(p.position);
            if (dist < attackRange) {
                const dirToPlayer = new THREE.Vector3().subVectors(p.position, this.player.position).normalize();
                if (playerForward.dot(dirToPlayer) > 0.3) {
                    return id;
                }
            }
        }
        return null;
    }

    flashRed(materials) {
        const originalColors = materials.map(m => m.color.getHex());
        materials.forEach(m => m.color.setHex(0xff0000));
        setTimeout(() => {
            materials.forEach((m, i) => m.color.setHex(originalColors[i]));
        }, 150);
    }

    takeDamage(amount) {
        if (this.currentGameMode !== 'pvp' || !this.player) return;
        this.flashRed([this.torsoMat, this.headMat, this.armMat, this.legMat]);
        if (this.onDamageTaken) this.onDamageTaken(amount);
    }

    damageEnemy(amount) {
        if (!this.enemy) return;
        this.enemyHp -= amount;
        const mats = this.enemy.children.map(c => c.material);
        this.flashRed(mats);
        if (this.enemyHp <= 0) {
            this.enemyHp = 100;
            this.enemy.position.set(35, 1, 0);
            if (this.onKillCallback) this.onKillCallback();
        }
    }

    showChatBubble(text) {
        this.chatLabel.element.innerHTML = text; this.chatLabel.element.style.opacity = '1';
        clearTimeout(this.chatTimeout);
        this.chatTimeout = setTimeout(() => { this.chatLabel.element.style.opacity = '0'; }, 4000);
    }

    updateRemotePlayer(id, data) {
        if (!this.otherPlayers[id]) {
            const newPlayer = this.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000);
            const chatDiv = document.createElement('div'); chatDiv.className = 'chat-bubble-3d';
            const label = new CSS2DObject(chatDiv); label.position.set(0, 3, 0); newPlayer.add(label);
            this.scene.add(newPlayer);
            this.otherPlayers[id] = { mesh: newPlayer, label: label, targetPos: new THREE.Vector3(data.x, 1, data.z), lastPos: new THREE.Vector3(data.x, 1, data.z), name: data.name };
        }
        const p = this.otherPlayers[id];
        p.lastPos.copy(p.mesh.position); p.targetPos.set(data.x, 1, data.z); p.mesh.rotation.y = data.ry; p.name = data.name;
        if (data.chat && data.chat !== "") { p.label.element.innerHTML = data.chat; p.label.element.style.opacity = '1'; clearTimeout(p.chatTimeout); p.chatTimeout = setTimeout(() => { p.label.element.style.opacity = '0'; }, 4000); }
    }

    removeRemotePlayer(id) { if (this.otherPlayers[id]) { this.scene.remove(this.otherPlayers[id].mesh); delete this.otherPlayers[id]; } }

    updatePlayerMovement() {
        if(!this.player || this.isPaused) return; 
        const speed = 0.3;
        const forward = new THREE.Vector3(); this.camera.getWorldDirection(forward); forward.y = 0; forward.normalize(); 
        const right = new THREE.Vector3(); right.crossVectors(forward, this.camera.up).normalize(); 
        let moveDir = new THREE.Vector3(0, 0, 0);
        if(this.keys['w']) moveDir.add(forward); if(this.keys['s']) moveDir.sub(forward); if(this.keys['d']) moveDir.add(right); if(this.keys['a']) moveDir.sub(right);
        if(this.joystick.active) { moveDir.add(forward.clone().multiplyScalar(-this.joystick.y)); moveDir.add(right.clone().multiplyScalar(this.joystick.x)); }
        if(moveDir.lengthSq() > 0) { moveDir.normalize().multiplyScalar(speed); this.player.position.add(moveDir); this.player.rotation.y = Math.atan2(moveDir.x, moveDir.z); }
        this.player.position.x = Math.max(-49, Math.min(49, this.player.position.x)); this.player.position.z = Math.max(-49, Math.min(49, this.player.position.z));
        const camDist = 15;
        const targetCamX = this.player.position.x - Math.sin(this.cameraAngle) * camDist * Math.cos(this.cameraPitch);
        const targetCamZ = this.player.position.z - Math.cos(this.cameraAngle) * camDist * Math.cos(this.cameraPitch);
        const targetCamY = this.player.position.y + 10 + Math.sin(this.cameraPitch) * camDist;
        this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
        this.camera.lookAt(this.player.position.x, this.player.position.y + 3, this.player.position.z);
        for (const id in this.otherPlayers) { const p = this.otherPlayers[id]; p.mesh.position.lerp(p.targetPos, 0.2); }
    }

    onWindowResize() { this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(window.innerWidth, window.innerHeight); this.labelRenderer.setSize(window.innerWidth, window.innerHeight); }

    animate() {
        requestAnimationFrame(() => this.animate()); this.updatePlayerMovement();
        if (this.currentGameMode === 'lemons' && this.activeGame) this.activeGame.update();
        this.renderer.render(this.scene, this.camera); this.labelRenderer.render(this.scene, this.camera);
    }
}

window.GameHandler = new GameHandler();
