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
        sun.position.set(60, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        const d = 80;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 250;
        this.scene.add(sun);

        const fill = new THREE.DirectionalLight(0xfff1cc, 0.3);
        fill.position.set(-50, 30, -30);
        this.scene.add(fill);

        window.addEventListener('resize', () => this.onWindowResize(), false);

        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
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
       GAME SYSTEM — cargar y descargar juegos
       ========================================================== */
    registerBuilders() {
        this.builders.crossroads = () => this.buildCrossroads();
        this.builders.obby = () => this.buildObby();
        this.builders.tower = () => this.buildTower();
        this.builders.soccer = () => this.buildSoccer();
    }

    loadGame(name) {
        // Limpieza del anterior
        this.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
        this.cleanups = [];
        this.ball = null;
        this.trophyPos = null;

        // Construir el nuevo
        if (this.builders[name]) {
            const cleanup = this.builders[name]();
            if (typeof cleanup === 'function') this.cleanups.push(cleanup);
            this.currentGame = name;
        }

        // Reposicionar jugador al spawn
        this.respawn();
        this.cameraSnap = true; // salto brusco de cámara al nuevo juego
    }

    respawn() {
        this.player.position.copy(this.spawnPos);
        this.player.rotation.set(0, 0, 0);
        this.jumpVel = 0;
        this.isGrounded = true;
        this.cameraYaw = 0;
    }

    /* ============================
       MATERIALES REUTILIZABLES
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
        canvas.width = 256;
        canvas.height = 256;
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
       JUEGO 1: CROSSROADS
       ========================================================== */
    buildCrossroads() {
        const meshes = [];
        const add = (m) => { this.scene.add(m); meshes.push(m); };

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(120, 1, 120),
            this.grassMaterial()
        );
        base.position.y = -0.5;
        base.receiveShadow = true;
        add(base);

        this.spawnPos = new THREE.Vector3(0, 0.5, 0);
        const spawn = this.block(10, 1, 10, 0x6b9bd1);
        spawn.position.copy(this.spawnPos);
        add(spawn);

        const tower = (x, z, c, h) => {
            for (let i = 0; i < h; i++) {
                const b = this.block(4, 4, 4, c);
                b.position.set(x, i * 4 + 2, z);
                add(b);
            }
        };
        tower(-22, -22, 0xff4444, 5);
        tower(26, 16, 0x3388ff, 7);
        tower(-32, 28, 0x44dd88, 4);

        const freeBlock = (x, y, z, w, h, d, c) => {
            const b = this.block(w, h, d, c);
            b.position.set(x, y + h / 2, z);
            add(b);
        };
        freeBlock(12, 0, -10, 3, 3, 3, 0xffd54a);
        freeBlock(-16, 0, 22, 4, 2, 2, 0xff66cc);
        freeBlock(0, 0, -18, 5, 5, 5, 0xffffff);

        const tree = (x, z) => {
            const trunk = this.block(1, 4, 1, 0x5c3a1e);
            trunk.position.set(x, 2, z);
            add(trunk);
            const leaves = this.block(4, 4, 4, 0x228833);
            leaves.position.set(x, 6, z);
            add(leaves);
        };
        tree(-15, 5); tree(18, -2); tree(-8, 15); tree(12, 25); tree(28, 5);

        this.respawnY = -10;
        return () => {};
    }

    /* ==========================================================
       JUEGO 2: OBBY PARKOUR (zigzag ascendente)
       ========================================================== */
    buildObby() {
        const meshes = [];
        const add = (m) => { this.scene.add(m); meshes.push(m); };

        // Lava inferior
        const lava = this.block(300, 1, 300, this.lavaMaterial());
        lava.position.y = -10;
        add(lava);

        // Plataforma inicial
        this.spawnPos = new THREE.Vector3(0, 1, 0);
        const start = this.block(8, 1, 8, 0x00cc66);
        start.position.set(0, 0.5, 0);
        start.material.emissive = new THREE.Color(0x008844);
        start.material.emissiveIntensity = 0.3;
        add(start);

        // Camino de plataformas
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
            add(plat);
            const dir = dirs[dirIdx % 8];
            x += dir[0];
            z += dir[1];
            y += 1.1;
            dirIdx++;
        }

        // Plataforma final con trofeo
        const finish = this.block(8, 1, 8, 0x66ff66);
        finish.material.emissive = new THREE.Color(0x44cc44);
        finish.material.emissiveIntensity = 0.5;
        finish.position.set(x, y, z);
        add(finish);

        this.trophyPos = new THREE.Vector3(x, y + 2, z);
        const trophy = this.block(1.5, 3, 1.5, 0xffd700);
        trophy.material.emissive = new THREE.Color(0xffaa00);
        trophy.material.emissiveIntensity = 0.6;
        trophy.position.set(x, y + 2, z);
        add(trophy);

        // Haz de luz del trofeo
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 80, 12),
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.25 })
        );
        beam.position.set(x, y + 40, z);
        add(beam);

        this.respawnY = -8;
        return () => {};
    }

    /* ==========================================================
       JUEGO 3: TORRE INFERNAL (espiral ascendente)
       ========================================================== */
    buildTower() {
        const meshes = [];
        const add = (m) => { this.scene.add(m); meshes.push(m); };

        const lava = this.block(300, 1, 300, this.lavaMaterial());
        lava.position.y = -10;
        add(lava);

        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(70, 1, 70),
            this.grassMaterial()
        );
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        add(ground);

        this.spawnPos = new THREE.Vector3(0, 1, 0);

        // Torre central
        const towerHeight = 70;
        const centralMat = new THREE.MeshStandardMaterial({ color: 0x6e7681 });
        const central = this.block(10, towerHeight, 10, centralMat);
        central.position.set(0, towerHeight / 2, 0);
        add(central);

        // Plataformas en espiral
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
            add(plat);
        }

        // Trofeo arriba
        const trophyTop = this.block(1.6, 4, 1.6, 0xffd700);
        trophyTop.position.set(0, towerHeight + 3, 0);
        trophyTop.material.emissive = new THREE.Color(0xff8800);
        trophyTop.material.emissiveIntensity = 0.5;
        add(trophyTop);
        const pole = this.block(0.3, 5, 0.3, 0x444444);
        pole.position.set(0, towerHeight + 7, 0);
        add(pole);
        const flag = this.block(2, 1.2, 0.1, 0xff2222);
        flag.position.set(1.2, towerHeight + 8.7, 0);
        add(flag);

        this.trophyPos = new THREE.Vector3(0, towerHeight + 4, 0);
        this.respawnY = -8;
        return () => {};
    }

    /* ==========================================================
       JUEGO 4: CANCHA DE FÚTBOL
       ========================================================== */
    buildSoccer() {
        const meshes = [];
        const add = (m) => { this.scene.add(m); meshes.push(m); };

        // Cesped a rayas
        const field = this.block(140, 1, 90, this.stripedGrassMaterial());
        field.position.y = -0.5;
        add(field);

        // Líneas blancas
        const lines = [
            { p: [0, 0.05, 45], s: [140, 0.05, 0.4] },
            { p: [0, 0.05, -45], s: [140, 0.05, 0.4] },
            { p: [-70, 0.05, 0], s: [0.4, 0.05, 90] },
            { p: [70, 0.05, 0], s: [0.4, 0.05, 90] },
            { p: [0, 0.05, 0], s: [0.4, 0.05, 90] },
        ];
        for (const l of lines) {
            const m = this.block(l.s[0], l.s[1], l.s[2], 0xffffff);
            m.position.set(l.p[0], l.p[1], l.p[2]);
            m.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            add(m);
        }
        // Círculo central (octógono)
        for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2;
            const seg = this.block(2.5, 0.06, 0.3, 0xffffff);
            seg.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            seg.position.set(Math.cos(ang) * 12, 0.06, Math.sin(ang) * 12);
            seg.rotation.y = -ang + Math.PI / 2;
            add(seg);
        }

        // Porterías
        add(this.makeGoal(-67, 0, 0, 0));
        add(this.makeGoal(67, 0, 0, Math.PI));

        // Pelota
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 24, 24),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        ball.position.set(0, 1.5, 0);
        ball.castShadow = true;
        ball.receiveShadow = true;
        add(ball);
        this.ball = ball;

        // Banderines de esquina
        for (const [x, z] of [[-69, 44], [69, 44], [-69, -44], [69, -44]]) {
            const pole = this.block(0.15, 2.5, 0.15, 0xffff00);
            pole.position.set(x, 1.25, z);
            add(pole);
            const corner = this.block(0.8, 0.5, 0.05, 0xff8800);
            corner.position.set(x + (x > 0 ? -0.45 : 0.45), 2.4, z);
            add(corner);
        }

        // Vallas alrededor
        const valla = new THREE.MeshStandardMaterial({ color: 0x666666 });
        for (let x = -60; x <= 60; x += 20) {
            const a = this.block(0.3, 4, 0.3, valla);
            a.position.set(x, 2, 46);
            add(a);
            const b = this.block(0.3, 4, 0.3, valla);
            b.position.set(x, 2, -46);
            add(b);
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
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 16), netMat);
        top.position.set(-0.6, 4, 0);
        grp.add(top);

        grp.position.set(x, y, z);
        grp.rotation.y = rotY;
        return grp;
    }

    /* ==========================================================
       PLAYER + INTERACCIONES
       ========================================================== */
    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) {
                const active = document.activeElement;
                if (active && active.tagName === 'INPUT') return;
                canvas.requestPointerLock();
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== canvas) return;
            this.cameraYaw -= e.movementX * 0.005;
            this.cameraPitch -= e.movementY * 0.003;
            this.cameraPitch = Math.max(0.15, Math.min(1.4, this.cameraPitch));
        });
    }

    isChatFocused() {
        const active = document.activeElement;
        return active && (
            active.id === 'chat-input' ||
            active.id === 'discover-search' ||
            (active.tagName === 'INPUT' && active.classList?.contains('discover-search'))
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

        if (this.keys['Space'] && this.isGrounded) {
            this.jumpVel = 11;
            this.isGrounded = false;
        }
        if (!this.isGrounded) {
            this.jumpVel += this.gravity * dt;
            this.player.position.y += this.jumpVel * dt;
            if (this.player.position.y <= 0) {
                this.player.position.y = 0;
                this.jumpVel = 0;
                this.isGrounded = true;
            }
        }

        // Caída al vacío
        if (this.player.position.y < this.respawnY) {
            this.respawn();
            this.cameraSnap = true;
            window.dispatchEvent(new CustomEvent('player-fell'));
        }

        // Llegar al trofeo
        if (this.trophyPos) {
            const d = this.player.position.distanceTo(this.trophyPos);
            if (d < 3.5) {
                this.trophyPos = null;
                window.dispatchEvent(new CustomEvent('player-won', { detail: this.currentGame }));
            }
        }

        // Pelota del fútbol
        if (this.ball && this.currentGame === 'soccer') this.updateBall(dt);

        this.animateLimbs();
    }

    updateBall(dt) {
        this.ballVelocity.multiplyScalar(0.96);
        this.ball.position.x += this.ballVelocity.x * dt;
        this.ball.position.z += this.ballVelocity.z * dt;
        this.ball.position.y = 1.5;

        // Rodar visualmente
        const speed = Math.hypot(this.ballVelocity.x, this.ballVelocity.z);
        if (speed > 0.1) {
            this.ball.rotation.z -= this.ballVelocity.x * dt * 0.5;
            this.ball.rotation.x += this.ballVelocity.z * dt * 0.5;
        }

        // Mantener en el campo
        this.ball.position.x = Math.max(-68, Math.min(68, this.ball.position.x));
        this.ball.position.z = Math.max(-43, Math.min(43, this.ball.position.z));

        // Empujar al chocar con el jugador
        const dx = this.ball.position.x - this.player.position.x;
        const dz = this.ball.position.z - this.player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 2.5) {
            const pushX = dx / Math.max(dist, 0.001);
            const pushZ = dz / Math.max(dist, 0.001);
            this.ballVelocity.x = pushX * 9;
            this.ballVelocity.z = pushZ * 9;
        }

        // Detección de gol
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

    updateCamera() {
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
        this.updateCamera();

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

window.GameHandler = new GameHandler();
