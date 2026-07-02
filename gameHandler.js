import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

class GameHandler {
    constructor() {
        this.init();
        this.createBaseplate();
        this.createStructures();
        this.createPlayer();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 15, 25);
        this.camera.lookAt(0, 5, 0);

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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.camera.left = -80;
        dirLight.shadow.camera.right = 80;
        dirLight.shadow.camera.top = 80;
        dirLight.shadow.camera.bottom = -80;
        
        this.scene.add(dirLight);

        window.addEventListener('resize', () => this.onWindowResize(), false);
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
    }

    createBaseplate() {
        const baseGeo = new THREE.BoxGeometry(100, 1, 100);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#3b5320'; 
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = '#5f7a3b';
        ctx.lineWidth = 4;
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

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), new THREE.LineBasicMaterial({ color: 0x000000 }));
        edges.position.y = -0.5;
        this.scene.add(edges);
    }

    createStructures() {
        this.structures = [];
        this.createTower(-20, 0, -20, 0xff0000, 5);
        this.createTower(25, 0, 15, 0x0055ff, 7);
        this.createBlock(10, 1.5, -10, 0xffff00, 3, 3, 3);
        this.createBlock(-15, 1, 20, 0xff00ff, 2, 2, 2);
        this.createBlock(0, 2.5, -15, 0xffffff, 5, 5, 5); 
    }

    createTower(x, y, z, color, height) {
        const blockGeo = new THREE.BoxGeometry(4, 4, 4);
        const blockMat = new THREE.MeshStandardMaterial({ color: color });
        for(let i = 0; i < height; i++) {
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.set(x, y + (i * 4) + 2, z);
            block.castShadow = true; block.receiveShadow = true;
            this.scene.add(block);
        }
    }

    createBlock(x, y, z, color, w, h, d) {
        const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: color }));
        block.position.set(x, y + (h/2), z);
        block.castShadow = true; block.receiveShadow = true;
        this.scene.add(block);
        this.structures.push(block);
    }

    createPlayer() {
        this.player = new THREE.Group();
        
        const head = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
        head.position.y = 6; head.castShadow = true;
        this.player.add(head);
        
        const torso = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 2), new THREE.MeshStandardMaterial({ color: 0x0055ff }));
        torso.position.y = 3; torso.castShadow = true;
        this.player.add(torso);

        const legGeo = new THREE.BoxGeometry(1.5, 4, 1.5);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-1, 1, 0); leftLeg.castShadow = true;
        this.player.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(1, 1, 0); rightLeg.castShadow = true;
        this.player.add(rightLeg);

        this.scene.add(this.player);

        const chatDiv = document.createElement('div');
        chatDiv.className = 'chat-bubble-3d';
        this.chatLabel = new CSS2DObject(chatDiv);
        this.chatLabel.position.set(0, 4, 0);
        this.player.add(this.chatLabel);
    }

    showChatBubble(text) {
        this.chatLabel.element.innerHTML = text;
        this.chatLabel.element.style.opacity = '1';
        
        clearTimeout(this.chatTimeout);
        this.chatTimeout = setTimeout(() => {
            this.chatLabel.element.style.opacity = '0';
        }, 4000);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const centralBlock = this.structures.find(s => s.material.color.getHex() === 0xffffff);
        if(centralBlock) centralBlock.rotation.y += 0.01;

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

window.GameHandler = new GameHandler();
