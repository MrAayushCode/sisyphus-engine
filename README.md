## Complete Documentation & Feature Guide

---

## Table of Contents

1. What is Sisyphus?
2. Installation
3. Core Game Mechanics
4. The Panopticon Interface
5. Core Systems Explained
6. DLC 1: Daily Missions System
7. DLC 2: Combat Librarian
8. DLC 3: Meditation & Recovery
9. DLC 4: Quest Chains
10. DLC 5: Context Filters
11. DLC 6: Analytics & Endgame
12. Advanced Mechanics
13. Strategy Guide
14. Commands Reference

---

## What is Sisyphus?

### The Core Idea

**SISYPHUS** is not just a to-do list. It's a **roguelike game built into your Obsidian vault** that transforms productivity into an engaging, narrative-driven experience.

The game is named after the Greek myth of Sisyphus, who eternally pushes a boulder uphill. Like him, we face endless tasks. But unlike Sisyphus' punishment, SISYPHUS gamifies this struggle, making it rewarding and addictive.

### What Makes It Different?

Traditional task management apps are boring. They don't motivate you emotionally. SISYPHUS changes this through:

- **Permanent Consequences**: Fail a quest? You lose health. Fail too much? You get locked down.
- **Resource Management**: Every decision has weight. Spend gold wisely.
- **Progression**: Watch your skills grow. Unlock bosses. Race toward Level 50.
- **Roguelike Elements**: Death is permanent (but your legacy carries forward).
- **Narrative**: Messages from the system taunt you. You feel like you're fighting against something.

---

## Installation

### Prerequisites

- Obsidian (v0.15.0 or higher)
- Basic familiarity with Obsidian plugins

### Step 1: Clone/Download

Place the Sisyphus plugin files in your Obsidian vault's `.obsidian/plugins/sisyphus/` directory.

### Step 2: Enable the Plugin

1. Open Obsidian Settings
2. Go to **Community Plugins** → **Installed Plugins**
3. Find **Sisyphus** and toggle it ON
4. Grant any required permissions

### Step 3: First Launch

When you launch Sisyphus, it automatically:
- Creates the `Active_Run/` directory structure
- Initializes your stats (HP: 100, Level: 1, Gold: 0)
- Rolls your first daily modifier (see: Chaos System)
- Generates 3 random daily missions

You're ready to deploy your first quest!

---

## Core Game Mechanics

### Health (HP)

**What it is**: Your life bar. Reach 0 HP and the game ends.

**How you lose HP**:
- Failing a quest: 10 + (Rival Damage / 2) damage
- If you're in debt: Damage is doubled
- Taking damage 50+ in one session: Triggers Lockdown

**How you gain HP**:
- Completing quests: +20 HP at daily login
- Max HP increases with level: `maxHP = 100 + (Level × 5)`
- Buy Stimpack from shop: +20 HP for 50g

**Critical State**: When HP < 30, your health bar pulses red and the Oracle shows corrupted text. This is your warning to be careful.

### Gold (g)

**What it is**: Currency used to buy upgrades and pay penalties.

**How you earn gold**:
- Completing quests: Varies by difficulty (Trivial: 10g → Suicide: 150g)
- Daily missions: Bonus 10-30g per mission
- Daily Modifier "Windfall": +50% gold for the day

**How you spend gold**:
- Buy protective items from the shop (Shield: 150g, Rest Day: 100g)
- Penalty for overly long research quests: Word count tax
- Quest deletion after 3 free deletions: 10g each

**Debt System**: If gold < 0, you're in debt. Damage taken is **doubled**. This creates urgency to get back to positive gold.

**Daily Modifier "Rival Sabotage"**: If this modifier is active, you lose 10% of your gold at login.

### Experience (XP) & Leveling

**What it is**: Your character progression. Reach Level 50 to win the game.

**How you gain XP**:
- Completing quests: 5-60% of your XP requirement based on difficulty
- Daily missions: 15-30 XP per mission
- Daily Modifier "Flow State": +50% XP for the day
- Completing quest chains: +100 XP bonus

**XP Requirement**: Each level requires more XP:
```
Level 1: 100 XP to reach Level 2
Level 2: 110 XP to reach Level 3 (increases by 10% each level)
```

**Leveling Effects**:
- **Max HP increases**: +5 per level
- **Rival Damage increases**: +5 per level (makes enemies harder)
- **Boss unlock**: At Levels 10, 20, 30, 50

### Rival Damage

**What it is**: Your opponent's attack power. Every time you fail a quest, Rival Damage increases permanently.

**How it works**:
- Starts at: 10
- Increases by: +1 for each failed quest
- Affects: Damage you take from failures
- Calculation: `Damage = 10 + (RivalDmg / 2)`

**Strategic implications**: As you fail more quests, survival becomes harder, creating a pressure to succeed.

### Lockdown System

**What triggers lockdown?**:
- Taking 50+ damage in a single session: Triggers 6-hour lockdown

**What happens during lockdown?**:
- You cannot create new quests
- You cannot complete quests
- All damage is prevented (rest day protection applies)

**How to escape lockdown**:
- **Wait it out**: Lockdown timer counts down in hours
- **Meditate**: (DLC 3) Reduce lockdown by 5 hours through meditation

### Shielded & Rest Day

**Shield** (150g from shop):
- Blocks **1 failure** without damage
- Lasts 24 hours
- When triggered: Shows "SHIELDED!" message
- Status icon shows "S" in status bar

**Rest Day** (100g from shop):
- **No damage taken** for 24 hours
- Quests can still be failed without losing HP
- Rust on skills is **paused** (doesn't accumulate)
- Status icon shows "D" (for "Day off") in status bar
- Prevents deploying High Stakes quests

---

## The Panopticon Interface

### What is the Panopticon?

The **Panopticon** is your main command center. It's a sidebar that displays everything you need to manage your run:

**Open it by**:
- Command palette: `Open Panopticon (Sidebar)`
- Ribbon icon (skull) on the left sidebar
- Or press the keyboard shortcut (if set)

### Interface Breakdown

#### 1. Header
```
Eye SISYPHUS OS
```

This is your main view title. It always shows you're in the game.

#### 2. Critical Alerts Section

**LOCKDOWN ACTIVE** (if locked down):
```
LOCKDOWN ACTIVE
Time Remaining: 2h 15m
Meditation: 3/10 (7 left)
[Progress bar]
[MEDITATE button]
[ATTEMPT RECOVERY button]
```

**REST DAY ACTIVE** (if on rest day):
```
REST DAY ACTIVE
18h 30m remaining | No damage, Rust paused
```

#### 3. HUD Grid (2×2)

Four stat boxes showing your current status:

| HEALTH | GOLD |
|--------|------|
| 45/100 | 120g |
| **LEVEL** | **RIVAL DMG** |
| **8** | **+50** |

Colors change based on state:
- **Red**: Health < 30 (critical, pulsing)
- **Orange**: Gold < 0 (in debt)
- **Blue**: Normal state

#### 4. The Oracle (Prediction System)
```
ORACLE PREDICTION

Survival: 3 days

Status Indicators:
🟢 Healthy    🔴 In Debt

Scars: 2 💀 (-19% starting gold)

Next Milestone: Level 10 (Boss Unlock)
```

**What it predicts**:
- **Survival estimate**: Days until HP reaches 0 based on current stats
- **Status lights**: Shows critical conditions (debt, etc.)
- **Scars**: Permanent penalties from previous deaths
- **Next milestone**: Shows which boss level is coming

**Glitch Mode**: When HP < 30 or Gold < -50, the Oracle shows corrupted text:
```
[CORRUPTED]
??? DAYS LEFT
NO FUTURE
```

This is intentional—showing you're in danger.

#### 5. Today's Objectives (DLC 1)

Shows your 3 random daily missions with progress:
```
✓ Morning Win (1/1) - Completed!
   Complete 1 Trivial quest before 10 AM
   Reward: +15g

.. Momentum (1/3) - In Progress
   Complete 3 quests today
   Reward: +20 XP

✗ Zero Inbox (0/1) - Not Started
   Process all scraps (0 remaining)
   Reward: +10g

All Missions Complete! +50 Bonus Gold
```

#### 6. Controls Section

Three buttons for core actions:

- **DEPLOY**: Open quest creation modal
- **SHOP**: Buy protective items
- **FOCUS**: Toggle brown noise (focus sound)

#### 7. Research Library (DLC 2)

Shows your research quests (separate from combat quests):
```
Research Ratio: 5:10 (2:1)

ACTIVE RESEARCH
- Survey: Learn React Hooks (145/200 words)
  [Complete] [Delete]

COMPLETED RESEARCH
+ Learn Vue Basics (Survey)
```

#### 8. Active Chain (DLC 4)

If you're in a quest chain:
```
ACTIVE CHAIN: Ship Production App (2/5)

Progress: ▓▓▓▓░░░░░░ 40%

✓ 1. Learn React Hooks (DONE)
✓ 2. Design UI Wireframes (DONE)
>>> 3. Build Auth System (ACTIVE)
🔒 4. Deploy to AWS (LOCKED)
🔒 5. Monitor & Launch (LOCKED)

[BREAK CHAIN] [VIEW STATS]
```

#### 9. Filter Controls (DLC 5)

Quick filtering for quests:
```
FILTER CONTROLS

Energy:
[ANY] [HIGH] [MEDIUM] [LOW]

Context:
[ANY] [HOME] [OFFICE] [ANYWHERE]

[CLEAR FILTERS]
```

#### 10. Active Threats (Quest List)

Shows all active quests sorted by deadline:
```
ACTIVE THREATS

[X] Fix Auth Bug [3⭐] (EXPIRED)
    -2h 15m overdue
    [✓] [✗] [🗑️]

[X] Write Docs [2⭐]
    3h 45m remaining
    Python + Writing (synergy bonus)
    [✓] [✗] [🗑️]

[★] Launch App v1.0 (BOSS)
    Tomorrow at 5 PM
    1000 XP | 1000g reward
    [✓] [✗] [🗑️]

System Idle. [DEPLOY QUEST]
```

**Quest card elements**:
- **[X]**: Difficulty indicator (color-coded)
- **[★]**: Boss quest (special purple styling)
- **⭐**: Star rating for difficulty
- **Timer**: Time remaining before deadline
- **Tags**: Skills involved, synergy bonuses
- **[✓]**: Complete the quest
- **[✗]**: Fail the quest
- **[🗑️]**: Delete the quest (costs gold after 3 free deletions)

#### 11. Neural Hub (Skills)

Shows all your skills and their progression:
```
NEURAL HUB

Python Lv 12 ▓▓▓▓▓▓▓▓▒▒ 80%  (healthy)

Writing Lv 5 ⚠️ ▓▓░░░░░░░░ 20%  (rusty)

DevOps Lv 8  ▓▓▓▓▓▓░░░░ 60%

Gym Lv 3 💀   ░░░░░░░░░░  0%  (atrophied)

[+ Add Neural Node]
```

**Click a skill** to see details:
- Name and level
- XP progress to next level
- Last used date
- Rust status
- Synergy connections

#### 12. Quick Capture (Input)

Bottom of the sidebar—rapidly deploy quests:
```
[Mission /1...5]
```

**How it works**:
- Type your quest name
- Add difficulty: `/1` (Trivial) through `/5` (Suicide)
- Press Enter to deploy

**Examples**:
- `Fix bug /3` → Creates "Fix bug" at Medium difficulty
- `Write report /2` → Creates "Write report" at Easy
- `Deploy app /5` → Creates "Deploy app" at Suicide

---

## Core Systems Explained

### The Chaos System (Daily Modifiers)

Every day at login, the system rolls a **Daily Modifier** that affects your entire day's gameplay.

**Modifier Effects**:
- Affect XP gain and gold gain
- Affect item prices in the shop
- Last exactly 24 hours
- Roll again automatically at midnight

**Available Modifiers**:

| Icon | Name | Effect | Description |
|------|------|--------|-------------|
| ☀️ | Clear Skies | 1x XP, 1x Gold, 1x Prices | Normal day—no bonuses or penalties |
| 🌊 | Flow State | 1.5x XP, 1x Gold, 1x Prices | Productivity mode! XP farming is easy. |
| 💰 | Windfall | 1x XP, 1.5x Gold, 1x Prices | Money day! Quests pay 50% more gold. |
| 📈 | Inflation | 1x XP, 1x Gold, 2x Prices | Everything in the shop is twice as expensive. |
| 🌫️ | Brain Fog | 0.5x XP, 1x Gold, 1x Prices | Thinking is hard. XP gains are halved. |
| 🕵️ | Rival Sabotage | 1x XP, 0.5x Gold, 1x Prices | You lose 10% of your gold at login. |
| 💉 | Adrenaline | 2x XP, 1x Gold, 1x Prices | DOUBLE XP! But lose 5 HP per quest completed. |

**Command**: `Reroll Chaos` (use to manually roll a new modifier if you don't like today's)

### Rust System (Skill Decay)

Skills get rusty if you don't use them. This adds pressure to keep all skills sharp.

**How rust works**:
- If a skill **hasn't been used for 3+ days**, it accumulates 1 rust stack daily
- Each rust stack **increases XP requirement** by 10% (multiplicative)
- Example: Rust 2 = 121% of base XP requirement

**How to remove rust**:
- **Use the skill**: Completing a quest with that skill immediately clears all rust
- **Polish manually**: Click on the skill in Neural Hub, click "Manual Polish" (costs 10g per rust stack, reduces XP requirement)

**Why rust exists**: It prevents you from ignoring skills. You need to keep all your neural nodes active.

### The Time-Skip Tax (Rot)

If you don't log in for multiple days, you accumulate **rot damage**.

**How it works**:
- Miss 1 day: No damage
- Miss 2+ days: `Damage = (Days Missed - 1) × 10`
- Example: Miss 3 days = 20 HP damage automatically dealt

**Why**: Encourages daily engagement. The game wants you to come back often.

### Permanent Scars (Death Penalty)

When you reach 0 HP and die, you enter **New Game+** but with permanent penalties.

**Scar effects**:
- Each scar = **-10% starting gold** for future runs (multiplicative)
- Example: 2 scars = 81% starting gold, 5 scars = 59% starting gold
- Scars are **permanent** and visible in the Oracle

**Why**: Death should feel consequential, but not game-ending. You can keep playing, but each death gets harder.

---

## DLC 1: Daily Missions System

### What Are Daily Missions?

Every day at login, you get **3 random missions** from a pool of 10. Complete them to earn bonus rewards.

**Key traits**:
- Roll once per day
- Reset at midnight
- Rewards stack
- Complete all 3 = +50 bonus gold
- Tracked in status bar

### Mission Pool

| Icon | Mission | Objective | Reward |
|------|---------|-----------|--------|
| ☀️ | Morning Win | Complete 1 Trivial quest before 10 AM | +15g |
| 🔥 | Momentum | Complete 3 quests today | +20 XP |
| 🧘 | Zero Inbox | Process all scraps (0 remaining) | +10g |
| 🎯 | Specialist | Use the same skill 3 times | +15 XP |
| 💪 | High Stakes | Complete 1 High Stakes quest | +30g |
| 🔖 | Librarian | Complete 1 Research quest | +15 XP |
| ⚡ | Speed Demon | Complete a quest within 2h of creation | +25 XP |
| 🔗 | Synergist | Complete quest with Primary + Secondary skill | +10g |
| 🛡️ | Survivor | Don't take any damage today | +20g |
| 🎲 | Risk Taker | Complete Difficulty 4+ quest | +15 XP |

### How to Complete Missions

Each mission tracks progress toward its target:

**"Morning Win"**: Complete 1 Trivial quest before 10 AM
- Deploy a quest with difficulty set to Trivial
- Complete it before 10 AM in your local time
- Mission completes automatically

**"Momentum"**: Complete 3 quests total
- Each quest completion adds +1 to progress
- Tracked automatically as you play

**"High Stakes"**: Complete 1 High Stakes quest
- When deploying a quest, check the "High Stakes" toggle
- High Stakes quests reward 1.5x gold
- Complete it to finish the mission

**"Survivor"**: Don't take any damage
- If you fail any quest, this mission resets to 0 progress
- You need a clean day (no failures) to complete it

### Viewing Mission Progress

**In the Panopticon**:
- Daily Missions section shows all 3 missions
- Progress bars show how close you are
- Checkmarks show completion status
- Reward badges show XP/Gold

**In the Status Bar** (bottom of Obsidian):
- Shows `M2/3` (2 out of 3 missions completed)

### Bonus Rewards

If you complete **all 3 daily missions**, you get:
- **+50g bonus gold**
- Message: "All Missions Complete! +50 Bonus Gold"
- Displayed at bottom of missions list

---

## DLC 2: Combat Librarian (Research Quests)

### What Are Research Quests?

**Research Quests** are long-form writing tasks separate from combat quests. They enforce a balanced learning-to-doing ratio.

**Key traits**:
- No gold rewards (only XP to linked skill)
- Require minimum word count
- Penalties for exceeding word limit
- Subject to 2:1 combat:research ratio

### Creating a Research Quest

**Command**: `Research: Create Research Quest`

Modal opens:
```
RESEARCH DEPLOYMENT

Research Title: [________]

Research Type:
  ○ Survey (100-200 words)
  ○ Deep Dive (200-400 words)

Linked Skill: [Python ▼]

Link Combat Quest: [None ▼]

[CREATE RESEARCH]
```

**Fields**:
- **Title**: Name of your research task
- **Type**: Survey (shorter) or Deep Dive (longer)
  - Survey: 100-200 words, 5 XP reward
  - Deep Dive: 200-400 words, 20 XP reward
- **Linked Skill**: Which skill receives the XP reward
- **Link Combat Quest**: (Optional) Connect to a combat quest for synthesis

### Research Quest System

**Word Count Governor**:

As you write, track word count in the quest note frontmatter:
```
---
type: research
...
---
# My Research
> Words: 150/200 ✅

Content here...
```

**Rules**:
- **Under 80%**: Cannot complete (too short)
  - Example: Survey needs 80 words minimum
- **80-100%**: Perfect range ✅
- **100-125%**: Word count tax (you lose gold)
  - Example: 250/200 words = -20g tax
- **125%+**: Locked
  - Must delete content or split into another quest

**Ratio Enforcer**:

You can't spam research quests. The game enforces a **2:1 combat-to-research ratio**.

If you've completed 1 research quest, you must complete 2 combat quests before creating another research.

**Message when blocked**:
```
RESEARCH BLOCKED
You've completed 1 research quest.
Complete 2 combat quests to unlock research again.

Current Ratio: 1:1 (1 combat, 1 research)
```

### Completing Research Quests

**Requirements**:
1. **Minimum word count**: 80% of limit
2. **Linked to synthesis**: Must connect to at least 1 combat quest
3. **No locked state**: Word count < 125%

**Completion rewards**:
- **XP to linked skill** (based on type)
- **No gold** (research doesn't pay)
- **Ratio counter** increases

### Viewing Research Library

**Command**: `Research: View Research Library`

Shows:
```
RESEARCH LIBRARY

Combat Quests: 5
Research Quests: 2
Ratio: 2.5:1 ✓ (Can create more research)

ACTIVE RESEARCH
- Learn React Hooks (Deep Dive, 280/400 words)
  [COMPLETE] [DELETE]

COMPLETED RESEARCH
+ Survey the TypeScript Ecosystem (Survey)
+ Write API Documentation (Deep Dive)
```

---

## DLC 3: Meditation & Recovery

### What is the Meditation System?

When you get locked down, meditation is your escape mechanism. It's a _active recovery_ system—you can't just wait, you must participate.

**Key traits**:
- Unlocks when locked down
- 10 clicks per 5-hour reduction
- 30-second cooldown between clicks
- Plays 432 Hz healing frequency

### How Lockdown Works

**Triggers**:
- Taking 50+ damage in a single session

**During lockdown**:
- Cannot create quests
- Cannot complete quests
- Cannot fail quests (protected)
- Lasts 6 hours by default

**Status display**:
```
LOCKDOWN ACTIVE
Time Remaining: 5h 32m

Meditation: 3/10 (7 left)
[Progress bar]
[MEDITATE button]
[ATTEMPT RECOVERY button]
```

### Using Meditation

**How it works**:
1. Get locked down (take 50+ damage)
2. Panopticon shows meditation section
3. Click **[MEDITATE]** button
4. 432 Hz tone plays (healing frequency)
5. Counter increases: `3/10`
6. Wait 30 seconds before clicking again
7. After 10 clicks: **Lockdown reduced by 5 hours**

**Cooldown mechanics**:
- Must wait 30 seconds between clicks
- If you try to click too fast: "Already meditating. Wait 30 seconds."
- Prevents game-breaking spam

**10-Click bonus**:
- Completes all 10 clicks once per lockdown
- Reduces lockdown by 5 hours automatically
- Message: "Meditation complete. Lockdown reduced by 5 hours."
- Sound: Success chime plays

**Why 432 Hz?**
- 432 Hz is a frequency associated with healing and harmony
- Adds immersion to the meditation experience
- Creates a calming moment during high-stress lockdown

### Quest Deletion Limits (Part of DLC 3)

Deleting quests costs gold after you've used your free deletions.

**Quota per day**:
- **3 free deletions** per day
- **+10g cost** for each deletion beyond 3
- Resets at midnight

**How it works**:
1. First 3 deletions today: FREE
   - Message: "Quest deleted. (2 free deletions remaining)"
2. 4th deletion: -10g
   - Message: "Quest deleted. Cost: -10g"
3. 5th deletion: -10g
   - And so on...

**Why this system?**
- Prevents mindless quest abandonment
- Makes you commit to deployments
- Adds a resource cost to poor planning
- Encourages thought before deployment

---

## DLC 4: Quest Chains

### What Are Quest Chains?

**Quest Chains** are multi-quest projects where quests must be completed in order. Useful for large, structured goals like "Build a feature."

**Key traits**:
- 2+ quests in sequence
- Must complete in order (locked until active)
- +100 XP bonus on completion
- Can break chain (keep earned XP)

### Creating a Quest Chain

**Command**: `Chains: Create Quest Chain`

Modal opens:
```
CHAIN BUILDER

Chain Name: [Ship Production App]

Select Quests:
☐ Learn React Hooks
☐ Design UI Wireframes
☑ Build Auth System
☑ Create Database Schema
☑ Deploy to AWS
☐ Write Tests

[CREATE CHAIN]
```

**Requirements**:
- Name your chain
- Select 2+ quests
- Quests appear in selection order (drag to reorder in future version)

### During a Chain

Once created, the chain appears in Panopticon:
```
ACTIVE CHAIN: Ship Production App (2/5)

Progress: ▓▓▓▓░░░░░░ 40%

✓ 1. Learn React Hooks (DONE)
✓ 2. Design UI Wireframes (DONE)
>>> 3. Build Auth System (ACTIVE - Next)
🔒 4. Create Database Schema (LOCKED)
🔒 5. Deploy to AWS (LOCKED)

[BREAK CHAIN]
```

**Quest states**:
- **DONE** (✓): Completed, can view details
- **ACTIVE** (>>>): Currently allowed to complete
- **LOCKED** (🔒): Must complete active quest first

**Locking mechanism**:
- If you try to complete a locked quest: "Quest locked in chain. Complete the active quest first."
- Only the current quest can be completed
- Previous quests already done, next quests are blocked

### Completing a Chain

When you complete the final quest in the chain:
```
Chain complete: Ship Production App! +100 XP Bonus
```

Effects:
- **+100 XP bonus** added to your XP pool
- Chain marked as complete
- Entry added to chain history
- Panopticon updates (chain no longer shows)

### Breaking a Chain

If you click **[BREAK CHAIN]**, you:
- Lose the remaining bonuses
- Keep all XP already earned from completed quests
- Can start a new chain immediately

Message:
```
Chain broken: Ship Production App. 
Kept 2 quest completions (20 XP).
```

**Why you'd break a chain**:
- Project priorities changed
- Too difficult to complete
- Found a better approach
- Need space for new chains

---

## DLC 5: Context Filters

### What Are Context Filters?

**Filters** let you organize quests by **energy level** and **location**, so you can quickly find the right task for your current situation.

**Key traits**:
- Tag quests with energy/context metadata
- Filter the quest list in real-time
- Help with task paralysis

### Filter Types

**Energy Level** (how much focus you have):
- **High**: 5+ hours of sustained focus available
- **Medium**: 2-5 hours available
- **Low**: Under 2 hours, or tired

**Context** (where you are):
- **Home**: Comfortable, private space
- **Office**: Professional environment
- **Anywhere**: Location-independent task

**Tags** (custom, optional):
- Examples: `urgent`, `creative`, `deep-work`, `meetings`

### Using Filters

**In the Panopticon**:
```
FILTER CONTROLS

Energy:
[ANY] [HIGH] [MEDIUM] [LOW]

Context:
[ANY] [HOME] [OFFICE] [ANYWHERE]

[CLEAR FILTERS]
```

**How to filter**:
1. Click an **Energy** button to show only quests matching that level
2. Click a **Context** button for location-based filtering
3. Combine filters (e.g., "High energy" + "Office" = demanding office tasks)
4. Click **[CLEAR FILTERS]** to show all quests again

**Effects**:
- Quest list updates immediately
- Non-matching quests hidden
- Filtered buttons show visual highlight

### Filter Commands

Quick commands to set filters:

| Command | Effect |
|---------|--------|
| `Filters: Show High Energy Quests` | Filter to high-energy only |
| `Filters: Show Medium Energy Quests` | Filter to medium-energy only |
| `Filters: Show Low Energy Quests` | Filter to low-energy only |
| `Filters: Clear All Filters` | Show all quests |

### Tagging Quests (Future Feature)

When you create a quest (or click on a quest's details):
```
Energy Level: [High ▼]
Context: [Home ▼]
Tags: [urgent] [creative] [deep-work]
```

Add custom tags to organize further:
- Filter to only `urgent` quests
- Group by `creative` vs `analytical`
- Quick-find `deep-work` when you have flow time

---

## DLC 6: Analytics & Endgame

### What is the Analytics System?

**Analytics** track your performance over time and unlock the endgame: defeating bosses to reach Level 50 and win.

**Key elements**:
- Daily metrics collection
- Weekly performance reports
- Boss milestone system
- Streak counter
- Win condition at Level 50

### Daily Metrics

Every day, the game automatically tracks:
```
Date: 2026-01-21
Quests Completed: 4
Quests Failed: 1
XP Earned: 120
Gold Earned: 80
Damage Taken: 25
Skills Leveled: 1 (Python)
Chains Completed: 0
```

**Where to see it**:
- Command: `Analytics: View Game Stats`
- Output: `Level: 8 | Streak: 5 | Quests: 47`

### Streak System

**How streaks work**:
- **Current Streak**: Consecutive days you logged in and completed ≥1 quest
- **Longest Streak**: Your personal record
- **Reset condition**: Miss a day with 0 completions

**Displayed**:
ANALYTICS & PROGRESS

Current Streak: 5 (next: 6)
Longest Streak: 23

**Motivational**: Streaks create daily urgency. Missing one day resets everything!

### Weekly Performance Reports

**Generated automatically** every Sunday at midnight.

**Command**: `Analytics: Generate Weekly Report`

**Report includes**:

WEEKLY REPORT - Week 3
Jan 15 - Jan 21, 2026

Total Quests: 17 ✓
Success Rate: 85%
Total XP Earned: 450
Total Gold Earned: 320

Top 3 Skills:
1. Python (5 uses, +2 levels)
2. Writing (3 uses, +1 level)
3. DevOps (2 uses)

Best Day: Tuesday (5 quests)
Worst Day: Friday (0 quests)

Damage Report:
- HP Lost: 40
- Lockdowns: 1
- Times Shielded: 2

Forecast:
- Projected Survival: 14 days
- Action Items:
  1. Buy shield (deficit: -30g)
  2. Polish rusted skills

### Boss Milestone System

**Bosses unlock at specific levels** and represent major challenges.

**Boss Roster**:

|Level|Boss Name|Reward|Difficulty|
|---|---|---|---|
|10|The First Trial|500 XP|Medium|
|20|The Nemesis Returns|1000 XP|Hard|
|30|The Reaper Awakens|1500 XP|Extreme|
|50|The Final Ascension|5000 XP|Legendary|

**How bosses work**:

1. **Reach level 10**: Boss automatically unlocks
2. **Message**: "Boss Unlocked: The First Trial (Level 10)"
3. **Command**: `Endgame: Check Boss Milestones` to see all
4. **Boss quest**: Can be deployed like normal quest (special purple styling)
5. **Epic rewards**: 1000 XP + 1000g for defeating

**Defeating a boss**:

- Deploy the boss quest
- Complete it (same as any quest)
- Receive epic rewards
- Unlock next boss (if at next milestone level)

### Win Condition (Level 50)

**THE GOAL**: Reach Level 50 and defeat "The Final Ascension" boss.

**When you defeat the final boss**:

VICTORY! You reached Level 50 in 87 days!

🎉 GAME WON! 🎉

Your Legacy:
- Total Quests: 450
- Total Skills: 12
- Bosses Defeated: 4
- Runs to Victory: 3


**Game state after winning**:

- You can continue playing
- Stats are preserved
- Can start a new run or continue current
- Victory is recorded in legacy

**Why Level 50?**

- It's a meaningful milestone (2 major prestige levels)
- Takes months of dedicated play
- Creates long-term progression goal
- Each death teaches you how to survive longer

---

## Advanced Mechanics

### The Permanent Scar System

Every time you die:

1. **Scar accumulates**: `legacy.deathCount += 1`
2. **Starting gold penalty**: Next run starts with `BaseGold × (0.9 ^ scars)`
    - 1 scar: 90% starting gold
    - 2 scars: 81% starting gold
    - 5 scars: 59% starting gold

**Why permanent?**

- Death should feel consequential
- Encourages careful play
- Each death makes survival harder
- Creates narrative: "I've learned from my mistakes"

### The Glitch Oracle

When you're in critical state (HP < 30 or Gold < -50), the Oracle shows corrupted text:

🔮 THE ORACLE

SÌ·uÌ·rÌ·vÌ·iÌ·vÌ·aÌ·lÌ·:Ì· Ì·?Ì·?Ì·?Ì· Ì·DÌ·AÌ·YÌ·SÌ· Ì·LÌ·EÌ·FÌ·TÌ·

[CORRUPTED DATA]
[NO FUTURE DETECTED]
[R U N]

**Why glitch?**

- Immersive indicator of danger
- 30% chance when in crisis
- Psychological pressure
- Cool visual effect

### Skill Synergy

When you complete a quest with **both a primary and secondary skill**, you gain:

- **Bonus XP**: (secondary skill level × 0.5) added to both skills
- **Neural link message**: "🔗 Neural Link Established"
- **Future bonus**: Same skill pair gets bonus when used together
- **Mission progress**: "Synergist" daily mission tracks this

**Why synergy?**

- Encourages varied skill usage
- Creates build paths (e.g., "Python + DevOps" combo)
- Rewards planning
- Makes skill selection strategic

### The Adrenaline Modifier

When "Adrenaline" daily modifier is active:

- **2x XP** from all quests
- **-5 HP** per quest completed
- Creates risk/reward: farm XP but lose health

**Strategic use**:

- Deploy easy quests to spam XP
- Manage health carefully
- Plan healing (buy Stimpacks)
- Race to level up before running out of HP

---

## Strategy Guide

### Early Game (Levels 1-5)

**Focus**:

1. Build starting gold (don't waste gold)
2. Get 1-2 core skills (pick 2-3 and master them)
3. Never let health drop below 50 (stay safe)
4. Complete daily missions for bonuses

**Tactics**:

- Deploy only Trivial/Easy quests (safe, predictable)
- Avoid Suicide quests (too risky)
- Use same skills repeatedly to avoid rust
- Buy nothing from shop yet (build savings)

**Pitfalls to avoid**:

- Deploying too many hard quests (you'll fail)
- Ignoring daily missions (free gold/XP)
- Failing constantly (Rival Damage spirals)
- Taking High Stakes quests (doubles damage risk)

### Mid Game (Levels 5-15)

**Focus**:

1. Reach Level 10 (unlock first boss)
2. Build diverse skill set (3-4 skills)
3. Experiment with quest chains
4. Start using research quests (DLC 2)

**Tactics**:

- Introduce Medium difficulty quests
- Use shields strategically (before risky quests)
- Deploy quest chains for big projects
- Balance research and combat (2:1 ratio)
- Use filters to find energy-matched quests

**Economy**:

- Build 200+ gold reserve
- Buy 1-2 shields for boss attempts
- Don't go into debt (avoid doubling damage)
- Accept high-stakes for bonus gold when safe

### Late Game (Levels 15-50)

**Focus**:

1. Defeat each boss in order (10, 20, 30, 50)
2. Maintain long streaks
3. Min-max your build (specialize)
4. Prepare for final boss

**Tactics**:

- Deploy quests with multiple synergies (build combos)
- Use quest chains for milestone unlocks
- Time high-stakes quests for Flow State modifier
- Meditate through lockdowns (don't lose runs)
- Buy shields before major boss attempts

**Dangerous scenarios**:

- **Two failures in a row**: Get locked down
- **Low gold + Rival Sabotage modifier**: Debt spiral
- **Multiple rusted skills**: XP slows down
- **Failed boss attempt**: Massive damage

### Final Boss Strategy (Level 50)

When you reach Level 50:

1. **Don't rush**: Boss will always be there
2. **Build reserves**: 300+ gold, 90+ HP
3. **Stock supplies**: Buy 2-3 shields
4. **Perfect run**: Complete dailies for no lockdown risk
5. **Deploy boss**: It's just another quest (but 1000 XP/gold reward)
6. **Complete it**: You win!

---

## Commands Reference

### Navigation

|Command|Effect|
|---|---|
|`open-panopticon`|Open the Panopticon sidebar|
|`toggle-focus`|Toggle brown noise for focus|

### Quest Management

|Command|Effect|
|---|---|
|`Deploy`|Open quest creation modal (also button in Panopticon)|
|`Shop`|Open shop modal (buy items)|

### Daily Management

|Command|Effect|
|---|---|
|`Reroll Chaos`|Roll a new daily modifier|
|`Recover (Lockdown)`|Show lockdown timer and estimate|
|`Meditation: Start Meditation`|Meditate (reduces lockdown by 5h per 10 clicks)|

### Research (DLC 2)

|Command|Effect|
|---|---|
|`Research: Create Research Quest`|Deploy a new research quest|
|`Research: View Research Library`|See all active & completed research|

### Chains (DLC 4)

|Command|Effect|
|---|---|
|`Chains: Create Quest Chain`|Build a new quest chain|
|`Chains: View Active Chain`|See current chain progress|

### Filters (DLC 5)

|Command|Effect|
|---|---|
|`Filters: Show High Energy Quests`|Filter to high-energy only|
|`Filters: Show Medium Energy Quests`|Filter to medium-energy only|
|`Filters: Show Low Energy Quests`|Filter to low-energy only|
|`Filters: Clear All Filters`|Show all quests|

### Analytics (DLC 6)

|Command|Effect|
|---|---|
|`Analytics: Generate Weekly Report`|Create weekly performance report|
|`Analytics: View Game Stats`|Show current stats snapshot|
|`Endgame: Check Boss Milestones`|View boss progression|

### Emergency

|Command|Effect|
|---|---|
|`ACCEPT DEATH`|Manually end run (triggers death sequence)|
|`Reroll Chaos`|Get new daily modifier|

---

## Tips & Tricks

### Gold Management

- **Never go negative**: Debt doubles damage. Avoid it.
- **Build 200g reserve**: Emergency shield fund.
- **Track flow state**: When Windfall modifier is active, spam easy quests for gold.
- **Plan purchases**: Buy shields before risky quests, not after you need them.

### Health Management

- **Don't let HP drop below 50**: You're always 2-3 failures from death.
- **Buy stimpacks proactively**: +20 HP for 50g is reasonable.
- **Use Rest Day for dangerous days**: Prevents damage spirals.
- **Meditate through lockdowns**: 10 clicks = 5 fewer hours locked down.

### Skill Strategy

- **Pick 2-3 core skills early**: Master them, ignore others.
- **Use synergies**: Primary + Secondary skill combos gain bonus XP.
- **Polish rust immediately**: -20% XP requirement reduction is huge.
- **Don't abandon skills**: Rust takes time but impacts long-term.

### Daily Mission Mastery

- **Prioritize "Morning Win"**: Complete 1 Trivial before 10 AM (free gold).
- **Chain "Momentum"**: Complete 3+ quests naturally during the day.
- **Avoid "Survivor" if you're risky**: No damage all day is hard.
- **Target Windfall days**: Double gold rewards with risky quests when odds are favorable.

### Boss Tactics

- **Save before attempting**: Plan your approach.
- **Use shields**: Boss quests have double health/damage for dramatic effect.
- **Deploy after completing 3+ quests**: Momentum makes you confident.
- **Don't rush**: You can attempt boss any time after unlock. Wait for perfect conditions.

### Lockdown Recovery

- **Meditate immediately**: Each click = 30 min relief.
- **Get to 10 clicks**: 5 hours off is significant.
- **Use time wisely**: Read, plan, prepare for next phase.
- **Don't fail again**: Failing again extends lockdown.

---

## Troubleshooting

### "Not in Lockdown. No need to meditate."

You tried to meditate when not locked down. Meditation only works when locked down (50+ damage taken in one session).

### "Already meditating. Wait 30 seconds."

30-second cooldown between meditation clicks to prevent spam.

### "RESEARCH BLOCKED: Complete 2 combat quests per research quest"

You've hit the 2:1 combat-to-research ratio limit. Complete 2 combat quests before creating more research quests.

### "Quest is not next in chain"

You tried to complete a quest that's not the active quest in the chain. Complete quests in order.

### "Quest locked in chain. Complete the active quest first."

Chain enforcement: only the current quest can be completed. Previous are done, next are locked.

### Death Happened

Your HP reached 0. You can:

1. Accept death (new game+)
2. Load a save (if you have one)
3. Accept scars and restart

Each death adds 1 scar (-10% starting gold penalty).

---

## Final Words

**SISYPHUS** is a game about persistence. It's designed to:

- **Challenge you**: Boss battles, Rival escalation, permanent consequences
- **Reward you**: Skill growth, level progression, boss defeats, eventual victory
- **Support you**: Rest days, shields, meditation recovery
- **Teach you**: How to manage resources, plan ahead, balance risk/reward

The goal isn't just to reach Level 50. It's to develop the **mindset** of a persistent achiever who doesn't give up, learns from failures, and systematically overcomes challenges.

Every quest matters. Every skill counts. Every day is an opportunity.

Good luck, and welcome to **SISYPHUS**.