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

        this.init();
        this.createBaseplate();
        this.createStructures();
        this.createPlayer();
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

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        const ambient = new THREE.AmbientLight(0xffffff, 0.65);
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

    createBaseplate() {
        const size = 100;
        const geo = new THREE.BoxGeometry(size, 1, size);

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
        tex.repeat.set(20, 20);

        const mat = new THREE.MeshStandardMaterial({ map: tex });
        const base = new THREE.Mesh(geo, mat);
        base.position.y = -0.5;
        base.receiveShadow = true;
        this.scene.add(base);

        const edge = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        edge.position.y = -0.5;
        this.scene.add(edge);
    }

    createStructures() {
        this.structures = [];

        const tower = (x, z, color, height) => {
            for (let i = 0; i < height; i++) {
                const b = new THREE.Mesh(
                    new THREE.BoxGeometry(4, 4, 4),
                    new THREE.MeshStandardMaterial({ color })
                );
                b.position.set(x, i * 4 + 2, z);
                b.castShadow = true;
                b.receiveShadow = true;
                this.scene.add(b);
                this.structures.push(b);
            }
        };

        const block = (x, y, z, w, h, d, color) => {
            const b = new THREE.Mesh(
                new THREE.BoxGeometry(w, h, d),
                new THREE.MeshStandardMaterial({ color })
            );
            b.position.set(x, y + h / 2, z);
            b.castShadow = true;
            b.receiveShadow = true;
            this.scene.add(b);
            this.structures.push(b);
        };

        tower(-22, -22, 0xff4444, 5);
        tower(26, 16, 0x3388ff, 7);
        block(12, 0, -10, 3, 3, 3, 0xffd54a);
        block(-16, 0, 22, 4, 2, 2, 0xff66cc);
        block(0, 0, -18, 5, 5, 5, 0xffffff);

        // Bosque de "spawn": spawn platform con bloques decorativos
        block(0, 0, 0, 10, 1, 10, 0x6b9bd1);
        block(-18, 0, 8, 2, 6, 2, 0x8b4513);
        block(18, 0, -8, 2, 6, 2, 0x8b4513);
    }

    createPlayer() {
        this.player = new THREE.Group();

        // === El icónico noob de Roblox: cabeza amarilla, camisa azul, pantalón verde ===
        const skin = 0xffcc4d;      // amarillo icónico
        const shirt = 0x1e7ad6;     // azul
        const pants = 0x7fb539;     // verde lima
        const accent = 0x000000;

        // Cabeza
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 2.2, 2.2),
            new THREE.MeshStandardMaterial({ color: skin })
        );
        head.position.y = 6.5;
        head.castShadow = true;
        this.player.add(head);

        // Cara: 2 ojos y una sonrisa
        const eyeL = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.38, 0.06),
            new THREE.MeshBasicMaterial({ color: accent })
        );
        eyeL.position.set(-0.5, 6.75, 1.12);
        this.player.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.5;
        this.player.add(eyeR);

        const smile = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.2, 0.06),
            new THREE.MeshBasicMaterial({ color: accent })
        );
        smile.position.set(0, 6.25, 1.12);
        this.player.add(smile);

        // Torso
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 3, 2),
            new THREE.MeshStandardMaterial({ color: shirt })
        );
        torso.position.y = 3.9;
        torso.castShadow = true;
        this.player.add(torso);

        // Brazos
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

        // Piernas
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

        // === Username tag sobre la cabeza ===
        const nameDiv = document.createElement('div');
        nameDiv.className = 'username-3d';
        nameDiv.textContent = 'Player_Clasic';
        this.nameLabel = new CSS2DObject(nameDiv);
        this.nameLabel.position.set(0, 8.5, 0);
        this.player.add(this.nameLabel);

        // === Burbuja de chat (por encima del nombre) ===
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

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Mouse-look con Pointer Lock — clic para activar
        const canvas = this.renderer.domElement;
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) {
                // Solo bloquear si NO estamos escribiendo en un input
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
        return active && (active.id === 'chat-input' || active.tagName === 'INPUT');
    }

    updatePlayer(dt) {
        if (this.isChatFocused()) {
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

            this.player.position.x = Math.max(-48, Math.min(48, this.player.position.x + move.x));
            this.player.position.z = Math.max(-48, Math.min(48, this.player.position.z + move.z));

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

        this.animateLimbs();
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
        this.camera.position.lerp(desired, 0.18);
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

        if (this.structures) {
            const central = this.structures.find(s => s.material.color.getHex() === 0xffffff);
            if (central) central.rotation.y += dt * 0.3;
        }

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }

    respawn() {
        this.player.position.set(0, 0, 0);
        this.player.rotation.y = 0;
        this.jumpVel = 0;
        this.isGrounded = true;
    }
}

window.GameHandler = new GameHandler();
