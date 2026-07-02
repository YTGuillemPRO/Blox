import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class GameHandler {
    constructor() {
        this.init();
        this.setupArena();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 25);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('game-container').appendChild(this.labelRenderer.domElement);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50;
        this.scene.add(dirLight);

        // Estado de controles
        this.keys = {};
        this.joystick = { x: 0, y: 0, active: false };
        this.cameraAngle = 0;
        this.isDragging = false;
        this.lastTouch = { x: 0, y: 0 };

        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        // Cámara arrastrar (PC)
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if(e.button === 2) { // Click derecho
                this.isDragging = true; this.lastTouch.x = e.clientX; this.lastTouch.y = e.clientY;
            }
        });
        window.addEventListener('mousemove', (e) => {
            if(this.isDragging) {
                this.cameraAngle -= (e.clientX - this.lastTouch.x) * 0.005;
                this.lastTouch.x = e.clientX;
            }
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('loading-screen').style.display = 'none';
    }

    setupArena() {
        const baseGeo = new THREE.BoxGeometry(80, 1, 80);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#555555'; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#444444'; ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        const baseTexture = new THREE.CanvasTexture(canvas);
        baseTexture.wrapS = THREE.RepeatWrapping; baseTexture.wrapT = THREE.RepeatWrapping; baseTexture.repeat.set(10, 10);

        this.baseplate = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ map: baseTexture }));
        this.baseplate.position.y = -0.5; this.baseplate.receiveShadow = true;
        this.scene.add(this.baseplate);

        const blueSpawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0x3366ff }));
        blueSpawn.position.set(-25, 0.25, 0); blueSpawn.receiveShadow = true; this.scene.add(blueSpawn);

        const redSpawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
        redSpawn.position.set(25, 0.25, 0); redSpawn.receiveShadow = true; this.scene.add(redSpawn);

        const colors = [0xffcc00, 0xff00ff, 0x00ff00, 0xffffff];
        for(let i = 0; i < 6; i++) {
            const size = Math.random() * 3 + 2;
            const block = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: colors[i % colors.length] }));
            block.position.set((Math.random() - 0.5) * 50, size/2, (Math.random() - 0.5) * 50);
            block.castShadow = true; block.receiveShadow = true; this.scene.add(block);
        }
    }

    startGame() {
        if(this.player) return;
        this.createPlayer();
        this.createEnemy();
        this.setupCombat();
    }

    createR6Character(colorTorso, colorHead, colorArm, colorLeg, isEnemy = false) {
        const group = new THREE.Group();
        
        // Torso R6 (2x2x1)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: colorTorso }));
        torso.position.y = 3; torso.castShadow = true; group.add(torso);
        
        // Cabeza R6 (1.2x1.2x1.2)
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: colorHead }));
        head.position.y = 4.6; head.castShadow = true; group.add(head);

        // Brazos R6 (1x2x1)
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm }));
        leftArm.position.set(-1.5, 3, 0); leftArm.castShadow = true; group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm }));
        rightArm.position.set(1.5, 3, 0); rightArm.castShadow = true; group.add(rightArm);

        // Piernas R6 (1x2x1)
        const legGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg }));
        leftLeg.position.set(-0.5, 1, 0); leftLeg.castShadow = true; group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg }));
        rightLeg.position.set(0.5, 1, 0); rightLeg.castShadow = true; group.add(rightLeg);

        if(!isEnemy) group.rightArmRef = rightArm; // Guardar referencia para animar
        
        return group;
    }

    createPlayer() {
        this.player = this.createR6Character(0x0033cc, 0xffcc00, 0xffcc00, 0x001a33);
        this.player.position.set(-25, 0, 0);
        this.scene.add(this.player);

        // Espada en mano derecha
        this.sword = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        handle.position.y = -0.3;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        guard.position.y = 0.1;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }));
        blade.position.y = 1.9;
        this.sword.add(handle, guard, blade);
        this.sword.position.set(0, -0.8, 0);
        this.sword.rotation.x = Math.PI; // Apuntando hacia abajo
        this.player.rightArmRef.add(this.sword);

        // Globo de chat
        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-bubble-3d';
        this.chatLabel = new CSS2DObject(chatDiv);
        this.chatLabel.position.set(0, 3, 0);
        this.player.add(this.chatLabel);
    }

    createEnemy() {
        this.enemy = this.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000, true);
        this.enemy.position.set(25, 0, 0);
        this.scene.add(this.enemy);
    }

    // Generador de sonido de espada (Sintetizador Web Audio API)
    playSwordSound() {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2); // Ruido descendente
        
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        filter.Q.value = 5;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
    }

    setupCombat() {
        this.isAttacking = false;
        
        const attackAction = () => {
            if(!this.isAttacking) this.attack();
        };

        // PC: Click izquierdo
        window.addEventListener('mousedown', (e) => {
            if(e.button === 0) attackAction();
        });

        // Móvil: Botón de ataque
        const btn = document.getElementById('attack-btn');
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); attackAction(); });
        btn.addEventListener('click', attackAction);
    }

    attack() {
        this.isAttacking = true;
        this.playSwordSound();
        let progress = 0;
        const attackInterval = setInterval(() => {
            progress += 0.15;
            this.player.rightArmRef.rotation.x = -Math.PI/2 * Math.sin(progress * Math.PI);
            if(progress >= 1) {
                clearInterval(attackInterval);
                this.player.rightArmRef.rotation.x = 0;
                this.isAttacking = false;
            }
        }, 20);
    }

    showChatBubble(text) {
        this.chatLabel.element.innerHTML = text;
        this.chatLabel.element.style.opacity = '1';
        clearTimeout(this.chatTimeout);
        this.chatTimeout = setTimeout(() => { this.chatLabel.element.style.opacity = '0'; }, 4000);
    }

    updatePlayerMovement() {
        if(!this.player) return;
        const speed = 0.3;
        let moveX = 0, moveZ = 0;

        // Entrada de teclado
        if(this.keys['w']) moveZ -= 1;
        if(this.keys['s']) moveZ += 1;
        if(this.keys['a']) moveX -= 1;
        if(this.keys['d']) moveX += 1;

        // Entrada de joystick
        if(this.joystick.active) {
            moveX = this.joystick.x;
            moveZ = this.joystick.y;
        }

        // Normalizar
        const len = Math.sqrt(moveX*moveX + moveZ*moveZ);
        if(len > 0) {
            moveX /= len; moveZ /= len;
            
            // Rotar el vector de movimiento basado en la cámara
            const cosY = Math.cos(this.cameraAngle);
            const sinY = Math.sin(this.cameraAngle);
            const worldX = moveX * cosY - moveZ * sinY;
            const worldZ = moveX * sinY + moveZ * cosY;

            this.player.position.x += worldX * speed;
            this.player.position.z += worldZ * speed;

            // Hacer que el jugador mire hacia donde camina
            this.player.rotation.y = Math.atan2(worldX, worldZ);
        }

        // Limitar a la baseplate
        this.player.position.x = Math.max(-39, Math.min(39, this.player.position.x));
        this.player.position.z = Math.max(-39, Math.min(39, this.player.position.z));

        // Actualizar cámara en tercera persona
        const targetCamX = this.player.position.x - Math.sin(this.cameraAngle) * 15;
        const targetCamZ = this.player.position.z - Math.cos(this.cameraAngle) * 15;
        const targetCamY = this.player.position.y + 10;
        
        this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
        this.camera.lookAt(this.player.position.x, this.player.position.y + 3, this.player.position.z);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayerMovement();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

window.GameHandler = new GameHandler();
