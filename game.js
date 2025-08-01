/*
 * Simple lane‑defense prototype.
 *
 * This script constructs a grid board, loads unit definitions from
 * units.json and allows players to place units on their side during a
 * preparation phase. When the battle is started the game runs a tick‑based
 * simulation where units move, attack and perform special abilities.
 */

(() => {
  const ROWS = 5;
  const COLS = 10;
  const TILE_SIZE = 60; // pixels
  // One tick corresponds to 1 ms of real time. For performance the main
  // loop groups ticks based on actual frame time.

  const boardEl = document.getElementById('board');
  const unitPickerEl = document.getElementById('unit-picker');
  const trashBtn = document.getElementById('trash');
  const startBattleBtn = document.getElementById('start-battle');

  // CSS variables to drive layout
  boardEl.style.setProperty('--rows', ROWS);
  boardEl.style.setProperty('--cols', COLS);
  boardEl.style.setProperty('--tile-size', `${TILE_SIZE}px`);

  // Internal state
  let unitsData = null; // loaded from JSON
  const playerUnits = []; // units placed by player
  const enemyUnits = []; // units controlled by AI
  const projectiles = [];
  let boardGrid = []; // 2D grid of occupancy references
  let placingUnitType = null;
  let placingTrash = false;
  let battleStarted = false;
  let lastTime = performance.now();

  // Helper: deep copy object
  const deepCopy = obj => JSON.parse(JSON.stringify(obj));

  // Unit class to encapsulate runtime properties
  class Unit {
    constructor(def, row, col, team) {
      this.def = def;
      this.id = `${def.id}-${Math.random().toString(36).slice(2)}`;
      this.row = row;
      this.col = col;
      this.team = team; // 'player' or 'enemy'
      this.dir = team === 'player' ? 1 : -1;
      this.maxHealth = def.stats.health;
      this.health = def.stats.health;
      this.speed = def.stats.speed;
      this.moveTicks = def.stats.movement_ticks;
      this.currentMoveTicks = def.stats.movement_ticks;
      this.moveCooldown = this.currentMoveTicks;
      this.attackCooldown = def.attack ? def.attack.frequency_ticks : Infinity;
      this.attackTimer = this.attackCooldown;
      this.healCooldown = def.behavior && def.behavior.heal ? def.behavior.heal.frequency_ticks : Infinity;
      this.healTimer = this.healCooldown;
      this.healPower = def.behavior && def.behavior.heal ? def.behavior.heal.initial_power : 0;
      this.el = null;
      // adjust for ranged units that slow down
      this.slowed = false;
    }
  }

  // Projectile class for ranged attacks
  class Projectile {
    constructor(startRow, startCol, targetRow, targetCol, totalTicks, damage, fromTeam) {
      this.startRow = startRow;
      this.startCol = startCol;
      this.targetRow = targetRow;
      this.targetCol = targetCol;
      this.totalTicks = totalTicks;
      this.elapsedTicks = 0;
      this.damage = damage;
      this.fromTeam = fromTeam;
      this.el = document.createElement('div');
      this.el.classList.add('projectile');
      boardEl.appendChild(this.el);
    }
  }

  // Create the visual grid
  function buildBoard() {
    boardGrid = [];
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      boardGrid[r] = [];
      for (let c = 0; c < COLS; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = r;
        tile.dataset.col = c;
        tile.addEventListener('click', () => onTileClick(r, c));
        boardEl.appendChild(tile);
        boardGrid[r][c] = null;
      }
    }
  }

  function onTileClick(row, col) {
    if (battleStarted) return;
    if (placingTrash) {
      // remove a player's unit if present
      const unit = boardGrid[row][col];
      if (unit && unit.team === 'player') {
        removeUnit(unit);
      }
      return;
    }
    if (!placingUnitType) return;
    // allow placement only on player's half (first 4 columns) and if tile is empty
    if (col >= Math.floor(COLS / 2)) return;
    if (boardGrid[row][col]) return;
    const def = unitsData.units.find(u => u.id === placingUnitType);
    const unit = new Unit(def, row, col, 'player');
    addUnit(unit);
  }

  function addUnit(unit) {
    (unit.team === 'player' ? playerUnits : enemyUnits).push(unit);
    boardGrid[unit.row][unit.col] = unit;
    // create element
    const tileEl = getTileElement(unit.row, unit.col);
    const span = document.createElement('span');
    span.textContent = unit.def.emoji;
    tileEl.appendChild(span);
    unit.el = span;
  }

  function removeUnit(unit) {
    // remove from array
    const arr = unit.team === 'player' ? playerUnits : enemyUnits;
    const idx = arr.findIndex(u => u.id === unit.id);
    if (idx >= 0) arr.splice(idx, 1);
    // remove from board
    boardGrid[unit.row][unit.col] = null;
    // remove element
    if (unit.el && unit.el.parentElement) {
      unit.el.parentElement.removeChild(unit.el);
    }
  }

  function getTileElement(row, col) {
    const index = row * COLS + col;
    return boardEl.children[index];
  }

  function buildUnitPicker() {
    unitsData.units.forEach(def => {
      const btn = document.createElement('button');
      btn.textContent = def.emoji;
      btn.title = def.name;
      btn.addEventListener('click', () => {
        placingTrash = false;
        placingUnitType = def.id;
        Array.from(unitPickerEl.children).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        trashBtn.classList.remove('selected');
      });
      unitPickerEl.appendChild(btn);
    });
    trashBtn.addEventListener('click', () => {
      placingTrash = true;
      placingUnitType = null;
      trashBtn.classList.add('selected');
      Array.from(unitPickerEl.children).forEach(b => b.classList.remove('selected'));
    });
  }

  function startBattle() {
    if (battleStarted) return;
    battleStarted = true;
    startBattleBtn.disabled = true;
    // spawn some enemy units for demonstration: one per lane
    for (let r = 0; r < ROWS; r++) {
      // choose a random enemy unit type: bouncer or rogue
      const enemyTypes = ['bouncer', 'rogue', 'athlete'];
      const typeId = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      const def = unitsData.units.find(u => u.id === typeId);
      const unit = new Unit(def, r, COLS - 1, 'enemy');
      addUnit(unit);
    }
    // start main loop
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function loop(time) {
    const dtMs = time - lastTime;
    lastTime = time;
    const dtTicks = dtMs; // 1 ms = 1 tick
    updateUnits(dtTicks);
    updateProjectiles(dtTicks);
    if (battleStarted) {
      requestAnimationFrame(loop);
    }
  }

  function updateUnits(dtTicks) {
    // update each unit's timers and perform actions
    const allUnits = [...playerUnits, ...enemyUnits];
    // sort units to avoid bias: players move from far end to near end and vice versa
    allUnits.sort((a, b) => {
      // For player units (dir=1) update from right to left; enemy from left to right
      if (a.team === 'player' && b.team === 'player') {
        return b.col - a.col;
      } else if (a.team === 'enemy' && b.team === 'enemy') {
        return a.col - b.col;
      } else {
        return 0;
      }
    });
    for (const unit of allUnits) {
      if (unit.health <= 0) continue;
      // Determine slowed state for archers
      if (unit.def.id === 'archer') {
        const nearestEnemyDist = nearestEnemyDistance(unit);
        if (nearestEnemyDist !== null && nearestEnemyDist <= unit.def.behavior.slow_down.condition_range_manhattan) {
          if (!unit.slowed) {
            unit.slowed = true;
            unit.currentMoveTicks = unit.def.behavior.slow_down.new_movement_ticks;
          }
        } else if (unit.slowed) {
          unit.slowed = false;
          unit.currentMoveTicks = unit.def.stats.movement_ticks;
        }
      }
      // Move
      unit.moveCooldown -= dtTicks;
      if (unit.moveCooldown <= 0) {
        const aheadRow = unit.row;
        const aheadCol = unit.col + unit.dir;
        let shouldMove = true;
        // check if should stop due to behavior
        if (unit.def.behavior) {
          if (unit.def.behavior.stop_on_adjacent_enemy && hasAdjacentEnemy(unit)) {
            shouldMove = false;
          }
          if (typeof unit.def.behavior.stop_on_enemy_in_lane !== 'undefined') {
            const range = unit.def.behavior.stop_on_enemy_in_lane;
            if (enemyInLaneWithin(unit, range)) shouldMove = false;
          }
        }
        if (shouldMove && aheadCol >= 0 && aheadCol < COLS) {
          if (!boardGrid[aheadRow][aheadCol]) {
            // move unit
            boardGrid[unit.row][unit.col] = null;
            unit.col = aheadCol;
            boardGrid[unit.row][unit.col] = unit;
            // update DOM element position by moving the span to new tile
            const newTile = getTileElement(unit.row, unit.col);
            newTile.appendChild(unit.el);
          }
        }
        unit.moveCooldown += unit.currentMoveTicks;
      }
      // Attack or heal
      if (unit.def.attack) {
        unit.attackTimer -= dtTicks;
        if (unit.attackTimer <= 0) {
          performAttack(unit);
          unit.attackTimer += unit.def.attack.frequency_ticks;
        }
      }
      if (unit.healPower > 0 && unit.def.behavior && unit.def.behavior.heal) {
        unit.healTimer -= dtTicks;
        if (unit.healTimer <= 0) {
          performHeal(unit);
          unit.healTimer += unit.def.behavior.heal.frequency_ticks;
        }
      }
    }
  }

  function updateProjectiles(dtTicks) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.elapsedTicks += dtTicks;
      const progress = Math.min(p.elapsedTicks / p.totalTicks, 1);
      // compute position in px
      const startX = p.startCol * (TILE_SIZE + 2) + TILE_SIZE / 2;
      const startY = p.startRow * (TILE_SIZE + 2) + TILE_SIZE / 2;
      const endX = p.targetCol * (TILE_SIZE + 2) + TILE_SIZE / 2;
      const endY = p.targetRow * (TILE_SIZE + 2) + TILE_SIZE / 2;
      const x = startX + (endX - startX) * progress;
      const y = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * 40; // parabolic arc
      p.el.style.transform = `translate(${x - 5}px, ${y - 5}px)`;
      if (progress >= 1) {
        // Arrived: apply damage if unit still on tile and of opposite team
        const targetUnit = boardGrid[p.targetRow][p.targetCol];
        if (targetUnit && targetUnit.team !== p.fromTeam) {
          applyDamage(targetUnit, p.damage);
        }
        // remove projectile
        p.el.remove();
        projectiles.splice(i, 1);
      }
    }
  }

  function nearestEnemyDistance(unit) {
    let minDist = null;
    const enemies = unit.team === 'player' ? enemyUnits : playerUnits;
    for (const e of enemies) {
      const dist = Math.abs(e.row - unit.row) + Math.abs(e.col - unit.col);
      if (minDist === null || dist < minDist) minDist = dist;
    }
    return minDist;
  }

  function enemyInLaneWithin(unit, range) {
    const enemies = unit.team === 'player' ? enemyUnits : playerUnits;
    return enemies.some(e => e.row === unit.row && Math.abs(e.col - unit.col) <= range);
  }

  function hasAdjacentEnemy(unit) {
    const enemies = unit.team === 'player' ? enemyUnits : playerUnits;
    return enemies.some(e => Math.abs(e.row - unit.row) + Math.abs(e.col - unit.col) === 1);
  }

  function performAttack(unit) {
    const attack = unit.def.attack;
    if (!attack) return;
    if (attack.type === 'melee') {
      // find adjacent enemy or within lane range
      const enemies = unit.team === 'player' ? enemyUnits : playerUnits;
      // filter adjacent
      const adjacent = enemies.filter(e => Math.abs(e.row - unit.row) + Math.abs(e.col - unit.col) === 1);
      if (adjacent.length === 0) return;
      // choose lowest health
      let target = adjacent[0];
      for (const e of adjacent) {
        if (e.health < target.health) target = e;
      }
      let dmg = attack.damage;
      // special case for athlete: damage depends on target speed
      if (unit.def.id === 'athlete') {
        const targetSpeed = eSpeed(target.def);
        if (targetSpeed > 20) dmg = 2; else dmg = 5;
      }
      applyDamage(target, dmg);
    } else if (attack.type === 'ranged') {
      // find targets within Manhattan distance
      const enemies = unit.team === 'player' ? enemyUnits : playerUnits;
      const targets = enemies.filter(e => Math.abs(e.row - unit.row) + Math.abs(e.col - unit.col) <= attack.range_manhattan);
      if (targets.length === 0) return;
      const target = targets[Math.floor(Math.random() * targets.length)];
      // Create projectile
      const dist = Math.abs(target.row - unit.row) + Math.abs(target.col - unit.col);
      const totalTicks = 50 * dist; // 1 tile per 50 ticks
      const p = new Projectile(unit.row, unit.col, target.row, target.col, totalTicks, attack.damage, unit.team);
      projectiles.push(p);
    }
  }

  function performHeal(unit) {
    // heal a random injured ally within range
    const behavior = unit.def.behavior.heal;
    const allies = unit.team === 'player' ? playerUnits : enemyUnits;
    const candidates = allies.filter(a => a !== unit && a.health < a.maxHealth && Math.abs(a.row - unit.row) + Math.abs(a.col - unit.col) <= behavior.range_manhattan);
    if (candidates.length === 0) return;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const healAmount = Math.max(0, unit.healPower);
    target.health = Math.min(target.maxHealth, target.health + healAmount);
    unit.healPower = Math.max(0, unit.healPower - 1);
    // show small visual effect by briefly changing background
    const tileEl = getTileElement(target.row, target.col);
    const originalColor = tileEl.style.backgroundColor;
    tileEl.style.backgroundColor = '#c8e6c9';
    setTimeout(() => {
      tileEl.style.backgroundColor = originalColor || '#fff';
    }, 200);
  }

  function applyDamage(unit, dmg) {
    unit.health -= dmg;
    if (unit.health <= 0) {
      removeUnit(unit);
    }
  }

  function eSpeed(def) {
    return def.stats.speed;
  }

  // Load units and initialize
  async function init() {
    // fetch units.json
    unitsData = await fetch('units.json').then(res => res.json());
    buildBoard();
    buildUnitPicker();
  }

  trashBtn.addEventListener('click', () => {
    // state toggled in buildUnitPicker; this ensures selection state visually resets
  });
  startBattleBtn.addEventListener('click', startBattle);

  init();
})();