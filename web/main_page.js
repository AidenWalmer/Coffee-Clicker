// --- Game Control Button ---
document.getElementById('restart-game').addEventListener('click', () => {
    if (confirm('Are you sure you want to restart the game? This will erase all progress.')) {
        localStorage.removeItem('coffeeClickerSave');
        localStorage.removeItem('coffeeAchievements');
        localStorage.removeItem('bonusCoffeeClicks');
        localStorage.removeItem('firstSell');
        coffeeCount = 0;
        totalClicks = 0;
        totalCoffeesCollected = 0;
        window.bonusCoffeeClicks = 0;
        window.firstSell = false;
        upgrades.forEach(u => { u.owned = 0; u.cost = u.baseCost; });
        shopUpgrades.forEach(u => { u.owned = 0; u.cost = u.baseCost; });
        if (typeof unlockedAchievements !== 'undefined') unlockedAchievements = new Set();
        updateCPS();
        updateDisplay();
        saveGame();
        // Reset shop buy amount button to 1x on restart
        setTimeout(() => {
            document.querySelectorAll('.shop-buy-amount-btn').forEach(b => b.classList.remove('active'));
            const shopBtn = document.querySelector('.shop-buy-amount-btn[data-amount="1"]');
            if (shopBtn) shopBtn.classList.add('active');
        }, 0);
    }
});
// --- Coffee Clicker with Upgrades and Autoclickers ---

// Game state
let coffeeCount = 0;
let coffeesPerSecond = 0; // total (auto + click)
let autoCoffeesPerSecond = 0; // from upgrades only
let clickCoffeesPerSecond = 0; // from clicking only
let clickCPSBonus = 0;
let clickCPSClicks = 0;
let clickCPSLastUpdate = Date.now();
let clickPower = 1;
let totalClicks = 0;
let totalCoffeesCollected = 0;
let shopUpgrades = [
    { name: 'Better Beans', baseCost: 200, cost: 200, power: 1, owned: 0 },
    { name: 'Coffee Grinder', baseCost: 5000, cost: 5000, power: 10, owned: 0 },
    { name: 'Barista Training', baseCost: 50000, cost: 50000, power: 100, owned: 0 },
    { name: 'Espresso Machine', baseCost: 250000, cost: 250000, power: 500, owned: 0 },
    { name: 'Coffee Roaster', baseCost: 1500000, cost: 1500000, power: 2500, owned: 0 },
    { name: 'Coffee Plantation', baseCost: 10000000, cost: 10000000, power: 15000, owned: 0 },
    { name: 'Coffee Conglomerate', baseCost: 75000000, cost: 75000000, power: 75000, owned: 0 }
];
let upgrades = [
    { name: 'Auto Brewer', baseCost: 10, cost: 10, cps: 0.1, owned: 0 },
    { name: 'Barista', baseCost: 100, cost: 100, cps: 1, owned: 0 },
    { name: 'Coffee Machine', baseCost: 1000, cost: 1000, cps: 10, owned: 0 },
    { name: 'Coffee Farm', baseCost: 10000, cost: 10000, cps: 100, owned: 0 },
    { name: 'Coffee Factory', baseCost: 100000, cost: 100000, cps: 1000, owned: 0 },
    { name: 'Coffee Lab', baseCost: 1000000, cost: 1000000, cps: 10000, owned: 0 },
    { name: 'Coffee Planet', baseCost: 10000000, cost: 10000000, cps: 1000000, owned: 0 },
    { name: 'Coffee Galaxy', baseCost: 100000000, cost: 100000000, cps: 10000000, owned: 0 },
    { name: 'Coffee Universe', baseCost: 1000000000, cost: 1000000000, cps: 100000000, owned: 0 }
];

// Track first sell for achievements
window.firstSell = JSON.parse(localStorage.getItem('firstSell') || 'false');

let buyAmount = 1;
let buyMode = 'buy'; // or 'sell'
let shopBuyAmount = 1;
let shopBuyMode = 'buy';

// Buy/Sell mode and amount button logic
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.buy-amount-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const val = this.getAttribute('data-amount');
            buyAmount = val === 'max' ? 'max' : parseInt(val);
            document.querySelectorAll('.buy-amount-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderUpgrades();
        });
    });
    // Set default active for upgrades
    document.querySelector('.buy-amount-btn[data-amount="1"]').classList.add('active');
    // Set default active for shop
    const shopBtn = document.querySelector('.shop-buy-amount-btn[data-amount="1"]');
    if (shopBtn) shopBtn.classList.add('active');

    document.getElementById('buy-mode').addEventListener('click', function () {
        buyMode = 'buy';
        document.getElementById('buy-mode').classList.add('active');
        document.getElementById('sell-mode').classList.remove('active');
        renderUpgrades();
    });
    document.getElementById('sell-mode').addEventListener('click', function () {
        buyMode = 'sell';
        document.getElementById('sell-mode').classList.add('active');
        document.getElementById('buy-mode').classList.remove('active');
        renderUpgrades();
    });

    document.querySelectorAll('.shop-buy-amount-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const val = this.getAttribute('data-amount');
            shopBuyAmount = val === 'max' ? 'max' : parseInt(val);
            document.querySelectorAll('.shop-buy-amount-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderShop();
        });
    });
    document.getElementById('shop-buy-mode').addEventListener('click', function () {
        shopBuyMode = 'buy';
        document.getElementById('shop-buy-mode').classList.add('active');
        document.getElementById('shop-sell-mode').classList.remove('active');
        renderShop();
    });
    document.getElementById('shop-sell-mode').addEventListener('click', function () {
        shopBuyMode = 'sell';
        document.getElementById('shop-sell-mode').classList.add('active');
        document.getElementById('shop-buy-mode').classList.remove('active');
        renderShop();
    });

    const logoSlider = document.getElementById('logo-switcher');
    const coffeeLogoImg = document.getElementById('coffee-logo-img');
    if (logoSlider && coffeeLogoImg) {
        logoSlider.addEventListener('input', function () {
            if (this.value === '0') {
                coffeeLogoImg.src = 'icons/coffee-cup.png';
                coffeeLogoImg.alt = 'Coffee Cup';
            } else {
                coffeeLogoImg.src = 'icons/coffee.png';
                coffeeLogoImg.alt = 'Coffee';
            }
        });
    }

    const brewBtn = document.getElementById('brew-button');
    if (brewBtn) {
        brewBtn.addEventListener('click', clickBrewButton);
        // Add hover tip to coffee clicker button
        brewBtn.addEventListener('mouseenter', function () {
            brewBtn.title = `Total Coffees Collected: ${totalCoffeesCollected}`;
        });
    }
});

// Load from localStorage
function loadGame() {
    const saved = JSON.parse(localStorage.getItem('coffeeClickerSave'));
    if (saved) {
        coffeeCount = saved.coffeeCount || 0;
        coffeesPerSecond = saved.coffeesPerSecond || 0;
        totalClicks = saved.totalClicks || 0;
        totalCoffeesCollected = saved.totalCoffeesCollected || 0;
        if (saved.upgrades) {
            upgrades.forEach((u, i) => {
                if (saved.upgrades[i]) {
                    u.owned = saved.upgrades[i].owned || 0;
                    u.cost = saved.upgrades[i].cost || u.baseCost;
                }
            });
        }
        if (saved.shopUpgrades) {
            shopUpgrades.forEach((u, i) => {
                if (saved.shopUpgrades[i]) {
                    u.owned = saved.shopUpgrades[i].owned || 0;
                    u.cost = saved.shopUpgrades[i].cost || u.baseCost;
                }
            });
        }
    }
}

function saveGame() {
    localStorage.setItem('coffeeClickerSave', JSON.stringify({
        coffeeCount,
        coffeesPerSecond,
        upgrades,
        shopUpgrades,
        totalClicks,
        totalCoffeesCollected
    }));
}

function updateDisplay() {
    const coffeeCountDisplay = coffeeCount % 1 === 0 ? coffeeCount : coffeeCount.toFixed(1);
    document.getElementById('coffee-count').textContent = `${coffeeCountDisplay} ${coffeeCount === 1 ? 'Coffee Brewed' : 'Coffees Brewed'}`;
    document.getElementById('coffee-per-second').textContent = `Coffees per second: ${coffeesPerSecond.toFixed(1)}`;
    renderShop();
    renderUpgrades();
}

let hasClickedBrew = false;
let clickMeTimeout = null;

function showClickMeMsg() {
    const msg = document.getElementById('click-me-msg');
    if (msg) msg.style.display = '';
}

function hideClickMeMsg() {
    const msg = document.getElementById('click-me-msg');
    if (msg) msg.style.display = 'none';
}

function resetClickMeTimeout() {
    if (clickMeTimeout) clearTimeout(clickMeTimeout);
    clickMeTimeout = setTimeout(() => {
        showClickMeMsg();
    }, 10000);
}

function getClickPower() {
    // Sum the power of all shop upgrades owned
    return shopUpgrades.reduce((sum, u) => sum + u.power * u.owned, 1);
}

function clickBrewButton(e) {
    if (!hasClickedBrew) {
        hasClickedBrew = true;
        hideClickMeMsg();
    } else {
        hideClickMeMsg();
    }
    resetClickMeTimeout();
    const power = getClickPower();
    coffeeCount += power;
    totalCoffeesCollected += power;
    totalClicks++;

    // Count this click for CPS bonus
    clickCPSClicks++;
    clickCPSLastUpdate = Date.now();
    updateCPS();
    updateDisplay();
    saveGame();
    showFloatingPlus(e, power);
    checkAchievements();
}

// Update showFloatingPlus to display the correct amount
function showFloatingPlus(event, amount = 1) {
    const btn = document.getElementById('brew-button');
    const rect = btn.getBoundingClientRect();
    // Random position within the button
    const x = Math.random() * (rect.width - 30) + 10;
    const y = Math.random() * (rect.height - 30) + 10;
    const plus = document.createElement('span');
    plus.className = 'floating-plus';
    plus.textContent = `+${amount}`;
    // Gradient from golden brown to dark brown
    plus.style.background = 'linear-gradient(90deg, #724100ff, #693600ff)';
    plus.style.webkitBackgroundClip = 'text';
    plus.style.backgroundClip = 'text';
    plus.style.webkitTextFillColor = 'transparent';
    plus.style.color = 'transparent';
    plus.style.left = `${x}px`;
    plus.style.top = `${y}px`;
    plus.style.position = 'absolute';
    btn.style.position = 'relative';
    btn.appendChild(plus);
    setTimeout(() => {
        plus.remove();
    }, 1000);
}

function buyShopUpgrade(index) {
    const upgrade = shopUpgrades[index];
    if (shopBuyMode === 'buy') {
        let canBuy = 0;
        let totalCost = 0;
        let tempCost = upgrade.cost;
        let maxAmount = shopBuyAmount;
        if (shopBuyAmount === 'max') {
            // Calculate max affordable
            let owned = upgrade.owned;
            while (coffeeCount >= totalCost + tempCost) {
                totalCost += tempCost;
                canBuy++;
                tempCost = Math.floor(upgrade.baseCost * Math.pow(1.15, owned + canBuy));
            }
        } else {
            for (let i = 0; i < maxAmount; i++) {
                if (coffeeCount >= totalCost + tempCost) {
                    totalCost += tempCost;
                    tempCost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned + canBuy + 1));
                    canBuy++;
                } else {
                    break;
                }
            }
        }
        if (canBuy > 0) {
            coffeeCount -= totalCost;
            upgrade.owned += canBuy;
            upgrade.cost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned));
            updateDisplay();
            saveGame();
        }
    } else if (shopBuyMode === 'sell') {
        let canSell = Math.min(shopBuyAmount, upgrade.owned);
        if (canSell > 0) {
            if (!window.firstSell) {
                window.firstSell = true;
                localStorage.setItem('firstSell', 'true');
                checkAchievements();
            }
            // Refund is 50% of the last N costs (reverse scaling)
            let refund = 0;
            for (let i = 0; i < canSell; i++) {
                let sellOwned = upgrade.owned - i;
                let sellCost = Math.floor(upgrade.baseCost * Math.pow(1.15, sellOwned));
                refund += Math.floor(sellCost * 0.5);
            }
            coffeeCount += refund;
            upgrade.owned -= canSell;
            upgrade.cost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned));
            updateDisplay();
            saveGame();
        }
    }
}

function renderShop() {
    const shopList = document.getElementById('shop-list');
    shopList.innerHTML = '';
    shopUpgrades.forEach((u, i) => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.style.width = '300px'; // Increased width
        let displayCost = u.cost;
        let totalCost = 0;
        let amount = shopBuyAmount;
        let maxCanBuy = 0;
        if (shopBuyMode === 'buy') {
            if (amount === 'max') {
                // Calculate max affordable
                let tempCost = u.cost;
                let owned = u.owned;
                let runningTotal = 0;
                while (coffeeCount >= runningTotal + tempCost) {
                    runningTotal += tempCost;
                    maxCanBuy++;
                    tempCost = Math.floor(u.baseCost * Math.pow(1.15, owned + maxCanBuy));
                }
                amount = maxCanBuy;
                totalCost = runningTotal;
            } else {
                let tempCost = u.cost;
                for (let n = 0; n < amount; n++) {
                    totalCost += tempCost;
                    tempCost = Math.floor(u.baseCost * Math.pow(1.15, u.owned + n + 1));
                }
            }
            displayCost = amount > 1 ? totalCost : u.cost;
        } else {
            displayCost = Math.floor(u.cost * 0.5);
        }
        let label = (shopBuyAmount === 'max') ? 'MAX' : shopBuyAmount;
        let maxDisplay = (shopBuyAmount === 'max') ? `<span style='float:right; color:#2a1706; font-weight:bold; margin-left:8px;'>x${maxCanBuy}</span>` : '';
        btn.innerHTML = `
                        <span style='float:left;font-weight:bold;'>${u.owned}</span>
                        <span style='display:inline-block;width:60%;text-align:center;'>${u.name}<br><span style='font-size:0.85em;color:#7a5c2e;'>+${u.power} per click</span></span>
                        <span style='float:right;'>${displayCost} <span style="font-size:1em;">☕</span></span>${maxDisplay}
                `;
        btn.disabled = coffeeCount < displayCost || amount === 0;
        btn.onclick = () => buyShopUpgrade(i);
        shopList.appendChild(btn);
    });
}

function buyUpgrade(index) {
    const upgrade = upgrades[index];
    if (buyMode === 'buy') {
        let canBuy = 0;
        let totalCost = 0;
        let tempCost = upgrade.cost;
        let maxAmount = buyAmount;
        if (buyAmount === 'max') {
            // Calculate max affordable
            let owned = upgrade.owned;
            while (coffeeCount >= totalCost + tempCost) {
                totalCost += tempCost;
                canBuy++;
                tempCost = Math.floor(upgrade.baseCost * Math.pow(1.15, owned + canBuy));
            }
        } else {
            for (let i = 0; i < maxAmount; i++) {
                if (coffeeCount >= totalCost + tempCost) {
                    totalCost += tempCost;
                    tempCost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned + canBuy + 1));
                    canBuy++;
                } else {
                    break;
                }
            }
        }
        if (canBuy > 0) {
            coffeeCount -= totalCost;
            upgrade.owned += canBuy;
            upgrade.cost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned));
            updateCPS();
            updateDisplay();
            saveGame();
            checkAchievements();
        }
    } else if (buyMode === 'sell') {
        let canSell = Math.min(buyAmount, upgrade.owned);
        if (canSell > 0) {
            if (!window.firstSell) {
                window.firstSell = true;
                localStorage.setItem('firstSell', 'true');
                checkAchievements();
            }
            // Calculate refund: sum of last N costs (reverse of buy formula)
            let refund = 0;
            for (let i = 0; i < canSell; i++) {
                let sellOwned = upgrade.owned - i;
                let sellCost = Math.floor(upgrade.baseCost * Math.pow(1.15, sellOwned));
                refund += Math.floor(sellCost * 0.5); // 50% refund
            }
            coffeeCount += refund;
            upgrade.owned -= canSell;
            upgrade.cost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned));
            updateCPS();
            updateDisplay();
            saveGame();
        }
    }
}

function updateCPS() {
    autoCoffeesPerSecond = upgrades.reduce((sum, u) => sum + u.owned * u.cps, 0);
    clickCoffeesPerSecond = clickCPSBonus;
    coffeesPerSecond = autoCoffeesPerSecond + clickCoffeesPerSecond;
}

function renderUpgrades() {
    const upgradesList = document.getElementById('upgrades-list');
    upgradesList.innerHTML = '';
    upgrades.forEach((u, i) => {
        const btn = document.createElement('button');
        btn.className = 'upgrade-btn';
        btn.style.width = '300px'; // Increased width
        let displayCost = u.cost;
        let totalCost = 0;
        let amount = buyAmount;
        let maxCanBuy = 0;
        if (buyMode === 'buy') {
            if (amount === 'max') {
                // Calculate max affordable
                let tempCost = u.cost;
                let owned = u.owned;
                let runningTotal = 0;
                while (coffeeCount >= runningTotal + tempCost) {
                    runningTotal += tempCost;
                    maxCanBuy++;
                    tempCost = Math.floor(u.baseCost * Math.pow(1.15, owned + maxCanBuy));
                }
                amount = maxCanBuy;
                totalCost = runningTotal;
            } else {
                let tempCost = u.cost;
                for (let n = 0; n < amount; n++) {
                    totalCost += tempCost;
                    tempCost = Math.floor(u.baseCost * Math.pow(1.15, u.owned + n + 1));
                }
            }
            displayCost = amount > 1 ? totalCost : u.cost;
            let maxDisplay = (buyAmount === 'max') ? `<span style='float:right; color:#2a1706; font-weight:bold; margin-left:8px;'>x${maxCanBuy}</span>` : '';
            btn.innerHTML = ` 
                                <span style='float:left;font-weight:bold;'>${u.owned}</span> 
                                <span style='display:inline-block;width:60%;text-align:center;'>${u.name}<br><span style='font-size:0.85em;color:#7a5c2e;'>+${u.cps}/s</span></span> 
                                <span style='float:right;'>${displayCost} <span style="font-size:1em;">☕</span></span>${maxDisplay} 
                            `;
            btn.title = `Total cost for ${buyAmount === 'max' ? amount : buyAmount}: ${displayCost}`;
            btn.disabled = coffeeCount < displayCost || amount === 0;
        } else {
            displayCost = Math.floor(u.cost * 0.5);
            btn.innerHTML = ` 
                                <span style='float:left;font-weight:bold;'>${u.owned}</span> 
                                <span style='display:inline-block;width:60%;text-align:center;'>${u.name}<br><span style='font-size:0.85em;color:#7a5c2e;'>+${u.cps}/s</span></span> 
                                <span style='float:right;'>${displayCost} <span style="font-size:1em;">☕</span></span> 
                            `;
            let canSell = Math.min(buyAmount === 'max' ? u.owned : buyAmount, u.owned);
            let refund = 0;
            for (let n = 0; n < canSell; n++) {
                let sellOwned = u.owned - n;
                let sellCost = Math.floor(u.baseCost * Math.pow(1.15, sellOwned));
                refund += Math.floor(sellCost * 0.5);
            }
            btn.title = `Refund for ${canSell}: ${refund}`;
            btn.disabled = u.owned === 0;
        }
        btn.onclick = () => buyUpgrade(i);
        upgradesList.appendChild(btn);
    });
}

// === Achievements ===
const achievements = [
    { id: 'first-click', condition: () => coffeeCount >= 1, message: 'Achievement: First Click!' },
    { id: 'hundred-clicks', condition: () => totalClicks >= 100, message: 'Achievement: 100 Clicks!' },
    { id: 'thousand-clicks', condition: () => totalClicks >= 1000, message: 'Achievement: 1,000 Clicks!' },
    { id: 'five-thousand-clicks', condition: () => totalClicks >= 5000, message: 'Achievement: 5,000 Clicks!' },
    { id: 'first-sell', condition: () => window.firstSell, message: 'Achievement: First Sale! (Sold a Shop Item or Upgrade)' },
    { id: 'hundred-coffees', condition: () => coffeeCount >= 100, message: 'Achievement: 100 Coffees!' },
    { id: 'thousand-coffees', condition: () => coffeeCount >= 1000, message: 'Achievement: 1,000 Coffees!' },
    { id: 'ten-thousand-coffees', condition: () => coffeeCount >= 10000, message: 'Achievement: 10,000 Coffees!' },
    { id: 'hundred-thousand-coffees', condition: () => coffeeCount >= 100000, message: 'Achievement: 100,000 Coffees!' },
    { id: 'million-coffees', condition: () => coffeeCount >= 1000000, message: 'Achievement: 1 Million Coffees!' },
    { id: 'ten-million-coffees', condition: () => coffeeCount >= 10000000, message: 'Achievement: 10 Million Coffees!' },
    { id: 'hundred-million-coffees', condition: () => coffeeCount >= 100000000, message: 'Achievement: 100 Million Coffees!' },
    { id: 'billion-coffees', condition: () => coffeeCount >= 1000000000, message: 'Achievement: 1 Billion Coffees!' },
    { id: 'ten-billion-coffees', condition: () => coffeeCount >= 10000000000, message: 'Achievement: 10 Billion Coffees!' },
    { id: 'hundred-billion-coffees', condition: () => coffeeCount >= 100000000000, message: 'Achievement: 100 Billion Coffees!!' },
    { id: 'trillion-coffees', condition: () => coffeeCount >= 1000000000000, message: 'Achievement: 1 Trillion Coffees!!!' },
    { id: 'first-bonus-coffee', condition: () => window.bonusCoffeeClicks >= 1, message: 'Achievement: Found Your First Coffee Bean!' },
    { id: 'fifth-bonus-coffee', condition: () => window.bonusCoffeeClicks >= 5, message: 'Achievement: Found 5 Coffee Beans!' },
    { id: 'tenth-bonus-coffee', condition: () => window.bonusCoffeeClicks >= 10, message: 'Achievement: Found 10 Coffee Beans!' },
    { id: 'twenty-fifth-bonus-coffee', condition: () => window.bonusCoffeeClicks >= 25, message: 'Achievement: Found 25 Coffee Beans!' },
    { id: 'all-upgrades', condition: () => upgrades.every(u => u.owned >= 1), message: 'Achievement: Purchase one of Every Upgrade!' },
    { id: 'all-shop-items', condition: () => shopUpgrades.every(u => u.owned >= 1), message: 'Achievement: Purchase one of Every Shop Item!' },
    { id: 'all-items', condition: () => upgrades.every(u => u.owned >= 1) && shopUpgrades.every(u => u.owned >= 1), message: 'Achievement: I\'ll Have One of Everything! (All Upgrades & Shop Items)' },
    {
        id: 'completionist', condition: () => {
            // Exclude this achievement itself from the check
            const otherAchievements = achievements.filter(a => a.id !== 'completionist');
            return otherAchievements.every(a => unlockedAchievements.has(a.id));
        }, message: 'Achievement: The Coffee Completionist (All Achievements Unlocked!)'
    },
    // First of any upgrade
    ...upgrades.map((u, i) => ({ id: `first-upgrade-${i}`, condition: () => u.owned >= 1, message: `Achievement: First ${u.name}!` })),
    // First of any shop item
    ...shopUpgrades.map((u, i) => ({ id: `first-shop-${i}`, condition: () => u.owned >= 1, message: `Achievement: First ${u.name}!` })),
];
let unlockedAchievements = new Set(JSON.parse(localStorage.getItem('coffeeAchievements') || '[]'));
window.bonusCoffeeClicks = parseInt(localStorage.getItem('bonusCoffeeClicks') || '0');

function renderAchievementsList() {
    const list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = '';
    let unlocked = 0;
    achievements.forEach(a => {
        if (unlockedAchievements.has(a.id)) {
            const li = document.createElement('li');
            li.textContent = a.message;
            list.appendChild(li);
            unlocked++;
        }
    });
    // Add summary at the top
    const percent = Math.round((unlocked / achievements.length) * 100);
    let summary = document.getElementById('achievements-summary');
    if (!summary) {
        summary = document.createElement('li');
        summary.id = 'achievements-summary';
        summary.style.fontWeight = 'bold';
        summary.style.background = '#e7fbe7';
        summary.style.borderBottom = '2px solid #bfa76a';
        list.prepend(summary);
    }
    summary.textContent = `Unlocked: ${unlocked} / ${achievements.length} (${percent}%)`;
}

// Update achievements list after unlocking
function showAchievement(msg) {
    const popup = document.getElementById('achievement-popup');
    if (!popup) return;
    popup.textContent = msg;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 3000);
    renderAchievementsList();
}

document.addEventListener('DOMContentLoaded', () => {
    renderAchievementsList();
});

function checkAchievements() {
    let changed = false;
    achievements.forEach(a => {
        if (!unlockedAchievements.has(a.id) && a.condition()) {
            unlockedAchievements.add(a.id);
            showAchievement(a.message);
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem('coffeeAchievements', JSON.stringify(Array.from(unlockedAchievements)));
    }
}

// === Random Bonus Coffee Event ===
let bonusCoffeeActive = false;
let bonusTimeout = null;

function spawnBonusCoffee() {
    if (bonusCoffeeActive) return;
    bonusCoffeeActive = true;
    const bonus = document.getElementById('bonus-coffee');
    const light = document.getElementById('bonus-coffee-light');
    // Random position (10% to 80% of viewport)
    const x = Math.random() * 70 + 10;
    const y = Math.random() * 60 + 10;
    bonus.style.left = x + 'vw';
    bonus.style.top = y + 'vh';
    bonus.style.display = 'block';
    bonus.style.fontSize = '5em'; // Make it larger
    // Wait for the bonus image to render, then center the light
    setTimeout(() => {
        const bonusRect = bonus.getBoundingClientRect();
        const lightSize = 8 * parseFloat(getComputedStyle(document.documentElement).fontSize); // 8em in px
        // Center the light behind the bean
        light.style.width = lightSize + 'px';
        light.style.height = lightSize + 'px';
        light.style.left = (bonusRect.left + window.scrollX + bonusRect.width / 2 - lightSize / 2) + 'px';
        light.style.top = (bonusRect.top + window.scrollY + bonusRect.height / 2 - lightSize / 2) + 'px';
        light.style.display = 'block';
    }, 10);
    // Ensure the image is visible and sized
    const img = document.getElementById('bonus-coffee-img');
    if (img) {
        img.style.width = '1em';
        img.style.height = '1em';
        img.style.display = 'block';
        img.style.pointerEvents = 'none';
        img.style.margin = '0 auto';
    }

    // Remove after 8 seconds if not clicked
    bonusTimeout = setTimeout(() => {
        bonus.style.display = 'none';
        light.style.display = 'none';
        bonusCoffeeActive = false;
    }, 8000);
}

document.getElementById('bonus-coffee').addEventListener('click', function(event) {
    if (!bonusCoffeeActive) return;
    // Award 25% of current coffeeCount (rounded down, at least 1)
    const bonusAmount = Math.max(1, Math.floor(coffeeCount * 0.25));
    coffeeCount += bonusAmount;
    updateDisplay();
    saveGame();
    const bonus = document.getElementById('bonus-coffee');
    const floating = document.createElement('span');
    setTimeout(() => floating.remove(), 1500);
    // Show white floating text at click position
    if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
        const whiteFloating = document.createElement('span');
        whiteFloating.textContent = `+${bonusAmount} coffees!`;
        whiteFloating.style.position = 'fixed';
        whiteFloating.style.left = event.clientX + 'px';
        whiteFloating.style.top = event.clientY + 'px';
        whiteFloating.style.fontSize = '1.7em';
        whiteFloating.style.color = '#ffffffff';
        whiteFloating.style.fontWeight = 'bold';
        whiteFloating.style.textShadow = '0 0 4px #000, 0 0 8px #000';
        whiteFloating.style.opacity = '1';
        whiteFloating.style.transition = 'opacity 1.2s';
        whiteFloating.style.pointerEvents = 'none';
        whiteFloating.style.zIndex = 9999;
        document.body.appendChild(whiteFloating);
        setTimeout(() => {
            whiteFloating.style.opacity = '0';
        }, 2000); // Show for 2 seconds before fading
        setTimeout(() => {
            whiteFloating.remove();
        }, 3200); // Fade duration (1.2s) + visible (2s)
    }
    // Hide bonus coffee and light effect
    bonus.style.display = 'none';
    const light = document.getElementById('bonus-coffee-light');
    if (light) light.style.display = 'none';
    bonusCoffeeActive = false;
    if (bonusTimeout) clearTimeout(bonusTimeout);

    // Track bonus coffee clicks for achievements
    window.bonusCoffeeClicks = (window.bonusCoffeeClicks || 0) + 1;
    localStorage.setItem('bonusCoffeeClicks', window.bonusCoffeeClicks.toString());
    checkAchievements();
});

// Spawn bonus coffee every 60 seconds
setInterval(() => {
    if (!bonusCoffeeActive) {
        spawnBonusCoffee();
    }
}, 60000);

// Autoclicker loop

// Update clickCPSBonus every second based on clicks in the last second
setInterval(() => {
    // Calculate bonus: clicks per second * click power
    const now = Date.now();
    if (now - clickCPSLastUpdate > 1200) {
        // If no clicks in the last 1.2s, reset bonus
        clickCPSBonus = 0;
        clickCPSClicks = 0;
    } else {
        clickCPSBonus = clickCPSClicks * getClickPower();
    }
    updateCPS();
    clickCPSClicks = 0;
}, 1000);

setInterval(() => {
    // Only add autoCoffeesPerSecond (from upgrades) as passive income
    coffeeCount += autoCoffeesPerSecond;
    updateDisplay();
    saveGame();
}, 1000);

// Save every 10 seconds
setInterval(saveGame, 10000);

// Setup
document.getElementById('brew-button').addEventListener('click', clickBrewButton);
loadGame();
updateCPS();
updateDisplay();




