# 🏔️ Sisyphus Engine: The Manual

**Welcome to the deep end.** This document outlines every mechanic, formula, and system within the Sisyphus Engine.

---

## 📋 Table of Contents

1. [The Panopticon (HUD)](#1-the-panopticon-hud)
2. [Core Gameplay Loop](#2-core-gameplay-loop)
3. [New Features (v2.5)](#3-new-features-v25)
4. [DLC 1: Daily Missions & Scraps](#4-dlc-1-daily-missions--scraps)
5. [DLC 2: Combat Librarian (Research)](#5-dlc-2-combat-librarian-research)
6. [DLC 3: Meditation & Recovery](#6-dlc-3-meditation--recovery)
7. [DLC 4: Quest Chains](#7-dlc-4-quest-chains)
8. [DLC 5: Context Filters](#8-dlc-5-context-filters)
9. [DLC 6: Analytics & Endgame](#9-dlc-6-analytics--endgame)
10. [Boss System](#10-boss-system)
11. [Achievement System](#11-achievement-system)
12. [Folder Structure](#12-folder-structure)
13. [Advanced Mechanics](#13-advanced-mechanics)

---

## <a id="1-the-panopticon-hud"></a>1. The Panopticon (HUD)

The **Panopticon** is your persistent Heads-Up Display in the right sidebar.

### **Vitals Grid**
* **HP:** Health Points. 0 = Permadeath. Turns red when critical (<30 HP).
* **Gold:** Currency. **Negative Gold (Debt) doubles all incoming damage**.
* **Level:** Current progression level. Unlocks Boss fights at 10, 20, 30, 50.
* **Rival Dmg:** Current punishment value. Scales with Level (+1 per failed quest).

### **Status Sirens**
* **🔒 LOCKDOWN ACTIVE:** Triggered when you take >50 damage in one session.
* **⚠️ DEBT CRISIS:** Pulsing red alert when Gold < 0.
* **🛡️ REST DAY ACTIVE:** Green alert showing immunity to damage.
* **🧪 ACTIVE EFFECTS:** Tracks duration of potions/buffs (e.g., "Focus Potion: 45m left").

---

## <a id="2-core-gameplay-loop"></a>2. Core Gameplay Loop

### **Quest Difficulty Table**

| Difficulty | Label | XP Reward | Gold Reward | Description |
|:---|:---|:---|:---|:---|
| **1** | Trivial | 5% of XP Req | 10g | Low risk, low reward |
| **2** | Easy | 10% of XP Req | 20g | Light tasks |
| **3** | Medium | 20% of XP Req | 40g | Standard difficulty |
| **4** | Hard | 40% of XP Req | 80g | Challenging work |
| **5** | SUICIDE | 60% of XP Req | 150g | Maximum risk |
| **Boss** | ☠️ BOSS | 1000 XP | 1000g | Special milestone quests |

### **Daily Modifiers (Chaos)**
Every day at login, one modifier is rolled:

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

## <a id="3-new-features-v25"></a>3. New Features (v2.5)

* **Hyper-Stable Rendering:** Double-buffered UI eliminates scroll jumping.
* **Safe Archiving:** Auto-renames duplicate files in Archive to prevent errors.
* **Live Word Count:** Research quests update word counts in real-time.
* **Template Manager:** Native UI for creating and managing quest templates.

---

## <a id="4-dlc-1-daily-missions--scraps"></a>4. DLC 1: Daily Missions & Scraps

3 random objectives assigned daily. **Reward:** +50 Gold for completing all three.

<details>
<summary><strong>View Mission Pool</strong> (Click to Expand)</summary>

| Mission | Description | Target | Reward |
|:---|:---|:---|:---|
| ☀️ Morning Win | Complete 1 Trivial quest before 10 AM | 1 | +15g |
| 🔥 Momentum | Complete 3 quests today | 3 | +20 XP |
| 🧘 Zero Inbox | Process all files in 'Scraps' folder | 1 | +10g |
| 🎯 Specialist | Use the same skill 3 times | 3 | +15 XP |
| 💪 High Stakes | Complete 1 High Stakes quest | 1 | +30g |
| ⚡ Speed Demon | Complete quest within 2h of creation | 1 | +25 XP |
| 🔗 Synergist | Complete quest with Primary + Secondary skill | 1 | +10g |
| 🛡️ Survivor | Don't take any damage today | 1 | +20g |

</details>

---

## <a id="5-dlc-2-combat-librarian-research"></a>5. DLC 2: Combat Librarian (Research)

**The Rule:** You must complete **2 Combat Quests** to earn the right to create **1 Research Quest**.

* **Survey:** 200 words.
* **Deep Dive:** 400 words.
* **Live Tracking:** Writing in the file updates the progress bar in the HUD instantly.

---

## <a id="6-dlc-3-meditation--recovery"></a>6. DLC 3: Meditation & Recovery

### **Lockdown**
Taking >50 Damage in one day triggers **Lockdown** (6 hours). You cannot deploy new quests.

### **Meditation**
* **Command:** `Meditation: Start`
* **Mechanic:** Plays 432Hz tone. 30s cooldown.
* **Effect:** 10 cycles reduces lockdown by 5 hours.

### **Deletion Quota**
* 3 Free deletions per day.
* 4th deletion costs 10 Gold.

---

## <a id="7-dlc-4-quest-chains"></a>7. DLC 4: Quest Chains

Link quests together for **+100 XP Bonus**.
* Quests must be done in order.
* Next quest is "Locked" until previous is done.
* Breaking a chain forfeits the bonus.

---

## <a id="8-dlc-5-context-filters"></a>8. DLC 5: Context Filters

Filter your view by:
* **Energy:** High, Medium, Low.
* **Context:** Home, Office, Anywhere.
* **Tags:** Custom hashtags.

---

## <a id="9-dlc-6-analytics--endgame"></a>9. DLC 6: Analytics & Endgame

* **Heatmap:** 28-day visual contribution grid.
* **Activity Line:** 7-day productivity trend.
* **JSON Export:** Backup your entire run history via command palette.

---

## <a id="10-boss-system"></a>10. Boss System

Bosses spawn at specific levels. They have massive HP pools and punish failure severely.

<details>
<summary><strong>View Boss Data</strong> (Click to Expand)</summary>

| Level | Name | HP | Penalty | Description |
|:---|:---|:---|:---|:---|
| 10 | The Gatekeeper | 300 | 20 HP | The first major filter. |
| 20 | The Shadow Self | 500 | 30 HP | Your bad habits manifest. |
| 30 | The Mountain | 700 | 40 HP | The peak is visible. |
| 50 | Sisyphus Prime | 1100 | 99 HP | One must imagine Sisyphus happy. |

</details>

---

## <a id="11-achievement-system"></a>11. Achievement System

* **First Blood:** Complete 1 quest.
* **Week Warrior:** 7-day streak.
* **Capitalist:** Hold 500 gold.
* **Giant Slayer:** Defeat any Boss.
* **Immortal:** Reach Level 20 with 0 deaths.

---

## <a id="12-folder-structure"></a>12. Folder Structure

Sisyphus auto-generates this structure.
```
Vault/
├── Active_Run/
│   ├── Quests/               # Active combat quests
│   ├── Research/             # Active research files (v2.0)
│   ├── Archive/              # Completed quests
│   └── Neural_Hub.canvas     # Skill graph visualization
├── Scraps/                   # Quick capture inbox
│   └── [timestamp].md        # Individual scraps
├── Graveyard/
│   ├── Failures/             # Failed quests
│   │   └── [FAILED] quest.md
│   └── Deaths/               # Death archives
│       └── 2026-01-23-1430/  # Timestamp folders
│           └── quest.md
└── .obsidian/
    └── plugins/
        └── sisyphus-engine/
            ├── main.js
            ├── styles.css
            └── manifest.json
		    └── src/
		         ├── achievements.ts
				 ├── engines/
				        ├── AnalyticsEngine.ts
				        ├── ChainsEngine.ts
				        ├── FiltersEngine.ts
				        ├── MeditationEngine.ts
				        └── ResearchEngine.ts
				 ├── engine.ts
				 ├── main.ts
				 ├── settings.ts
				 ├── types.ts
				 ├── ui/
				 │   ├── card.ts
				 │   ├── charts.ts
				 │   ├── modals.ts
				 │   └── view.ts
				 └── utils.ts
```

## <a id="13-advanced-mechanics"></a>13. Advanced Mechanics

### **The Debt Crisis**
* **Trigger:** Gold < 0.
* **Effect:** All incoming damage is **doubled**.
* **Visual:** HUD pulses red.

### **Skill Rust**
* **Trigger:** Skill unused for 3 days.
* **Effect:** XP Requirement +10% per rust stack.
* **Cure:** Use the skill or buy "Rest Day".

### **Neural Hub**
Generates an Obsidian Canvas (`Active_Run/Neural_Hub.canvas`) visualizing your skills and their "Synergy" connections.
* **Green:** Active
* **Red:** Rusty
* **Lines:** Connections formed by using Secondary Skills.