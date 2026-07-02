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

        // Iluminación
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        this.scene.add(dirLight);

        // Controles básicos
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('loading-screen').style.display = 'none';
    }

    setupArena() {
        // Baseplate
        const baseGeo = new THREE.BoxGeometry(80, 1, 80);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#555555'; 
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        const baseTexture = new THREE.CanvasTexture(canvas);
        baseTexture.wrapS = THREE.RepeatWrapping;
        baseTexture.wrapT = THREE.RepeatWrapping;
        baseTexture.repeat.set(10, 10);

        this.baseplate = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ map: baseTexture }));
        this.baseplate.position.y = -0.5;
        this.baseplate.receiveShadow = true;
        this.scene.add(this.baseplate);

        // Spawn Azul (Jugador)
        const blueSpawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0x3366ff }));
        blueSpawn.position.set(-25, 0.25, 0);
        blueSpawn.receiveShadow = true;
        this.scene.add(blueSpawn);

        // Spawn Rojo (Enemigo)
        const redSpawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
        redSpawn.position.set(25, 0.25, 0);
        redSpawn.receiveShadow = true;
        this.scene.add(redSpawn);

        // Obstáculos de arena (Cajas clasicas)
        const colors = [0xffcc00, 0xff00ff, 0x00ff00, 0xffffff];
        for(let i = 0; i < 6; i++) {
            const size = Math.random() * 3 + 2;
            const block = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                new THREE.MeshStandardMaterial({ color: colors[i % colors.length] })
            );
            block.position.set((Math.random() - 0.5) * 50, size/2, (Math.random() - 0.5) * 50);
            block.castShadow = true; block.receiveShadow = true;
            this.scene.add(block);
        }
    }

    startGame() {
        if(this.player) return; // Evitar duplicados
        this.createPlayer();
        this.createEnemy();
        this.setupCombat();
    }

    createPlayer() {
        this.player = new THREE.Group();
        this.player.position.set(-25, 0, 0);
        
        // Torso Azul
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: 0x3366ff }));
        torso.position.y = 3; torso.castShadow = true;
        this.player.add(torso);
        
        // Cabeza
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
        head.position.y = 4.75; head.castShadow = true;
        this.player.add(head);

        // Brazos
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        const armMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-1.5, 3, 0); leftArm.castShadow = true;
        this.player.add(leftArm);

        // Brazo Derecho (Portador de espada)
        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(1.5, 3, 0); this.rightArm.castShadow = true;
        this.player.add(this.rightArm);

        // Espada
        this.sword = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        handle.position.y = -0.4;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 }));
        blade.position.y = 1.5;
        this.sword.add(handle, blade);
        this.sword.position.set(0, -1, 0);
        this.rightArm.add(this.sword);

        // Piernas
        const legGeo = new THREE.BoxGeometry(1, 2, 1);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x004400 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.5, 1, 0); leftLeg.castShadow = true;
        this.player.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.5, 1, 0); rightLeg.castShadow = true;
        this.player.add(rightLeg);

        this.scene.add(this.player);

        // Globo de chat
        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-bubble-3d';
        this.chatLabel = new CSS2DObject(chatDiv);
        this.chatLabel.position.set(0, 3, 0);
        this.player.add(this.chatLabel);
    }

    createEnemy() {
        // Enemigo Bótico Rojo
        this.enemy = new THREE.Group();
        this.enemy.position.set(25, 0, 0);
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
        torso.position.y = 3; torso.castShadow = true;
        this.enemy.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
        head.position.y = 4.75; head.castShadow = true;
        this.enemy.add(head);

        this.scene.add(this.enemy);
    }

    setupCombat() {
        this.isAttacking = false;
        window.addEventListener('mousedown', (e) => {
            if(e.button === 0 && !this.isAttacking) { // Clic izquierdo
                this.attack();
            }
        });
    }

    attack() {
        this.isAttacking = true;
        let progress = 0;
        const attackInterval = setInterval(() => {
            progress += 0.2;
            this.rightArm.rotation.x = -Math.PI/2 * Math.sin(progress * Math.PI);
            if(progress >= 1) {
                clearInterval(attackInterval);
                this.rightArm.rotation.x = 0;
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
        const rotSpeed = 0.05;
        
        if(this.keys['w']) this.player.position.z -= speed;
        if(this.keys['s']) this.player.position.z += speed;
        if(this.keys['a']) this.player.position.x -= speed;
        if(this.keys['d']) this.player.position.x += speed;

        // Limitar a la baseplate
        this.player.position.x = Math.max(-39, Math.min(39, this.player.position.x));
        this.player.position.z = Math.max(-39, Math.min(39, this.player.position.z));

        // Cámara sigue al jugador
        const targetPos = new THREE.Vector3(
            this.player.position.x, 
            this.player.position.y + 10, 
            this.player.position.z + 15
        );
        this.camera.position.lerp(targetPos, 0.1);
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
