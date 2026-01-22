# 🏔️ Sisyphus Engine for Obsidian

> **"One must imagine Sisyphus happy. But Sisyphus must also get to work."**

![Version](https://img.shields.io/badge/version-2.0.0-blueviolet?style=for-the-badge) ![Platform](https://img.shields.io/badge/platform-Obsidian-black?style=for-the-badge) ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Sisyphus Engine** is a high-stakes gamification OS for Obsidian. It replaces your todo list with a roguelike RPG system where productivity dictates survival. 

**Core Rule:** If your HP hits 0, the run ends. Your level, gold, and progress are wiped. You keep only your "Scars."

---

## 📋 Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [The Panopticon (HUD)](#2-the-panopticon-hud)
3. [Core Gameplay Loop](#3-core-gameplay-loop)
4. [New Features (v2.0)](#4-new-features-v20)
5. [DLC 1: Daily Missions & Scraps](#5-dlc-1-daily-missions--scraps)
6. [DLC 2: Combat Librarian (Research)](#6-dlc-2-combat-librarian-research)
7. [DLC 3: Meditation & Recovery](#7-dlc-3-meditation--recovery)
8. [DLC 4: Quest Chains](#8-dlc-4-quest-chains)
9. [DLC 5: Neural Hub (Skill Graph)](#9-dlc-5-neural-hub-skill-graph)
10. [DLC 6: Analytics & Endgame](#10-dlc-6-analytics--endgame)
11. [Full Command Reference](#11-full-command-reference)

---

## <a id="1-installation--setup"></a>1. Installation & Setup

### **Prerequisites**
* Obsidian v1.0.0 or higher.
* **Recommendation:** Use a fresh vault or a dedicated folder for your first run.

### **Manual Installation**
Since Sisyphus is an engine, it requires manual placement of the compiled files.

1.  **Locate your Plugin Folder:**
    * **Windows:** `\Path\To\Vault\.obsidian\plugins\sisyphus-engine\`
    * **Mac:** `~/Library/Application Support/obsidian/Vault/.obsidian/plugins/sisyphus-engine/`
    * **Linux:** `~/.config/obsidian/Vault/.obsidian/plugins/sisyphus-engine/`
2.  **Deploy Files:** Place `main.js`, `styles.css`, and `manifest.json` into this folder.
3.  **Activate:** Open Obsidian Settings > Community Plugins > Enable **Sisyphus Engine**.
4.  **Initialize:** Press `Ctrl/Cmd + P` and run `Sisyphus: Open Panopticon`.

---

## <a id="2-the-panopticon-hud"></a>2. The Panopticon (HUD)

The **Panopticon** is your persistent Heads-Up Display in the right sidebar. It monitors active threats and vitals.

* **Vitals Grid:**
    * **HP:** Health Points. 0 = Permadeath.
    * **Gold:** Currency. **Negative Gold (Debt) doubles all incoming damage.**
    * **Rival Dmg:** Current punishment value. Scales with Level.
* **Status Sirens (v2.0):**
    * **LOCKDOWN:** Active if you take >50 damage in one session.
    * **DEBT CRISIS:** Pulsing red alert when Gold < 0.
* **The Oracle:** An algorithmic prediction of your survival (in days).
* **Quick Capture:** Input field at the bottom.
    * *Syntax:* `Task Name /1` (Difficulty 1) through `Task Name /5` (Difficulty 5).

---

## <a id="3-core-gameplay-loop"></a>3. Core Gameplay Loop

You do not simply "add tasks." You **Deploy Quests**.

* **Deploying:** Quests have Difficulty (1-5) and Priority.
    * **Difficulty 1 (Trivial):** Low Risk, Low Reward.
    * **Difficulty 5 (SUICIDE):** High Risk, Massive Reward.
    * **High Stakes:** Doubles Gold reward but also doubles Damage on failure.
* **Execution:** Completion grants XP and Gold. Failure deals Damage (`Rival Dmg`).
* **Leveling:** Leveling up heals you but **increases Rival Damage**. The game gets harder the longer you survive.

### **Chaos & Entropy**
Every day, the Engine rolls a **Daily Modifier**:

| Modifier | Effect | Icon |
| :--- | :--- | :--- |
| **Clear Skies** | No effects. | ☀️ |
| **Flow State** | +50% XP gain. | 🌊 |
| **Windfall** | +50% Gold gain. | 💰 |
| **Inflation** | Shop prices 2x. | 📈 |
| **Brain Fog** | XP gain halved (0.5x). | 🌫️ |
| **Rival Sabotage** | Gold gain halved (0.5x). | 🕵️ |
| **Adrenaline** | 2x XP, but -5 HP per quest completed. | 💉 |

---

## <a id="4-new-features-v20"></a>4. New Features (v2.0)

* **Performance:** The engine now uses **Debounced Typing**, allowing for lag-free writing in large vaults.
* **Mobile Optimized:** The HUD now creates a responsive single-column layout on phones.
* **Real Research Files:** Research quests now generate actual Markdown files in `Active_Run/Research/`.
* **Boss Rituals:** Boss spawns now feature a heartbeat audio cue and a 3-second delay for dramatic effect.
* **Victory Screen:** Reaching Level 50 now triggers an Ascension Modal with lifetime stats.

---

## <a id="5-dlc-1-daily-missions--scraps"></a>5. DLC 1: Daily Missions & Scraps

3 random objectives are assigned daily.

**The "Zero Inbox" Loop:**
One possible mission is **Zero Inbox**. To complete it, you must process your "Scraps".

1.  **Capture:** Use `Ctrl/Cmd + P` -> `Quick Capture (Scrap)` to dump thoughts instantly into the `Scraps/` folder.
2.  **Process:** Clean out the `Scraps/` folder (delete or move files).
3.  **Reward:** The mission marks itself complete once the folder is empty.

---

## <a id="6-dlc-2-combat-librarian-research"></a>6. DLC 2: Combat Librarian (Research)

The Engine prevents you from writing unless you have "earned" it.

* **The Ratio:** You must complete **2 Combat Quests** (standard tasks) to unlock **1 Research Quest** (writing/study). *Note: The first research quest of a run is free.*
* **Word Count Jail:**
    * **Survey:** Target 200 words.
    * **Deep Dive:** Target 400 words.
* **Validation:**
    * **< 80%:** Cannot complete. (Too short).
    * **> 125%:** **Gold Tax applied.** (You are rambling).

---

## <a id="7-dlc-3-meditation--recovery"></a>7. DLC 3: Meditation & Recovery

* **Lockdown:** If you take >50 Damage in a single day, the system triggers LOCKDOWN.
    * *Effect:* You cannot deploy new quests for 6 hours.
* **Active Recovery:** You can reduce lockdown time by performing **Meditation**.
    * *Command:* `Meditation: Start`.
    * *Mechanic:* Triggers a 432Hz audio tone. You must wait 30 seconds between cycles. Completing 10 cycles reduces lockdown by 5 hours.
* **Deletion Quota:** You have **3 Free Deletions** per day. The 4th deletion costs Gold.

---

## <a id="8-dlc-4-quest-chains"></a>8. DLC 4: Quest Chains

Create linear dependencies between tasks.

* **Builder:** Select multiple active quests to link them.
* **Locking:** You cannot complete step 2 before step 1.
* **Momentum:** Completing a full chain grants a massive XP bonus.

---

## <a id="9-dlc-5-neural-hub-skill-graph"></a>9. DLC 5: Neural Hub (Skill Graph)

Sisyphus tracks your skills (e.g., "Coding", "Writing") and visualizes them as a brain.

* **Visual Graph:** Run `Neural Hub: Generate Skill Graph` to create a `.canvas` file showing your skills as nodes in a neural network.
* **Synergy:** Completing a quest with a Secondary Skill draws a permanent connection line between the two skills on the graph.
* **Rust:** If a skill is not used for **3 days**, it turns **RED** on the graph. Use it to polish it.

---

## <a id="10-dlc-6-analytics--endgame"></a>10. DLC 6: Analytics & Endgame

* **Reports:** Generate Weekly Reports to see success rates, gold earned, and top skills.
* **Boss Milestones:** At Levels 10, 20, 30, 40, and 50, special Boss Quests appear automatically.
* **Win Condition:** Defeating the Level 50 Boss ("Sisyphus Prime") triggers the Victory Modal and logs the run in your Legacy history.

---

## <a id="11-full-command-reference"></a>11. Full Command Reference

Access these via the Command Palette (`Ctrl/Cmd + P`).

### **HUD & System**
| Command | Description |
| :--- | :--- |
| `Open Panopticon (Sidebar)` | Opens the main dashboard. |
| `Toggle Focus Noise` | Turns Brown Noise audio On/Off. |
| `ACCEPT DEATH` | **HARD RESET.** Wipes save data. Resets Lvl to 1. |
| `Reroll Chaos` | Debug: Forces a new Daily Modifier roll. |
| `Quick Capture (Scrap)` | Instantly create a note in the `Scraps/` folder. |

### **Quest Management**
| Command | Description |
| :--- | :--- |
| `Research: Create Research Quest` | Start a writing task (Requires Combat Tokens). |
| `Research: View Research Library` | Manage active/completed research drafts. |
| `Chains: Create Quest Chain` | Open Builder to link active quests. |
| `Chains: View Active Chain` | Check progress of current chain. |

### **Recovery & Filters**
| Command | Description |
| :--- | :--- |
| `Meditation: Start` | Begin 432Hz recovery cycle (Lockdown only). |
| `Recover (Lockdown)` | Check remaining Lockdown timer. |
| `Filters: Show High/Medium/Low Energy` | Filter the Quest list by energy tag. |
| `Filters: Clear All Filters` | Reset view to show all quests. |

### **Analytics & Skills**
| Command | Description |
| :--- | :--- |
| `Analytics: Generate Weekly Report` | Show summary of the week's performance. |
| `Analytics: View Game Stats` | View current Streak, Total Quests, etc. |
| `Endgame: Check Boss Milestones` | Force check for Boss Spawns. |
| `Neural Hub: Generate Skill Graph` | Create an Obsidian Canvas of your skill tree. |
