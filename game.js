console.log('🎮 Game starting...');

// ===== GAME STATE =====
let cookies = 0;              // Display value (integer)
let cookiesRaw = 0;           // Internal value (float) - CRITICAL FIX
let cookiesPerSecond = 0;
let prestigeMultiplier = 1;
let lastUpdate = Date.now();
const upgrades = {
    cursor: { level: 0, baseCost: 10, cps: 0.1 },
    grandma: { level: 0, baseCost: 100, cps: 1 },
    farm: { level: 0, baseCost: 1100, cps: 8 },
    mine: { level: 0, baseCost: 12000, cps: 47 },
    factory: { level: 0, baseCost: 130000, cps: 260 },
    bank: { level: 0, baseCost: 1400000, cps: 1400 },
    temple: { level: 0, baseCost: 20000000, cps: 7800 },
    wizard: { level: 0, baseCost: 330000000, cps: 44000 }
};

const upgradeNames = {
    cursor: "Cursor", grandma: "Grandma", farm: "Farm", mine: "Mine",
    factory: "Factory", bank: "Bank", temple: "Temple", wizard: "Wizard"
};

const upgradeDescs = {
    cursor: "Auto-clicks every 10 seconds", grandma: "Bakes cookies", farm: "Grows cookie plants",
    mine: "Mines cookie ores", factory: "Mass-produces cookies", bank: "Generates interest",
    temple: "Worship the cookie god", wizard: "Summons cookies with magic"
};

// ===== CORE FUNCTIONS =====
function getCost(type) {
    return Math.floor(upgrades[type].baseCost * Math.pow(1.15, upgrades[type].level));
}

function calcCPS() {
    let total = 0;
    for (const type in upgrades) {
        total += upgrades[type].cps * upgrades[type].level;
    }
    return total * prestigeMultiplier;
}

// CRITICAL FIX: Track raw cookies (float) and display cookies (integer)
function addCookies(amount) {
    cookiesRaw += amount;           // Accumulate fractional cookies
    const wholeCookies = Math.floor(cookiesRaw);
    
    if (wholeCookies > cookies) {
        cookies = wholeCookies;     // Only update display when we have whole cookies
        updateCookieCounter();
        updateUpgradeAffordability();
    }
}

function clickCookie() {
    // Click gives whole cookies immediately
    cookiesRaw += 1 * prestigeMultiplier;
    cookies = Math.floor(cookiesRaw);
    updateCookieCounter();
    updateUpgradeAffordability();
    
    const container = document.getElementById('floating-cookies');
    if (container) {
        const el = document.createElement('div');
        el.className = 'floating-cookie';
        el.innerHTML = `<i class="fas fa-cookie"></i> +${Math.floor(1 * prestigeMultiplier)}`;
        el.style.left = `${Math.random() * 60 + 20}%`;
        el.style.bottom = '20%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }
}

// ===== UPGRADE SYSTEM =====
function buyUpgrade(type) {
    const cost = getCost(type);
    
    if (cookies >= cost) {
        cookies -= cost;
        cookiesRaw -= cost;  // Also deduct from raw
        upgrades[type].level++;
        cookiesPerSecond = calcCPS();
        rebuildFullUI();
        saveGame();
        showNotification(`✅ +${upgradeNames[type]} (Lv${upgrades[type].level})`);
    } else {
        showNotification(`❌ Need ${formatNum(cost)} cookies (have ${cookies})`);
    }
}

// ===== DISPLAY =====
function updateCookieCounter() {
    const cookieCountEl = document.getElementById('cookie-count');
    const cpsEl = document.getElementById('cps');
    const prestigeBtn = document.getElementById('prestige-btn');
    
    if (cookieCountEl) cookieCountEl.textContent = formatNum(cookies);
    if (cpsEl) cpsEl.textContent = formatNum(cookiesPerSecond);
    
    if (prestigeBtn) {
        const mult = Math.floor(Math.sqrt(cookies / 1000000));
        prestigeBtn.innerHTML = `<i class="fas fa-star"></i> Prestige (${mult}x)`;
        prestigeBtn.disabled = cookies < 1000000;
    }
}

function updateUpgradeAffordability() {
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    
    const items = list.querySelectorAll('.upgrade-item');
    items.forEach(item => {
        const type = item.getAttribute('data-upgrade');
        if (!type) return;
        
        const cost = getCost(type);
        const affordable = cookies >= cost;
        
        item.classList.remove('affordable', 'clickable', 'disabled');
        if (affordable) {
            item.classList.add('affordable', 'clickable');
        } else {
            item.classList.add('disabled');
        }
        
        const costEl = item.querySelector('.upgrade-cost');
        if (costEl) {
            costEl.innerHTML = `<i class="fas fa-cookie-bite"></i> ${formatNum(cost)}`;
        }
        
        const cpsEl = item.querySelector('.upgrade-cps');
        if (cpsEl) {
            cpsEl.innerHTML = `<i class="fas fa-bolt"></i> ${formatNum(upgrades[type].cps * prestigeMultiplier)} CPS`;
        }
    });
}

function rebuildFullUI() {
    updateCookieCounter();
    
    const list = document.getElementById('upgrades-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    for (const type in upgrades) {
        const cost = getCost(type);
        const affordable = cookies >= cost;
        
        const item = document.createElement('div');
        item.className = affordable ? 'upgrade-item affordable clickable' : 'upgrade-item disabled';
        item.setAttribute('data-upgrade', type);
        
        item.innerHTML = `
            <div class="upgrade-header">
                <div class="upgrade-name">${upgradeNames[type]}</div>
                <div class="upgrade-level">Lv ${upgrades[type].level}</div>
            </div>
            <div class="upgrade-desc">${upgradeDescs[type]}</div>
            <div class="upgrade-stats">
                <div class="upgrade-cps"><i class="fas fa-bolt"></i> ${formatNum(upgrades[type].cps * prestigeMultiplier)} CPS</div>
                <div class="upgrade-cost"><i class="fas fa-cookie-bite"></i> ${formatNum(cost)}</div>
            </div>
        `;
        
        list.appendChild(item);
    }
}

function formatNum(num) {
    if (num >= 1e9) return (num/1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num/1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num/1e3).toFixed(1) + 'K';
    return num.toString();
}

// ===== SAVE/LOAD =====
function saveGame() {
    try {
        localStorage.setItem('idleGameSave', JSON.stringify({
            cookies, cookiesRaw, cookiesPerSecond, prestigeMultiplier, upgrades, timestamp: Date.now()
        }));
        showStatus('✅ Saved');
    } catch(e) {}
}

function loadGame() {
    try {
        const data = localStorage.getItem('idleGameSave');
        if (data) {
            const s = JSON.parse(data);
            cookies = Math.floor(s.cookies) || 0;
            cookiesRaw = s.cookiesRaw || s.cookies || 0;  // Load raw value
            cookiesPerSecond = s.cookiesPerSecond || 0;
            prestigeMultiplier = s.prestigeMultiplier || 1;
            if (s.upgrades) {
                for (const t in s.upgrades) {
                    if (upgrades[t]) {
                        upgrades[t].level = s.upgrades[t].level || 0;
                    }
                }
            }
            lastUpdate = Date.now();
            rebuildFullUI();
        } else {
            rebuildFullUI();
        }
    } catch(e) {}
}

function showStatus(msg) {
    const el = document.getElementById('save-status');
    if (el) {
        el.textContent = msg;
        setTimeout(() => { if(el.textContent === msg) el.textContent = ''; }, 2000);
    }
}

function showNotification(msg) {
    const el = document.getElementById('save-status');
    if (el) {
        el.textContent = msg;
        el.style.color = '#ffd700';
        setTimeout(() => { if(el.textContent === msg) el.textContent = ''; }, 3000);
    }
}

// ===== GAME LOOP =====
function gameLoop() {
    const now = Date.now();
    const delta = (now - lastUpdate) / 1000;
    lastUpdate = now;
    
    if (cookiesPerSecond > 0) {
        addCookies(cookiesPerSecond * delta);  // Accumulates fractional cookies
    }
    
    requestAnimationFrame(gameLoop);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    // Clean corrupted saves
    try {
        const data = localStorage.getItem('idleGameSave');
        if (data) {
            const s = JSON.parse(data);
            if (typeof s.cookies === 'number' && !Number.isInteger(s.cookies) && !s.cookiesRaw) {
                console.log('🧹 Cleaning old save format...');
                localStorage.removeItem('idleGameSave');
            }
        }
    } catch(e) {}
    
    const cookieArea = document.querySelector('.cookie-area');
    if (cookieArea) cookieArea.addEventListener('click', clickCookie);
    
    document.getElementById('prestige-btn')?.addEventListener('click', () => {
        if (cookies >= 1000000) {
            const mult = Math.floor(Math.sqrt(cookies / 1000000));
            prestigeMultiplier = 1 + mult * 0.1;
            cookies = 0;
            cookiesRaw = 0;
            for (const t in upgrades) upgrades[t].level = 0;
            cookiesPerSecond = 0;
            rebuildFullUI();
            showNotification(`🌟 Prestige! +${mult * 10}% multiplier`);
        }
    });
    
    document.getElementById('save-btn')?.addEventListener('click', saveGame);
    document.getElementById('load-btn')?.addEventListener('click', loadGame);
    
    const upgradesList = document.getElementById('upgrades-list');
    if (upgradesList) {
        upgradesList.addEventListener('click', function(e) {
            const item = e.target.closest('.upgrade-item');
            if (item && !item.classList.contains('disabled')) {
                const type = item.getAttribute('data-upgrade');
                if (type) buyUpgrade(type);
            }
        });
    }
    
    loadGame();
    lastUpdate = Date.now();
    gameLoop();
    setTimeout(() => showNotification('🍪 Auto-generating cookies now works!'), 1000);
});

setInterval(saveGame, 60000);