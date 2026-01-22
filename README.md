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
9. [DLC 5: Context Filters](#9-dlc-5-context-filters)
10. [DLC 6: Analytics & Endgame](#10-dlc-6-analytics--endgame)
11. [Boss System](#11-boss-system)
12. [Achievement System](#12-achievement-system)
13. [Full Command Reference](#13-full-command-reference)
14. [Hotkeys & Quick Actions](#14-hotkeys--quick-actions)
15. [Advanced Mechanics](#15-advanced-mechanics)

---

## <a id="1-installation--setup"></a>1. Installation & Setup

### **Prerequisites**
* Obsidian v1.0.0 or higher.
* **Recommendation:** Use a fresh vault or a dedicated folder for your first run.

### **Manual Installation**
Since Sisyphus is an engine, it requires manual placement of the compiled files.

1. **Locate your Plugin Folder:**
   * **Windows:** `\Path\To\Vault\.obsidian\plugins\sisyphus-engine\`
   * **Mac:** `~/Library/Application Support/obsidian/Vault/.obsidian/plugins/sisyphus-engine/`
   * **Linux:** `~/.config/obsidian/Vault/.obsidian/plugins/sisyphus-engine/`
2. **Deploy Files:** Place `main.js`, `styles.css`, and `manifest.json` into this folder.
3. **Activate:** Open Obsidian Settings > Community Plugins > Enable **Sisyphus Engine**.
4. **Initialize:** Press `Ctrl/Cmd + P` and run `Sisyphus: Open Panopticon`.

---

## <a id="2-the-panopticon-hud"></a>2. The Panopticon (HUD)

The **Panopticon** is your persistent Heads-Up Display in the right sidebar. It monitors active threats and vitals.

### **HUD Components**

#### **Vitals Grid (2x2 Display)**
* **HP:** Health Points. 0 = Permadeath. Turns red when critical (<30 HP).
* **Gold:** Currency. **Negative Gold (Debt) doubles all incoming damage** and triggers visual alarms.
* **Level:** Current progression level. Unlocks Boss fights at 10, 20, 30, 50.
* **Rival Dmg:** Current punishment value. Scales with Level (+1 per failed quest).

#### **Status Sirens (v2.0)**
* **🔒 LOCKDOWN ACTIVE:** Triggered when you take >50 damage in one session. Shows countdown timer and meditation progress.
* **⚠️ DEBT CRISIS:** Pulsing red alert when Gold < 0. Reminds you all damage is doubled.
* **🛡️ REST DAY ACTIVE:** Green alert showing immunity to damage and rust prevention.

#### **The Oracle**
An algorithmic prediction system that calculates:
* **Survival Days:** How many days you can survive at current damage rate
* **Glitch Mode:** When HP < 30 or in Debt, Oracle may display corrupted messages like `[CORRUPTED]`, `??? DAYS LEFT`, or `NO FUTURE`
* **Scars Display:** Shows death count and legacy penalties
* **Next Milestone:** Displays upcoming Boss levels (10, 20, 30, 50)

#### **Sound Toggle (v2.0)**
* Click the 🔊/🔇 icon in header to mute/unmute all audio
* Persists across sessions
* Affects combat sounds, meditation tones, and brown noise

#### **Quick Capture**
Input field at the bottom of the HUD.
* **Syntax:** `Task Name /1` (Difficulty 1) through `Task Name /5` (Difficulty 5).
* **Default:** If no `/N` is specified, defaults to Difficulty 3 (Medium).
* Press **Enter** to instantly deploy the quest.

---

## <a id="3-core-gameplay-loop"></a>3. Core Gameplay Loop

You do not simply "add tasks." You **Deploy Quests**.

### **Quest Deployment**

Quests have **Difficulty (1-5)** and **Priority** levels:

| Difficulty | Label | XP Reward | Gold Reward | Description |
|:---|:---|:---|:---|:---|
| **1** | Trivial | 5% of XP Req | 10g | Low risk, low reward |
| **2** | Easy | 10% of XP Req | 20g | Light tasks |
| **3** | Medium | 20% of XP Req | 40g | Standard difficulty |
| **4** | Hard | 40% of XP Req | 80g | Challenging work |
| **5** | SUICIDE | 60% of XP Req | 150g | Maximum risk |
| **Boss** | ☠️ BOSS | 1000 XP | 1000g | Special milestone quests |

### **High Stakes Mode**
* Toggle when creating a quest
* **Effect:** +50% Gold reward, but **doubles damage on failure**
* Recommended for experienced players only

### **Quest Execution**
* **Completion:** Grants XP and Gold. May level up skills.
* **Failure:** Deals Damage equal to `10 + (Rival Dmg / 2)`. Increases Rival Dmg by 1.
* **Manual Abort:** Use `XX` button to manually fail a quest (bypasses shield/rest day protection).
* **Deadline Expiry:** Auto-fails quest when deadline passes.

### **Leveling System**
* Completing quests grants XP
* When XP ≥ XP Required:
  * Level increases by 1
  * XP Requirement increases by 10%
  * Max HP increases by 5
  * **HP fully restored to new Max HP**
  * Rival Damage increases (game gets harder)
* Check for Boss Milestones at Levels 10, 20, 30, 50

### **Chaos & Entropy**
Every day at login, the Engine rolls a **Daily Modifier**:

| Modifier | Effect | Icon |
| :--- | :--- | :--- |
| **Clear Skies** | No effects. | ☀️ |
| **Flow State** | +50% XP gain. | 🌊 |
| **Windfall** | +50% Gold gain. | 💰 |
| **Inflation** | Shop prices 2x. | 📈 |
| **Brain Fog** | XP gain halved (0.5x). | 🌫️ |
| **Rival Sabotage** | Gold gain halved (0.5x). | 🕵️ |
| **Adrenaline** | 2x XP, but -5 HP per quest completed. | 💉 |

The modifier persists for the entire day and affects all quest rewards.

---

## <a id="4-new-features-v20"></a>4. New Features (v2.0)

### **Performance Improvements**
* **Debounced Typing:** Research quest word counters now use 1-second debounce, eliminating lag when writing in large vaults
* **Mobile Optimized:** Responsive single-column layout on phones with larger touch targets (44px minimum)
* **Optimized Rendering:** HUD updates only when necessary, reducing CPU usage

### **Quality of Life**
* **Real Research Files:** Research quests now generate actual Markdown files in `Active_Run/Research/` instead of virtual entries
* **Boss HP Tracking:** Boss quests display HP bars and can be damaged multiple times before defeat
* **Boss Heartbeat Audio:** 3-second delay with heartbeat sound effect when Boss spawns
* **Victory Screen:** Level 50 completion triggers an Ascension Modal with lifetime stats
* **Undo System:** Deleted quests can be restored within 60 seconds (Ctrl+Shift+Z)
* **Quest Templates:** Quick-deploy common quest types with hotkey (Ctrl+Cmd+D)
* **Export Analytics:** Export all stats as JSON for external analysis

### **Visual Enhancements**
* **Debt Crisis Alert:** Pulsing red animation when Gold < 0
* **Meditation Progress Bar:** Visual feedback for lockdown recovery
* **Achievement Badges:** Color-coded by rarity (Common, Rare, Epic, Legendary)
* **Chain Progress Indicators:** Visual quest chain tracking with status colors
* **Glitch Oracle:** Oracle text corrupts when in critical condition

---

## <a id="5-dlc-1-daily-missions--scraps"></a>5. DLC 1: Daily Missions & Scraps

### **Daily Missions System**
3 random objectives are assigned daily at login. Completing all 3 grants a **+50 Gold Bonus**.

#### **Mission Pool**
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
| 🎲 Risk Taker | Complete Difficulty 4+ quest | 1 | +15 XP |

#### **Mission Mechanics**
* Missions reset daily at login
* Progress tracked automatically in real-time
* Visual progress bars in HUD
* Checkmark (✓) appears when complete
* **Bonus Gold:** All 3 complete = +50g

### **The "Zero Inbox" Loop**

One possible mission is **Zero Inbox**. To complete it:

1. **Capture:** Use `Ctrl/Cmd + P` -> `Quick Capture (Scrap)` to dump thoughts instantly into the `Scraps/` folder.
2. **Process:** Clean out the `Scraps/` folder (delete, archive, or convert to quests).
3. **Reward:** The mission marks itself complete once the folder is empty.

This creates a GTD-style inbox workflow integrated into the game.

---

## <a id="6-dlc-2-combat-librarian-research"></a>6. DLC 2: Combat Librarian (Research)

The Engine prevents you from writing unless you have "earned" it.

### **The 2:1 Combat Ratio**
* You must complete **2 Combat Quests** (standard tasks) to unlock **1 Research Quest** (writing/study).
* **Exception:** The first research quest of a run is free (cold start).
* Attempting to create research without sufficient combat tokens shows `RESEARCH BLOCKED` warning.

### **Research Types**

| Type | Word Target | Description |
|:---|:---|:---|
| **Survey** | 200 words | Quick exploration or summary |
| **Deep Dive** | 400 words | Comprehensive analysis or essay |

### **Word Count Validation**
Research quests track word count in real-time (with 1-second debounce):

* **< 80% of target:** Cannot complete. Too short.
* **80-100%:** Ideal completion. Full rewards.
* **100-125%:** Valid but triggers **Gold Tax** (proportional to overage).
* **> 125%:** Cannot complete. Too long.

**Example:** Survey (200 words)
* Minimum: 160 words
* Ideal: 160-200 words
* Taxed: 201-250 words (up to 20g penalty)
* Rejected: 251+ words

### **Research File System (v2.0)**
Research quests now create actual Markdown files:

```
Active_Run/Research/my_research_topic.md
```

**Frontmatter:**
```yaml
---
type: research
research_id: research_1
status: active
linked_skill: Writing
word_limit: 200
created: 2026-01-23T...
---
```

**Live Word Tracking:**
* Word count updates as you type (debounced)
* Progress bar shows completion percentage
* Warnings appear when approaching limits

### **Skill Integration**
* Link research to a skill (e.g., "Writing", "Physics")
* Completing research grants skill XP
* Research word count contributes to skill progression

---

## <a id="7-dlc-3-meditation--recovery"></a>7. DLC 3: Meditation & Recovery

### **Lockdown System**
**Trigger:** Taking >50 Damage in a single day activates LOCKDOWN.

**Effects:**
* Cannot deploy new quests
* Lasts 6 hours by default
* Timer displayed in HUD
* Red pulsing alert in Panopticon

### **Active Recovery: Meditation**
You can reduce lockdown time by performing **Meditation Cycles**.

**Mechanics:**
* Command: `Meditation: Start`
* Plays 432Hz healing tone (1 second)
* **Cooldown:** 30 seconds between clicks
* **Progress:** Tracked as cycles (0/10)
* **Reward:** Completing 10 cycles reduces lockdown by **5 hours**
* Cycles reset when lockdown ends or is reduced

**UI Feedback (v2.0):**
* Progress bar shows cycles completed
* Meditation button grays out during cooldown
* Breathing animation when active
* Success sound when 10 cycles complete

### **Deletion Quota System**
**Daily Allowance:** 3 free quest deletions per day.

**Cost Structure:**
* Deletions 1-3: Free
* Deletion 4+: 10 Gold each

**Warnings (v2.0):**
* After 3 deletions, confirmation modal appears
* Shows remaining quota in UI: `(2 free deletions remaining)`
* Color-coded warnings: White → Orange → Red

**Undo Buffer:**
* Deleted quests stored in memory for 60 seconds
* Hotkey: `Ctrl/Cmd + Shift + Z` to undo
* Maximum 5 quests in buffer
* Expired deletions cannot be restored

---

## <a id="8-dlc-4-quest-chains"></a>8. DLC 4: Quest Chains

Create linear dependencies between tasks for bonus XP.

### **Creating Chains**
1. Open `Chains: Create` command
2. Name your chain (e.g., "Launch Product")
3. Select 2+ active quests to link
4. Quests must be completed in order

### **Chain Mechanics**
* **Locking:** Cannot complete Quest 2 until Quest 1 is done
* **Progress Tracking:** HUD shows X/Y quests complete
* **Visual States:**
  * ✓ Completed (green, dimmed)
  * → Active (bright green, bold)
  * 🔒 Locked (gray, dimmed)
* **Bonus XP:** Completing entire chain grants **+100 XP**

### **Chain Management**
* **Active Chain:** Only 1 chain can be active at a time
* **Breaking Chains:**
  * Use `Chains: View Active` → Break button
  * Keeps XP from completed quests
  * Loses bonus XP
  * Chain logged in history
* **Chain History:** All completed/broken chains tracked with timestamps

### **Boss Chains (v2.0)**
* If final quest in chain is a Boss quest, chain is marked as "Boss Chain"
* Extra visual effects on completion
* Recommended for endgame content

---

## <a id="9-dlc-5-context-filters"></a>9. DLC 5: Context Filters

Filter quests by energy level, location, and tags for focused work sessions.

### **Filter Types**

#### **Energy Level**
* **High:** Fresh, alert, peak performance
* **Medium:** Normal working state
* **Low:** Tired, depleted, minimal effort
* **Any:** No energy filter (default)

#### **Context**
* **Home:** Requires home environment
* **Office:** Requires work environment
* **Anywhere:** Can be done from any location
* **Any:** No context filter (default)

#### **Tags** (Custom)
* Add custom tags when creating quests
* Filter by multiple tags (OR logic)
* Examples: `#urgent`, `#creative`, `#admin`

### **Using Filters**

**Via HUD:**
* Filter bar appears above quest list
* Click energy/context buttons to toggle
* Active filters highlighted in blue
* Clear All button resets view

**Via Commands:**
* `Filters: High Energy` - Show only high-energy quests
* `Filters: Medium Energy` - Show only medium-energy quests
* `Filters: Low Energy` - Show only low-energy quests
* `Filters: Clear All` - Reset to show all quests

**Smart Filtering:**
* Filtered quests hidden from view
* Quest count shows filtered/total
* Filters persist until cleared
* Multiple filters combine (AND logic)

### **Filter Assignment**
Filters are assigned per-quest in the deployment modal:
* Select energy level dropdown
* Select context dropdown
* Add custom tags (comma-separated)

---

## <a id="10-dlc-6-analytics--endgame"></a>10. DLC 6: Analytics & Endgame

### **Game Statistics**
Track comprehensive metrics across your entire run:

**Core Metrics:**
* Total Quests Completed
* Total XP Earned
* Current Streak (consecutive days)
* Longest Streak (all-time record)
* Success Rate (completed/total)
* Gold Earned (lifetime)
* Damage Taken (lifetime)
* Deaths (from all runs)

**Skill Metrics:**
* Top 3 Most Used Skills
* Average Skill Level
* Total Skills Created
* Rust Events (times skills decayed)

**Research Metrics:**
* Total Research Quests
* Total Combat Quests
* Current Ratio (combat:research)
* Research Completed
* Average Words Written

**Chain Metrics:**
* Total Chains Completed
* Total Chains Broken
* Longest Chain (quest count)
* Chain Completion Rate

### **Weekly Reports**
Generate detailed weekly summaries:

```
Week 3 Report (Jan 15 - Jan 21, 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Quests: 42
Success Rate: 85%
Total XP: 1,250
Total Gold: 580g
Top Skills: Writing, Coding, Fitness
Best Day: Jan 18 (12 quests)
Worst Day: Jan 20 (3 quests)
```

**Command:** `Analytics: Generate Weekly Report`

### **Export System (v2.0)**
Export all data as JSON for external analysis:

**Command:** `Analytics: Export Stats JSON`

**Output:** `Sisyphus_Stats_[timestamp].json`

**Contents:**
* All settings and state
* Complete history
* Skills graph
* Chain records
* Daily metrics
* Boss status
* Achievements

### **Boss Milestone System**
Track boss progression across the run:

| Level | Boss Name | XP Reward | Status |
|:---|:---|:---|:---|
| 10 | The Gatekeeper | 500 XP | 🔒 Locked |
| 20 | The Shadow Self | 1000 XP | 🔒 Locked |
| 30 | The Mountain | 1500 XP | 🔒 Locked |
| 50 | Sisyphus Prime | 5000 XP | 🔒 Locked |

**Status Indicators:**
* 🔒 **Locked:** Level not reached yet
* ⚡ **Unlocked:** Boss available but not defeated
* ✓ **Defeated:** Boss conquered (shows timestamp)

### **Victory Condition**
**Win Condition:** Defeat the Level 50 Boss ("Sisyphus Prime")

**Victory Effects:**
* `gameWon` flag set to true
* Victory Modal displays:
  * Final Level
  * Total Quests Completed
  * Deaths Endured
  * Longest Streak
  * "One must imagine Sisyphus happy" message
* Run logged in Legacy history
* Option to start New Game+

---

## <a id="11-boss-system"></a>11. Boss System

### **Boss Spawning**
Bosses automatically spawn when reaching milestone levels:

**Spawn Sequence:**
1. Level threshold reached (10, 20, 30, or 50)
2. 💓 Heartbeat sound plays
3. 2-second warning: "⚠️ ANOMALY DETECTED..."
4. 3-second delay
5. ☠️ Boss quest appears with dramatic sound
6. Boss file created in `Active_Run/Quests/`

### **Boss Mechanics (v2.0)**

**HP System:**
* Bosses have HP equal to `100 + (Level × 20)`
* Example: Level 10 Boss = 200 HP

**Combat:**
* **⚔️ ATTACK Button:** Deals 25 damage per click
* **HP Bar:** Visual progress bar shows remaining health
* **Multiple Hits Required:** Must attack 8-10 times to defeat
* **No Time Limit:** Attack at your own pace

**Failure Penalty:**
* Using `XX` (manual fail) button applies massive HP penalty
* Penalty defined per boss (20-99 HP)
* Level 50 Boss penalty: 99 HP (near-death)

### **Boss Data**

| Level | Name | Description | HP | Penalty |
|:---|:---|:---|:---|:---|
| 10 | The Gatekeeper | The first major filter | 300 | 20 HP |
| 20 | The Shadow Self | Your own bad habits manifest | 500 | 30 HP |
| 30 | The Mountain | The peak is visible | 700 | 40 HP |
| 50 | Sisyphus Prime | One must imagine Sisyphus happy | 1100 | 99 HP |

### **Boss Rewards**
* **XP:** 500-5000 XP (scales with level)
* **Gold:** 1000g flat reward
* **Achievement:** "Giant Slayer" unlocked on first boss
* **Victory:** Level 50 boss triggers game win

---

## <a id="12-achievement-system"></a>12. Achievement System

10 achievements track major milestones across your journey.

### **Achievement List**

#### **Common Tier** 🔵
| Achievement | Requirement | Description |
|:---|:---|:---|
| **First Blood** | Complete 1 quest | Your first quest completion |
| **Week Warrior** | 7-day streak | Maintain productivity for a full week |
| **Warm Up** | Complete 10 quests | Getting into the flow |

#### **Rare Tier** 🟢
| Achievement | Requirement | Description |
|:---|:---|:---|
| **Apprentice** | Reach Level 5 in any skill | Master a single discipline |
| **Chain Gang** | Complete 1 Quest Chain | Finish your first linked sequence |
| **Scholar** | Complete 5 Research Quests | Dedicated to learning |
| **Capitalist** | Hold 500 gold at once | Amass significant wealth |

#### **Epic Tier** 🟣
| Achievement | Requirement | Description |
|:---|:---|:---|
| **Giant Slayer** | Defeat any Boss | Conquer your first major obstacle |

#### **Legendary Tier** 🟡
| Achievement | Requirement | Description |
|:---|:---|:---|
| **Sisyphus Happy** | Reach Level 50 | Ultimate ascension |
| **Immortal** | Reach Level 20 with 0 Deaths | Flawless run to mid-game |

### **Achievement Display (v2.0)**
* **Badges:** Color-coded by rarity in Analytics section
* **Locked State:** Shows as "???" until unlocked
* **Hover Tooltips:** Displays unlock condition
* **Unlock Notification:** Sound effect + notice when earned
* **Timestamp:** Records exact unlock time

---

## <a id="13-full-command-reference"></a>13. Full Command Reference

Access these via the Command Palette (`Ctrl/Cmd + P`).

### **Core System Commands**

| Command | Description |
| :--- | :--- |
| `Open Panopticon (Sidebar)` | Opens the main HUD dashboard |
| `Toggle Focus Audio` | Turns Brown Noise ambient sound On/Off |
| `ACCEPT DEATH` | **HARD RESET.** Wipes save data. Resets to Level 1. All progress lost except Scars. |
| `Reroll Chaos` | Debug: Forces a new Daily Modifier roll |

### **Quest Management**

| Command | Description |
| :--- | :--- |
| `Deploy Quest` | Opens quest creation modal (full options) |
| `Deploy Quest from Template` | Quick-deploy pre-configured quest types |
| `Undo Last Quest Deletion` | Restore most recently deleted quest (60s window) |

### **Research System**

| Command | Description |
| :--- | :--- |
| `Research: Create Quest` | Start a writing task (Requires 2:1 combat ratio or first quest) |
| `Research: View Library` | Manage active/completed research drafts |

### **Quest Chains**

| Command | Description |
| :--- | :--- |
| `Chains: Create` | Open Builder to link 2+ active quests |
| `Chains: View Active` | Check progress and manage current chain |

### **Meditation & Recovery**

| Command | Description |
| :--- | :--- |
| `Meditation: Start` | Begin 432Hz recovery cycle (only during Lockdown) |
| `Recover (Lockdown)` | Check remaining Lockdown timer |

### **Context Filters**

| Command | Description |
| :--- | :--- |
| `Filters: High Energy` | Show only high-energy quests |
| `Filters: Medium Energy` | Show only medium-energy quests |
| `Filters: Low Energy` | Show only low-energy quests |
| `Filters: Clear All Filters` | Reset view to show all quests |

### **Analytics & Progression**

| Command | Description |
| :--- | :--- |
| `Analytics: Generate Weekly Report` | Create summary of the past 7 days |
| `Analytics: View Game Stats` | Display current Streak, Level, Total Quests, etc. |
| `Analytics: Export Stats JSON` | Export all data to JSON file for external analysis |
| `Endgame: Check Boss Milestones` | Force check for Boss spawn conditions |

### **Neural Hub (Skills)**

| Command | Description |
| :--- | :--- |
| `Neural Hub: Generate Skill Graph` | Create an Obsidian Canvas visualizing your skill network |

### **Quick Actions**

| Command | Description |
| :--- | :--- |
| `Quick Capture (Scrap)` | Instantly create a note in the `Scraps/` folder for later processing |

---

## <a id="14-hotkeys--quick-actions"></a>14. Hotkeys & Quick Actions

### **Default Hotkeys (v2.0)**

| Hotkey | Command | Description |
|:---|:---|:---|
| `Ctrl/Cmd + D` | Deploy Quest | Opens quest creation modal |
| `Ctrl/Cmd + Shift + Z` | Undo Quest Deletion | Restore deleted quest (60s window) |

### **Customizable Hotkeys**
You can assign custom hotkeys to any command via:
1. Settings → Hotkeys
2. Search for "Sisyphus"
3. Click + next to desired command
4. Press your key combination

**Recommended Hotkeys:**
* `Ctrl+Shift+M` → Meditation: Start
* `Ctrl+Shift+C` → Quick Capture (Scrap)
* `Ctrl+Shift+F` → Filters: Clear All

### **Quick Capture Syntax**
In the HUD input field at bottom:

```
Task Name /1        → Trivial (Diff 1)
Task Name /2        → Easy (Diff 2)
Task Name /3        → Medium (Diff 3)
Task Name /4        → Hard (Diff 4)
Task Name /5        → SUICIDE (Diff 5)
Task Name           → Defaults to Medium (Diff 3)
```

Press **Enter** to deploy instantly.

---

## <a id="15-advanced-mechanics"></a>15. Advanced Mechanics

### **Neural Hub: Skill Graph**
Generate a visual brain network of your skills using Obsidian Canvas:

**Features:**
* **Nodes:** Each skill is a node with Level, XP, and Rust status
* **Connections:** Synergy links between skills (Secondary Skill usage)
* **Colors:**
  * 🟢 Green: Active skill (no rust)
  * 🔴 Red: Rusty skill (unused for 3+ days)
  * 🟡 Gold: High-level skill (Level 10+)
* **Layout:** Circular arrangement with radius based on skill count
* **Auto-Update:** Regenerate to see new connections

**Command:** `Neural Hub: Generate Skill Graph`
**Output:** `Active_Run/Neural_Hub.canvas`

### **Skill Rust Mechanics**
Skills decay over time if unused:

**Rust Rules:**
* If skill unused for **3+ days**: Rust increases by 1
* **Max Rust:** 10 stacks
* **Penalty:** XP Requirement increases by 10% per rust stack
* **Recovery:** Using the skill clears all rust
* **Manual Polish:** Available in Skill Detail modal (instant clear)

**Preventing Rust:**
* Use skill within 3 days
* Activate Rest Day (Shop item) - pauses rust
* Skills used during Rest Day do not count toward clearing rust

### **The Death System**
When HP reaches 0:

**Immediate Effects:**
1. All active quests moved to `Graveyard/Deaths/[timestamp]/`
2. Level reset to 1
3. HP reset to 100
4. Gold reset to 0
5. XP reset to 0
6. Rival Damage reset to 10

**Permanent Changes:**
* **Death Counter Increases:** Tracked in Legacy
* **Scars Applied:** Each death reduces starting gold by 10%
  * Formula: `Starting Gold = 100 × (0.9 ^ Death Count)`
  * Example: 3 deaths = 100 × (0.9^3) = 72.9g start
* **Skills Preserved:** All skills remain at current level
* **Achievements Kept:** All unlocked achievements persist
* **Boss Progress Reset:** Must defeat bosses again

**Accepting Death:**
Use `ACCEPT DEATH` command to trigger manually (for testing or voluntary reset).

### **The Debt Crisis**
When Gold drops below 0:

**Effects:**
* **All damage doubled** (including Boss damage, Rival damage, Adrenaline damage)
* **Pulsing red alert** in HUD (siren animation)
* **Oracle glitch** messages increase in frequency
* **Shop prices remain normal** (no additional markup)

**Recovery:**
* Complete quests to earn gold
* Use Daily Mission bonuses
* Windfall modifier day
* Avoid failures until positive balance restored

**Example:**
* Normal Rival Damage: 15 HP
* In Debt: 30 HP (doubled)

### **Synergy System**
Link two skills on a single quest for bonus effects:

**Primary Skill:**
* Main skill used for the quest
* Receives full XP (1 point)
* Subject to rust tracking
* Required field (can be "None")

**Secondary Skill:**
* Supporting skill used
* Receives 0.5 XP
* **Bonus XP:** Main quest rewards gain `Secondary Skill Level × 0.5` XP
* **Neural Link:** First use creates permanent connection in Skill Graph
* Optional field (defaults to "None")

**Example:**
Quest: "Write Marketing Email"
* Primary: Writing (Level 5)
* Secondary: Marketing (Level 8)
* Base Reward: 40 XP
* Synergy Bonus: +4 XP (8 × 0.5)
* Total: 44 XP

### **Priority System**
Quests have visual priority indicators:

| Priority | Visual | Use Case |
|:---|:---|:---|
| Critical | Red border | Urgent, deadline-sensitive |
| High | Orange border | Important, should do soon |
| Normal | Blue border | Standard task |
| Low | Gray border | Nice-to-have, flexible |

Priority is cosmetic and does not affect mechanics (yet).

### **Quest Deadlines**
All quests must have a deadline (set via datetime picker).

**Deadline Mechanics:**
* **Visual Timer:** Shows `Xh Ym` remaining
* **Late Warning:** Timer turns red when <1 hour remaining
* **Auto-Fail:** Quest automatically fails when deadline expires
* **Damage:** Standard failure damage applied
* **Rival Increase:** +1 Rival Damage

**Strategy Tips:**
* Short deadlines create urgency
* Long deadlines allow flexibility
* Adrenaline modifier punishes long sessions

### **The Shop System**
Purchase consumable items to aid survival:

| Item | Cost | Effect | Duration |
|:---|:---|:---|:---|
| 💉 Stimpack | 50g | Heal 20 HP | Instant |
| 💣 Sabotage | 200g | -5 Rival Dmg | Permanent |
| 🛡️ Shield | 150g | Immunity to damage | 24 hours |
| 😴 Rest Day | 100g | Pause rust, immune to damage | 24 hours |

**Shop Mechanics:**
* Items disabled if insufficient gold
* Prices affected by Inflation modifier (2x)
* Effects stack (multiple Stimpacks allowed)
* Shield/Rest Day cannot overlap

**Command:** Open via HUD "SHOP" button or Quest Modal

---

## 16. Folder Structure

Sisyphus creates the following folder hierarchy in your vault:

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
```

**Auto-Creation:**
All folders created automatically when needed. You don't need to set up anything manually.

---

## 17. File Frontmatter Reference

### **Combat Quest Frontmatter**

```yaml
---
type: quest
status: active                    # active, completed, failed
difficulty: Medium                # Trivial, Easy, Medium, Hard, SUICIDE
priority: Normal                  # Critical, High, Normal, Low
xp_reward: 40
gold_reward: 60
skill: Writing                    # Primary skill
secondary_skill: Marketing        # Optional secondary skill
high_stakes: false                # true = double gold & damage
is_boss: false                    # true for boss quests
created: 2026-01-23T14:30:00Z
deadline: 2026-01-24T10:00:00Z
completed_at: 2026-01-23T16:45:00Z  # Added on completion
---
```

### **Boss Quest Frontmatter (v2.0)**

```yaml
---
type: quest
status: active
difficulty: ☠️ BOSS
priority: Critical
xp_reward: 1000
gold_reward: 1000
skill: Boss
secondary_skill: None
high_stakes: false
is_boss: true
boss_hp: 500                      # Current HP (decreases with attacks)
boss_max_hp: 500                  # Total HP (display reference)
created: 2026-01-23T14:30:00Z
deadline: 2026-01-26T14:30:00Z    # Usually 3 days
---
```

### **Research Quest Frontmatter (v2.0)**

```yaml
---
type: research
research_id: research_1           # Unique ID for tracking
status: active                    # active, completed
linked_skill: Writing
word_limit: 200                   # Target word count
created: 2026-01-23T14:30:00Z
---
```

---

## 18. Troubleshooting & FAQ

### **Q: The HUD isn't showing up**
**A:** Run `Sisyphus: Open Panopticon` from command palette. If still missing, try restarting Obsidian.

### **Q: I'm stuck in Lockdown and meditation isn't working**
**A:** Ensure 30 seconds pass between meditation clicks. Check the progress bar in the HUD. 10 cycles = 5 hour reduction.

### **Q: Research quest blocked even though I completed combat quests**
**A:** The ratio checks `totalCombat / totalResearch`. If you've completed 10 combat and 6 research, your ratio is 1.67:1 (need 2:1). Complete 2 more combat quests.

### **Q: Quest disappeared after deletion, can't undo**
**A:** Undo only works within 60 seconds. After that, the quest is permanently deleted. Check `Graveyard/` folders if it auto-failed.

### **Q: Boss HP bar not updating**
**A:** This was fixed in v2.0. Make sure you're using the latest version. The HP should update immediately after clicking ATTACK.

### **Q: Meditation audio not playing**
**A:** Check the sound toggle in HUD header (🔊 icon). If muted globally, meditation tones won't play. Also verify browser audio permissions.

### **Q: Skills showing as rusty immediately**
**A:** This can happen if `lastUsed` timestamp is corrupted. Open Skill Detail modal and click "Manual Polish" to reset rust.

### **Q: How do I backup my progress?**
**A:** Use `Analytics: Export Stats JSON` to create a backup. Your data is also stored in `.obsidian/plugins/sisyphus-engine/data.json`.

### **Q: Can I disable the Debt Crisis mechanics?**
**A:** No, debt doubling is a core mechanic. Avoid going negative by completing gold-rewarding quests or using shop items conservatively.

### **Q: What happens if I skip multiple days?**
**A:** After 2 days of absence, you take "rot damage" at 10 HP per day. Example: 5 days away = 30 HP damage on return.

---

## 19. Performance Tips

### **For Large Vaults (1000+ Files)**
* Research word counter uses 1-second debounce
* HUD updates are optimized
* Consider filtering quests by context to reduce visible items

### **For Mobile Users**
* Use Quest Templates for faster deployment
* Quick Capture is optimized for thumb typing
* HUD uses responsive design (stacks on narrow screens)
* Touch targets are 44px minimum for accessibility

### **Audio Performance**
* Brown noise uses ScriptProcessorNode (legacy but stable)
* Meditation tones are brief (1 second)
* Mute audio if experiencing lag on low-end devices

---

## 20. Advanced Strategies

### **Optimal Daily Routine**
1. **Morning:** Check Daily Missions, deploy Morning Win (Trivial)
2. **Peak Hours:** High-energy quests during focus time
3. **Afternoon:** Research quests (requires prior combat)
4. **Evening:** Low-energy quests or process Scraps
5. **Before Bed:** Review tomorrow's deadlines

### **Skill Tree Strategy**
* Focus on 3-5 core skills early
* Use Secondary Skills to build neural connections
* Polish rust manually if close to level-up
* Diversify to unlock more Daily Missions

### **Chain Building**
* Start chains with easiest quest first
* End chains with hardest quest (momentum)
* Don't chain time-sensitive quests (deadline risk)
* Boss chains guarantee big XP

### **Risk Management**
* Keep HP above 50 to avoid Lockdown
* Maintain positive gold balance always
* Use Shield before attempting multiple Hard quests
* Rest Day on Adrenaline modifier days

### **Endgame Preparation**
* Level to 48-49 before attempting Level 50 Boss
* Stock 500+ gold for post-victory safety
* Complete all achievements before final boss
* Export stats before final run (backup)

---

## 21. Developer Notes

### **Architecture**
* **Engine Pattern:** Modular engine design with DLC sub-engines
* **Event Bus:** TinyEmitter for decoupled updates
* **Debouncing:** Performance optimization for real-time tracking
* **Audio Controller:** Centralized sound management

### **Key Files**
* `main.ts` - Plugin lifecycle, command registration
* `engine.ts` - Core game loop, quest management
* `view.ts` - HUD rendering, UI state
* `modals.ts` - All modal dialogs
* `types.ts` - TypeScript interfaces
* **Sub-Engines:**
  * `AnalyticsEngine.ts` - Stats, achievements, bosses
  * `MeditationEngine.ts` - Lockdown, meditation, deletion quota
  * `ResearchEngine.ts` - Research quest system
  * `ChainsEngine.ts` - Quest chain mechanics
  * `FiltersEngine.ts` - Context filtering logic

### **Future Roadmap (Community Ideas)**
* [ ] New Game+ mode (scaling difficulty)
* [ ] Multiplayer leaderboards
* [ ] Custom achievement creation
* [ ] Quest templates customization UI
* [ ] Mobile-specific gestures
* [ ] Skill tree presets
* [ ] Boss difficulty tiers

---

## 22. Credits & Philosophy

### **Design Philosophy**
Sisyphus Engine is inspired by:
* **Albert Camus** - The Myth of Sisyphus (existential productivity)
* **Roguelike Games** - Permadeath, progression, risk/reward
* **GTD Methodology** - Inbox processing, context-based work
* **Gamification Theory** - Intrinsic motivation through stakes

### **Core Principles**
1. **Consequences Matter:** Your choices have real weight
2. **No Grinding:** Quality over quantity (high difficulty > spam trivial)
3. **Failure Is Part of Growth:** Death teaches lessons (Scars = wisdom)
4. **Respect Your Time:** Writing requires earning it (combat ratio)
5. **Honest Difficulty:** The game gets harder as you get stronger

### **License**
MIT License - Free to use, modify, distribute

---

## 23. Community & Support

### **Getting Help**
* Check the [Troubleshooting](#18-troubleshooting--faq) section first
* Search existing issues on GitHub
* Join the Obsidian Discord (tag @sisyphus-engine)

### **Contributing**
* Report bugs via GitHub Issues
* Suggest features via Discussions
* Submit PRs for bug fixes (please include tests)

### **Acknowledgments**
* Obsidian team for the plugin API
* Community beta testers
* All productivity warriors pushing their boulders

---

**Remember:** One must imagine Sisyphus happy. But Sisyphus must also get to work.

*Now go push that boulder.* 🏔️