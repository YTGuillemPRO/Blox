import * as THREE from 'three';

// 🍋 SELL LEMONS — simulador 3D donde recoges limones y los vendes en un puesto.
export class SellLemonsGame {
    constructor(handler) {
        this.handler = handler;
        this.scene = handler.scene;
        this.objects = [];
        this.lemons = [];

        this.money = 0;
        this.inventory = 0;

        this.moneyPerLemon = 5;
        this.pickupRadius = 4;
        this.treeLevel = 1;
        this.autoSeller = false;
        this.autoSellInterval = null;

        this.treePos = new THREE.Vector3(-18, 0, -10);
        this.standPos = new THREE.Vector3(18, 0, 12);
        this.playerSpawn = new THREE.Vector3(0, 1, 0);

        this.sellZoneRadius = 6;
    }

    add(obj) {
        this.scene.add(obj);
        this.objects.push(obj);
    }

    build() {
        this.buildTree();
        this.buildStand();
        this.buildDecorations();
        this.spawnLemons();
        this.buildHud();
        this.start();
    }

    buildTree() {
        const tree = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6B4423 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });

        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 4, 10), trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        tree.add(trunk);

        const leafData = [
            [0, 4, 0, 2.2], [1.6, 4.5, 0.6, 1.6], [-1.5, 4.4, -0.6, 1.7],
            [1, 5.2, -1.2, 1.5], [-1, 5.1, 1.2, 1.5], [0, 5.8, 0, 1.8],
            [1.8, 4, -1.6, 1.3], [-1.8, 4, 1.4, 1.3]
        ];
        for (const [x, y, z, r] of leafData) {
            const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), leafMat);
            leaf.position.set(x, y, z);
            leaf.castShadow = true;
            tree.add(leaf);
        }

        tree.position.copy(this.treePos);
        this.add(tree);
    }

    buildStand() {
        const stand = new THREE.Group();
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const awningMat = new THREE.MeshStandardMaterial({ color: 0xff3344 });

        const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 1.4, 2.4), woodMat);
        counter.position.y = 1.4;
        counter.castShadow = true;
        stand.add(counter);

        const legGeo = new THREE.BoxGeometry(0.35, 1.4, 0.35);
        for (const [x, y, z] of [[-3, 0.7, -1], [3, 0.7, -1], [-3, 0.7, 1], [3, 0.7, 1]]) {
            const leg = new THREE.Mesh(legGeo, darkWoodMat);
            leg.position.set(x, y, z);
            stand.add(leg);
        }

        const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 3, 6);
        for (const [x, z] of [[-3, -1], [3, -1], [-3, 1], [3, 1]]) {
            const post = new THREE.Mesh(postGeo, darkWoodMat);
            post.position.set(x, 3.7, z);
            stand.add(post);
        }

        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const awning = new THREE.Group();
        for (let i = 0; i < 8; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(7 / 8, 0.15, 2.6), i % 2 === 0 ? awningMat : stripeMat);
            stripe.position.set(-3.5 + (i + 0.5) * (7 / 8), 5.3, 0);
            awning.add(stripe);
        }
        stand.add(awning);

        stand.position.copy(this.standPos);
        this.add(stand);

        this.sellIndicator = new THREE.Mesh(
            new THREE.CylinderGeometry(this.sellZoneRadius, this.sellZoneRadius, 0.1, 24),
            new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0.15 })
        );
        this.sellIndicator.position.copy(this.standPos);
        this.sellIndicator.position.y = 0.05;
        this.add(this.sellIndicator);
    }

    buildDecorations() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x777777 });
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });

        const decor = [
            [8, 0, -6, 'rock'], [-10, 0, 5, 'bush'], [12, 0, -4, 'bush'],
            [-12, 0, -14, 'rock'], [5, 0, -15, 'bush'], [-3, 0, 14, 'rock'],
            [10, 0, 18, 'bush'], [-15, 0, 16, 'rock']
        ];
        for (const [x, y, z, type] of decor) {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(type === 'rock' ? 0.7 : 1.0, 8, 6), type === 'rock' ? rockMat : bushMat);
            mesh.position.set(x, y + (type === 'rock' ? 0.3 : 0.5), z);
            mesh.castShadow = true;
            this.add(mesh);
        }

        const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff176 }));
        sun.position.set(60, 80, -60);
        this.add(sun);

        const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.05 });
        const clouds = [[30, 50, -40], [-40, 55, 20], [50, 60, 30], [-20, 65, -50]];
        for (const [x, y, z] of clouds) {
            const cloud = new THREE.Group();
            const parts = [[0,0,0,3], [2.5,0.5,-0.5,2.4], [-2.5,0,0.5,2.2], [1,1,0.5,1.8], [-1,-0.5,0,1.5]];
            for (const [cx, cy, cz, r] of parts) {
                const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
                sphere.position.set(cx, cy, cz);
                cloud.add(sphere);
            }
            cloud.position.set(x, y, z);
            this.add(cloud);
        }
    }

    spawnLemons() {
        const lemonMat = new THREE.MeshStandardMaterial({ color: 0xffe44d, emissive: 0xaa8800, emissiveIntensity: 0.15 });
        const count = this.treeLevel === 1 ? 8 : this.treeLevel === 2 ? 14 : 20;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1 + Math.random() * 1.8;
            const x = this.treePos.x + Math.cos(angle) * radius;
            const z = this.treePos.z + Math.sin(angle) * radius;
            const y = 3.5 + Math.random() * 1.8;

            const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), lemonMat);
            lemon.position.set(x, y, z);
            lemon.castShadow = true;
            lemon.userData.isLemon = true;
            lemon.userData.collected = false;
            this.add(lemon);
            this.lemons.push(lemon);
        }
    }

    start() {
        this.handler.createPlayer(0x1e7ad6, 0xffcc4d, 0x1e7ad6, 0x7fb539);
        this.handler.player.position.copy(this.playerSpawn);
    }

    onClick(worldPoint) {
        if (!this.handler.player) return false;
        const px = this.handler.player.position;
        let picked = false;
        let nearest = null;
        let nearestDist = Infinity;

        for (const lemon of this.lemons) {
            if (lemon.userData.collected) continue;
            const dx = lemon.position.x - px.x;
            const dy = lemon.position.y - px.y;
            const dz = lemon.position.z - px.z;
            const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (d < this.pickupRadius && d < nearestDist) {
                nearest = lemon;
                nearestDist = d;
            }
        }
        if (nearest) {
            nearest.userData.collected = true;
            this.scene.remove(nearest);
            this.inventory++;
            this.showToast(`+1 🍋`);
            picked = true;
            this.updateHud();
        }
        return picked;
    }

    sellInventory() {
        if (this.inventory === 0) return;
        const earned = this.inventory * this.moneyPerLemon;
        this.money += earned;
        this.inventory = 0;
        this.showToast(`+$${earned} 💰`);
        this.updateHud();
    }

    buyUpgrade(upgradeId) {
        let cost = 0;
        if (upgradeId === 'tree2') cost = 100;
        else if (upgradeId === 'tree3') cost = 350;
        else if (upgradeId === 'autoSeller') cost = 250;
        else return false;

        if (this.money < cost) return false;

        if (upgradeId === 'tree2' && this.treeLevel < 2) {
            this.money -= cost; this.treeLevel = 2; this.respawnLemons(); return true;
        }
        if (upgradeId === 'tree3' && this.treeLevel < 3) {
            this.money -= cost; this.treeLevel = 3; this.respawnLemons(); return true;
        }
        if (upgradeId === 'autoSeller' && !this.autoSeller) {
            this.money -= cost; this.autoSeller = true; this.startAutoSeller(); return true;
        }
        return false;
    }

    respawnLemons() {
        for (const lemon of this.lemons) this.scene.remove(lemon);
        this.lemons = [];
        this.spawnLemons();
    }

    startAutoSeller() {
        this.stopAutoSeller();
        this.autoSellInterval = setInterval(() => {
            if (this.inventory > 0) {
                const earned = this.inventory * this.moneyPerLemon;
                this.money += earned;
                this.inventory = 0;
                this.showToast(`Auto-Venta: +$${earned} 🤖`);
                this.updateHud();
            }
        }, 4000);
    }

    stopAutoSeller() {
        if (this.autoSellInterval) {
            clearInterval(this.autoSellInterval);
            this.autoSellInterval = null;
        }
    }

    update() {
        if (!this.handler.player) return;
        const px = this.handler.player.position;
        const distToStand = Math.hypot(px.x - this.standPos.x, px.z - this.standPos.z);

        const sellBtn = document.getElementById('lemon-sell-btn');
        if (sellBtn) {
            const shouldShow = distToStand < this.sellZoneRadius && this.inventory > 0;
            sellBtn.style.display = shouldShow ? 'block' : 'none';
            if (shouldShow) {
                sellBtn.textContent = `💰 VENDER ${this.inventory} x $${this.moneyPerLemon} = +$${this.inventory * this.moneyPerLemon}`;
            }
        }

        if (this.sellIndicator) {
            const pulse = 0.12 + Math.sin(Date.now() * 0.003) * 0.05;
            this.sellIndicator.material.opacity = pulse;
            this.sellIndicator.material.color.setHex(distToStand < this.sellZoneRadius ? 0x4cd964 : 0xffcc00);
        }
    }

    buildHud() {
        const slot = document.getElementById('game-specific-hud');
        if (!slot) return;
        slot.innerHTML = '';

        const moneyEl = document.createElement('div');
        moneyEl.className = 'hud-lemon-money';
        moneyEl.id = 'lemon-money';
        moneyEl.textContent = '$0';
        slot.appendChild(moneyEl);

        const infoEl = document.createElement('div');
        infoEl.className = 'hud-lemon-info';
        infoEl.id = 'lemon-info';
        infoEl.innerHTML = '🍋 <span id="lemon-inv">0</span> &nbsp; 🌳 Nivel <span id="lemon-tree">1</span>';
        slot.appendChild(infoEl);

        const sellBtn = document.createElement('button');
        sellBtn.className = 'hud-lemon-sell-btn';
        sellBtn.id = 'lemon-sell-btn';
        sellBtn.textContent = '💰 VENDER';
        slot.appendChild(sellBtn);

        const shopBtn = document.createElement('button');
        shopBtn.className = 'hud-lemon-shop-btn';
        shopBtn.id = 'lemon-shop-btn';
        shopBtn.textContent = '🛒 Tienda';
        slot.appendChild(shopBtn);

        const modal = document.createElement('div');
        modal.className = 'lemon-shop-modal';
        modal.id = 'lemon-shop-modal';
        modal.innerHTML = `
            <div class="lemon-shop-box">
                <h2>🛒 Tienda</h2>
                <p class="shop-money">💰 $<span id="shop-money-amount">0</span></p>
                <div class="upgrade">
                    <strong>🌳 Árbol Nivel 2</strong>
                    <p>14 limones por cosecha (antes 8).</p>
                    <button class="upgrade-btn" data-id="tree2">$100</button>
                </div>
                <div class="upgrade">
                    <strong>🌳 Árbol Nivel 3</strong>
                    <p>20 limones por cosecha. ¡El doble!</p>
                    <button class="upgrade-btn" data-id="tree3">$350</button>
                </div>
                <div class="upgrade">
                    <strong>🤖 Vendedor Automático</strong>
                    <p>Vende tus limones cada 4 segundos sin esfuerzo.</p>
                    <button class="upgrade-btn" data-id="autoSeller">$250</button>
                </div>
                <button class="close-shop" id="close-shop">← Volver al juego</button>
            </div>
        `;
        slot.appendChild(modal);

        const toast = document.createElement('div');
        toast.className = 'lemon-toast';
        toast.id = 'lemon-toast';
        document.body.appendChild(toast);

        sellBtn.addEventListener('click', () => this.sellInventory());
        shopBtn.addEventListener('click', () => {
            modal.classList.add('open');
            document.getElementById('shop-money-amount').textContent = this.money;
            this.refreshShopButtons();
        });
        document.getElementById('close-shop').addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
        
        slot.querySelectorAll('.upgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const ok = this.buyUpgrade(id);
                if (ok) {
                    btn.disabled = true;
                    btn.classList.add('owned');
                    btn.textContent = '✓ Comprado';
                    document.getElementById('shop-money-amount').textContent = this.money;
                    this.refreshShopButtons();
                    this.updateHud();
                } else {
                    btn.textContent = '✗ Sin dinero';
                    setTimeout(() => { this.refreshShopButtons(); }, 800);
                }
            });
        });

        this.onCanvasClick = (e) => {
            if (e.button !== 0) return;
            const mouse = new THREE.Vector2(
                (e.clientX / window.innerWidth) * 2 - 1,
                -(e.clientY / window.innerHeight) * 2 + 1
            );
            const ray = new THREE.Raycaster();
            ray.setFromCamera(mouse, this.handler.camera);
            const hits = ray.intersectObjects(this.lemons.filter(l => !l.userData.collected));
            if (hits.length > 0) {
                this.onClick(hits[0].object.position);
            }
        };
        this.handler.renderer.domElement.addEventListener('click', this.onCanvasClick);

        this.updateHud();
    }

    refreshShopButtons() {
        document.querySelectorAll('.upgrade-btn').forEach(btn => {
            const id = btn.dataset.id;
            let bought = false;
            if (id === 'tree2') bought = this.treeLevel >= 2;
            if (id === 'tree3') bought = this.treeLevel >= 3;
            if (id === 'autoSeller') bought = this.autoSeller;

            if (bought) {
                btn.classList.add('owned');
                btn.disabled = true;
                btn.textContent = '✓ Comprado';
            } else {
                btn.classList.remove('owned');
                btn.disabled = false;
                btn.textContent = id === 'tree2' ? '$100' : id === 'tree3' ? '$350' : '$250';
            }
        });
    }

    updateHud() {
        const moneyEl = document.getElementById('lemon-money');
        const invEl = document.getElementById('lemon-inv');
        const treeEl = document.getElementById('lemon-tree');
        const shopMoney = document.getElementById('shop-money-amount');
        if (moneyEl) moneyEl.textContent = `$${this.money}`;
        if (invEl) invEl.textContent = this.inventory;
        if (treeEl) treeEl.textContent = this.treeLevel;
        if (shopMoney && document.getElementById('lemon-shop-modal').classList.contains('open')) {
            shopMoney.textContent = this.money;
        }
    }

    showToast(text) {
        const toast = document.getElementById('lemon-toast');
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => toast.classList.remove('show'), 1500);
    }

    cleanup() {
        for (const obj of this.objects) this.scene.remove(obj);
        this.objects = [];
        this.lemons = [];
        if (this.handler.renderer?.domElement && this.onCanvasClick) {
            this.handler.renderer.domElement.removeEventListener('click', this.onCanvasClick);
        }
        this.stopAutoSeller();
        const slot = document.getElementById('game-specific-hud');
        if (slot) slot.innerHTML = '';
        const toast = document.getElementById('lemon-toast');
        if (toast) toast.remove();
    }
}
