import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class GameHandler {
    constructor() {
        this.keys = {};
        this.moveSpeed = 14;
        this.cameraYaw = 0;
        this.cameraPitch = 0.75;
        this.cameraDistance = 20;
        this.jumpVel = 0;
        this.gravity = -32;
        this.isGrounded = true;
        this.walkPhase = 0;
        this.lastTime = performance.now();
        this.cleanups = [];
        this.builders = {};
        this.currentGame = null;
        this.ball = null;
        this.ballVelocity = new THREE.Vector3();
        this.lastMoveDir = new THREE.Vector3();
        this.respawnY = -8;
        this.trophyPos = null;
        this.spawnPos = new THREE.Vector3(0, 0.5, 0);
        this.cameraSnap = false;

        // === Partículas ===
        this.particlePool = [];
        this.activeParticles = [];
        this.cameraShakeTime = 0;
        this.cameraShakeIntensity = 0;
        this.dustTimer = 0;

        // === Minimapa ===
        this.staticObjects = [];

        // === Mouse drag ===
        this.isRightDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.init();
        this.createPlayer();
        this.registerBuilders();
        this.loadGame('crossroads');
        this.setupControls();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa1c8e8);
        this.scene.fog = new THREE.Fog(0xa1c8e8, 100, 450);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        const container = document.getElementById('game-container');
        container.appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.left = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.zIndex = '5';
        container.appendChild(this.labelRenderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.1);
        sun.position.set(120, 240, -80);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        const d = 80;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 300;
        this.scene.add(sun);

        const fill = new THREE.DirectionalLight(0xfff1cc, 0.3);
        fill.position.set(-50, 30, -30);
        this.scene.add(fill);

        // === Sol visible en el cielo ===
        this.addSkySun();

        window.addEventListener('resize', () => this.onWindowResize(), false);

        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
    }

    addSkySun() {
        const sunCore = new THREE.Mesh(
            new THREE.SphereGeometry(10, 24, 24),
            new THREE.MeshBasicMaterial({ color: 0xfff8a0 })
        );
        sunCore.position.set(120, 240, -80);
        this.scene.add(sunCore);

        const glow1 = new THREE.Mesh(
            new THREE.SphereGeometry(17, 24, 24),
            new THREE.MeshBasicMaterial({ color: 0xfff8a0, transparent: true, opacity: 0.3 })
        );
        glow1.position.copy(sunCore.position);
        this.scene.add(glow1);

        const glow2 = new THREE.Mesh(
            new THREE.SphereGeometry(26, 24, 24),
            new THREE.MeshBasicMaterial({ color: 0xfff8a0, transparent: true, opacity: 0.12 })
        );
        glow2.position.copy(sunCore.position);
        this.scene.add(glow2);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    createPlayer() {
        this.player = new THREE.Group();
        const skin = 0xffcc4d;
        const shirt = 0x1e7ad6;
        const pants = 0x7fb539;

        const head = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 2.2, 2.2),
            new THREE.MeshStandardMaterial({ color: skin })
        );
        head.position.y = 6.5;
        head.castShadow = true;
        this.player.add(head);

        const eyeL = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.38, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        eyeL.position.set(-0.5, 6.75, 1.12);
        this.player.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.5;
        this.player.add(eyeR);

        const smile = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 0.06),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        smile.position.set(0, 6.25, 1.12);
        this.player.add(smile);

        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 3, 2),
            new THREE.MeshStandardMaterial({ color: shirt })
        );
        torso.position.y = 3.9;
        torso.castShadow = true;
        this.player.add(torso);

        const armGeo = new THREE.BoxGeometry(1.2, 3, 1.2);
        const armMat = new THREE.MeshStandardMaterial({ color: shirt });

        const armL = new THREE.Mesh(armGeo, armMat);
        armL.position.set(-2.35, 3.9, 0);
        armL.castShadow = true;
        armL.userData.isArm = 'left';
        this.player.add(armL);

        const armR = new THREE.Mesh(armGeo, armMat);
        armR.position.x = 2.35;
        armR.castShadow = true;
        armR.userData.isArm = 'right';
        this.player.add(armR);

        const legGeo = new THREE.BoxGeometry(1.4, 2.8, 1.4);
        const legMat = new THREE.MeshStandardMaterial({ color: pants });

        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.75, 1.4, 0);
        legL.castShadow = true;
        legL.userData.isLeg = 'left';
        this.player.add(legL);

        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.x = 0.75;
        legR.castShadow = true;
        legR.userData.isLeg = 'right';
        this.player.add(legR);

        this.scene.add(this.player);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'username-3d';
        nameDiv.textContent = 'Player_Clasic';
        this.nameLabel = new CSS2DObject(nameDiv);
        this.nameLabel.position.set(0, 8.5, 0);
        this.player.add(this.nameLabel);

        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-bubble-3d';
        chatDiv.style.display = 'none';
        this.chatLabel = new CSS2DObject(chatDiv);
        this.chatLabel.position.set(0, 11, 0);
        this.player.add(this.chatLabel);
    }

    showChatBubble(text) {
        this.chatLabel.element.textContent = text;
        this.chatLabel.element.style.display = 'block';
        clearTimeout(this.chatTimeout);
        this.chatTimeout = setTimeout(() => {
            this.chatLabel.element.style.display = 'none';
        }, 4000);
    }

    setPlayerName(name) {
        if (this.nameLabel) this.nameLabel.element.textContent = name;
    }

    /* ==========================================================
       FLOATING TEXT (R$ sobre el personaje)
       ========================================================== */
    showFloatingText(text, color = '#4cd964', worldPos) {
        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText = `
            color: ${color};
            font: 800 22px 'Source Sans Pro';
            text-shadow: 0 0 6px rgba(0,0,0,0.85), 0 2px 0 rgba(0,0,0,0.5);
            pointer-events: none;
            white-space: nowrap;
            letter-spacing: 0.5px;
            transition: none;
            transform-origin: center;
            will-change: transform, opacity;
        `;
        const obj = new CSS2DObject(div);
        obj.position.copy(worldPos);
        obj.position.y += 4;
        this.scene.add(obj);

        const startY = obj.position.y;
        let t = 0;
        const dur = 1.4;
        const step = () => {
            t += 1 / 60;
            if (t >= dur) {
                this.scene.remove(obj);
                if (obj.element.parentNode) obj.element.parentNode.removeChild(obj.element);
                return;
            }
            obj.position.y = startY + t * 2.5;
            const p = t / dur;
            obj.element.style.opacity = Math.max(0, 1 - p * p);
            obj.element.style.fontSize = `${22 + p * 14}px`;
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    /* ==========================================================
       PARTICLE SYSTEM con pool de objetos
       ========================================================== */
    emitParticles(position, options = {}) {
        const {
            count = 10,
            color = 0xffffff,
            size = 0.3,
            speed = 5,
            lifetime = 1,
            gravity = 8,
            spread = 1,
            upwardBias = 0.5,
        } = options;

        for (let i = 0; i < count; i++) {
            const p = this.acquireParticle();
            p.material.color.setHex(color);
            p.material.opacity = 1;
            p.scale.setScalar(size);
            p.position.copy(position);

            const angle = Math.random() * Math.PI * 2;
            const horiz = speed * spread * (0.5 + Math.random() * 0.7);
            const vert = speed * upwardBias * (0.7 + Math.random() * 0.6);

            p.userData.velocity.set(
                Math.cos(angle) * horiz,
                vert,
                Math.sin(angle) * horiz
            );
            p.userData.life = lifetime * (0.7 + Math.random() * 0.6);
            p.userData.maxLife = p.userData.life;
            p.userData.gravity = gravity;
            p.userData.rotSpeed = (Math.random() - 0.5) * 10;

            this.scene.add(p);
            this.activeParticles.push(p);
        }
    }

    acquireParticle() {
        if (this.particlePool.length > 0) {
            const p = this.particlePool.pop();
            p.visible = true;
            return p;
        }
        const p = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })
        );
        return p;
    }

    updateParticles(dt) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.userData.life -= dt;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.activeParticles.splice(i, 1);
                p.visible = false;
                this.particlePool.push(p);
                continue;
            }
            p.userData.velocity.y -= p.userData.gravity * dt;
            p.position.x += p.userData.velocity.x * dt;
            p.position.y += p.userData.velocity.y * dt;
            p.position.z += p.userData.velocity.z * dt;
            p.material.opacity = Math.max(0, p.userData.life / p.userData.maxLife);
            p.rotation.x += dt * p.userData.rotSpeed;
            p.rotation.z += dt * p.userData.rotSpeed * 0.7;
        }
    }

    /* ==========================================================
       GAME SYSTEM
       ========================================================== */
registerBuilders() {
  this.builders.crossroads = () => this.buildCrossroads();
  this.builders.obby = () => this.buildObby();
  this.builders.tower = () => this.buildTower();
  this.builders.soccer = () => this.buildSoccer();
  
  // Sell Lemons
  this.builders['sell-lemons'] = () => this.buildSellLemons();
}

    loadGame(name) {
        this.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
        this.cleanups = [];

        // limpiar partículas
        for (const p of this.activeParticles) this.scene.remove(p);
        for (const p of this.particlePool) this.scene.remove(p);
        this.activeParticles = [];
        this.particlePool = [];

        this.ball = null;
        this.trophyPos = null;
        this.staticObjects = [];

        if (this.builders[name]) {
            const cleanup = this.builders[name]();
            if (typeof cleanup === 'function') this.cleanups.push(cleanup);
            this.currentGame = name;
        }

        this.respawn();
        this.cameraSnap = true;
    }

    respawn() {
        this.player.position.copy(this.spawnPos);
        this.player.rotation.set(0, 0, 0);
        this.jumpVel = 0;
        this.isGrounded = true;
        this.cameraYaw = 0;
    }

    /* ============================
       MATERIALES
       ============================ */
    grassMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#3b5320';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 256; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        return new THREE.MeshStandardMaterial({ map: tex });
    }

    stripedGrassMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const light = '#5d8c33';
        const dark = '#3b5320';
        const w = canvas.width / 8;
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 === 0 ? light : dark;
            ctx.fillRect(i * w, 0, w, canvas.height);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(5, 3);
        return new THREE.MeshStandardMaterial({ map: tex });
    }

    lavaMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff2200,
            emissiveIntensity: 0.5,
        });
    }

    block(w, h, d, color) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            typeof color === 'number' ? new THREE.MeshStandardMaterial({ color }) : color
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    /* ==========================================================
       CROSSROADS
       ========================================================== */
    buildCrossroads() {
        const meshes = [];
        const addObj = (mesh, minimap = null) => {
            this.scene.add(mesh);
            meshes.push(mesh);
            if (minimap) this.staticObjects.push({ mesh, ...minimap });
        };

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(140, 1, 140),
            this.grassMaterial()
        );
        base.position.y = -0.5;
        base.receiveShadow = true;
        addObj(base, { color: '#3b5320', size: 50 });

        this.spawnPos = new THREE.Vector3(0, 0.5, 0);
        const spawn = this.block(10, 1, 10, 0x6b9bd1);
        spawn.position.copy(this.spawnPos);
        addObj(spawn, { color: '#6b9bd1', size: 10 });

        const tower = (x, z, c, h, mc, ms) => {
            for (let i = 0; i < h; i++) {
                const b = this.block(4, 4, 4, c);
                b.position.set(x, i * 4 + 2, z);
                addObj(b, { color: mc, size: ms });
            }
        };
        tower(-22, -22, 0xff4444, 5, '#ff4444', 8);
        tower(26, 16, 0x3388ff, 7, '#3388ff', 8);
        tower(-32, 28, 0x44dd88, 4, '#44dd88', 8);

        const fb = (x, y, z, w, h, d, c, mc, ms) => {
            const b = this.block(w, h, d, c);
            b.position.set(x, y + h / 2, z);
            addObj(b, { color: mc, size: ms });
        };
        fb(12, 0, -10, 3, 3, 3, 0xffd54a, '#ffd54a', 5);
        fb(-16, 0, 22, 4, 2, 2, 0xff66cc, '#ff66cc', 5);
        fb(0, 0, -18, 5, 5, 5, 0xffffff, '#ffffff', 7);

        const tree = (x, z) => {
            const trunk = this.block(1, 4, 1, 0x5c3a1e);
            trunk.position.set(x, 2, z);
            addObj(trunk, { color: '#5c3a1e', size: 2 });
            const leaves = this.block(4, 4, 4, 0x228833);
            leaves.position.set(x, 6, z);
            addObj(leaves, { color: '#228833', size: 5 });
        };
        tree(-15, 5); tree(18, -2); tree(-8, 15); tree(12, 25); tree(28, 5);

        this.respawnY = -10;
        return () => {};
    }

    /* ==========================================================
       OBBY
       ========================================================== */
    buildObby() {
        const meshes = [];
        const addObj = (mesh, minimap = null) => {
            this.scene.add(mesh);
            meshes.push(mesh);
            if (minimap) this.staticObjects.push({ mesh, ...minimap });
        };

        const lava = this.block(300, 1, 300, this.lavaMaterial());
        lava.position.y = -10;
        addObj(lava, { color: '#ff3300', size: 80 });

        this.spawnPos = new THREE.Vector3(0, 1, 0);
        const start = this.block(8, 1, 8, 0x00cc66);
        start.material.emissive = new THREE.Color(0x008844);
        start.material.emissiveIntensity = 0.3;
        start.position.set(0, 0.5, 0);
        addObj(start, { color: '#00cc66', size: 8 });

        const dirs = [[5, 0], [5, -5], [0, -5], [-5, -5], [-5, 0], [-5, 5], [0, 5], [5, 5]];
        const colors = [0xff6688, 0x66ccff, 0xffcc44, 0x88ff66, 0xcc88ff, 0xff9966, 0x66ffcc, 0xff66cc];
        let x = 0, y = 2, z = -8;
        let dirIdx = 0;
        for (let i = 0; i < 22; i++) {
            const t = i / 22;
            const w = Math.max(3.5, 5 - t * 2);
            const d = Math.max(3.5, 5 - t * 2);
            const color = colors[i % colors.length];
            const plat = this.block(w, 0.8, d, color);
            plat.position.set(x, y, z);
            const hex = '#' + color.toString(16).padStart(6, '0');
            addObj(plat, { color: hex, size: 5 });
            const dir = dirs[dirIdx % 8];
            x += dir[0];
            z += dir[1];
            y += 1.1;
            dirIdx++;
        }

        const finish = this.block(8, 1, 8, 0x66ff66);
        finish.material.emissive = new THREE.Color(0x44cc44);
        finish.material.emissiveIntensity = 0.5;
        finish.position.set(x, y, z);
        addObj(finish, { color: '#66ff66', size: 9 });

        this.trophyPos = new THREE.Vector3(x, y + 2, z);
        const trophy = this.block(1.5, 3, 1.5, 0xffd700);
        trophy.material.emissive = new THREE.Color(0xffaa00);
        trophy.material.emissiveIntensity = 0.6;
        trophy.position.set(x, y + 2, z);
        addObj(trophy, { color: '#ffd700', size: 4 });

        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 80, 12),
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.25 })
        );
        beam.position.set(x, y + 40, z);
        addObj(beam, { color: '#ffff00', size: 3 });

        this.respawnY = -8;
        return () => {};
    }

    /* ==========================================================
       TORRE
       ========================================================== */
    buildTower() {
        const meshes = [];
        const addObj = (mesh, minimap = null) => {
            this.scene.add(mesh);
            meshes.push(mesh);
            if (minimap) this.staticObjects.push({ mesh, ...minimap });
        };

        const lava = this.block(300, 1, 300, this.lavaMaterial());
        lava.position.y = -10;
        addObj(lava, { color: '#ff3300', size: 80 });

        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(70, 1, 70),
            this.grassMaterial()
        );
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        addObj(ground, { color: '#3b5320', size: 30 });

        this.spawnPos = new THREE.Vector3(0, 1, 0);

        const towerHeight = 70;
        const centralMat = new THREE.MeshStandardMaterial({ color: 0x6e7681 });
        const central = this.block(10, towerHeight, 10, centralMat);
        central.position.set(0, towerHeight / 2, 0);
        addObj(central, { color: '#6e7681', size: 10 });

        const numPlatforms = 22;
        const radius = 12;
        for (let i = 0; i < numPlatforms; i++) {
            const angle = (i / numPlatforms) * Math.PI * 4;
            const yPos = (i + 1) * (towerHeight / numPlatforms) + 2;
            const isLast = i === numPlatforms - 1;
            const plat = this.block(
                isLast ? 7 : 4.5,
                0.6,
                isLast ? 7 : 4.5,
                isLast ? 0xffd700 : 0x4cd964
            );
            plat.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
            if (isLast) {
                plat.material.emissive = new THREE.Color(0xffaa00);
                plat.material.emissiveIntensity = 0.6;
            }
            addObj(plat, { color: isLast ? '#ffd700' : '#4cd964', size: 4 });
        }

        const trophyTop = this.block(1.6, 4, 1.6, 0xffd700);
        trophyTop.position.set(0, towerHeight + 3, 0);
        trophyTop.material.emissive = new THREE.Color(0xff8800);
        trophyTop.material.emissiveIntensity = 0.5;
        addObj(trophyTop, { color: '#ffd700', size: 4 });
        const pole = this.block(0.3, 5, 0.3, 0x444444);
        pole.position.set(0, towerHeight + 7, 0);
        const flag = this.block(2, 1.2, 0.1, 0xff2222);
        flag.position.set(1.2, towerHeight + 8.7, 0);

        this.trophyPos = new THREE.Vector3(0, towerHeight + 4, 0);
        this.respawnY = -8;
        return () => {};
    }

    /* ==========================================================
       FÚTBOL
       ========================================================== */
    buildSoccer() {
        const meshes = [];
        const addObj = (mesh, minimap = null) => {
            this.scene.add(mesh);
            meshes.push(mesh);
            if (minimap) this.staticObjects.push({ mesh, ...minimap });
        };

        const field = this.block(140, 1, 90, this.stripedGrassMaterial());
        field.position.y = -0.5;
        addObj(field, { color: '#3b5320', size: 60 });

        addObj(this.makeGoal(-67, 0, 0, 0), { color: '#ffffff', size: 12 });
        addObj(this.makeGoal(67, 0, 0, Math.PI), { color: '#ffffff', size: 12 });

        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        ball.position.set(0, 1.5, 0);
        ball.castShadow = true;
        ball.receiveShadow = true;
        addObj(ball, { color: '#ffffff', size: 2 });
        this.ball = ball;

        for (const [x, z] of [[-69, 44], [69, 44], [-69, -44], [69, -44]]) {
            const pole = this.block(0.15, 2.5, 0.15, 0xffff00);
            pole.position.set(x, 1.25, z);
            const corner = this.block(0.8, 0.5, 0.05, 0xff8800);
            corner.position.set(x + (x > 0 ? -0.45 : 0.45), 2.4, z);
        }

        this.spawnPos = new THREE.Vector3(0, 1, 35);
        this.respawnY = -8;
        return () => {};
    }

    makeGoal(x, y, z, rotY) {
        const grp = new THREE.Group();
        const postMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
        const netMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
        const pL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, 0.3), postMat);
        pL.position.set(0, 2, -8);
        grp.add(pL);
        const pR = pL.clone();
        pR.position.z = 8;
        grp.add(pR);
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 16), postMat);
        cross.position.set(0, 4, 0);
        grp.add(cross);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4, 16), netMat);
        back.position.set(-1.2, 2, 0);
        grp.add(back);
        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        return grp;
    }

    /* ==========================================================
       CONTROLS — clic derecho + arrastrar para rotar cámara
       ========================================================== */
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        const canvas = this.renderer.domElement;
        canvas.style.cursor = 'grab';
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('mousedown', (e) => {
            if (e.button !== 2) return;
            this.isRightDragging = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isRightDragging && e.button === 2) {
                this.isRightDragging = false;
                canvas.style.cursor = 'grab';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isRightDragging) return;
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.cameraYaw -= dx * 0.005;
            this.cameraPitch -= dy * 0.003;
            this.cameraPitch = Math.max(0.15, Math.min(1.4, this.cameraPitch));
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
    }

    isChatFocused() {
        const active = document.activeElement;
        return active && (
            active.id === 'chat-input' ||
            active.id === 'discover-search'
        );
    }

    isUiBlocking() {
        return !!document.getElementById('discover-overlay')?.classList.contains('open');
    }

    updatePlayer(dt) {
        if (this.isChatFocused() || this.isUiBlocking()) {
            this.walkPhase *= 0.82;
            this.animateLimbs();
            return;
        }

        const move = new THREE.Vector3();
        if (this.keys['KeyW'] || this.keys['ArrowUp']) move.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) move.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) move.x += 1;

        const isMoving = move.lengthSq() > 0;
        if (isMoving) {
            move.normalize();
            const sin = Math.sin(this.cameraYaw);
            const cos = Math.cos(this.cameraYaw);
            const mx = move.x * cos + move.z * sin;
            const mz = -move.x * sin + move.z * cos;
            move.x = mx;
            move.z = mz;
            move.multiplyScalar(this.moveSpeed * dt);

            this.player.position.x += move.x;
            this.player.position.z += move.z;
            this.lastMoveDir.copy(move).normalize();

            const targetYaw = Math.atan2(move.x, move.z);
            let cur = this.player.rotation.y;
            let diff = targetYaw - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.player.rotation.y = cur + diff * Math.min(1, dt * 12);

            this.walkPhase += dt * 9;
        } else {
            this.walkPhase *= 0.82;
        }

        // Salto
        if (this.keys['Space'] && this.isGrounded) {
            this.jumpVel = 11;
            this.isGrounded = false;
            this.emitParticles(
                new THREE.Vector3(this.player.position.x, 0.2, this.player.position.z),
                { count: 6, color: 0xddccaa, size: 0.3, speed: 3, lifetime: 0.6, gravity: 3, upwardBias: 0.2 }
            );
        }

        if (!this.isGrounded) {
            this.jumpVel += this.gravity * dt;
            this.player.position.y += this.jumpVel * dt;
            if (this.player.position.y <= 0) {
                const dropVel = this.jumpVel;
                this.player.position.y = 0;
                this.jumpVel = 0;
                this.isGrounded = true;
                if (dropVel < -8) {
                    this.emitParticles(
                        new THREE.Vector3(this.player.position.x, 0.3, this.player.position.z),
                        { count: 14, color: 0xc8b890, size: 0.4, speed: 5, lifetime: 0.9, gravity: 4, upwardBias: 0.3, spread: 1.2 }
                    );
                    this.cameraShakeTime = 0.35;
                    this.cameraShakeIntensity = Math.min(0.6, Math.abs(dropVel) * 0.05);
                }
            }
        } else if (isMoving) {
            this.dustTimer += dt;
            if (this.dustTimer > 0.25) {
                this.dustTimer = 0;
                this.emitParticles(
                    new THREE.Vector3(this.player.position.x, 0.1, this.player.position.z),
                    { count: 1, color: 0xddccaa, size: 0.18, speed: 1, lifetime: 0.4, gravity: 1, upwardBias: 0.1 }
                );
            }
        }

        if (this.player.position.y < this.respawnY) {
            this.respawn();
            this.cameraSnap = true;
            window.dispatchEvent(new CustomEvent('player-fell'));
        }

        if (this.trophyPos) {
            const d = this.player.position.distanceTo(this.trophyPos);
            if (d < 3.5) {
                this.trophyPos = null;
                window.dispatchEvent(new CustomEvent('player-won', { detail: this.currentGame }));
            }
        }

        if (this.ball && this.currentGame === 'soccer') this.updateBall(dt);
        this.animateLimbs();
    }

    updateBall(dt) {
        this.ballVelocity.multiplyScalar(0.96);
        this.ball.position.x += this.ballVelocity.x * dt;
        this.ball.position.z += this.ballVelocity.z * dt;
        this.ball.position.y = 1.5;

        const speed = Math.hypot(this.ballVelocity.x, this.ballVelocity.z);
        if (speed > 0.1) {
            this.ball.rotation.z -= this.ballVelocity.x * dt * 0.5;
            this.ball.rotation.x += this.ballVelocity.z * dt * 0.5;
        }
        this.ball.position.x = Math.max(-68, Math.min(68, this.ball.position.x));
        this.ball.position.z = Math.max(-43, Math.min(43, this.ball.position.z));

        const dx = this.ball.position.x - this.player.position.x;
        const dz = this.ball.position.z - this.player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.5) {
            const pushX = dx / Math.max(dist, 0.001);
            const pushZ = dz / Math.max(dist, 0.001);
            this.ballVelocity.x = pushX * 9;
            this.ballVelocity.z = pushZ * 9;
        }

        if (this.ball.position.x < -60 && Math.abs(this.ball.position.z) < 8) {
            window.dispatchEvent(new CustomEvent('player-scored', { detail: 'left' }));
            this.ball.position.set(0, 1.5, 0);
            this.ballVelocity.set(0, 0, 0);
        } else if (this.ball.position.x > 60 && Math.abs(this.ball.position.z) < 8) {
            window.dispatchEvent(new CustomEvent('player-scored', { detail: 'right' }));
            this.ball.position.set(0, 1.5, 0);
            this.ballVelocity.set(0, 0, 0);
        }
    }

    animateLimbs() {
        const swing = Math.sin(this.walkPhase);
        this.player.children.forEach(c => {
            if (c.userData.isLeg === 'left') c.position.z = swing * 1.5;
            else if (c.userData.isLeg === 'right') c.position.z = -swing * 1.5;
            if (c.userData.isArm === 'left') c.rotation.x = -swing * 0.7;
            else if (c.userData.isArm === 'right') c.rotation.x = swing * 0.7;
        });
    }

    updateCamera(dt) {
        const target = this.player.position.clone().add(new THREE.Vector3(0, 4, 0));
        const cp = Math.cos(this.cameraPitch);
        const sp = Math.sin(this.cameraPitch);
        const cy = Math.cos(this.cameraYaw);
        const sy = Math.sin(this.cameraYaw);
        const offset = new THREE.Vector3(
            sy * cp * this.cameraDistance,
            sp * this.cameraDistance,
            cy * cp * this.cameraDistance
        );

        // Camera shake
        if (this.cameraShakeTime > 0) {
            this.cameraShakeTime -= dt;
            const k = Math.max(0, this.cameraShakeTime / 0.35) * this.cameraShakeIntensity;
            offset.x += (Math.random() - 0.5) * k * 1.5;
            offset.y += (Math.random() - 0.5) * k;
            offset.z += (Math.random() - 0.5) * k * 0.3;
        }

        const desired = target.clone().add(offset);
        if (this.cameraSnap) {
            this.camera.position.copy(desired);
            this.cameraSnap = false;
        } else {
            this.camera.position.lerp(desired, 0.18);
        }
        this.camera.lookAt(target);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const now = performance.now();
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        dt = Math.min(dt, 0.05);

        this.updatePlayer(dt);
        this.updateCamera(dt);
        this.updateParticles(dt);

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

window.GameHandler = new GameHandler();
