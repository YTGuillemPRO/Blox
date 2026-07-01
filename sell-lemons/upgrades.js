class SellLemonsUpgrades {
  constructor(game) {
    this.game = game;
    this.purchasedUpgrades = {};
    this.upgradeLevels = {};
  }

  getUpgradeCost(upgradeId) {
    const upgrade = this.game.config.upgrades[upgradeId];
    if (!upgrade) return 0;
    
    const level = this.upgradeLevels[upgradeId] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, level));
  }

  canAfford(upgradeId) {
    const cost = this.getUpgradeCost(upgradeId);
    return this.game.money >= cost;
  }

  purchaseUpgrade(upgradeId) {
    if (!this.canAfford(upgradeId)) return false;
    
    const cost = this.getUpgradeCost(upgradeId);
    const upgrade = this.game.config.upgrades[upgradeId];
    
    this.game.money -= cost;
    this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;
    this.purchasedUpgrades[upgradeId] = true;
    
    this.applyEffect(upgrade);
    this.game.updateUI();
    this.game.showFloatingText(`¡${upgrade.name}!`, '#4cd964');
    
    return true;
  }

  applyEffect(upgrade) {
    if (upgrade.effect === 'clickPower') {
      this.game.clickPower += upgrade.value;
    } else if (upgrade.effect === 'autoSell') {
      this.game.autoSellPower += upgrade.value;
    }
  }

  getTotalClickPower() {
    let power = this.game.config.clickPower;
    for (const [id, level] of Object.entries(this.upgradeLevels)) {
      const upgrade = this.game.config.upgrades[id];
      if (upgrade && upgrade.effect === 'clickPower') {
        power += upgrade.value * level;
      }
    }
    return power;
  }

  getTotalAutoSell() {
    let power = 0;
    for (const [id, level] of Object.entries(this.upgradeLevels)) {
      const upgrade = this.game.config.upgrades[id];
      if (upgrade && upgrade.effect === 'autoSell') {
        power += upgrade.value * level;
      }
    }
    return power;
  }
}

window.SellLemonsUpgrades = SellLemonsUpgrades;
