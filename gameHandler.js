import * as THREE from 'three';

import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


import { SwordsGame } from './js/games/swords.js';

import { SellLemonsGame } from './js/games/sellLemons.js';


class GameHandler {

    constructor() {

        this.scene = null;

        this.camera = null;

        this.renderer = null;

        this.labelRenderer = null;

        this.audioCtx = null;


        this.keys = {};

        this.joystick = { x: 0, y: 0, active: false };

        this.cameraAngle = 0;

        this.isDragging = false;

        this.lastTouch = { x: 0, y: 0 };


        this.player = null;

        this.chatLabel = null;


        this.otherPlayers = {};

        this.game = null;


        this.init();

        this.setupBaseScene();

        this.setupControls();

        this.animate();

    }


    init() {

        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color(0x87CEEB);

        this.scene.fog = new THREE.Fog(0x87CEEB, 80, 250);


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


        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);

        window.addEventListener('keyup', (e) => this.keys[e.key.toLowerCase()] = false);


        this.renderer.domElement.addEventListener('mousedown', (e) => {

            if (e.button === 2) {

                this.isDragging = true;

                this.lastTouch.x = e.clientX;

                this.lastTouch.y = e.clientY;

            }

        });

        window.addEventListener('mousemove', (e) => {

            if (this.isDragging) {

                this.cameraAngle -= (e.clientX - this.lastTouch.x) * 0.005;

                this.lastTouch.x = e.clientX;

            }

        });

        window.addEventListener('mouseup', () => this.isDragging = false);

        this.renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());


        window.addEventListener('resize', () => this.onWindowResize(), false);

        const loading = document.getElementById('loading-screen');

        if (loading) loading.style.display = 'none';

    }


    setupBaseScene() {

        const baseGeo = new THREE.BoxGeometry(200, 1, 200);

        const canvas = document.createElement('canvas');

        canvas.width = 512; canvas.height = 512;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#4a6b2a'; ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;

        for (let i = 0; i <= 512; i += 64) {

            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();

            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();

        }

        const baseTexture = new THREE.CanvasTexture(canvas);

        baseTexture.wrapS = THREE.RepeatWrapping; baseTexture.wrapT = THREE.RepeatWrapping;

        baseTexture.repeat.set(20, 20);


        this.baseplate = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ map: baseTexture }));

        this.baseplate.position.y = -0.5; this.baseplate.receiveShadow = true;

        this.scene.add(this.baseplate);


        const edge = new THREE.LineSegments(

            new THREE.EdgesGeometry(baseGeo),

            new THREE.LineBasicMaterial({ color: 0x000000 })

        );

        edge.position.y = -0.5;

        this.scene.add(edge);

    }


    setupControls() {}


    loadGame(name) {

        if (this.game && this.game.cleanup) this.game.cleanup();

        if (this.player) {

            this.scene.remove(this.player);

            this.player = null;

        }

        this.game = null;


        if (name === 'swords') this.game = new SwordsGame(this);

        else if (name === 'sellLemons') this.game = new SellLemonsGame(this);


        if (this.game) {

            this.game.build();

            this.game.start();

            return true;

        }

        return false;

    }


    initAudio() {

        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

    }


    createR6Character(colorTorso, colorHead, colorArm, colorLeg) {

        const group = new THREE.Group();

        const torso = new THREE.Mesh(

            new THREE.BoxGeometry(2, 2, 1),

            new THREE.MeshStandardMaterial({ color: colorTorso })

        );

        torso.position.y = 3; torso.castShadow = true; group.add(torso);


        const head = new THREE.Mesh(

            new THREE.BoxGeometry(1.2, 1.2, 1.2),

            new THREE.MeshStandardMaterial({ color: colorHead })

        );

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


    createPlayer(torsoColor = 0x1e7ad6, headColor = 0xffcc4d, armColor = 0xffcc4d, legColor = 0x7fb539) {

        if (this.player) return;

        this.player = this.createR6Character(torsoColor, headColor, armColor, legColor);

        this.player.position.set(0, 1, 0);

        this.scene.add(this.player);


        const chatDiv = document.createElement('div');

        chatDiv.className = 'chat-bubble-3d';

        this.chatLabel = new CSS2DObject(chatDiv);

        this.chatLabel.position.set(0, 3, 0);

        this.player.add(this.chatLabel);

    }


    showChatBubble(text) {

        if (!this.chatLabel) return;

        this.chatLabel.element.innerHTML = text;

        this.chatLabel.element.style.opacity = '1';

        clearTimeout(this.chatTimeout);

        this.chatTimeout = setTimeout(() => { this.chatLabel.element.style.opacity = '0'; }, 4000);

    }


    updatePlayerMovement() {

        if (!this.player) return;

        const speed = 0.3;

        const forward = new THREE.Vector3();

        this.camera.getWorldDirection(forward);

        forward.y = 0; forward.normalize();

        const right = new THREE.Vector3();

        right.crossVectors(forward, this.camera.up).normalize();


        let moveDir = new THREE.Vector3(0, 0, 0);

        if (this.keys['w']) moveDir.add(forward);

        if (this.keys['s']) moveDir.sub(forward);

        if (this.keys['d']) moveDir.add(right);

        if (this.keys['a']) moveDir.sub(right);

        if (this.joystick.active) {

            moveDir.add(forward.clone().multiplyScalar(-this.joystick.y));

            moveDir.add(right.clone().multiplyScalar(this.joystick.x));

        }


        if (moveDir.lengthSq() > 0) {

            moveDir.normalize().multiplyScalar(speed);

            this.player.position.add(moveDir);

            this.player.rotation.y = Math.atan2(moveDir.x, moveDir.z);

        }


        this.player.position.x = Math.max(-95, Math.min(95, this.player.position.x));

        this.player.position.z = Math.max(-95, Math.min(95, this.player.position.z));


        const targetCamX = this.player.position.x - Math.sin(this.cameraAngle) * 15;

        const targetCamZ = this.player.position.z - Math.cos(this.cameraAngle) * 15;

        const targetCamY = this.player.position.y + 10;

        this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.1);

        this.camera.lookAt(this.player.position.x, this.player.position.y + 3, this.player.position.z);


        for (const id in this.otherPlayers) {

            this.otherPlayers[id].mesh.position.lerp(this.otherPlayers[id].targetPos, 0.2);

        }

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

            this.otherPlayers[id] = {

                mesh: newPlayer,

                label: label,

                targetPos: new THREE.Vector3(data.x, 1, data.z),

                lastPos: new THREE.Vector3(data.x, 1, data.z),

            };

        }

        const p = this.otherPlayers[id];

        p.lastPos.copy(p.mesh.position);

        p.targetPos.set(data.x, 1, data.z);

        p.mesh.rotation.y = data.ry || 0;

        if (data.chat && data.chat !== '') {

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


    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);

    }


    animate() {

        requestAnimationFrame(() => this.animate());

        this.updatePlayerMovement();

        if (this.game && this.game.update) this.game.update();

        this.renderer.render(this.scene, this.camera);

        this.labelRenderer.render(this.scene, this.camera);

    }

}


window.GameHandler = new GameHandler();


