import * as THREE from 'three';

class GameHandler {
    constructor() {
        this.init();
        this.createBaseplate();
        this.createStructures();
        this.animate();
    }

    init() {
        // Escena
        this.scene = new THREE.Scene();
        
        // Fondo clásico de Roblox 2008 (Cielo azul claro)
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500); // Niebla para dar profundidad

        // Cámara
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        // Posicionada para ver el mapa detrás de la UI
        this.camera.position.set(30, 40, 60);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true; // Sombras habilitadas
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Iluminación
        // Luz Ambiental (ilumina todo uniformemente)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Luz Direccional (Simula el sol, proyecta sombras)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        
        // Configuración de sombras para cubrir el mapa de 100x100
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.camera.left = -80;
        dirLight.shadow.camera.right = 80;
        dirLight.shadow.camera.top = 80;
        dirLight.shadow.camera.bottom = -80;
        
        this.scene.add(dirLight);

        // Evento de resize
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Quitar pantalla de carga
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
    }

    createBaseplate() {
        // Geometría del Baseplate (100x100)
        const baseGeo = new THREE.BoxGeometry(100, 1, 100);
        
        // Crear textura de cuadrícula procedural
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Fondo verde oscuro clásico
        ctx.fillStyle = '#3b5320'; 
        ctx.fillRect(0, 0, 512, 512);
        
        // Cuadrícula
        ctx.strokeStyle = '#5f7a3b';
        ctx.lineWidth = 4;
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(512, i);
            ctx.stroke();
        }

        const baseTexture = new THREE.CanvasTexture(canvas);
        baseTexture.wrapS = THREE.RepeatWrapping;
        baseTexture.wrapT = THREE.RepeatWrapping;
        baseTexture.repeat.set(10, 10); // Repetir la textura para hacer los cuadros más pequeños

        const baseMat = new THREE.MeshStandardMaterial({ map: baseTexture });
        
        this.baseplate = new THREE.Mesh(baseGeo, baseMat);
        this.baseplate.position.y = -0.5; // Para que la superficie superior esté en y=0
        this.baseplate.receiveShadow = true;
        this.scene.add(this.baseplate);

        // Añadir un borde al baseplate (estilo Roblox)
        const edgeGeo = new THREE.EdgesGeometry(baseGeo);
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.y = -0.5;
        this.scene.add(edges);
    }

    createStructures() {
        this.structures = [];

        // Torre de bloques Rojos
        this.createTower(-20, 0, -20, 0xff0000, 5);
        
        // Torre de bloques Azules
        this.createTower(25, 0, 15, 0x0055ff, 7);

        // Algunos bloques dispersos
        this.createBlock(10, 1.5, -10, 0xffff00, 3, 3, 3);
        this.createBlock(-15, 1, 20, 0xff00ff, 2, 2, 2);
        this.createBlock(0, 2.5, 0, 0xffffff, 5, 5, 5); // Bloque central blanco
    }

    createTower(x, y, z, color, height) {
        const blockGeo = new THREE.BoxGeometry(4, 4, 4);
        const blockMat = new THREE.MeshStandardMaterial({ color: color });
        
        for(let i = 0; i < height; i++) {
            const block = new THREE.Mesh(blockGeo, blockMat);
            block.position.set(x, y + (i * 4) + 2, z);
            block.castShadow = true;
            block.receiveShadow = true;
            this.scene.add(block);
            this.structures.push(block);
        }
    }

    createBlock(x, y, z, color, w, h, d) {
        const blockGeo = new THREE.BoxGeometry(w, h, d);
        const blockMat = new THREE.MeshStandardMaterial({ color: color });
        const block = new THREE.Mesh(blockGeo, blockMat);
        block.position.set(x, y + (h/2), z);
        block.castShadow = true;
        block.receiveShadow = true;
        this.scene.add(block);
        this.structures.push(block);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Pequeña animación para demostrar que el motor está vivo
        const time = Date.now() * 0.0005;
        if(this.structures.length > 0) {
            const centralBlock = this.structures.find(s => s.material.color.getHex() === 0xffffff);
            if(centralBlock) {
                centralBlock.rotation.y += 0.01;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Exponer el motor globalmente para que localScript.js pueda acceder a él
window.GameHandler = new GameHandler();
