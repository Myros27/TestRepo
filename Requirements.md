Of course! Here is the complete translation of the improved game requirements into English.

***

### **Improved Requirements for the Game Prototype (Version 2.0)**

#### **1. General Game Concepts**

To establish a common foundation, the following terms are defined:

*   **Tick:** The smallest unit of time in the game. The game engine runs with a precision of **1000 Ticks per second**. All in-game actions (movement, attacks, cooldowns) are defined in Ticks.
*   **Speed:** A new, more intuitive value for movement. It is calculated using the formula: `Speed = 10000 / Ticks per Tile`.
    *   *Example:* An Athlete who needs 250 Ticks to cross a tile has a speed of `10000 / 250 = 40`. A Bouncer (1000 Ticks) has a speed of `10000 / 1000 = 10`. **A higher Speed value means a faster unit.**
*   **Tile:** A single square on the game board that can be occupied by a maximum of one unit (exceptions will be specified).
*   **Lane:** A horizontal row of tiles on the game board.
*   **Adjacent:** Refers to the four directly connected tiles (top, bottom, left, right).
*   **Manhattan Distance:** The distance between two tiles, calculated as the sum of horizontal and vertical steps (dx + dy).
*   **Unit Collision:** Units block each other. A unit cannot enter a tile that is already occupied by another unit.
    *   **Chain Movement:** When a unit in front vacates a tile, the unit waiting directly behind it can move into the newly freed tile within the same tick. This also applies to longer chains of units, creating a "caterpillar effect."

#### **2. Visuals and User Experience (UX)**

*   **Unit Representation:** For the prototype, units will be represented by **emojis** to quickly and easily differentiate between types.
*   **Projectile Animation:** Arrows from the Archer (and other ranged projectiles) must be clearly visible. They should fly in a **parabolic (high) arc trajectory** from the shooter to the target tile.
*   **Hit Logic:** Projectiles only hit units that are on the **exact target tile at the moment of the projectile's arrival**. Units along the path are not hit.
*   **UI Elements:**
    *   A bar at the bottom of the screen will display available units for placement.
    *   A **"Trash Can" icon** will be visible to remove units from the board during the preparation phase.
    *   A **Debug Panel** will be maintained for testing purposes (Start Battle, +/- for lanes).

*(The remaining requirements for the Game Board and Game Flow from your original document remain unchanged, as they are already well-defined.)*

---

#### **3. Unit Specifications (Revised)**

**General Rules:**
*   **Death:** A unit whose health drops to 0 is immediately removed from the field.
*   **Melee Target Selection:** If multiple enemies are adjacent, the one with the lowest remaining health is prioritized.

##### **Unit 1: Athlete (🏃)**
*   **Health:** 15 HP
*   **Speed:** **40** (corresponds to 1 tile every 250 Ticks)
*   **Movement:** Stops when an enemy is on an adjacent tile.
*   **Attack (Melee):**
    *   **Frequency:** 2 attacks/second (every 500 Ticks)
    *   **Damage:**
        *   **5 damage** against targets with Speed 20 or less (e.g., Bouncer).
        *   **2 damage** against targets with Speed over 20 (e.g., Rogue).

##### **Unit 2: Archer (🏹)**
*   **Health:** 10 HP
*   **Speed:**
    *   **Standard:** **25** (1 tile every 400 Ticks)
    *   **Slowed:** **~7** (1 tile every 1500 Ticks) when an enemy is within a Manhattan distance ≤ 5.
*   **Movement:** Stops completely when an enemy is in the same lane within 4 tiles.
*   **Attack (Ranged):**
    *   **Condition:** Attacks a random enemy within a Manhattan distance ≤ 5.
    *   **Frequency:** 1 shot/1.2 seconds (every 1200 Ticks)
    *   **Damage:** 8 HP
    *   **Projectile Speed:** **200** (travels over 1 tile in 50 Ticks)

##### **Unit 3: Bouncer (🦍)**
*   **Health:** 28 HP
*   **Speed:** **10** (1 tile every 1000 Ticks)
*   **Movement:** Stops when an enemy is on an adjacent tile.
*   **Attack (Melee):**
    *   **Frequency:** ~1.67 attacks/second (every 600 Ticks)
    *   **Damage:** 12 HP

##### **Unit 4: Rogue (🔪)**
*   **Health:** 3 HP
*   **Speed:** **~29** (1 tile every 350 Ticks)
*   **Movement:** Stops when an enemy is in the same lane within 2 tiles.
*   **Attack (Melee):**
    *   **Frequency:** 0.625 attacks/second (every 1600 Ticks)
    *   **Damage:** 20 HP

##### **Unit 5: Supporter (💉)**
*   **Health:** 5 HP
*   **Speed:** **~18** (1 tile every 550 Ticks)
*   **Attack (Melee):**
    *   **Frequency:** 10 attacks/second (every 100 Ticks)
    *   **Damage:** 1 HP
*   **Special Ability (Heal):**
    *   **Frequency:** Every 300 Ticks (~3.3 heals/second)
    *   **Target:** A random, injured, allied unit (not itself) within a Manhattan distance ≤ 2.
    *   **Healing Power:** Starts at 10 HP and decreases by 1 with each heal (10, 9, 8, ...). Does not reset.

---

### **Proposals for 10 New Units**

Here are 10 proposals for new units with unique mechanics:

1.  **Shield Bearer (🛡️)**
    *   **HP:** 50, **Speed:** 8
    *   **Attack:** 3 damage, every 1200 Ticks
    *   **Ability (Passive):** Blocks the first ranged attack aimed at it. Takes 50% less damage from adjacent enemies. **Weakness:** Very slow and low damage output.

2.  **Alchemist (⚗️)**
    *   **HP:** 8, **Speed:** 20
    *   **Attack (Ranged):** Every 2000 Ticks, throws a potion onto a random tile occupied by an enemy within a 4-tile radius (Manhattan).
    *   **Ability (Area of Effect):** The potion leaves an acid puddle on the target tile for 3 seconds (3000 Ticks). All units (friend or foe) that enter or stand on the tile take 2 damage per second. **Weakness:** Can harm its own units.

3.  **Frost Mage (❄️)**
    *   **HP:** 12, **Speed:** 15
    *   **Attack (Ranged):** Every 1500 Ticks, shoots a frostbolt at the nearest enemy (max range 6).
    *   **Ability (Slow):** The target hit takes 2 damage, but its **Speed is halved for 2 seconds**. **Weakness:** Low direct damage.

4.  **Berserker (🪓)**
    *   **HP:** 10, **Speed:** 30
    *   **Attack:** 8 damage, every 800 Ticks
    *   **Ability (Bloodlust):** Increases its attack speed by 20% for each enemy it personally defeats (stacks). **Weakness:** Starts weak and has low health (glass cannon).

5.  **Assassin (👤)**
    *   **HP:** 7, **Speed:** 35
    *   **Attack:** 15 damage, every 1800 Ticks
    *   **Ability (Teleport):** At the start of the battle, the assassin jumps behind the first enemy unit in its lane (if there is space). Prioritizes ranged units as targets. **Weakness:** Very vulnerable if focused.

6.  **Explosive Beetle (💣)**
    *   **HP:** 2, **Speed:** 50
    *   **Attack:** None
    *   **Ability (Death Explosion):** When it dies, it explodes, dealing 15 damage to all units (friend or foe) on adjacent tiles. **Weakness:** One-time use, can damage its own team.

7.  **Paladin (✝️)**
    *   **HP:** 25, **Speed:** 12
    *   **Attack:** 5 damage, every 1000 Ticks
    *   **Ability (Shield Bash):** Every third attack is a shield bash that deals no damage but **stuns** the target for 1 second (1000 Ticks), preventing it from moving or attacking. **Weakness:** Low average damage.

8.  **Javelin Thrower (🎯)**
    *   **HP:** 15, **Speed:** 22
    *   **Attack (Ranged):** Every 1400 Ticks, throws a javelin at the first enemy in its lane (max range 5).
    *   **Ability (Pierce):** The javelin continues flying and also hits the unit directly behind the first target (if present) for 50% of the damage. **Strength:** Effective against lined-up enemies.

9.  **Necromancer (💀)**
    *   **HP:** 10, **Speed:** 10
    *   **Attack:** None
    *   **Ability (Summon):** Every 4 seconds (4000 Ticks), it summons a **Skeleton (HP: 1, Speed: 20, Damage: 1)** on an adjacent, free tile. Max of 3 skeletons at a time. **Weakness:** Completely defenseless in melee combat.

10. **Bard (🎶)**
    *   **HP:** 8, **Speed:** 20
    *   **Attack:** None
    *   **Ability (Aura of Inspiration):** All allied units within a 3-tile radius (Manhattan distance) receive a **+5 Speed bonus**. The bard just walks forward and does not stop to fight. **Weakness:** Cannot fight and must be protected.

---

### **Technical Implementation Proposals**

#### **1. JSON Structure for Units**

Unit definitions should be externalized into a `units.json` file so they can be easily modified without changing the code.

**Example `units.json`:**
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
```

#### **2. GitHub Actions Pipeline for Automated Testing**

To provide a testable version after every push, we can use **GitHub Actions** in combination with **GitHub Pages**. This is free for public repositories.

1.  **Your Project Structure:**
    *   `index.html`
    *   `style.css`
    *   `game.js` (your game code)
    *   `units.json`
    *   `package.json` (if you use a small web server for testing or a build tool)

2.  **Create the Workflow File:**
    In your project folder, create the path `.github/workflows/` and inside it, a file named `deploy.yml`.

**Example `deploy.yml`:**
```yaml
# Name of the workflow, displayed in the GitHub UI
name: Build and Deploy to GitHub Pages

# Trigger: This workflow runs on every push to the 'main' branch
on:
  push:
    branches:
      - main

# Permissions for the job to deploy to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Definition of the jobs to be executed
jobs:
  # Job ID
  deploy:
    # Environment for deployment to GitHub Pages
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    # Operating system the job will run on
    runs-on: ubuntu-latest
    steps:
      # Step 1: Check out the code from the repository
      - name: Checkout repository
        uses: actions/checkout@v4

      # Step 2: Set up the GitHub Pages artifact
      # This prepares all files (HTML, CSS, JS, JSON) for deployment
      - name: Setup Pages
        uses: actions/configure-pages@v5

      # Optional: If you have a build step (e.g., with Node.js/npm)
      # - name: Setup Node.js
      #   uses: actions/setup-node@v4
      #   with:
      #     node-version: '20'
      # - name: Install dependencies
      #   run: npm install
      # - name: Build project
      #   run: npm run build # This command must be defined in your package.json

      # Step 3: Upload the artifact to be deployed
      # The 'path' should point to the folder with your index.html
      # If you don't have a build step, it's the root directory '.'
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.' # Or e.g., './dist' if you use a build tool

      # Step 4: Deploy the artifact to GitHub Pages
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**How it works:**
1.  You push a change to your code (`git push`).
2.  GitHub recognizes the `deploy.yml` file and automatically starts an "Action".
3.  The Action checks out the code, packages all your game files, and uploads them to GitHub Pages.
4.  After a few moments, the latest version of your game is live at a URL like `https://YOUR-GITHUB-NAME.github.io/YOUR-PROJECT-NAME/` and you can test it directly.
