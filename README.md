# 🏔️ Sisyphus Engine for Obsidian

> **"One must imagine Sisyphus happy. But Sisyphus must also get to work."**

![Version](https://img.shields.io/badge/version-2.5.0-blueviolet?style=for-the-badge) ![Platform](https://img.shields.io/badge/platform-Obsidian-black?style=for-the-badge) ![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Sisyphus Engine** is a high-stakes gamification OS for Obsidian. It replaces your todo list with a roguelike RPG system where productivity dictates survival. 

**Core Rule:** If your HP hits 0, the run ends. Your level, gold, and progress are wiped. You keep only your "Scars."

---

## ⚡ Quick Start

### **1. Installation**
Since Sisyphus is an engine, it requires manual placement of the core files.

1. **Locate your Plugin Folder:**
   * **Windows:** `\Path\To\Vault\.obsidian\plugins\sisyphus-engine\`
   * **Mac/Linux:** `~/.config/obsidian/Vault/.obsidian/plugins/sisyphus-engine/`
2. **Deploy Files:** * Copy `main.js`, `styles.css`, and `manifest.json` into this folder.
   * **CRITICAL:** You must also move the `src/` folder into the plugin directory for the engine to reference local assets and templates correctly.
3. **Activate:** Open Obsidian Settings > Community Plugins > Enable **Sisyphus Engine**.
4. **Initialize:** Press `Ctrl/Cmd + P` and run `Sisyphus: Open Panopticon`.

### **2. The Loop**
1. **Deploy Quests:** Press `Ctrl/Cmd + D` to create tasks. Assign difficulty (1-5) and deadlines.
2. **Do The Work:** Complete tasks in real life.
3. **Log It:** Click "Complete" in the HUD to earn XP/Gold.
4. **Survive:** If you miss deadlines or fail quests, you take Damage. If HP hits 0, you die.

---

## 📚 Documentation & Wiki

This engine is deep. For detailed mechanics, boss data, and formulas, consult the **[Official Wiki](WIKI.md)**.

* **[HUD & Vitals](WIKI.md#1-the-panopticon-hud)** - Understanding HP, Gold, and Glitches.
* **[The Mechanics](WIKI.md#2-core-gameplay-loop)** - Experience, Leveling, and Risk.
* **[Boss Data](WIKI.md#10-boss-system)** - HP values and spawn thresholds for all 4 bosses.
* **[DLC Content](WIKI.md#4-dlc-1-daily-missions--scraps)** - Research, Meditation, and Chains.

---

## ⌨️ Controls

| Hotkey | Command | Action |
|:---|:---|:---|
| `Ctrl/Cmd + D` | Deploy Quest | Open quest creation modal |
| `Ctrl/Cmd + Shift + Z` | Undo Deletion | Restore last deleted quest (60s) |
| `Ctrl/Cmd + Shift + C` | Quick Capture | Dump thought to Inbox |

**Quick Capture Syntax:**
Type in the HUD input bar:
* `Task /1` → Trivial
* `Task /5` → SUICIDE Difficulty
* `Task` → Medium (Default)

---

## 🤝 Community

* **Report Bugs:** GitHub Issues

**Remember:** One must imagine Sisyphus happy. But Sisyphus must also get to work.