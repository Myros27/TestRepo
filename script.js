/*
 * Grid Battle Prototype
 *
 * This script implements a simplified version of the lane‑based auto‑battler described
 * in Requirements.md. It supports drag‑and‑drop placement of units during setup,
 * dynamic row count, a start battle button, basic unit AI for movement and
 * combat, and a simple win/lose check. Projectiles are represented visually
 * but travel in a straight line for simplicity. Healing, slowing and other
 * special behaviours are implemented where feasible.
 */

document.addEventListener('DOMContentLoaded', init);

const BOARD_COLS = 30;
let boardRows = 1;
let board = [];
let unitsDefs = {};
let units = {};
let unitCounter = 0;
let state = 'setup'; // 'setup', 'battle', 'ended'
let battleInterval = null;
let projectiles = [];

// Constants for tick simulation
const BASE_TICK_MS = 1; // 1 ms per tick
const LOOP_INTERVAL_MS = 10; // update loop runs every 10 ms (10 ticks)
const TICKS_PER_LOOP = LOOP_INTERVAL_MS / BASE_TICK_MS;

async function init() {
  await loadUnits();
  setupBoard();
  renderSelectionBars();
  attachDebugHandlers();
}

// Load unit definitions from the JSON file
async function loadUnits() {
  // Parse units definitions from the embedded JSON script tag. If parsing
  // fails for some reason (e.g. not present), fall back to empty data.
  const scriptTag = document.getElementById('units-data');
  if (scriptTag) {
    try {
      const data = JSON.parse(scriptTag.textContent);
      data.units.forEach(u => {
        unitsDefs[u.id] = u;
      });
    } catch (err) {
      console.error('Failed to parse unit definitions:', err);
    }
  }
}

// Initialize the board data structure and render it
function setupBoard() {
  board = [];
  for (let r = 0; r < boardRows; r++) {
    board[r] = new Array(BOARD_COLS).fill(null);
  }
  renderBoard();
}

// Render the grid and unit placement onto the DOM
function renderBoard() {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';
  boardDiv.style.gridTemplateColumns = `repeat(${BOARD_COLS}, 32px)`;
  boardDiv.style.gridTemplateRows = `repeat(${boardRows}, 40px)`;
  for (let r = 0; r < boardRows; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if (c < 10) {
        cell.classList.add('player-zone');
      } else if (c < 20) {
        cell.classList.add('neutral-zone');
      } else {
        cell.classList.add('opponent-zone');
      }
      cell.dataset.row = r;
      cell.dataset.col = c;
      // When dragging a unit over a cell, allow drop in setup
      cell.addEventListener('dragover', e => {
        if (state !== 'setup') return;
        e.preventDefault();
      });
      cell.addEventListener('drop', onCellDrop);
      const occupantId = board[r][c];
      if (occupantId) {
        const u = units[occupantId];
        const span = document.createElement('div');
        span.classList.add('unit-on-board');
        span.textContent = u.def.emoji;
        span.dataset.unitInstanceId = occupantId;
        span.draggable = true;
        span.addEventListener('dragstart', onBoardUnitDragStart);
        cell.appendChild(span);
      }
      boardDiv.appendChild(cell);
    }
  }
  // Remove any lingering projectiles
  document.querySelectorAll('.projectile').forEach(p => p.remove());
}

// Populate the player and opponent selection bars
function renderSelectionBars() {
  const playerBar = document.getElementById('player-units');
  const opponentBar = document.getElementById('opponent-units');
  playerBar.innerHTML = '';
  opponentBar.innerHTML = '';
  Object.values(unitsDefs).forEach(def => {
    // Player unit icon
    const elP = document.createElement('div');
    elP.classList.add('unit-icon');
    elP.textContent = def.emoji;
    elP.draggable = true;
    elP.dataset.unitId = def.id;
    elP.dataset.team = 'player';
    elP.addEventListener('dragstart', onUnitPaletteDragStart);
    playerBar.appendChild(elP);
    // Opponent unit icon
    const elO = document.createElement('div');
    elO.classList.add('unit-icon');
    elO.textContent = def.emoji;
    elO.draggable = true;
    elO.dataset.unitId = def.id;
    elO.dataset.team = 'opponent';
    elO.addEventListener('dragstart', onUnitPaletteDragStart);
    opponentBar.appendChild(elO);
  });
}

// Debug panel event bindings
function attachDebugHandlers() {
  document.getElementById('add-row').addEventListener('click', () => {
    if (state !== 'setup') return;
    if (boardRows < 7) {
      boardRows++;
      document.getElementById('row-count').textContent = boardRows;
      setupBoard();
    }
  });
  document.getElementById('remove-row').addEventListener('click', () => {
    if (state !== 'setup') return;
    if (boardRows > 1) {
      // Remove units from the last row before shrinking
      const lastRowIndex = boardRows - 1;
      for (let c = 0; c < BOARD_COLS; c++) {
        const uid = board[lastRowIndex][c];
        if (uid) {
          removeUnit(uid);
        }
      }
      boardRows--;
      document.getElementById('row-count').textContent = boardRows;
      setupBoard();
    }
  });
  document.getElementById('start-battle').addEventListener('click', startBattle);
  document.getElementById('restart-button').addEventListener('click', restartGame);
  // Trash bin handlers for removing units
  const trash = document.getElementById('trash-bin');
  trash.addEventListener('dragover', e => {
    if (state !== 'setup') return;
    e.preventDefault();
  });
  trash.addEventListener('drop', onTrashDrop);
}

/* Drag & Drop Handlers */

// Dragging a unit from the palette (selection bar)
function onUnitPaletteDragStart(e) {
  const unitId = e.target.dataset.unitId;
  const team = e.target.dataset.team;
  e.dataTransfer.setData('text/plain', JSON.stringify({ palette: true, unitId, team }));
}

// Dragging a unit from the board
function onBoardUnitDragStart(e) {
  const unitInstanceId = e.target.dataset.unitInstanceId;
  e.dataTransfer.setData('text/plain', JSON.stringify({ palette: false, unitInstanceId }));
}

// Dropping a dragged object onto a cell
function onCellDrop(e) {
  if (state !== 'setup') return;
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  const row = parseInt(e.currentTarget.dataset.row, 10);
  const col = parseInt(e.currentTarget.dataset.col, 10);
  // If dragging from palette
  if (data.palette) {
    placeNewUnit(data.unitId, data.team, row, col);
  } else {
    // moving unit on board not supported; ignore
  }
}

// Dropping onto the trash bin removes the unit instance
function onTrashDrop(e) {
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  if (!data.palette && data.unitInstanceId) {
    removeUnit(data.unitInstanceId);
    renderBoard();
  }
}

// Create a new unit instance and place it on the board
function placeNewUnit(unitId, team, row, col) {
  // Validate zone placement
  if (team === 'player' && col >= 10) return;
  if (team === 'opponent' && col < 20) return;
  // Ensure cell is empty
  if (board[row][col] !== null) return;
  unitCounter++;
  const instanceId = 'u' + unitCounter;
  const def = unitsDefs[unitId];
  // Deep clone the definition to avoid mutation
  const unitInstance = {
    id: instanceId,
    def: JSON.parse(JSON.stringify(def)),
    team: team,
    row: row,
    col: col,
    health: def.stats.health,
    speed: def.stats.speed,
    movement_ticks: def.stats.movement_ticks,
    moveCounter: 0,
    attackCounter: 0,
    specialCounter: 0,
    healValue: def.behavior && def.behavior.heal ? def.behavior.heal.initial_heal : null,
    slowed: false
  };
  // Direction: player moves right (+1), opponent moves left (-1)
  unitInstance.direction = team === 'player' ? 1 : -1;
  units[instanceId] = unitInstance;
  board[row][col] = instanceId;
  renderBoard();
}

// Remove a unit instance from the board and units map
function removeUnit(instanceId) {
  const unit = units[instanceId];
  if (!unit) return;
  // Clear from board
  if (board[unit.row] && board[unit.row][unit.col] === instanceId) {
    board[unit.row][unit.col] = null;
  }
  delete units[instanceId];
}

/* Battle logic */
function startBattle() {
  if (state !== 'setup') return;
  state = 'battle';
  // Disable dragging by removing draggable on palette units
  document.querySelectorAll('.unit-icon').forEach(el => el.draggable = false);
  document.getElementById('add-row').disabled = true;
  document.getElementById('remove-row').disabled = true;
  document.getElementById('start-battle').disabled = true;
  // Start the update loop
  battleInterval = setInterval(() => {
    updateBattle(TICKS_PER_LOOP);
  }, LOOP_INTERVAL_MS);
}

function restartGame() {
  // Reset state and clear everything
  clearInterval(battleInterval);
  battleInterval = null;
  state = 'setup';
  units = {};
  unitCounter = 0;
  projectiles = [];
  document.getElementById('message-overlay').classList.remove('active');
  document.getElementById('add-row').disabled = false;
  document.getElementById('remove-row').disabled = false;
  document.getElementById('start-battle').disabled = false;
  document.getElementById('row-count').textContent = boardRows;
  setupBoard();
  renderSelectionBars();
}

// Main battle update loop. Processes a number of ticks equal to 'ticks'
function updateBattle(ticks) {
  for (let i = 0; i < ticks; i++) {
    // Update all units
    processUnits();
    // Update projectiles
    processProjectiles();
    // Check victory condition
    if (checkVictory()) {
      endBattle();
      break;
    }
  }
}

// Process each unit's behaviour for one tick
function processUnits() {
  // Sort units to implement chain movement: for players, process rightmost first; for opponents, leftmost first
  const unitIds = Object.keys(units);
  unitIds.sort((a, b) => {
    const ua = units[a];
    const ub = units[b];
    // Sort by team then by position along direction
    if (ua.team === ub.team) {
      return ua.direction === 1 ? ub.col - ua.col : ua.col - ub.col;
    }
    // process players then opponents
    return ua.team === 'player' ? -1 : 1;
  });
  unitIds.forEach(id => {
    const unit = units[id];
    if (!unit) return;
    // Skip dead units
    if (unit.health <= 0) return;
    // Check if unit slowed due to archer logic resets
    unit.moveCounter++;
    unit.attackCounter++;
    if (unit.def.behavior && unit.def.behavior.heal) {
      unit.specialCounter++;
    }
    // Determine attack or heal or movement
    // Healing (Supporter)
    if (unit.def.behavior && unit.def.behavior.heal) {
      const healInfo = unit.def.behavior.heal;
      if (unit.specialCounter >= healInfo.frequency_ticks && unit.healValue > 0) {
        // Find potential allies within range that are missing health
        const candidates = [];
        Object.values(units).forEach(other => {
          if (other.team === unit.team && other.id !== unit.id && other.health > 0 && other.health < other.def.stats.health) {
            const dist = Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
            if (dist <= healInfo.range_manhattan) {
              candidates.push(other);
            }
          }
        });
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          target.health = Math.min(target.health + unit.healValue, target.def.stats.health);
          unit.healValue = Math.max(0, unit.healValue - 1);
          unit.specialCounter = 0;
        }
      }
    }
    // Determine melee or ranged attack
    const attackDef = unit.def.attack;
    // Check for enemies in range
    let enemyInRange = null;
    let meleeAdjacent = false;
    // For melee, range is 1 (adjacent)
    if (attackDef.type === 'melee') {
      // Check four adjacent tiles for enemies
      const dirs = [ [0,1], [0,-1], [1,0], [-1,0] ];
      let minHealth = Infinity;
      dirs.forEach(d => {
        const rr = unit.row + d[0];
        const cc = unit.col + d[1];
        if (rr >= 0 && rr < boardRows && cc >= 0 && cc < BOARD_COLS) {
          const occ = board[rr][cc];
          if (occ) {
            const other = units[occ];
            if (other && other.team !== unit.team && other.health > 0) {
              meleeAdjacent = true;
              // melee priority: attack the lowest health enemy adjacent
              if (other.health < minHealth) {
                minHealth = other.health;
                enemyInRange = other;
              }
            }
          }
        }
      });
    } else if (attackDef.type === 'ranged') {
      // Range defined by Manhattan distance
      let possible = [];
      Object.values(units).forEach(other => {
        if (other.team !== unit.team && other.health > 0) {
          const dist = Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
          if (dist <= attackDef.range_manhattan) {
            possible.push(other);
          }
        }
      });
      if (possible.length > 0) {
        // Choose random enemy in range
        enemyInRange = possible[Math.floor(Math.random() * possible.length)];
      }
    }
    // Attack if ready
    if (enemyInRange && unit.attackCounter >= attackDef.frequency_ticks) {
      if (attackDef.type === 'melee') {
        // Compute damage, handle conditional rules
        let damage = attackDef.damage;
        if (attackDef.rules) {
          for (const rule of attackDef.rules) {
            if (rule.condition === 'default') {
              damage = rule.damage;
            } else {
              // Very simple condition parser: only supports target_speed comparison
              if (rule.condition.includes('target_speed')) {
                const parts = rule.condition.split(' ');
                const operator = parts[1];
                const value = parseFloat(parts[2]);
                const targetSpeed = enemyInRange.speed;
                let condMet = false;
                if (operator === '>') {
                  condMet = targetSpeed > value;
                } else if (operator === '>=') {
                  condMet = targetSpeed >= value;
                } else if (operator === '<') {
                  condMet = targetSpeed < value;
                } else if (operator === '<=') {
                  condMet = targetSpeed <= value;
                }
                if (condMet) {
                  damage = rule.damage;
                  break;
                }
              }
            }
          }
        }
        enemyInRange.health -= damage;
        if (enemyInRange.health <= 0) {
          removeUnit(enemyInRange.id);
        }
        unit.attackCounter = 0;
      } else if (attackDef.type === 'ranged') {
        // Fire a projectile
        launchProjectile(unit, enemyInRange);
        unit.attackCounter = 0;
      }
    }
    // Movement conditions
    let canMove = true;
    // Don't move if adjacent to an enemy (melee units) or if special stop logic
    if (attackDef.type === 'melee' && meleeAdjacent) {
      canMove = false;
    }
    if (unit.def.behavior) {
      // Rogue stops moving if enemy within specified range
      if (unit.def.behavior.stop_on_enemy_within) {
        const maxDist = unit.def.behavior.stop_on_enemy_within;
        let nearEnemy = false;
        Object.values(units).forEach(other => {
          if (other.team !== unit.team && other.health > 0) {
            const dist = Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
            if (dist <= maxDist) {
              nearEnemy = true;
            }
          }
        });
        if (nearEnemy) canMove = false;
      }
      // Archer special: slow down when an enemy within range and stop within lane distance
      if (unit.def.behavior.slow_down) {
        const condRange = unit.def.behavior.slow_down.condition_range_manhattan;
        let within = false;
        Object.values(units).forEach(other => {
          if (other.team !== unit.team && other.health > 0) {
            const dist = Math.abs(other.row - unit.row) + Math.abs(other.col - unit.col);
            if (dist <= condRange) within = true;
          }
        });
        if (within) {
          if (!unit.slowed) {
            unit.slowed = true;
            unit.movement_ticks = unit.def.behavior.slow_down.new_movement_ticks;
            unit.speed = unit.def.behavior.slow_down.new_speed;
          }
        } else {
          if (unit.slowed) {
            // restore
            unit.slowed = false;
            unit.movement_ticks = unit.def.stats.movement_ticks;
            unit.speed = unit.def.stats.speed;
          }
        }
      }
      if (unit.def.behavior.stop_on_enemy_in_lane !== undefined) {
        const distLane = unit.def.behavior.stop_on_enemy_in_lane;
        let stop = false;
        Object.values(units).forEach(other => {
          if (other.team !== unit.team && other.health > 0 && other.row === unit.row) {
            // same lane
            const d = Math.abs(other.col - unit.col);
            if (d <= distLane) stop = true;
          }
        });
        if (stop) canMove = false;
      }
    }
    // Attempt movement if allowed
    if (canMove && unit.moveCounter >= unit.movement_ticks) {
      const newRow = unit.row;
      const newCol = unit.col + unit.direction;
      if (newCol >= 0 && newCol < BOARD_COLS) {
        // Check occupancy
        if (board[newRow][newCol] === null) {
          // Move
          board[unit.row][unit.col] = null;
          unit.col = newCol;
          board[newRow][newCol] = unit.id;
        }
      }
      unit.moveCounter = 0;
    }
  });
  // Re-render board visuals at regular intervals (every 20 loops) to reduce DOM thrashing
  if (window.renderCounter === undefined) {
    window.renderCounter = 0;
  }
  window.renderCounter++;
  if (window.renderCounter >= 5) {
    renderBoard();
    window.renderCounter = 0;
  }
}

// Create and track a projectile object for ranged attacks
function launchProjectile(attacker, target) {
  const projectile = {
    id: 'p' + Date.now() + Math.random(),
    attacker: attacker,
    target: target,
    progress: 0,
    // compute total ticks needed: Manhattan distance * projectile_speed (ticks per tile)
    totalTicks: Math.abs(attacker.row - target.row) + Math.abs(attacker.col - target.col),
    damage: attacker.def.attack.damage
  };
  projectile.totalTicks *= attacker.def.attack.projectile_speed || 50;
  projectiles.push(projectile);
  // Render projectile element
  const projElem = document.createElement('div');
  projElem.classList.add('projectile');
  // Use a simple arrow emoji to represent projectile
  projElem.textContent = attacker.team === 'player' ? '➜' : '⬅';
  projElem.dataset.projectileId = projectile.id;
  document.getElementById('board').appendChild(projElem);
  projectile.element = projElem;
  // Position initial at attacker cell
  positionProjectile(projectile, 0);
}

// Update projectile positions and handle arrival
function processProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    // Advance progress
    proj.progress++;
    if (proj.progress >= proj.totalTicks) {
      // Projectile arrives at target tile
      // Determine if target still alive and on tile
      if (proj.target.health > 0 && board[proj.target.row][proj.target.col] === proj.target.id) {
        proj.target.health -= proj.damage;
        if (proj.target.health <= 0) {
          removeUnit(proj.target.id);
        }
      }
      // Remove projectile
      if (proj.element && proj.element.parentNode) {
        proj.element.parentNode.removeChild(proj.element);
      }
      projectiles.splice(i, 1);
      continue;
    }
    // Update visual position
    positionProjectile(proj, proj.progress / proj.totalTicks);
  }
}

// Set CSS position of projectile based on progress ratio (0..1)
function positionProjectile(projectile, ratio) {
  const boardDiv = document.getElementById('board');
  const cellWidth = 32;
  const cellHeight = 40;
  const startX = projectile.attacker.col * cellWidth + cellWidth / 2;
  const startY = projectile.attacker.row * cellHeight + cellHeight / 2;
  const endX = projectile.target.col * cellWidth + cellWidth / 2;
  const endY = projectile.target.row * cellHeight + cellHeight / 2;
  // Linear interpolation for x and y; add slight upward arc (parabola) for aesthetics
  const midX = startX + (endX - startX) * ratio;
  const midY = startY + (endY - startY) * ratio - 20 * Math.sin(Math.PI * ratio);
  projectile.element.style.transform = `translate(${midX - 10}px, ${midY - 10}px)`;
}

// Check for victory/defeat and return true if battle should end
function checkVictory() {
  let playerAlive = false;
  let opponentAlive = false;
  Object.values(units).forEach(u => {
    if (u.health > 0) {
      if (u.team === 'player') playerAlive = true;
      else if (u.team === 'opponent') opponentAlive = true;
    }
  });
  if (!playerAlive || !opponentAlive) {
    return true;
  }
  return false;
}

// When a side wins, show a message and stop the battle loop
function endBattle() {
  clearInterval(battleInterval);
  battleInterval = null;
  state = 'ended';
  const playerAlive = Object.values(units).some(u => u.team === 'player' && u.health > 0);
  const message = playerAlive ? 'Victory!' : 'Defeat';
  document.getElementById('message-content').textContent = message;
  document.getElementById('message-overlay').classList.add('active');
}