### **Complete Game Prototype Requirements (Version 2.0)**

#### **1. General Game Concepts**

This section defines the fundamental mechanics and terminology for the game.

*   **Tick:** The smallest discrete unit of time in the game. The game engine is required to run with a precision of **1000 Ticks per second**. All time-based actions, such as movement, attack speed, and ability cooldowns, are defined in Ticks.
*   **Speed:** An intuitive value representing a unit's movement capability. It is calculated from the time it takes a unit to cross one tile, using the formula: `Speed = 10000 / Ticks_per_Tile`. A higher Speed value signifies a faster unit.
    *   *Example 1:* A unit taking 250 Ticks to cross a tile has a Speed of `10000 / 250 = 40`.
    *   *Example 2:* A unit taking 1000 Ticks to cross a tile has a Speed of `10000 / 1000 = 10`.
*   **Tile:** A single square on the game board. By default, a tile can only be occupied by one unit at a time.
*   **Lane:** A horizontal row of tiles spanning the width of the game board.
*   **Adjacent:** Refers to the four tiles directly connected to a given tile (up, down, left, right). Diagonally connected tiles are not considered adjacent.
*   **Manhattan Distance:** The distance between two tiles, calculated as the sum of the absolute differences of their coordinates (`dx + dy`).
*   **Unit Collision & Chain Movement:** Units cannot move onto a tile that is already occupied by another unit (friendly or enemy). They must wait for the tile to become vacant.
    *   **Chain Movement Rule:** If a unit moves forward, vacating a tile, a friendly unit waiting directly behind it is permitted to move into that vacated tile within the very same tick. This rule applies to any number of units in a line, creating a fluid, snake-like "caterpillar effect."

---

#### **2. The Game Board**

*   **Grid Structure:** The game is played on a grid of **30 columns**. The number of rows is dynamic. It starts with **one row (30x1)**.
*   **Expansion:** The board can be expanded to a maximum size of **30 columns by 7 rows**.
*   **Prototype Controls:** A **Debug Panel** must be implemented for testing. This panel will include `"+"` and `"-"` buttons that allow a tester to dynamically increase or decrease the number of rows on the board during the setup phase.
*   **Placement Zones:** The columns of the board are divided into three distinct zones:
    *   **Player Zone:** Columns 1 through 10.
    *   **Neutral Zone:** Columns 11 through 20.
    *   **Opponent Zone:** Columns 21 through 30.

---

#### **3. Game Flow**

The game is structured into three distinct phases.

1.  **Phase 1: Preparation (Setup)**
    *   The game is paused.
    *   The player selects units from a selection bar and places them via drag-and-drop into their designated zone (columns 1-10).
    *   A "trash bin" area is provided, allowing the player to drag and drop units from the board to remove them before the battle starts.
    *   For the prototype, opponent units are also placed via drag-and-drop into their zone (columns 21-30).

2.  **Phase 2: Battle**
    *   The battle begins when the player clicks the **"Start Battle" button** located in the Debug Panel.
    *   All placed units become active and begin to act autonomously based on their individual rules.
    *   Player units move from left to right.
    *   Opponent units move from right to left.

3.  **Phase 3: End of Battle**
    *   **Victory Condition:** A side wins as soon as all units of the opposing team have been defeated.
    *   An appropriate victory or defeat message is displayed to the user.
    *   After the message is acknowledged, the game board is reset to its initial state for the next round (back to Phase 1).

---

#### **4. Visuals and User Experience (UX)**

*   **Unit Representation:** For the prototype, all units will be visually represented by **emojis**.
*   **Projectile Animation:** Ranged projectiles, such as the Archer's arrows, must be clearly visible. They must travel from the attacker to the target tile in a **parabolic (high arc) trajectory**.
*   **Projectile Hit Logic:** A projectile only damages a unit if that unit is on the designated target tile *at the moment the projectile arrives*. Units that the projectile flies over are not affected. If the target tile is empty upon arrival, the projectile has no effect.

---

#### **5. Unit Specifications**

**5.1. General Unit Rules**

*   **Death:** When a unit's Health (HP) reaches 0, it is immediately and permanently removed from the game board.
*   **Melee Target Priority:** If a melee unit is adjacent to multiple enemy units simultaneously, it will always prioritize attacking the enemy with the lowest current Health.

**5.2. Core Unit Details**

##### **Unit 1: Athlete (🏃)**
*   **Health:** 15 HP
*   **Speed:** **40** (1 tile per 250 Ticks)
*   **Movement:** Moves forward until an enemy is on an adjacent tile, then stops.
*   **Attack (Melee):**
    *   **Frequency:** 1 attack per 500 Ticks (2 attacks/sec).
    *   **Damage:** Damage is conditional on the target's speed:
        *   **5 Damage** against targets with Speed 20 or less.
        *   **2 Damage** against targets with Speed greater than 20.

##### **Unit 2: Archer (🏹)**
*   **Health:** 10 HP
*   **Speed:**
    *   **Standard:** **25** (1 tile per 400 Ticks).
    *   **Slowed:** **~7** (1 tile per 1500 Ticks) as long as an enemy is within a 5-tile Manhattan distance.
*   **Movement:** Stops moving completely if an enemy is in the same lane and within 4 tiles.
*   **Attack (Ranged):**
    *   **Condition:** Attacks when an enemy is within a 5-tile Manhattan distance.
    *   **Frequency:** 1 shot per 1200 Ticks (1 shot/1.2 sec).
    *   **Targeting:** Fires at the tile of a random enemy in range.
    *   **Damage:** 8 HP.
    *   **Projectile Speed:** **200** (travels 1 tile in 50 Ticks).

##### **Unit 3: Bouncer (🦍)**
*   **Health:** 28 HP
*   **Speed:** **10** (1 tile per 1000 Ticks)
*   **Movement:** Moves forward until an enemy is on an adjacent tile, then stops.
*   **Attack (Melee):**
    *   **Frequency:** 1 attack per 600 Ticks (~1.67 attacks/sec).
    *   **Damage:** 12 HP.

##### **Unit 4: Rogue (🔪)**
*   **Health:** 3 HP
*   **Speed:** **~29** (1 tile per 350 Ticks)
*   **Movement:** Stops moving if an enemy is in the same lane and within 2 tiles.
*   **Attack (Melee):**
    *   **Frequency:** 1 attack per 1600 Ticks (0.625 attacks/sec).
    *   **Damage:** 20 HP.

##### **Unit 5: Supporter (💉)**
*   **Health:** 5 HP
*   **Speed:** **~18** (1 tile per 550 Ticks)
*   **Attack (Melee):**
    *   **Frequency:** 1 attack per 100 Ticks (10 attacks/sec).
    *   **Damage:** 1 HP.
*   **Special Ability (Heal):**
    *   **Frequency:** Every 300 Ticks (~3.3 heals/sec).
    *   **Target:** Heals a random, allied unit (cannot target itself) that is not at full health, within a 2-tile Manhattan distance.
    *   **Healing Mechanic:** The amount of health restored degrades with each use. The first heal restores 10 HP, the second 9 HP, the third 8 HP, and so on, until it reaches 0. This degradation is permanent for the unit and does not reset between heals.

**5.3. New Unit Proposals**

1.  **Shield Bearer (🛡️)**
    *   **HP:** 50, **Speed:** 8
    *   **Attack:** 3 damage, every 1200 Ticks.
    *   **Ability (Passive):** Blocks the first ranged attack that targets it. Takes 50% reduced damage from adjacent enemies. **Weakness:** Very slow and low damage.

2.  **Alchemist (⚗️)**
    *   **HP:** 8, **Speed:** 20
    *   **Attack (Ranged):** Every 2000 Ticks, throws a potion onto a random tile occupied by an enemy within a 4-tile Manhattan distance.
    *   **Ability (Area of Effect):** The potion leaves an acid puddle on the target tile for 3 seconds (3000 Ticks). Any unit (friend or foe) standing on or entering the puddle takes 2 damage per second. **Weakness:** Can damage allied units.

3.  **Frost Mage (❄️)**
    *   **HP:** 12, **Speed:** 15
    *   **Attack (Ranged):** Every 1500 Ticks, fires a frostbolt at the nearest enemy (max range 6).
    *   **Ability (Slow):** The hit target takes 2 damage and its Speed is halved for 2 seconds. **Weakness:** Low direct damage.

4.  **Berserker (🪓)**
    *   **HP:** 10, **Speed:** 30
    *   **Attack:** 8 damage, every 800 Ticks.
    *   **Ability (Bloodlust):** Attack speed increases by 20% for each enemy it personally defeats (stacks). **Weakness:** Low health, starts weak.

5.  **Assassin (👤)**
    *   **HP:** 7, **Speed:** 35
    *   **Attack:** 15 damage, every 1800 Ticks.
    *   **Ability (Teleport):** At the start of the battle, teleports behind the first enemy unit in its lane (if space is available). Prioritizes targeting ranged units. **Weakness:** Very fragile.

6.  **Explosive Beetle (💣)**
    *   **HP:** 2, **Speed:** 50
    *   **Attack:** None.
    *   **Ability (Death Explosion):** Upon death, explodes, dealing 15 damage to all units (friend or foe) on all adjacent tiles. **Weakness:** One-time use, potential for friendly fire.

7.  **Paladin (✝️)**
    *   **HP:** 25, **Speed:** 12
    *   **Attack:** 5 damage, every 1000 Ticks.
    *   **Ability (Shield Bash):** Every third attack deals no damage but **stuns** the target for 1 second (1000 Ticks), preventing it from moving or attacking. **Weakness:** Low average damage output.

8.  **Javelin Thrower (🎯)**
    *   **HP:** 15, **Speed:** 22
    *   **Attack (Ranged):** Every 1400 Ticks, throws a javelin at the first enemy in its lane (max range 5).
    *   **Ability (Pierce):** The javelin travels through the first target, hitting a second unit directly behind it (if present) for 50% damage. **Strength:** Effective against lined-up units.

9.  **Necromancer (💀)**
    *   **HP:** 10, **Speed:** 10
    *   **Attack:** None.
    *   **Ability (Summon):** Every 4 seconds (4000 Ticks), summons a **Skeleton** (HP: 1, Speed: 20, Damage: 1) on a free adjacent tile. Can control a maximum of 3 skeletons at once. **Weakness:** Defenseless in melee.

10. **Bard (🎶)**
    *   **HP:** 8, **Speed:** 20
    *   **Attack:** None.
    *   **Ability (Aura of Inspiration):** Provides a passive **+5 Speed bonus** to all allied units within a 3-tile Manhattan distance. The bard does not stop to fight. **Weakness:** Cannot attack and must be protected.

---

#### **6. Technical Implementation**

**6.1. JSON Data Structure for Units**

Unit data must be stored in an external `units.json` file to allow for easy balancing and modification.

**Example `units.json` structure:**
```json
{
  "units": [
    {
      "id": "athlete",
      "name": "Athlete",
      "emoji": "🏃",
      "stats": {
        "health": 15,
        "speed": 40,
        "movement_ticks": 250
      },
      "attack": {
        "type": "melee",
        "frequency_ticks": 500,
        "rules": [
          {
            "condition": "target_speed > 20",
            "damage": 2
          },
          {
            "condition": "default",
            "damage": 5
          }
        ]
      },
      "behavior": {
        "stop_on_adjacent_enemy": true
      }
    },
    {
      "id": "archer",
      "name": "Archer",
      "emoji": "🏹",
      "stats": {
        "health": 10,
        "speed": 25,
        "movement_ticks": 400
      },
      "attack": {
        "type": "ranged",
        "frequency_ticks": 1200,
        "range_manhattan": 5,
        "damage": 8,
        "projectile_speed": 200
      },
      "behavior": {
        "slow_down": {
          "condition_range_manhattan": 5,
          "new_speed": 7,
          "new_movement_ticks": 1500
        },
        "stop_on_enemy_in_lane": 4
      }
    }
  ]
}
