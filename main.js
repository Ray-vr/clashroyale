// --- Card Definitions (Expanded Deck) ---
const CARD_DEFINITIONS = [
  { name: "Knight", cost: 3, hp: 50, dmg: 10, speed: 1, color: "brown", type: "troop", icon:"🛡️" },
  { name: "Archer", cost: 2, hp: 25, dmg: 7, speed: 1.5, color: "green", type: "troop", icon:"🏹" },
  { name: "Giant", cost: 5, hp: 120, dmg: 20, speed: 0.7, color: "gray", type: "troop", icon:"🧔" },
  { name: "Fireball", cost: 4, hp: 0, dmg: 35, speed: 0, color: "orange", type: "spell", icon:"🔥" },
  { name: "Cannon", cost: 3, hp: 60, dmg: 12, speed: 0, color: "silver", type: "defense", icon:"🛡️" },
  { name: "Wizard", cost: 4, hp: 40, dmg: 16, speed: 1.2, color: "purple", type: "troop", icon:"🧙" },
  { name: "Freeze", cost: 3, hp: 0, dmg: 0, speed: 0, color: "cyan", type: "spell", icon:"❄️" },
  { name: "Wall", cost: 2, hp: 80, dmg: 0, speed: 0, color: "darkgray", type: "defense", icon:"🧱" }
];

// --- Card Collection & Upgrades ---
let collection = {};
CARD_DEFINITIONS.forEach(card => {
  collection[card.name] = { level: 1, count: 0, evolved: false };
});

// --- Chests, Magic Items, Trophy Road, Timer ---
let chests = [{ type: "Silver Chest", cards: 2 }];
let magicItems = { chestKeys: 1, boostPotions: 1 };
let trophies = 0, arena = 1;
let timer = 120; // seconds per match
let timerInterval = null;

// --- Game State ---
let elixir = 5, elixirMax = 10, elixirRegen = 0.05;
let playerUnits = [], aiUnits = [];
let crowns = { player: 0, ai: 0 };
let towers = [
  // Player towers
  { x: 100, y: 60, hp: 100, side: "player", type: "crown" },
  { x: 700, y: 60, hp: 100, side: "player", type: "crown" },
  { x: 400, y: 35, hp: 160, side: "player", type: "king" },
  // AI towers
  { x: 100, y: 410, hp: 100, side: "ai", type: "crown" },
  { x: 700, y: 410, hp: 100, side: "ai", type: "crown" },
  { x: 400, y: 435, hp: 160, side: "ai", type: "king" }
];
// Obstacles
let obstacles = [
  { x: 250, y: 220, w: 60, h: 60 },
  { x: 530, y: 220, w: 60, h: 60 }
];

let gameOver = false;
let dragCardIdx = null, dragCardData = null;

// --- DOM Elements ---
const canvas = document.getElementById('battlefield');
const ctx = canvas.getContext('2d');
const elixirDiv = document.getElementById('elixir-bar');
const cardPanel = document.getElementById('card-panel');
const trophyDiv = document.getElementById('trophy-road');
const chestPanel = document.getElementById('chest-panel');
const magicDiv = document.getElementById('magic-items');
const matchInfo = document.getElementById('match-info');
const openChestBtn = document.getElementById('open-chest-btn');
const timerDiv = document.getElementById('timer');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');

// --- Card Panel (Drag-and-Drop) ---
function renderCards() {
  cardPanel.innerHTML = "";
  CARD_DEFINITIONS.forEach((card, idx) => {
    if (collection[card.name].level > 0) {
      let label = `${card.icon} ${card.name} (${card.cost}) Lv.${collection[card.name].level}`;
      if (collection[card.name].evolved) label += " ⭐";
      const btn = document.createElement('button');
      btn.className = "card-btn";
      btn.innerText = label;
      btn.disabled = elixir < card.cost;
      btn.draggable = true;
      btn.ondragstart = e => {
        dragCardIdx = idx;
        dragCardData = card;
      };
      btn.ondragend = e => {
        dragCardIdx = null;
        dragCardData = null;
      };
      cardPanel.appendChild(btn);
    }
  });
}

// --- Drag/Drop on Battlefield ---
canvas.ondragover = e => { e.preventDefault(); }
canvas.ondrop = e => {
  if (dragCardIdx === null || gameOver) return;
  let rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  let card = CARD_DEFINITIONS[dragCardIdx];
  if (elixir < card.cost) return;
  elixir -= card.cost;
  if (card.type === "spell") {
    // Drop spell: effect at location
    aiUnits.forEach(u => {
      let d = Math.hypot(u.x - x, u.y - y);
      if (d < 40) u.hp -= card.dmg * collection[card.name].level * (collection[card.name].evolved ? 2 : 1);
    });
    if (card.name === "Freeze") {
      aiUnits.forEach(u => {
        let d = Math.hypot(u.x - x, u.y - y);
        if (d < 40) u.frozen = 60; // 1s freeze
      });
    }
  } else {
    playerUnits.push({
      ...card,
      x, y,
      hp: card.hp * collection[card.name].level * (collection[card.name].evolved ? 2 : 1),
      dmg: card.dmg * collection[card.name].level * (collection[card.name].evolved ? 2 : 1),
      side: "player",
      frozen: 0
    });
  }
  renderCards();
};

// --- AI Logic ---
function aiPlay() {
  if (gameOver) return;
  let aiElixir = Math.floor(Math.random() * 6);
  if (aiElixir > 2) {
    let cardIdx = Math.floor(Math.random() * CARD_DEFINITIONS.length);
    const card = CARD_DEFINITIONS[cardIdx];
    aiUnits.push({
      ...card,
      x: Math.random() > 0.5 ? 120 : 680,
      y: 120 + Math.random() * 200,
      hp: card.hp,
      dmg: card.dmg,
      side: "ai",
      frozen: 0
    });
  }
}

// --- Game Loop ---
function update() {
  if (gameOver) return;
  elixir = Math.min(elixir + elixirRegen, elixirMax);
  renderCards();
  if (Math.random() < 0.012) aiPlay();
  moveUnits(playerUnits, "ai");
  moveUnits(aiUnits, "player");

  towers.forEach(tower => {
    if (tower.hp <= 0 && !tower.destroyed) {
      tower.destroyed = true;
      if (tower.type === "king") {
        gameOver = true;
        matchInfo.innerText = tower.side === "player" ? "You Lose! King Tower destroyed." : "You Win! King Tower destroyed.";
        if (tower.side === "ai") crowns.player += 1;
        if (tower.side === "player") crowns.ai += 1;
      } else {
        if (tower.side === "ai") crowns.player += 1;
        if (tower.side === "player") crowns.ai += 1;
      }
    }
  });

  if (!gameOver && crowns.player + crowns.ai >= 2) {
    gameOver = true;
    matchInfo.innerText = crowns.player > crowns.ai ? "You Win!" : "You Lose!";
    if (crowns.player > crowns.ai) trophies += 30;
    else trophies = Math.max(0, trophies - 20);
    rewardChest();
    updateTrophyRoad();
    clearInterval(timerInterval);
  }

  draw();
  requestAnimationFrame(update);
}

// --- Move Units (Animated, Obstacles, Lanes) ---
function moveUnits(units, enemySide) {
  units.forEach(unit => {
    if (unit.frozen && unit.frozen > 0) { unit.frozen--; return; }
    let targets = towers.filter(t => t.side === enemySide && t.hp > 0);
    if (targets.length === 0) return;
    let target = targets.reduce((a, b) => {
      let da = Math.hypot(a.x - unit.x, a.y - unit.y);
      let db = Math.hypot(b.x - unit.x, b.y - unit.y);
      return da < db ? a : b;
    });
    let dx = target.x - unit.x, dy = target.y - unit.y;
    let dist = Math.hypot(dx, dy);
    // Obstacle avoidance
    for (let obs of obstacles) {
      if (unit.x > obs.x && unit.x < obs.x+obs.w && unit.y > obs.y && unit.y < obs.y+obs.h) {
        unit.x += (unit.x < obs.x+obs.w/2 ? -1 : 1) * 2;
        unit.y += (unit.y < obs.y+obs.h/2 ? -1 : 1) * 2;
        continue;
      }
    }
    if (dist < 30) {
      target.hp -= unit.dmg * 0.1;
    } else {
      unit.x += dx / dist * unit.speed;
      unit.y += dy / dist * unit.speed;
    }
  });
}

// --- Drawing (Grid, Lanes, Obstacles, Animated Units) ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Battlefield grid
  ctx.strokeStyle = "#fff2";
  for (let i=1;i<4;i++) {
    ctx.beginPath(); ctx.moveTo(i*200,0); ctx.lineTo(i*200,500); ctx.stroke();
  }
  // Lanes
  ctx.strokeStyle = "#fff8";
  ctx.beginPath(); ctx.moveTo(0,250); ctx.lineTo(800,250); ctx.stroke();
  // Obstacles
  obstacles.forEach(obs => {
    ctx.fillStyle="#333";
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.fillStyle="#bbb";
    ctx.font="20px Arial"; ctx.fillText("🧱",obs.x+obs.w/2-10,obs.y+obs.h/2+10);
  });
  // Towers
  towers.forEach(tower => {
    ctx.fillStyle = tower.type === "king"
      ? (tower.side === "player" ? "#ffd700" : "#d11")
      : (tower.side === "player" ? "#44f" : "#e54");
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.type === "king" ? 28 : 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.font="14px Arial";
    ctx.fillText(tower.destroyed ? "X" : `${tower.hp|0}`, tower.x-14, tower.y+6);
  });
  // Units (Animated)
  playerUnits.forEach(unit => drawUnit(unit, true));
  aiUnits.forEach(unit => drawUnit(unit, false));
  // Elixir, crowns, timer
  elixirDiv.innerText = `Elixir: ${elixir.toFixed(1)} / ${elixirMax}`;
  matchInfo.innerText = `Crowns: ${crowns.player} | AI: ${crowns.ai}`;
  timerDiv.innerText = `Time: ${Math.floor(timer/60)}:${("0"+(timer%60)).slice(-2)}`
}

// --- Draw Unit (Animated) ---
function drawUnit(unit, isPlayer) {
  ctx.save();
  ctx.translate(unit.x, unit.y);
  // Simple walking animation
  let step = Math.sin(Date.now()/120 + unit.x)*4;
  ctx.font="22px Arial";
  ctx.globalAlpha = unit.frozen ? 0.5 : 1;
  ctx.fillText(unit.icon, -13, 6+step);
  ctx.restore();
  // HP bar
  ctx.fillStyle = isPlayer ? "#2ecc40" : "#e54";
  ctx.fillRect(unit.x-14, unit.y+18, Math.max(0,unit.hp/2), 4);
}

// --- Trophy Road ---
function updateTrophyRoad() {
  arena = 1 + Math.floor(trophies / 100);
  trophyDiv.innerText = `Trophy Road: ${trophies} trophies | Arena ${arena}`;
}

// --- Chest Rewards ---
function rewardChest() {
  chests.push({ type: Math.random() > 0.5 ? "Silver Chest" : "Gold Chest", cards: 2 + arena });
  renderChests();
}
function renderChests() {
  chestPanel.innerHTML = "Chests: " + chests.map(chest => chest.type).join(", ");
  if (chests.length > 0) {
    if (!openChestBtn.parentNode) chestPanel.appendChild(openChestBtn);
    openChestBtn.style.display = "";
  } else openChestBtn.style.display = "none";
}
openChestBtn.onclick = function() {
  if (chests.length === 0) return;
  let chest = chests.shift();
  let reward = [];
  for (let i = 0; i < chest.cards; i++) {
    let idx = Math.floor(Math.random() * CARD_DEFINITIONS.length);
    let card = CARD_DEFINITIONS[idx];
    collection[card.name].count += 1;
    if (collection[card.name].count >= 3 * collection[card.name].level) {
      collection[card.name].level++;
      collection[card.name].count = 0;
      reward.push(`${card.name} upgraded to Level ${collection[card.name].level}!`);
    } else {
      reward.push(`+1 ${card.name}`);
    }
    if (!collection[card.name].evolved && Math.random() < 0.1) {
      collection[card.name].evolved = true;
      reward.push(`${card.name} evolved!`);
    }
  }
  alert("Chest Opened:\n" + reward.join("\n"));
  renderChests();
  renderCards();
};

// --- Magic Items ---
function renderMagicItems() {
  magicDiv.innerHTML = `Magic Items: Chest Keys (${magicItems.chestKeys}), Boost Potions (${magicItems.boostPotions})`;
}
magicDiv.onclick = function() {
  if (magicItems.chestKeys > 0 && chests.length > 0) {
    magicItems.chestKeys--;
    openChestBtn.click();
    renderMagicItems();
  } else if (magicItems.boostPotions > 0) {
    magicItems.boostPotions--;
    let idx = Math.floor(Math.random() * CARD_DEFINITIONS.length);
    let card = CARD_DEFINITIONS[idx];
    collection[card.name].level++;
    alert(`${card.name} boosted to Level ${collection[card.name].level}!`);
    renderMagicItems();
    renderCards();
  }
};

// --- Timer ---
function startTimer() {
  timerInterval = setInterval(() => {
    if (gameOver) { clearInterval(timerInterval); return; }
    timer--;
    if (timer <= 0) {
      gameOver = true;
      matchInfo.innerText = crowns.player > crowns.ai ? "You Win (Timeout)!" : "You Lose (Timeout)!";
      clearInterval(timerInterval);
      rewardChest();
      updateTrophyRoad();
    }
  }, 1000);
}

// --- LocalStorage Save/Load ---
saveBtn.onclick = function() {
  localStorage.setItem("cr_collection", JSON.stringify(collection));
  localStorage.setItem("cr_trophies", trophies);
  localStorage.setItem("cr_magic", JSON.stringify(magicItems));
  localStorage.setItem("cr_chests", JSON.stringify(chests));
  alert("Progress saved!");
};
loadBtn.onclick = function() {
  let c = localStorage.getItem("cr_collection");
  let t = localStorage.getItem("cr_trophies");
  let m = localStorage.getItem("cr_magic");
  let ch = localStorage.getItem("cr_chests");
  if (c) collection = JSON.parse(c);
  if (t) trophies = parseInt(t);
  if (m) magicItems = JSON.parse(m);
  if (ch) chests = JSON.parse(ch);
  renderCards(); updateTrophyRoad(); renderChests(); renderMagicItems();
  alert("Progress loaded!");
};

// --- Startup ---
renderCards();
updateTrophyRoad();
renderChests();
renderMagicItems();
startTimer();
update();
