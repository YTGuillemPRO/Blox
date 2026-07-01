import * as THREE from 'three';
import { SellLemonsUpgrades } from './upgrades.js';

class SellLemonsGame {
  constructor(handler) {
    this.handler = handler;
    this.config = null;
    this.money = 0;
    this.clickPower = 1;
    this.autoSellPower = 0;
    this.lemonsSold = 0;
    this.upgrades = null;
    this.autoSellInterval = null;
    this.lemonStand = null;
    this.particles = [];
    
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const response = await fetch('games/sell-lemons/config.json');
      this.config = await response.json();
      this.money = this.config.startingMoney;
      this.upgrades = new SellLemonsUpgrades(this);
      this.init();
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  init() {
    this.createLemonStand();
    this.createUI();
    this.startAutoSell();
    this.setupControls();
    this.updateUI();
  }

  createLemonStand() {
    // Puesto principal de limones
    const standGroup = new THREE.Group();
    
    // Base del puesto
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.5, 5),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    base.position.y = 0.25;
    base.castShadow = true;
    standGroup.add(base);
    
    // Mostrador
    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.3, 4),
      new THREE.MeshStandardMaterial({ color: 0xD2691E })
    );
    counter.position.y = 0.65;
    counter.castShadow = true;
    standGroup.add(counter);
    
    // Limones en el mostrador
    for (let i = 0; i < 5; i++) {
      const lemon = this.createLemon();
      lemon.position.set(-2.5 + i * 1.2, 0.9, 0);
      standGroup.add(lemon);
    }
    
    // Cartel
    const sign = this.createSign();
    sign.position.set(0, 2.5, -2);
    standGroup.add(sign);
    
    standGroup.position.set(0, 0, -5);
    this.handler.scene.add(standGroup);
    this.lemonStand = standGroup;
    
    // Hacer el puesto clickable
    this.lemonStand.userData = { 
      clickable: true, 
      type: 'lemonStand',
      game: this
    };
  }

  createLemon() {
    const lemon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 0.2
      })
    );
    lemon.castShadow = true;
    lemon.scale.set(1, 0.7, 1);
    return lemon;
  }

  createSign() {
    const signGroup = new THREE.Group();
    
    // Poste
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    pole.position.y = 0;
    signGroup.add(pole);
    
    // Tablero del cartel
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    board.position.y = 1;
    signGroup.add(board);
    
    // Texto "LEMONS" (usando emoji flotante)
    const emoji = document.createElement('div');
    emoji.textContent = '🍋 $1';
    emoji.style.cssText = `
      font: bold 24px Arial;
      color: #000;
      background: rgba(255, 215, 0, 0.9);
      padding: 5px 10px;
      border-radius: 5px;
      pointer-events: none;
    `;
    
    // El cartel se manejará con CSS2D si es necesario
    
    return signGroup;
  }

  createUI() {
    // Panel de upgrades
    const upgradePanel = document.createElement('div');
    upgradePanel.id = 'sell-lemons-upgrades';
    upgradePanel.style.cssText = `
      position: fixed;
      right: 14px;
      top: 70px;
      width: 280px;
      max-height: calc(100vh - 150px);
      background: rgba(20, 20, 20, 0.95);
      backdrop-filter: blur(12px);
      border: 2px solid rgba(255, 215, 0, 0.3);
      border-radius: 12px;
      padding: 16px;
      overflow-y: auto;
      z-index: 100;
      font-family: 'Source Sans Pro', Arial, sans-serif;
    `;
    
    const title = document.createElement('h3');
    title.textContent = '🛒 Upgrades';
    title.style.cssText = `
      margin: 0 0 12px 0;
      color: #FFD700;
      font-size: 18px;
      text-align: center;
      border-bottom: 2px solid rgba(255, 215, 0, 0.3);
      padding-bottom: 8px;
    `;
    upgradePanel.appendChild(title);
    
    // Lista de upgrades
    const upgradesList = document.createElement('div');
    upgradesList.id = 'upgrades-list';
    upgradePanel.appendChild(upgradesList);
    
    document.querySelector('#game-view').appendChild(upgradePanel);
    
    this.renderUpgrades();
  }

  renderUpgrades() {
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    for (const [id, upgrade] of Object.entries(this.config.upgrades)) {
      const cost = this.upgrades.getUpgradeCost(id);
      const level = this.upgrades.upgradeLevels[id] || 0;
      const canAfford = this.money >= cost;
      
      const item = document.createElement('div');
      item.style.cssText = `
        background: ${canAfford ? 'rgba(76, 217, 100, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
        border: ${canAfford ? '1px solid rgba(76, 217, 100, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'};
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        cursor: ${canAfford ? 'pointer' : 'not-allowed'};
        transition: all 0.2s;
      `;
      
      if (canAfford) {
        item.addEventListener('click', () => this.upgrades.purchaseUpgrade(id));
        item.addEventListener('mouseenter', () => {
          item.style.background = 'rgba(76, 217, 100, 0.25)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'rgba(76, 217, 100, 0.15)';
        });
      }
      
      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: white; font-weight: 600; font-size: 14px;">${upgrade.name}</span>
          <span style="color: ${canAfford ? '#4cd964' : '#ff6b6b'}; font-weight: 700; font-size: 13px;">
            R$ ${this.formatMoney(cost)}
          </span>
        </div>
        <div style="color: #888; font-size: 11px;">
          Nivel: ${level} | +${upgrade.value} ${upgrade.effect === 'clickPower' ? 'click' : 'auto/s'}
        </div>
      `;
      
      list.appendChild(item);
    }
  }

  setupControls() {
    const canvas = this.handler.renderer.domElement;
    
    canvas.addEventListener('click', (event) => {
      if (event.button !== 0) return; // Solo click izquierdo
      
      const mouse = new THREE.Vector2();
      const camera = this.handler.camera;
      
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      const intersects = raycaster.intersectObjects(
        this.lemonStand.children, 
        true
      );
      
      if (intersects.length > 0) {
        this.sellLemons();
      }
    });
  }

  sellLemons() {
    const amount = this.clickPower;
    this.money += amount;
    this.lemonsSold += amount;
    
    this.showFloatingText(`+R$ ${amount}`, '#4cd964');
    this.createSaleParticles();
    this.updateUI();
  }

  startAutoSell() {
    this.autoSellInterval = setInterval(() => {
      const autoAmount = this.upgrades.getTotalAutoSell();
      if (autoAmount > 0) {
        this.money += autoAmount;
        this.lemonsSold += autoAmount;
        this.updateUI();
      }
    }, 1000);
  }

  showFloatingText(text, color) {
    const pos = this.lemonStand.position.clone();
    pos.y += 3;
    
    const div = document.createElement('div');
    div.textContent = text;
    div.style.cssText = `
      color: ${color};
      font: 800 24px 'Source Sans Pro';
      text-shadow: 0 0 8px rgba(0,0,0,0.9), 0 
