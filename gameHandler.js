import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class GameHandler {
    constructor() {
        this.scene = null;
        this.otherPlayers = {}; 
        this.init();
        this.setupArena();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 60, 250);

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

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -80; dirLight.shadow.camera.right = 80;
        dirLight.shadow.camera.top = 80; dirLight.shadow.camera.bottom = -80;
        this.scene.add(dirLight);

        this.keys = {};
        this.joystick = { x: 0, y: 0, active: false };
        this.cameraAngle = 0;
        this.isDragging = false;
        this.lastTouch = { x: 0, y: 0 };
        this.audioCtx = null;

        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if(e.button === 2) { this.isDragging = true; this.lastTouch.x = e.clientX; this.lastTouch.y = e.clientY; }
        });
        window.addEventListener('mousemove', (e) => {
            if(this.isDragging) { this.cameraAngle -= (e.clientX - this.lastTouch.x) * 0.005; this.lastTouch.x = e.clientX; }
        });
        window.addEventListener('mouseup', () => this.isDragging = false);
        this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

        window.addEventListener('resize', () => this.onWindowResize(), false);
        document.getElementById('loading-screen').style.display = 'none';
    }

    setupArena() {
        const baseGeo = new THREE.BoxGeometry(100, 1, 100);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#4a6b2a'; ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#3a5520'; ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
        }
        const baseTexture = new THREE.CanvasTexture(canvas);
        baseTexture.wrapS = THREE.RepeatWrapping; baseTexture.wrapT = THREE.RepeatWrapping; baseTexture.repeat.set(15, 15);

        this.baseplate = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ map: baseTexture }));
        this.baseplate.position.y = -0.5; this.baseplate.receiveShadow = true; this.scene.add(this.baseplate);

        const river = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 100), new THREE.MeshStandardMaterial({ color: 0x0044aa }));
        river.position.y = 0; river.receiveShadow = true; this.scene.add(river);

        this.createCastle(-35, 0, 0x0033cc);
        this.createCastle(35, 0, 0xcc0000);  
    }

    createCastle(x, z, teamColor) {
        const castle = new THREE.Group();
        const stoneColor = 0xBFC7CC; 
        const redColor = 0xE91D2D;   
        
        const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor });
        const redMat = new THREE.MeshStandardMaterial({ color: redColor });
        const teamMat = new THREE.MeshStandardMaterial({ color: teamColor });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });

        // Torreones
        const towerGeo = new THREE.BoxGeometry(8, 20, 8);
        const positions = [[-15, -15], [15, -15], [-15, 15], [15, 15]];
        positions.forEach(p => {
            const tower = new THREE.Mesh(towerGeo, stoneMat);
            tower.position.set(p[0], 10, p[1]); tower.castShadow = true; tower.receiveShadow = true;
            castle.add(tower);
            
            // Almenas (Dientes de arriba)
            for(let i = -3; i <= 3; i += 2) {
                const cren = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);
                cren.position.set(p[0] + i, 21, p[1] + 3.5); castle.add(cren);
                const cren2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);
                cren2.position.set(p[0] + 3.5, 21, p[1] + i); castle.add(cren2);
                const cren3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);
                cren3.position.set(p[0] + i, 21, p[1] - 3.5); castle.add(cren3);
                const cren4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), stoneMat);
                cren4.position.set(p[0] - 3.5, 21, p[1] + i); castle.add(cren4);
            }

            // Techo rojo de Tinkercad
            const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 8, 4), redMat);
            roof.position.set(p[0], 25, p[1]); roof.castShadow = true;
            castle.add(roof);

            // Banderas
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6), woodMat);
            pole.position.set(p[0], 32, p[1]); castle.add(pole);
            const flag = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 0.1), teamMat);
            flag.position.set(p[0] + 2, 33, p[1]); castle.add(flag);
        });

        // Muros
        const wallGeo = new THREE.BoxGeometry(22, 10, 2);
        const wall1 = new THREE.Mesh(wallGeo, stoneMat); wall1.position.set(0, 5, -15); castle.add(wall1);
        const wall2 = new THREE.Mesh(wallGeo, stoneMat); wall2.position.set(0, 5, 15); castle.add(wall2);
        const wall3 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall3.position.set(-15, 5, 0); castle.add(wall3);
        const wall4 = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 22), stoneMat); wall4.position.set(15, 5, 0); castle.add(wall4);

        // Patio
        const floor = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 28), teamMat);
        floor.position.y = 0.5; floor.receiveShadow = true; castle.add(floor);

        castle.position.set(x, 0, z);
        this.scene.add(castle);
    }

    startGame() {
        if(this.player) return;
        this.initAudio(); 
        this.createPlayer();
        this.createEnemy();
        this.setupCombat();
    }

    initAudio() {
        if(!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    createR6Character(colorTorso, colorHead, colorArm, colorLeg) {
        const group = new THREE.Group();
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), new THREE.MeshStandardMaterial({ color: colorTorso }));
        torso.position.y = 3; torso.castShadow = true; group.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: colorHead }));
        head.position.y = 4.6; head.castShadow = true; group.add(head);
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm }));
        leftArm.position.set(-1.5, 3, 0); leftArm.castShadow = true; group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: colorArm }));
        rightArm.position.set(1.5, 3, 0); rightArm.castShadow = true; group.add(rightArm);
        const legGeo = new THREE.BoxGeometry(1, 2, 1);
        const leftLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg }));
        leftLeg.position.set(-0.5, 1, 0); leftLeg.castShadow = true; group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: colorLeg }));
        rightLeg.position.set(0.5, 1, 0); rightLeg.castShadow = true; group.add(rightLeg);
        group.rightArmRef = rightArm; 
        return group;
    }

    createPlayer() {
        this.player = this.createR6Character(0x0033cc, 0xffcc00, 0xffcc00, 0x001a33);
        this.player.position.set(-35, 1, 0);
        this.scene.add(this.player);

        // Espada Mejorada
        this.sword = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.3), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        handle.position.y = -0.5;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 })); // Guarda dorada
        guard.position.y = 0.1;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 0.1), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, metalness: 0.9, roughness: 0.1 })); // Hoja blanca brillante
        blade.position.y = 2.8;
        this.sword.add(handle, guard, blade);
        this.sword.position.set(0, -0.8, 0);
        this.sword.rotation.x = Math.PI;
        this.player.rightArmRef.add(this.sword);

        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-bubble-3d';
        this.chatLabel = new CSS2DObject(chatDiv);
        this.chatLabel.position.set(0, 3, 0);
        this.player.add(this.chatLabel);
    }

    createEnemy() {
        this.enemy = this.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000);
        this.enemy.position.set(35, 1, 0);
        this.scene.add(this.enemy);
    }

    playSwordSound() {
        if(!this.audioCtx) return;
        const ctx = this.audioCtx;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for(let i=0; i<data.length; i++) data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
        filter.Q.value = 3;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.8, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        source.connect(filter).connect(gain).connect(ctx.destination);
        source.start();
    }

    setupCombat() {
        this.isAttacking = false;
        const attackAction = () => { if(!this.isAttacking) this.attack(); };
        window.addEventListener('mousedown', (e) => { if(e.button === 0) attackAction(); });
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

    updateRemotePlayer(id, data) {
        if (!this.otherPlayers[id]) {
            const newPlayer = this.createR6Character(0xcc0000, 0xffcc00, 0xffcc00, 0x330000);
            const chatDiv = document.createElement('div');
            chatDiv.className = 'chat-bubble-3d';
            const label = new CSS2DObject(chatDiv);
            label.position.set(0, 3, 0);
            newPlayer.add(label);
            this.scene.add(newPlayer);
            this.otherPlayers[id] = { mesh: newPlayer, label: label, targetPos: new THREE.Vector3(data.x, 1, data.z), lastPos: new THREE.Vector3(data.x, 1, data.z) };
        }
        
        const p = this.otherPlayers[id];
        p.lastPos.copy(p.mesh.position);
        p.targetPos.set(data.x, 1, data.z);
        p.mesh.rotation.y = data.ry;
        
        if (data.chat && data.chat !== "") {
            p.label.element.innerHTML = data.chat;
            p.label.element.style.opacity = '1';
            clearTimeout(p.chatTimeout);
            p.chatTimeout = setTimeout(() => { p.label.element.style.opacity = '0'; }, 4000);
        }
    }

    removeRemotePlayer(id) {
        if (this.otherPlayers[id]) {
            this.scene.remove(this.otherPlayers[id].mesh);
            delete this.otherPlayers[id];
        }
    }

    updatePlayerMovement() {
        if(!this.player) return;
        const speed = 0.3;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0; forward.normalize(); 
        const right = new THREE.Vector3();
        right.crossVectors(forward, this.camera.up).normalize(); 
        
        let moveDir = new THREE.Vector3(0, 0, 0);

        if(this.keys['w']) moveDir.add(forward);
        if(this.keys['s']) moveDir.sub(forward);
        if(this.keys['d']) moveDir.add(right);
        if(this.keys['a']) moveDir.sub(right);

        if(this.joystick.active) {
            moveDir.add(forward.clone().multiplyScalar(-this.joystick.y));
            moveDir.add(right.clone().multiplyScalar(this.joystick.x));
        }

        if(moveDir.lengthSq() > 0) {
            moveDir.normalize().multiplyScalar(speed);
            this.player.position.add(moveDir);
            this.player.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        this.player.position.x = Math.max(-49, Math.min(49, this.player.position.x));
        this.player.position.z = Math.max(-49, Math.min(49, this.player.position.z));

        const targetCamX = this.player.position.x - Math.sin(this.cameraAngle) * 15;
        const targetCamZ = this.player.position.z - Math.cos(this.cameraAngle) * 15;
        const targetCamY = this.player.position.y + 10;
        
        this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
        this.camera.lookAt(this.player.position.x, this.player.position.y + 3, this.player.position.z);

        for (const id in this.otherPlayers) {
            const p = this.otherPlayers[id];
            p.mesh.position.lerp(p.targetPos, 0.2);
        }
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
