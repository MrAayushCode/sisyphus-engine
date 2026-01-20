'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// EVENT BUS SYSTEM
class TinyEmitter {
    constructor() {
        this.listeners = {};
    }
    on(event, fn) {
        (this.listeners[event] = this.listeners[event] || []).push(fn);
    }
    off(event, fn) {
        if (!this.listeners[event])
            return;
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
    trigger(event, data) {
        (this.listeners[event] || []).forEach(fn => fn(data));
    }
}
class AudioController {
    constructor(muted) {
        this.audioCtx = null;
        this.brownNoiseNode = null;
        this.muted = false;
        this.muted = muted;
    }
    setMuted(muted) { this.muted = muted; }
    initAudio() { if (!this.audioCtx)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted)
            return;
        this.initAudio();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }
    playSound(type) {
        if (type === "success") {
            this.playTone(600, "sine", 0.1);
            setTimeout(() => this.playTone(800, "sine", 0.2), 100);
        }
        else if (type === "fail") {
            this.playTone(150, "sawtooth", 0.4);
            setTimeout(() => this.playTone(100, "sawtooth", 0.4), 150);
        }
        else if (type === "death") {
            this.playTone(50, "square", 1.0);
        }
        else if (type === "click") {
            this.playTone(800, "sine", 0.05);
        }
        else if (type === "heartbeat") {
            this.playTone(60, "sine", 0.1, 0.5);
            setTimeout(() => this.playTone(50, "sine", 0.1, 0.4), 150);
        }
        else if (type === "meditate") {
            this.playTone(432, "sine", 2.0, 0.05);
        }
    }
    toggleBrownNoise() {
        this.initAudio();
        if (this.brownNoiseNode) {
            this.brownNoiseNode.disconnect();
            this.brownNoiseNode = null;
            new obsidian.Notice("Focus Audio: OFF");
        }
        else {
            const bufferSize = 4096;
            this.brownNoiseNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
            let lastOut = 0;
            this.brownNoiseNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 0.1;
                }
            };
            this.brownNoiseNode.connect(this.audioCtx.destination);
            new obsidian.Notice("Focus Audio: ON (Brown Noise)");
        }
    }
}

class ChaosModal extends obsidian.Modal {
    constructor(app, m) { super(app); this.modifier = m; }
    onOpen() {
        const c = this.contentEl;
        const h1 = c.createEl("h1", { text: "THE OMEN" });
        h1.setAttribute("style", "text-align:center; color:#f55;");
        const ic = c.createEl("div", { text: this.modifier.icon });
        ic.setAttribute("style", "font-size:80px; text-align:center;");
        const h2 = c.createEl("h2", { text: this.modifier.name });
        h2.setAttribute("style", "text-align:center;");
        const p = c.createEl("p", { text: this.modifier.desc });
        p.setAttribute("style", "text-align:center");
        const b = c.createEl("button", { text: "Acknowledge" });
        b.addClass("mod-cta");
        b.style.display = "block";
        b.style.margin = "20px auto";
        b.onclick = () => this.close();
    }
    onClose() { this.contentEl.empty(); }
}
class ShopModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🛒 BLACK MARKET" });
        contentEl.createEl("p", { text: `Purse: 🪙 ${this.plugin.settings.gold}` });
        this.item(contentEl, "💉 Stimpack", "Heal 20 HP", 50, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.hp = Math.min(this.plugin.settings.maxHp, this.plugin.settings.hp + 20);
        }));
        this.item(contentEl, "💣 Sabotage", "-5 Rival Dmg", 200, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.rivalDmg = Math.max(5, this.plugin.settings.rivalDmg - 5);
        }));
        this.item(contentEl, "🛡️ Shield", "24h Protection", 150, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.shieldedUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
        this.item(contentEl, "😴 Rest Day", "Safe for 24h", 100, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.restDayUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
    }
    item(el, name, desc, cost, effect) {
        const c = el.createDiv();
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;");
        const i = c.createDiv();
        i.createEl("b", { text: name });
        i.createEl("div", { text: desc });
        const b = c.createEl("button", { text: `${cost} G` });
        if (this.plugin.settings.gold < cost) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.5";
        }
        else {
            b.addClass("mod-cta");
            b.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.gold -= cost;
                yield effect();
                yield this.plugin.engine.save();
                new obsidian.Notice(`Bought ${name}`);
                this.close();
                new ShopModal(this.app, this.plugin).open();
            });
        }
    }
    onClose() { this.contentEl.empty(); }
}
class QuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.difficulty = 3;
        this.skill = "None";
        this.secSkill = "None";
        this.deadline = "";
        this.highStakes = false;
        this.isBoss = false;
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚔️ DEPLOYMENT" });
        new obsidian.Setting(contentEl).setName("Objective").addText(t => {
            t.onChange(v => this.name = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1", "Trivial").addOption("2", "Easy").addOption("3", "Medium").addOption("4", "Hard").addOption("5", "SUICIDE").setValue("3").onChange(v => this.difficulty = parseInt(v)));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        skills["+ New"] = "+ New";
        new obsidian.Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => {
            if (v === "+ New") {
                this.close();
                new SkillManagerModal(this.app, this.plugin).open();
            }
            else
                this.skill = v;
        }));
        new obsidian.Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new obsidian.Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t => t.setValue(false).onChange(v => this.highStakes = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => {
            if (this.name) {
                this.plugin.engine.createQuest(this.name, this.difficulty, this.skill, this.secSkill, this.deadline, this.highStakes, "Normal", this.isBoss);
                this.close();
            }
        }));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillManagerModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Add New Node" });
        let n = "";
        new obsidian.Setting(contentEl).setName("Node Name").addText(t => t.onChange(v => n = v)).addButton(b => b.setButtonText("Create").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (n) {
                this.plugin.settings.skills.push({ name: n, level: 1, xp: 0, xpReq: 5, lastUsed: new Date().toISOString(), rust: 0, connections: [] });
                yield this.plugin.engine.save();
                this.close();
            }
        })));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillDetailModal extends obsidian.Modal {
    constructor(app, plugin, index) { super(app); this.plugin = plugin; this.index = index; }
    onOpen() {
        const { contentEl } = this;
        const s = this.plugin.settings.skills[this.index];
        contentEl.createEl("h2", { text: `Node: ${s.name}` });
        new obsidian.Setting(contentEl).setName("Name").addText(t => t.setValue(s.name).onChange(v => s.name = v));
        new obsidian.Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b => b.setButtonText("Manual Polish").onClick(() => __awaiter(this, void 0, void 0, function* () {
            s.rust = 0;
            s.xpReq = Math.floor(s.xpReq / 1.1);
            yield this.plugin.engine.save();
            this.close();
            new obsidian.Notice("Rust polished.");
        })));
        const div = contentEl.createDiv();
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        const bSave = div.createEl("button", { text: "Save" });
        bSave.addClass("mod-cta");
        bSave.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.save(); this.close(); });
        const bDel = div.createEl("button", { text: "Delete Node" });
        bDel.setAttribute("style", "color:red;");
        bDel.onclick = () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.skills.splice(this.index, 1);
            yield this.plugin.engine.save();
            this.close();
        });
    }
    onClose() { this.contentEl.empty(); }
}
class ResearchQuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.title = "";
        this.type = "survey";
        this.linkedSkill = "None";
        this.linkedCombatQuest = "None";
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH DEPLOYMENT" });
        new obsidian.Setting(contentEl)
            .setName("Research Title")
            .addText(t => {
            t.onChange(v => this.title = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl)
            .setName("Research Type")
            .addDropdown(d => d
            .addOption("survey", "Survey (100-200 words)")
            .addOption("deep_dive", "Deep Dive (200-400 words)")
            .setValue("survey")
            .onChange(v => this.type = v));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        new obsidian.Setting(contentEl)
            .setName("Linked Skill")
            .addDropdown(d => d
            .addOptions(skills)
            .setValue("None")
            .onChange(v => this.linkedSkill = v));
        const combatQuests = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    combatQuests[f.basename] = f.basename;
                }
            });
        }
        new obsidian.Setting(contentEl)
            .setName("Link Combat Quest")
            .addDropdown(d => d
            .addOptions(combatQuests)
            .setValue("None")
            .onChange(v => this.linkedCombatQuest = v));
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE RESEARCH")
            .setCta()
            .onClick(() => {
            if (this.title) {
                this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
                this.close();
            }
        }));
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ResearchListModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH LIBRARY" });
        const stats = this.plugin.engine.getResearchRatio();
        const statsEl = contentEl.createDiv({ cls: "sisy-research-stats" });
        statsEl.createEl("p", { text: `Combat Quests: ${stats.combat}` });
        statsEl.createEl("p", { text: `Research Quests: ${stats.research}` });
        statsEl.createEl("p", { text: `Ratio: ${stats.ratio}:1` });
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = contentEl.createDiv();
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 10px 0;");
            warning.setText("RESEARCH BLOCKED: Need 2:1 combat to research ratio");
        }
        contentEl.createEl("h3", { text: "Active Research" });
        const quests = this.plugin.settings.researchQuests.filter(q => !q.completed);
        if (quests.length === 0) {
            contentEl.createEl("p", { text: "No active research quests." });
        }
        else {
            quests.forEach((q) => {
                const card = contentEl.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #444; padding: 10px; margin: 5px 0; border-radius: 4px;");
                const header = card.createEl("h4", { text: q.title });
                header.setAttribute("style", "margin: 0 0 5px 0;");
                const info = card.createEl("div");
                info.setText(`Type: ${q.type === "survey" ? "Survey" : "Deep Dive"} | Words: ${q.wordCount}/${q.wordLimit}`);
                info.setAttribute("style", "font-size: 0.9em; opacity: 0.8;");
                const actions = card.createDiv();
                actions.setAttribute("style", "margin-top: 8px; display: flex; gap: 5px;");
                const completeBtn = actions.createEl("button", { text: "COMPLETE" });
                completeBtn.setAttribute("style", "flex: 1; padding: 5px; background: green; color: white; border: none; border-radius: 3px; cursor: pointer;");
                completeBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(q.id, q.wordCount);
                    this.close();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 5px; background: red; color: white; border: none; border-radius: 3px; cursor: pointer;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(q.id);
                    this.close();
                };
            });
        }
        contentEl.createEl("h3", { text: "Completed Research" });
        const completed = this.plugin.settings.researchQuests.filter(q => q.completed);
        if (completed.length === 0) {
            contentEl.createEl("p", { text: "No completed research." });
        }
        else {
            completed.forEach((q) => {
                const item = contentEl.createEl("p");
                item.setText(`+ ${q.title} (${q.type === "survey" ? "Survey" : "Deep Dive"})`);
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em;");
            });
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ChainBuilderModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.chainName = "";
        this.selectedQuests = [];
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "CHAIN BUILDER" });
        new obsidian.Setting(contentEl)
            .setName("Chain Name")
            .addText(t => {
            t.onChange(v => this.chainName = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        contentEl.createEl("h3", { text: "Select Quests" });
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests = [];
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    quests.push(f.basename);
                }
            });
        }
        quests.forEach((quest, idx) => {
            new obsidian.Setting(contentEl)
                .setName(quest)
                .addToggle(t => t.onChange(v => {
                if (v) {
                    this.selectedQuests.push(quest);
                }
                else {
                    this.selectedQuests = this.selectedQuests.filter(q => q !== quest);
                }
            }));
        });
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE CHAIN")
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (this.chainName && this.selectedQuests.length >= 2) {
                yield this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
                this.close();
            }
            else {
                new obsidian.Notice("Chain needs a name and at least 2 quests");
            }
        })));
    }
    onClose() {
        this.contentEl.empty();
    }
}

/**
 * DLC 6: Analytics & Endgame Engine
 * Handles all metrics tracking, boss milestones, achievements, and win condition
 *
 * ISOLATED: Only reads/writes to settings.dayMetrics, weeklyReports, bossMilestones, streak, achievements
 * DEPENDENCIES: moment, SisyphusSettings types
 */
class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Track daily metrics - called whenever a quest is completed/failed/etc
     */
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = {
                date: today,
                questsCompleted: 0,
                questsFailed: 0,
                xpEarned: 0,
                goldEarned: 0,
                damagesTaken: 0,
                skillsLeveled: [],
                chainsCompleted: 0
            };
            this.settings.dayMetrics.push(metric);
        }
        switch (type) {
            case "quest_complete":
                metric.questsCompleted += amount;
                break;
            case "quest_fail":
                metric.questsFailed += amount;
                break;
            case "xp":
                metric.xpEarned += amount;
                break;
            case "gold":
                metric.goldEarned += amount;
                break;
            case "damage":
                metric.damagesTaken += amount;
                break;
            case "skill_level":
                metric.skillsLeveled.push("Skill leveled");
                break;
            case "chain_complete":
                metric.chainsCompleted += amount;
                break;
        }
    }
    /**
     * Update daily streak - called once per day at login
     */
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate === today) {
            return; // Already counted today
        }
        const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
        if (lastDate === yesterday) {
            // Consecutive day
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        }
        else {
            // Streak broken, start new one
            this.settings.streak.current = 1;
        }
        this.settings.streak.lastDate = today;
    }
    /**
     * Initialize boss milestones on first run
     */
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            this.settings.bossMilestones = milestones;
        }
    }
    /**
     * Check if any bosses should be unlocked based on current level
     */
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        this.settings.bossMilestones.forEach((boss) => {
            var _a;
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                    this.audioController.playSound("success");
                }
            }
        });
        return messages;
    }
    /**
     * Mark boss as defeated and award XP
     */
    defeatBoss(level) {
        var _a;
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss) {
            return { success: false, message: "Boss not found", xpReward: 0 };
        }
        if (boss.defeated) {
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        }
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        // Check win condition
        if (level === 50) {
            this.winGame();
            return { success: true, message: `Boss Defeated: ${boss.name}! VICTORY!`, xpReward: boss.xpReward };
        }
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }
    /**
     * Trigger win condition
     */
    winGame() {
        var _a;
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
    }
    /**
     * Generate weekly report
     */
    generateWeeklyReport() {
        const week = obsidian.moment().week();
        const startDate = obsidian.moment().startOf('week').format("YYYY-MM-DD");
        const endDate = obsidian.moment().endOf('week').format("YYYY-MM-DD");
        const weekMetrics = this.settings.dayMetrics.filter((m) => obsidian.moment(m.date).isBetween(obsidian.moment(startDate), obsidian.moment(endDate), null, '[]'));
        const totalQuests = weekMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum, m) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum, m) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum, m) => sum + m.goldEarned, 0);
        const topSkills = this.settings.skills
            .sort((a, b) => (b.level - a.level))
            .slice(0, 3)
            .map((s) => s.name);
        const bestDay = weekMetrics.length > 0
            ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        const report = {
            week: week,
            startDate: startDate,
            endDate: endDate,
            totalQuests: totalQuests,
            successRate: successRate,
            totalXp: totalXp,
            totalGold: totalGold,
            topSkills: topSkills,
            bestDay: bestDay,
            worstDay: worstDay
        };
        this.settings.weeklyReports.push(report);
        return report;
    }
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        var _a;
        const achievement = this.settings.achievements.find((a) => a.id === achievementId);
        if (!achievement || achievement.unlocked)
            return false;
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        return true;
    }
    /**
     * Get current game stats snapshot
     */
    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum, m) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesDefeated: this.settings.bossMilestones.filter((b) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
    /**
     * Get survival estimate (rough calculation)
     */
    getSurvivalEstimate() {
        const damagePerFailure = 10 + Math.floor(this.settings.rivalDmg / 2);
        const actualDamage = this.settings.gold < 0 ? damagePerFailure * 2 : damagePerFailure;
        return Math.floor(this.settings.hp / Math.max(1, actualDamage));
    }
}

/**
 * DLC 3: Meditation & Recovery Engine
 * Handles lockdown state, meditation healing, and quest deletion quota
 *
 * ISOLATED: Only reads/writes to lockdownUntil, isMeditating, meditationClicksThisLockdown,
 *           questDeletionsToday, lastDeletionReset
 * DEPENDENCIES: moment, SisyphusSettings
 * SIDE EFFECTS: Plays audio (432 Hz tone)
 */
class MeditationEngine {
    constructor(settings, audioController) {
        this.meditationCooldownMs = 30000; // 30 seconds
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Check if currently locked down
     */
    isLockedDown() {
        if (!this.settings.lockdownUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.lockdownUntil));
    }
    /**
     * Get lockdown time remaining in minutes
     */
    getLockdownTimeRemaining() {
        if (!this.isLockedDown()) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }
        const totalMinutes = obsidian.moment(this.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, totalMinutes };
    }
    /**
     * Trigger lockdown after taking 50+ damage
     */
    triggerLockdown() {
        this.settings.lockdownUntil = obsidian.moment().add(6, 'hours').toISOString();
        this.settings.meditationClicksThisLockdown = 0;
    }
    /**
     * Perform one meditation cycle (click)
     * Returns: { success, cyclesDone, cyclesRemaining, message }
     */
    meditate() {
        var _a;
        if (!this.isLockedDown()) {
            return {
                success: false,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Not in lockdown. No need to meditate.",
                lockdownReduced: false
            };
        }
        if (this.settings.isMeditating) {
            return {
                success: false,
                cyclesDone: this.settings.meditationClicksThisLockdown,
                cyclesRemaining: Math.max(0, 10 - this.settings.meditationClicksThisLockdown),
                message: "Already meditating. Wait 30 seconds.",
                lockdownReduced: false
            };
        }
        this.settings.isMeditating = true;
        this.settings.meditationClicksThisLockdown++;
        // Play healing frequency
        this.playMeditationSound();
        const remaining = 10 - this.settings.meditationClicksThisLockdown;
        // Check if 10 cycles complete
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = obsidian.moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            // Auto-reset meditation flag after cooldown
            setTimeout(() => {
                this.settings.isMeditating = false;
            }, this.meditationCooldownMs);
            return {
                success: true,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Meditation complete. Lockdown reduced by 5 hours.",
                lockdownReduced: true
            };
        }
        // Auto-reset meditation flag after cooldown
        setTimeout(() => {
            this.settings.isMeditating = false;
        }, this.meditationCooldownMs);
        return {
            success: true,
            cyclesDone: this.settings.meditationClicksThisLockdown,
            cyclesRemaining: remaining,
            message: `Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`,
            lockdownReduced: false
        };
    }
    /**
     * Play 432 Hz healing frequency for 1 second
     */
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.frequency.value = 432;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        }
        catch (e) {
            console.log("Audio not available for meditation");
        }
    }
    /**
     * Get meditation status for current lockdown
     */
    getMeditationStatus() {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30; // 30 min per cycle
        return {
            cyclesDone,
            cyclesRemaining,
            timeReduced
        };
    }
    /**
     * Reset deletion quota if new day
     */
    ensureDeletionQuotaReset() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
    }
    /**
     * Check if user has free deletions left today
     */
    canDeleteQuestFree() {
        this.ensureDeletionQuotaReset();
        return this.settings.questDeletionsToday < 3;
    }
    /**
     * Get deletion quota status
     */
    getDeletionQuota() {
        this.ensureDeletionQuotaReset();
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        const paid = Math.max(0, this.settings.questDeletionsToday - 3);
        return {
            free: remaining,
            paid: paid,
            remaining: remaining
        };
    }
    /**
     * Delete a quest and charge gold if necessary
     * Returns: { cost, message }
     */
    applyDeletionCost() {
        this.ensureDeletionQuotaReset();
        let cost = 0;
        let message = "";
        if (this.settings.questDeletionsToday >= 3) {
            // Paid deletion
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        }
        else {
            // Free deletion
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        return { cost, message };
    }
}

/**
 * DLC 2: Research Quest System Engine
 * Handles research quest creation, completion, word count validation, and combat:research ratio
 *
 * ISOLATED: Only reads/writes to researchQuests, researchStats
 * DEPENDENCIES: SisyphusSettings types
 * REQUIREMENTS: Audio callbacks from parent for notifications
 */
class ResearchEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new research quest
     * Checks 2:1 combat:research ratio before allowing creation
     */
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check 2:1 combat:research ratio
            if (!this.canCreateResearchQuest()) {
                return {
                    success: false,
                    message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
                };
            }
            const wordLimit = type === "survey" ? 200 : 400;
            const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
            const researchQuest = {
                id: questId,
                title: title,
                type: type,
                linkedSkill: linkedSkill,
                wordLimit: wordLimit,
                wordCount: 0,
                linkedCombatQuest: linkedCombatQuest,
                createdAt: new Date().toISOString(),
                completed: false
            };
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
            this.settings.researchStats.totalResearch++;
            return {
                success: true,
                message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"} (${wordLimit} words)`,
                questId: questId
            };
        });
    }
    /**
     * Complete a research quest
     * Validates word count (80-125%), applies penalties for overage, awards XP
     */
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest) {
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        }
        if (researchQuest.completed) {
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        }
        // Check minimum word count (80% of limit)
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return {
                success: false,
                message: `Quest too short! Minimum ${minWords} words required (you have ${finalWordCount})`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Check maximum word count (125% is locked)
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return {
                success: false,
                message: `Word count too high! Maximum ${Math.ceil(researchQuest.wordLimit * 1.25)} words allowed`,
                xpReward: 0,
                goldPenalty: 0
            };
        }
        // Calculate XP reward
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        // Calculate gold penalty for overage (100-125% range)
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            if (overagePercent > 0) {
                goldPenalty = Math.floor(20 * (overagePercent / 100));
            }
        }
        // Award XP to linked skill
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        // Apply penalty and mark complete
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
        let message = `Research Complete: ${researchQuest.title}! +${xpReward} XP`;
        if (goldPenalty > 0) {
            message += ` (-${goldPenalty}g overage penalty)`;
        }
        return { success: true, message, xpReward, goldPenalty };
    }
    /**
     * Delete a research quest
     */
    deleteResearchQuest(questId) {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            const quest = this.settings.researchQuests[index];
            this.settings.researchQuests.splice(index, 1);
            // Decrement stats appropriately
            if (!quest.completed) {
                this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            }
            else {
                this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
            }
            return { success: true, message: "Research quest deleted" };
        }
        return { success: false, message: "Research quest not found" };
    }
    /**
     * Update word count for a research quest (as user writes)
     */
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }
    /**
     * Get current combat:research ratio
     */
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return {
            combat: stats.totalCombat,
            research: stats.totalResearch,
            ratio: ratio.toFixed(2)
        };
    }
    /**
     * Check if user can create more research quests
     * Rule: Must have 2:1 combat to research ratio
     */
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
    /**
     * Get active (not completed) research quests
     */
    getActiveResearchQuests() {
        return this.settings.researchQuests.filter(q => !q.completed);
    }
    /**
     * Get completed research quests
     */
    getCompletedResearchQuests() {
        return this.settings.researchQuests.filter(q => q.completed);
    }
    /**
     * Validate word count status for a quest
     * Returns: { status: 'too_short' | 'perfect' | 'overage' | 'locked', percent: number }
     */
    validateWordCount(questId, wordCount) {
        const quest = this.settings.researchQuests.find(q => q.id === questId);
        if (!quest) {
            return { status: 'too_short', percent: 0, message: "Quest not found" };
        }
        const percent = (wordCount / quest.wordLimit) * 100;
        if (percent < 80) {
            return { status: 'too_short', percent, message: `Too short (${Math.ceil(percent)}%). Need 80% minimum.` };
        }
        if (percent <= 100) {
            return { status: 'perfect', percent, message: `Perfect range (${Math.ceil(percent)}%)` };
        }
        if (percent <= 125) {
            const tax = Math.floor(20 * ((percent - 100) / 100));
            return { status: 'overage', percent, message: `Overage warning: -${tax}g tax` };
        }
        return { status: 'locked', percent, message: `Locked! Maximum 125% of word limit.` };
    }
}

/**
 * DLC 4: Quest Chains Engine
 * Handles multi-quest sequences with ordering, locking, and completion tracking
 *
 * ISOLATED: Only reads/writes to activeChains, chainHistory, currentChainId, chainQuestsCompleted
 * DEPENDENCIES: SisyphusSettings types
 * INTEGRATION POINTS: Needs to hook into completeQuest() in main engine for chain progression
 */
class ChainsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new quest chain
     */
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (questNames.length < 2) {
                return {
                    success: false,
                    message: "Chain must have at least 2 quests"
                };
            }
            const chainId = `chain_${Date.now()}`;
            const chain = {
                id: chainId,
                name: name,
                quests: questNames,
                currentIndex: 0,
                completed: false,
                startedAt: new Date().toISOString(),
                isBoss: questNames[questNames.length - 1].toLowerCase().includes("boss")
            };
            this.settings.activeChains.push(chain);
            this.settings.currentChainId = chainId;
            return {
                success: true,
                message: `Chain created: ${name} (${questNames.length} quests)`,
                chainId: chainId
            };
        });
    }
    /**
     * Get the current active chain
     */
    getActiveChain() {
        if (!this.settings.currentChainId)
            return null;
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        return (chain && !chain.completed) ? chain : null;
    }
    /**
     * Get the next quest that should be completed in the active chain
     */
    getNextQuestInChain() {
        const chain = this.getActiveChain();
        if (!chain)
            return null;
        return chain.quests[chain.currentIndex] || null;
    }
    /**
     * Check if a quest is part of an active (incomplete) chain
     */
    isQuestInChain(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return false;
        return chain.quests.includes(questName);
    }
    /**
     * Check if a quest can be started (is it the next quest in the chain?)
     */
    canStartQuest(questName) {
        const chain = this.getActiveChain();
        if (!chain)
            return true; // Not in a chain, can start any quest
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    /**
     * Mark a quest as completed in the chain
     * Advances chain if successful, awards bonus XP if chain completes
     */
    completeChainQuest(questName) {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain", chainComplete: false, bonusXp: 0 };
            }
            const currentQuest = chain.quests[chain.currentIndex];
            if (currentQuest !== questName) {
                return {
                    success: false,
                    message: "Quest is not next in chain",
                    chainComplete: false,
                    bonusXp: 0
                };
            }
            chain.currentIndex++;
            this.settings.chainQuestsCompleted++;
            // Check if chain is complete
            if (chain.currentIndex >= chain.quests.length) {
                return this.completeChain(chain);
            }
            const remaining = chain.quests.length - chain.currentIndex;
            const percent = Math.floor((chain.currentIndex / chain.quests.length) * 100);
            return {
                success: true,
                message: `Chain progress: ${chain.currentIndex}/${chain.quests.length} (${remaining} remaining, ${percent}% complete)`,
                chainComplete: false,
                bonusXp: 0
            };
        });
    }
    /**
     * Complete the entire chain
     */
    completeChain(chain) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            chain.completed = true;
            chain.completedAt = new Date().toISOString();
            const bonusXp = 100;
            this.settings.xp += bonusXp;
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: chain.completedAt,
                xpEarned: bonusXp
            };
            this.settings.chainHistory.push(record);
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            return {
                success: true,
                message: `Chain complete: ${chain.name}! +${bonusXp} XP Bonus`,
                chainComplete: true,
                bonusXp: bonusXp
            };
        });
    }
    /**
     * Break an active chain
     * Keeps earned XP from completed quests
     */
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain to break", xpKept: 0 };
            }
            const completed = chain.currentIndex;
            const xpKept = completed * 10; // Approximate XP from each quest
            // Save to history as broken
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: new Date().toISOString(),
                xpEarned: xpKept
            };
            this.settings.chainHistory.push(record);
            this.settings.activeChains = this.settings.activeChains.filter(c => c.id !== chain.id);
            this.settings.currentChainId = "";
            return {
                success: true,
                message: `Chain broken: ${chain.name}. Kept ${completed} quest completions (${xpKept} XP).`,
                xpKept: xpKept
            };
        });
    }
    /**
     * Get progress of active chain
     */
    getChainProgress() {
        const chain = this.getActiveChain();
        if (!chain)
            return { completed: 0, total: 0, percent: 0 };
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }
    /**
     * Get all completed chain records (history)
     */
    getChainHistory() {
        return this.settings.chainHistory;
    }
    /**
     * Get all active chains (not completed)
     */
    getActiveChains() {
        return this.settings.activeChains.filter(c => !c.completed);
    }
    /**
     * Get detailed state of active chain (for UI rendering)
     */
    getChainDetails() {
        const chain = this.getActiveChain();
        if (!chain) {
            return { chain: null, progress: { completed: 0, total: 0, percent: 0 }, questStates: [] };
        }
        const progress = this.getChainProgress();
        const questStates = chain.quests.map((quest, idx) => {
            if (idx < chain.currentIndex) {
                return { quest, status: 'completed' };
            }
            else if (idx === chain.currentIndex) {
                return { quest, status: 'active' };
            }
            else {
                return { quest, status: 'locked' };
            }
        });
        return { chain, progress, questStates };
    }
}

/**
 * DLC 5: Context Filters Engine
 * Handles quest filtering by energy level, location context, and custom tags
 *
 * ISOLATED: Only reads/writes to questFilters, filterState
 * DEPENDENCIES: SisyphusSettings types, TFile (for quest metadata)
 * NOTE: This is primarily a VIEW LAYER concern, but keeping logic isolated is good
 */
class FiltersEngine {
    constructor(settings) {
        this.settings = settings;
    }
    /**
     * Set filter for a specific quest
     */
    setQuestFilter(questName, energy, context, tags) {
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
    }
    /**
     * Get filter for a specific quest
     */
    getQuestFilter(questName) {
        return this.settings.questFilters[questName] || null;
    }
    /**
     * Update the active filter state
     */
    setFilterState(energy, context, tags) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
    }
    /**
     * Get current filter state
     */
    getFilterState() {
        return this.settings.filterState;
    }
    /**
     * Check if a quest matches current filter state
     */
    questMatchesFilter(questName) {
        const filters = this.settings.filterState;
        const questFilter = this.settings.questFilters[questName];
        // If no filter set for this quest, always show
        if (!questFilter)
            return true;
        // Energy filter
        if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
            return false;
        }
        // Context filter
        if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
            return false;
        }
        // Tags filter (requires ANY of the active tags)
        if (filters.activeTags.length > 0) {
            const hasTag = filters.activeTags.some((tag) => questFilter.tags.includes(tag));
            if (!hasTag)
                return false;
        }
        return true;
    }
    /**
     * Filter a list of quests based on current filter state
     */
    filterQuests(quests) {
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            return this.questMatchesFilter(questName);
        });
    }
    /**
     * Get quests by specific energy level
     */
    getQuestsByEnergy(energy, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    /**
     * Get quests by specific context
     */
    getQuestsByContext(context, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    /**
     * Get quests by specific tags
     */
    getQuestsByTags(tags, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter)
                return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    /**
     * Clear all active filters
     */
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
    }
    /**
     * Get all unique tags used across all quests
     */
    getAvailableTags() {
        const tags = new Set();
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag) => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    /**
     * Get summary stats about filtered state
     */
    getFilterStats(allQuests) {
        const filtered = this.filterQuests(allQuests);
        const activeFiltersCount = (this.settings.filterState.activeEnergy !== "any" ? 1 : 0) +
            (this.settings.filterState.activeContext !== "any" ? 1 : 0) +
            (this.settings.filterState.activeTags.length > 0 ? 1 : 0);
        return {
            total: allQuests.length,
            filtered: filtered.length,
            activeFiltersCount: activeFiltersCount
        };
    }
    /**
     * Toggle a specific filter value
     * Useful for UI toggle buttons
     */
    toggleEnergyFilter(energy) {
        if (this.settings.filterState.activeEnergy === energy) {
            this.settings.filterState.activeEnergy = "any";
        }
        else {
            this.settings.filterState.activeEnergy = energy;
        }
    }
    /**
     * Toggle context filter
     */
    toggleContextFilter(context) {
        if (this.settings.filterState.activeContext === context) {
            this.settings.filterState.activeContext = "any";
        }
        else {
            this.settings.filterState.activeContext = context;
        }
    }
    /**
     * Toggle a tag in the active tag list
     */
    toggleTag(tag) {
        const idx = this.settings.filterState.activeTags.indexOf(tag);
        if (idx >= 0) {
            this.settings.filterState.activeTags.splice(idx, 1);
        }
        else {
            this.settings.filterState.activeTags.push(tag);
        }
    }
}

// DEFAULT CONSTANTS
const DEFAULT_MODIFIER = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
const CHAOS_TABLE = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];
// MISSION POOL
const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all scraps (0 remaining)", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_scraps" },
    { id: "specialist", name: "🎯 Specialist", desc: "Use the same skill 3 times", target: 3, reward: { xp: 15, gold: 0 }, check: "skill_repeat" },
    { id: "high_stakes", name: "💪 High Stakes", desc: "Complete 1 High Stakes quest", target: 1, reward: { xp: 0, gold: 30 }, check: "high_stakes" },
    { id: "speed_demon", name: "⚡ Speed Demon", desc: "Complete quest within 2h of creation", target: 1, reward: { xp: 25, gold: 0 }, check: "fast_complete" },
    { id: "synergist", name: "🔗 Synergist", desc: "Complete quest with Primary + Secondary skill", target: 1, reward: { xp: 0, gold: 10 }, check: "synergy" },
    { id: "survivor", name: "🛡️ Survivor", desc: "Don't take any damage today", target: 1, reward: { xp: 0, gold: 20 }, check: "no_damage" },
    { id: "risk_taker", name: "🎲 Risk Taker", desc: "Complete Difficulty 4+ quest", target: 1, reward: { xp: 15, gold: 0 }, check: "hard_quest" }
];
class SisyphusEngine extends TinyEmitter {
    constructor(app, plugin, audio) {
        super(); // INIT EVENT EMITTER
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.saveSettings();
            // EVENT BUS TRIGGER: Notify UI to update
            this.trigger("update");
        });
    }
    // GAME LOOP
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0)
                break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push(Object.assign(Object.assign({}, mission), { checkFunc: mission.check, progress: 0, completed: false }));
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = obsidian.moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }
    checkDailyMissions(context) {
        const now = obsidian.moment();
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                case "morning_trivial":
                    if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10)
                        mission.progress++;
                    break;
                case "quest_count":
                    if (context.type === "complete")
                        mission.progress = this.settings.questsCompletedToday;
                    break;
                case "high_stakes":
                    if (context.type === "complete" && context.highStakes)
                        mission.progress++;
                    break;
                case "fast_complete":
                    if (context.type === "complete" && context.questCreated) {
                        if (obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours') <= 2)
                            mission.progress++;
                    }
                    break;
                case "synergy":
                    if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None")
                        mission.progress++;
                    break;
                case "no_damage":
                    if (context.type === "damage")
                        mission.progress = 0;
                    break;
                case "hard_quest":
                    if (context.type === "complete" && context.difficulty && context.difficulty >= 4)
                        mission.progress++;
                    break;
                case "skill_repeat":
                    if (context.type === "complete" && context.skill) {
                        this.settings.skillUsesToday[context.skill] = (this.settings.skillUsesToday[context.skill] || 0) + 1;
                        const maxUses = Math.max(0, ...Object.values(this.settings.skillUsesToday));
                        mission.progress = maxUses;
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new obsidian.Notice(`✅ Daily Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        if (diffLabel === "Trivial")
            return 1;
        if (diffLabel === "Easy")
            return 2;
        if (diffLabel === "Medium")
            return 3;
        if (diffLabel === "Hard")
            return 4;
        if (diffLabel === "SUICIDE")
            return 5;
        return 3;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(this.settings.lastLogin), 'days');
                if (daysDiff > 1) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        this.settings.hp -= rotDamage;
                        this.settings.history.push({ date: today, status: "rot", xpEarned: -rotDamage });
                    }
                }
            }
            if (this.settings.lastLogin !== today) {
                this.analyticsEngine.updateStreak();
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = Math.min(this.settings.maxHp, this.settings.hp + 20);
                this.settings.damageTakenToday = 0;
                this.settings.lockdownUntil = "";
                const todayMoment = obsidian.moment();
                this.settings.skills.forEach(s => {
                    if (s.lastUsed) {
                        if (todayMoment.diff(obsidian.moment(s.lastUsed), 'days') > 3 && !this.isResting()) {
                            s.rust = Math.min(10, (s.rust || 0) + 1);
                            s.xpReq = Math.floor(s.xpReq * 1.1);
                        }
                    }
                });
                this.settings.lastLogin = today;
                this.settings.history.push({ date: today, status: "success", xpEarned: 0 });
                if (this.settings.history.length > 14)
                    this.settings.history.shift();
                if (this.settings.dailyMissionDate !== today)
                    this.rollDailyMissions();
                yield this.rollChaos(true);
                yield this.save();
            }
        });
    }
    completeQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            const questName = file.basename;
            if (this.chainsEngine.isQuestInChain(questName) && !this.chainsEngine.canStartQuest(questName)) {
                new obsidian.Notice("Quest locked in chain. Complete the active quest first.");
                return;
            }
            if (this.chainsEngine.isQuestInChain(questName)) {
                const chainResult = yield this.chainsEngine.completeChainQuest(questName);
                if (chainResult.success && chainResult.message)
                    new obsidian.Notice(chainResult.message);
            }
            let xp = (fm.xp_reward || 20) * this.settings.dailyModifier.xpMult;
            let gold = (fm.gold_reward || 0) * this.settings.dailyModifier.goldMult;
            const skillName = fm.skill || "None";
            const secondary = fm.secondary_skill || "None";
            this.audio.playSound("success");
            const skill = this.settings.skills.find(s => s.name === skillName);
            if (skill) {
                if (skill.rust > 0) {
                    skill.rust = 0;
                    skill.xpReq = Math.floor(skill.xpReq / 1.2);
                    new obsidian.Notice(`✨ ${skill.name}: Rust Cleared!`);
                }
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Up!`);
                }
                if (secondary && secondary !== "None") {
                    const secSkill = this.settings.skills.find(s => s.name === secondary);
                    if (secSkill) {
                        if (!skill.connections)
                            skill.connections = [];
                        if (!skill.connections.includes(secondary)) {
                            skill.connections.push(secondary);
                            new obsidian.Notice(`🔗 Neural Link Established`);
                        }
                        xp += Math.floor(secSkill.level * 0.5);
                        secSkill.xp += 0.5;
                    }
                }
            }
            if (this.settings.dailyModifier.name === "Adrenaline")
                this.settings.hp -= 5;
            this.settings.xp += xp;
            this.settings.gold += gold;
            if (this.settings.xp >= this.settings.xpReq) {
                this.settings.level++;
                this.settings.rivalDmg += 5;
                this.settings.xp = 0;
                this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1);
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = this.settings.maxHp;
                this.taunt("level_up");
                const bossMsgs = this.analyticsEngine.checkBossMilestones();
                bossMsgs.forEach(msg => new obsidian.Notice(msg));
            }
            this.settings.questsCompletedToday++;
            const questCreated = fm.created ? new Date(fm.created).getTime() : Date.now();
            const difficulty = this.getDifficultyNumber(fm.difficulty);
            this.checkDailyMissions({ type: "complete", difficulty, skill: skillName, secondarySkill: secondary, highStakes: fm.high_stakes, questCreated });
            const archivePath = "Active_Run/Archive";
            if (!this.app.vault.getAbstractFileByPath(archivePath))
                yield this.app.vault.createFolder(archivePath);
            yield this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
            yield this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
            yield this.save();
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("😴 Rest Day active. No damage.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice(`🛡️ SHIELDED!`);
            }
            else {
                let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
                if (this.settings.gold < -100)
                    damage *= 2;
                this.settings.hp -= damage;
                this.settings.damageTakenToday += damage;
                if (!manualAbort)
                    this.settings.rivalDmg += 1;
                this.audio.playSound("fail");
                this.taunt("fail");
                this.checkDailyMissions({ type: "damage" });
                if (this.settings.damageTakenToday > 50) {
                    this.meditationEngine.triggerLockdown();
                    this.taunt("lockdown");
                    this.audio.playSound("death");
                    this.trigger("lockdown"); // EVENT TRIGGER
                }
                if (this.settings.hp <= 30) {
                    this.audio.playSound("heartbeat");
                    this.taunt("low_hp");
                }
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
            if (this.settings.hp <= 0)
                this.triggerDeath();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
                return;
            }
            if (this.isResting() && highStakes) {
                new obsidian.Notice("Cannot deploy High Stakes on Rest Day.");
                return;
            }
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            else {
                switch (diff) {
                    case 1:
                        xpReward = Math.floor(this.settings.xpReq * 0.05);
                        goldReward = 10;
                        diffLabel = "Trivial";
                        break;
                    case 2:
                        xpReward = Math.floor(this.settings.xpReq * 0.10);
                        goldReward = 20;
                        diffLabel = "Easy";
                        break;
                    case 3:
                        xpReward = Math.floor(this.settings.xpReq * 0.20);
                        goldReward = 40;
                        diffLabel = "Medium";
                        break;
                    case 4:
                        xpReward = Math.floor(this.settings.xpReq * 0.40);
                        goldReward = 80;
                        diffLabel = "Hard";
                        break;
                    case 5:
                        xpReward = Math.floor(this.settings.xpReq * 0.60);
                        goldReward = 150;
                        diffLabel = "SUICIDE";
                        break;
                }
            }
            if (highStakes && !isBoss) {
                goldReward = Math.floor(goldReward * 1.5);
            }
            let deadlineStr = "None";
            let deadlineFrontmatter = "";
            if (deadlineIso) {
                deadlineStr = obsidian.moment(deadlineIso).format("YYYY-MM-DD HH:mm");
                deadlineFrontmatter = `deadline: ${deadlineIso}`;
            }
            const rootPath = "Active_Run";
            const questsPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            if (!this.app.vault.getAbstractFileByPath(questsPath))
                yield this.app.vault.createFolder(questsPath);
            const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${questsPath}/${safeName}.md`;
            const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes}
is_boss: ${isBoss}
created: ${new Date().toISOString()}
${deadlineFrontmatter}
---
# ⚔️ ${name}
> [!INFO] Mission
> **Pri:** ${priority} | **Diff:** ${diffLabel} | **Due:** ${deadlineStr}
> **Rwd:** ${xpReward} XP | ${goldReward} G
> **Neural Link:** ${skill} + ${secSkill}
`;
            if (this.app.vault.getAbstractFileByPath(filename)) {
                new obsidian.Notice("Exists!");
                return;
            }
            yield this.app.vault.create(filename, content);
            this.audio.playSound("click");
            this.save(); // Will trigger update
        });
    }
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () { yield this.app.vault.delete(file); new obsidian.Notice("Deployment Aborted (Deleted)"); this.save(); });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            for (const file of folder.children) {
                if (file instanceof obsidian.TFile) {
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    if ((fm === null || fm === void 0 ? void 0 : fm.deadline) && obsidian.moment().isAfter(obsidian.moment(fm.deadline)))
                        yield this.failQuest(file);
                }
            }
            this.save();
        });
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            this.audio.playSound("death");
            const earnedSouls = Math.floor(this.settings.level * 10 + this.settings.gold / 10);
            this.settings.legacy.souls += earnedSouls;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            new obsidian.Notice(`💀 RUN ENDED.`);
            this.settings.hp = 100;
            this.settings.maxHp = 100;
            this.settings.xp = 0;
            this.settings.gold = 0;
            this.settings.xpReq = 100;
            this.settings.level = 1;
            this.settings.rivalDmg = 10;
            this.settings.skills = [];
            this.settings.history = [];
            this.settings.damageTakenToday = 0;
            this.settings.lockdownUntil = "";
            this.settings.shieldedUntil = "";
            this.settings.restDayUntil = "";
            this.settings.dailyMissions = [];
            this.settings.dailyMissionDate = "";
            this.settings.questsCompletedToday = 0;
            this.settings.skillUsesToday = {};
            const baseStartGold = this.settings.legacy.perks.startGold || 0;
            const scarPenalty = Math.pow(0.9, this.settings.legacy.deathCount);
            this.settings.gold = Math.floor(baseStartGold * scarPenalty);
            this.settings.runCount++;
            yield this.save();
        });
    }
    rollChaos() {
        return __awaiter(this, arguments, void 0, function* (showModal = false) {
            const roll = Math.random();
            if (roll < 0.4)
                this.settings.dailyModifier = DEFAULT_MODIFIER;
            else {
                const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
                this.settings.dailyModifier = CHAOS_TABLE[idx];
                if (this.settings.dailyModifier.name === "Rival Sabotage" && this.settings.gold > 10)
                    this.settings.gold = Math.floor(this.settings.gold * 0.9);
            }
            yield this.save();
            if (showModal)
                new ChaosModal(this.app, this.settings.dailyModifier).open();
        });
    }
    attemptRecovery() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("Not in Lockdown.");
                return;
            }
            const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
            new obsidian.Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
            this.save();
        });
    }
    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil)); }
    taunt(trigger) {
        if (Math.random() < 0.2)
            return;
        const insults = {
            "fail": ["Focus.", "Again.", "Stay sharp."],
            "shield": ["Smart move.", "Bought some time."],
            "low_hp": ["Critical condition.", "Survive."],
            "level_up": ["Stronger.", "Scaling up."],
            "lockdown": ["Overheated. Cooling down.", "Forced rest."]
        };
        const msg = insults[trigger][Math.floor(Math.random() * insults[trigger].length)];
        new obsidian.Notice(`SYSTEM: "${msg}"`, 6000);
    }
    parseQuickInput(text) {
        if (this.meditationEngine.isLockedDown()) {
            new obsidian.Notice("⛔ LOCKDOWN ACTIVE");
            return;
        }
        let diff = 3;
        let cleanText = text;
        if (text.match(/\/1/)) {
            diff = 1;
            cleanText = text.replace(/\/1/, "").trim();
        }
        else if (text.match(/\/2/)) {
            diff = 2;
            cleanText = text.replace(/\/2/, "").trim();
        }
        else if (text.match(/\/3/)) {
            diff = 3;
            cleanText = text.replace(/\/3/, "").trim();
        }
        else if (text.match(/\/4/)) {
            diff = 4;
            cleanText = text.replace(/\/4/, "").trim();
        }
        else if (text.match(/\/5/)) {
            diff = 5;
            cleanText = text.replace(/\/5/, "").trim();
        }
        const deadline = obsidian.moment().add(24, 'hours').toISOString();
        this.createQuest(cleanText, diff, "None", "None", deadline, false, "Normal", false);
    }
    // DELEGATED METHODS
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
            if (!result.success) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.researchEngine.completeResearchQuest(questId, finalWordCount);
            if (!result.success) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    deleteResearchQuest(questId) {
        const result = this.researchEngine.deleteResearchQuest(questId);
        new obsidian.Notice(result.message);
        this.save();
    }
    updateResearchWordCount(questId, newWordCount) { this.researchEngine.updateResearchWordCount(questId, newWordCount); this.save(); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.meditationEngine.meditate();
            if (!result.success && result.message) {
                new obsidian.Notice(result.message);
                return;
            }
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    canDeleteQuest() { return this.meditationEngine.canDeleteQuestFree(); }
    deleteQuestWithCost(file) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = this.meditationEngine.applyDeletionCost();
            new obsidian.Notice(result.message);
            yield this.app.vault.delete(file);
            yield this.save();
        });
    }
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.chainsEngine.createQuestChain(name, questNames);
            if (result.success) {
                new obsidian.Notice(result.message);
                yield this.save();
                return true;
            }
            else {
                new obsidian.Notice(result.message);
                return false;
            }
        });
    }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.chainsEngine.breakChain();
            new obsidian.Notice(result.message);
            yield this.save();
        });
    }
    setQuestFilter(questFile, energy, context, tags) {
        this.filtersEngine.setQuestFilter(questFile.basename, energy, context, tags);
        new obsidian.Notice(`Quest tagged: ${energy} energy, ${context} context`);
        this.save();
    }
    setFilterState(energy, context, tags) {
        this.filtersEngine.setFilterState(energy, context, tags);
        new obsidian.Notice(`Filters set: ${energy} energy, ${context} context`);
        this.save();
    }
    clearFilters() { this.filtersEngine.clearFilters(); new obsidian.Notice("All filters cleared"); this.save(); }
    getFilteredQuests(quests) { return this.filtersEngine.filterQuests(quests); }
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() {
        const msgs = this.analyticsEngine.checkBossMilestones();
        msgs.forEach(m => new obsidian.Notice(m));
        this.save();
    }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
}

const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";
class PanopticonView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.refresh();
            this.plugin.engine.on('update', this.refresh.bind(this));
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const c = this.contentEl;
            c.empty();
            const container = c.createDiv({ cls: "sisy-container" });
            const scroll = container.createDiv({ cls: "sisy-scroll-area" });
            // --- 1. HEADER & CRITICAL ALERTS ---
            scroll.createEl("h2", { text: "Eye SISYPHUS OS", cls: "sisy-header" });
            if (this.plugin.engine.isLockedDown()) {
                const l = scroll.createDiv({ cls: "sisy-alert sisy-alert-lockdown" });
                l.createEl("h3", { text: "LOCKDOWN ACTIVE" });
                const { hours, minutes: mins } = this.plugin.engine.meditationEngine.getLockdownTimeRemaining();
                l.createEl("p", { text: `Time Remaining: ${hours}h ${mins}m` });
                const btn = l.createEl("button", { text: "ATTEMPT RECOVERY" });
                const medStatus = this.plugin.engine.getMeditationStatus();
                const medDiv = l.createDiv();
                medDiv.setAttribute("style", "margin-top: 10px; padding: 10px; background: rgba(170, 100, 255, 0.1); border-radius: 4px;");
                medDiv.createEl("p", { text: `Meditation: ${medStatus.cyclesDone}/10 (${medStatus.cyclesRemaining} left)` });
                const medBar = medDiv.createDiv();
                medBar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 5px 0; overflow: hidden;");
                const medFill = medBar.createDiv();
                const medPercent = (medStatus.cyclesDone / 10) * 100;
                medFill.setAttribute("style", `width: ${medPercent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const medBtn = medDiv.createEl("button", { text: "MEDITATE" });
                medBtn.setAttribute("style", "width: 100%; padding: 8px; margin-top: 5px; background: rgba(170, 100, 255, 0.3); border: 1px solid #aa64ff; color: #aa64ff; border-radius: 3px; cursor: pointer; font-weight: bold;");
                medBtn.onclick = () => {
                    this.plugin.engine.startMeditation();
                    setTimeout(() => this.refresh(), 100);
                };
                btn.addClass("sisy-btn");
                btn.onclick = () => this.plugin.engine.attemptRecovery();
            }
            if (this.plugin.engine.isResting()) {
                const r = scroll.createDiv({ cls: "sisy-alert sisy-alert-rest" });
                r.createEl("h3", { text: "REST DAY ACTIVE" });
                const timeRemaining = obsidian.moment(this.plugin.settings.restDayUntil).diff(obsidian.moment(), 'minutes');
                const hours = Math.floor(timeRemaining / 60);
                const mins = timeRemaining % 60;
                r.createEl("p", { text: `${hours}h ${mins}m remaining | No damage, Rust paused` });
            }
            // --- 2. HUD GRID (2x2) ---
            const hud = scroll.createDiv({ cls: "sisy-hud" });
            this.stat(hud, "HEALTH", `${this.plugin.settings.hp}/${this.plugin.settings.maxHp}`, this.plugin.settings.hp < 30 ? "sisy-critical" : "");
            this.stat(hud, "GOLD", `${this.plugin.settings.gold}`, this.plugin.settings.gold < 0 ? "sisy-val-debt" : "");
            this.stat(hud, "LEVEL", `${this.plugin.settings.level}`);
            this.stat(hud, "RIVAL DMG", `${this.plugin.settings.rivalDmg}`);
            // --- 3. THE ORACLE ---
            const oracle = scroll.createDiv({ cls: "sisy-oracle" });
            oracle.createEl("h4", { text: "ORACLE PREDICTION" });
            const survival = Math.floor(this.plugin.settings.hp / (this.plugin.settings.rivalDmg * (this.plugin.settings.gold < 0 ? 2 : 1)));
            let survText = `Survival: ${survival} days`;
            const isCrisis = this.plugin.settings.hp < 30 || this.plugin.settings.gold < 0;
            // Glitch Logic
            if (isCrisis && Math.random() < 0.3) {
                const glitches = ["[CORRUPTED]", "??? DAYS LEFT", "NO FUTURE", "RUN"];
                survText = glitches[Math.floor(Math.random() * glitches.length)];
            }
            const survEl = oracle.createDiv({ text: survText });
            if (survival < 2 || survText.includes("???") || survText.includes("CORRUPTED")) {
                survEl.setAttribute("style", "color:#ff5555; font-weight:bold; letter-spacing: 1px;");
            }
            const lights = oracle.createDiv({ cls: "sisy-status-lights" });
            if (this.plugin.settings.gold < 0)
                lights.createDiv({ text: "DEBT: YES", cls: "sisy-light-active" });
            // DLC 1: Scars display
            const scarCount = ((_a = this.plugin.settings.legacy) === null || _a === void 0 ? void 0 : _a.deathCount) || 0;
            if (scarCount > 0) {
                const scarEl = oracle.createDiv({ cls: "sisy-scar-display" });
                scarEl.createEl("span", { text: `Scars: ${scarCount}` });
                const penalty = Math.pow(0.9, scarCount);
                const percentLost = Math.floor((1 - penalty) * 100);
                scarEl.createEl("small", { text: `(-${percentLost}% starting gold)` });
            }
            // DLC 1: Next milestone
            const levelMilestones = [10, 20, 30, 50];
            const nextMilestone = levelMilestones.find(m => m > this.plugin.settings.level);
            if (nextMilestone) {
                const milestoneEl = oracle.createDiv({ cls: "sisy-milestone" });
                milestoneEl.createEl("span", { text: `Next Milestone: Level ${nextMilestone}` });
                if (nextMilestone === 10 || nextMilestone === 20 || nextMilestone === 30 || nextMilestone === 50) {
                    milestoneEl.createEl("small", { text: "(Boss Unlock)" });
                }
            }
            // --- 4. DAILY MISSIONS (DLC 1) ---
            scroll.createDiv({ text: "TODAYS OBJECTIVES", cls: "sisy-section-title" });
            this.renderDailyMissions(scroll);
            // --- 5. CONTROLS ---
            const ctrls = scroll.createDiv({ cls: "sisy-controls" });
            ctrls.createEl("button", { text: "DEPLOY", cls: "sisy-btn mod-cta" }).onclick = () => new QuestModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "SHOP", cls: "sisy-btn" }).onclick = () => new ShopModal(this.app, this.plugin).open();
            ctrls.createEl("button", { text: "FOCUS", cls: "sisy-btn" }).onclick = () => this.plugin.audio.toggleBrownNoise();
            // --- 6. ACTIVE THREATS ---
            // --- DLC 5: CONTEXT FILTERS ---
            scroll.createDiv({ text: "FILTER CONTROLS", cls: "sisy-section-title" });
            this.renderFilterBar(scroll);
            // --- DLC 4: QUEST CHAINS ---
            const activeChain = this.plugin.engine.getActiveChain();
            if (activeChain) {
                scroll.createDiv({ text: "ACTIVE CHAIN", cls: "sisy-section-title" });
                this.renderChainSection(scroll);
            }
            // --- DLC 2: RESEARCH LIBRARY ---
            scroll.createDiv({ text: "RESEARCH LIBRARY", cls: "sisy-section-title" });
            this.renderResearchSection(scroll);
            // --- DLC 6: ANALYTICS & ENDGAME ---
            scroll.createDiv({ text: "ANALYTICS & PROGRESS", cls: "sisy-section-title" });
            this.renderAnalytics(scroll);
            // --- ACTIVE THREATS ---
            scroll.createDiv({ text: "ACTIVE THREATS", cls: "sisy-section-title" });
            yield this.renderQuests(scroll);
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            this.plugin.settings.skills.forEach((s, idx) => {
                const row = scroll.createDiv({ cls: "sisy-skill-row" });
                row.onclick = () => new SkillDetailModal(this.app, this.plugin, idx).open();
                const meta = row.createDiv({ cls: "sisy-skill-meta" });
                meta.createSpan({ text: s.name });
                meta.createSpan({ text: `Lvl ${s.level}` });
                if (s.rust > 0) {
                    meta.createSpan({ text: `RUST ${s.rust}`, cls: "sisy-rust-badge" });
                }
                const bar = row.createDiv({ cls: "sisy-bar-bg" });
                const fill = bar.createDiv({ cls: "sisy-bar-fill" });
                fill.setAttribute("style", `width: ${(s.xp / s.xpReq) * 100}%; background: ${s.rust > 0 ? '#d35400' : '#00b0ff'}`);
            });
            const addBtn = scroll.createDiv({ text: "+ Add Neural Node", cls: "sisy-add-skill" });
            addBtn.onclick = () => new SkillManagerModal(this.app, this.plugin).open();
            // --- 8. QUICK CAPTURE ---
            const footer = container.createDiv({ cls: "sisy-quick-capture" });
            const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
            input.onkeydown = (e) => __awaiter(this, void 0, void 0, function* () {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.plugin.engine.parseQuickInput(input.value.trim());
                    input.value = "";
                }
            });
        });
    }
    // DLC 1: Render Daily Missions
    renderDailyMissions(parent) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) {
            parent.createDiv({ text: "No missions today. Check back tomorrow.", cls: "sisy-empty-state" });
            return;
        }
        const missionsDiv = parent.createDiv({ cls: "sisy-daily-missions" });
        missions.forEach((mission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (mission.completed)
                card.addClass("sisy-mission-completed");
            const header = card.createDiv({ cls: "sisy-mission-header" });
            const statusIcon = mission.completed ? "YES" : "..";
            header.createEl("span", { text: statusIcon, cls: "sisy-mission-status" });
            header.createEl("span", { text: mission.name, cls: "sisy-mission-name" });
            card.createEl("p", { text: mission.desc, cls: "sisy-mission-desc" });
            const progress = card.createDiv({ cls: "sisy-mission-progress" });
            progress.createEl("span", { text: `${mission.progress}/${mission.target}`, cls: "sisy-mission-counter" });
            const bar = progress.createDiv({ cls: "sisy-bar-bg" });
            const fill = bar.createDiv({ cls: "sisy-bar-fill" });
            const percent = (mission.progress / mission.target) * 100;
            fill.setAttribute("style", `width: ${Math.min(percent, 100)}%`);
            const reward = card.createDiv({ cls: "sisy-mission-reward" });
            if (mission.reward.xp > 0)
                reward.createSpan({ text: `+${mission.reward.xp} XP`, cls: "sisy-reward-xp" });
            if (mission.reward.gold > 0)
                reward.createSpan({ text: `+${mission.reward.gold}g`, cls: "sisy-reward-gold" });
        });
        const allCompleted = missions.every(m => m.completed);
        if (allCompleted && missions.length > 0) {
            missionsDiv.createDiv({ text: "All Missions Complete! +50 Bonus Gold", cls: "sisy-mission-bonus" });
        }
    }
    // DLC 2: Render Research Quests Section
    renderResearchSection(parent) {
        const researchQuests = this.plugin.settings.researchQuests || [];
        const activeResearch = researchQuests.filter(q => !q.completed);
        const completedResearch = researchQuests.filter(q => q.completed);
        // Stats bar
        const stats = this.plugin.engine.getResearchRatio();
        const statsDiv = parent.createDiv({ cls: "sisy-research-stats" });
        statsDiv.setAttribute("style", "border: 1px solid #666; padding: 10px; border-radius: 4px; margin-bottom: 10px; background: rgba(170, 100, 255, 0.05);");
        const ratioText = statsDiv.createEl("p", { text: `Research Ratio: ${stats.combat}:${stats.research} (${stats.ratio}:1)` });
        ratioText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        if (!this.plugin.engine.canCreateResearchQuest()) {
            const warning = statsDiv.createEl("p", { text: "BLOCKED: Need 2 combat per 1 research" });
            warning.setAttribute("style", "color: orange; font-weight: bold; margin: 5px 0;");
        }
        // Active Research
        parent.createDiv({ text: "ACTIVE RESEARCH", cls: "sisy-section-title" });
        if (activeResearch.length === 0) {
            parent.createDiv({ text: "No active research.", cls: "sisy-empty-state" });
        }
        else {
            activeResearch.forEach((quest) => {
                const card = parent.createDiv({ cls: "sisy-research-card" });
                card.setAttribute("style", "border: 1px solid #aa64ff; padding: 10px; margin-bottom: 8px; border-radius: 4px; background: rgba(170, 100, 255, 0.05);");
                const header = card.createDiv();
                header.setAttribute("style", "display: flex; justify-content: space-between; margin-bottom: 6px;");
                const title = header.createEl("span", { text: quest.title });
                title.setAttribute("style", "font-weight: bold; flex: 1;");
                const typeLabel = header.createEl("span", { text: quest.type === "survey" ? "SURVEY" : "DEEP DIVE" });
                typeLabel.setAttribute("style", "font-size: 0.75em; padding: 2px 6px; background: rgba(170, 100, 255, 0.3); border-radius: 2px;");
                const wordCount = card.createEl("p", { text: `Words: ${quest.wordCount}/${quest.wordLimit}` });
                wordCount.setAttribute("style", "margin: 5px 0; font-size: 0.85em;");
                const bar = card.createDiv();
                bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin: 6px 0;");
                const fill = bar.createDiv();
                const percent = Math.min(100, (quest.wordCount / quest.wordLimit) * 100);
                fill.setAttribute("style", `width: ${percent}%; height: 100%; background: #aa64ff; transition: width 0.3s;`);
                const actions = card.createDiv();
                actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 8px;");
                const viewBtn = actions.createEl("button", { text: "COMPLETE" });
                viewBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(85, 255, 85, 0.2); border: 1px solid #55ff55; color: #55ff55; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                viewBtn.onclick = () => {
                    this.plugin.engine.completeResearchQuest(quest.id, quest.wordCount);
                    this.refresh();
                };
                const deleteBtn = actions.createEl("button", { text: "DELETE" });
                deleteBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.85em;");
                deleteBtn.onclick = () => {
                    this.plugin.engine.deleteResearchQuest(quest.id);
                    this.refresh();
                };
            });
        }
        // Completed Research
        parent.createDiv({ text: "COMPLETED RESEARCH", cls: "sisy-section-title" });
        if (completedResearch.length === 0) {
            parent.createDiv({ text: "No completed research.", cls: "sisy-empty-state" });
        }
        else {
            completedResearch.forEach((quest) => {
                const item = parent.createEl("p", { text: `+ ${quest.title} (${quest.type === "survey" ? "Survey" : "Deep Dive"})` });
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em; margin: 3px 0;");
            });
        }
    }
    renderQuests(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            let count = 0;
            if (folder instanceof obsidian.TFolder) {
                const files = folder.children.filter(f => f instanceof obsidian.TFile);
                files.sort((a, b) => {
                    var _a, _b;
                    const fmA = (_a = this.app.metadataCache.getFileCache(a)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const fmB = (_b = this.app.metadataCache.getFileCache(b)) === null || _b === void 0 ? void 0 : _b.frontmatter;
                    const dateA = (fmA === null || fmA === void 0 ? void 0 : fmA.deadline) ? obsidian.moment(fmA.deadline).valueOf() : 9999999999999;
                    const dateB = (fmB === null || fmB === void 0 ? void 0 : fmB.deadline) ? obsidian.moment(fmB.deadline).valueOf() : 9999999999999;
                    return dateA - dateB;
                });
                for (const file of files) {
                    count++;
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const card = parent.createDiv({ cls: "sisy-card" });
                    if (fm === null || fm === void 0 ? void 0 : fm.is_boss)
                        card.addClass("sisy-card-boss");
                    const d = String((fm === null || fm === void 0 ? void 0 : fm.difficulty) || "").match(/\d/);
                    if (d)
                        card.addClass(`sisy-card-${d[0]}`);
                    // Top section with title and timer
                    const top = card.createDiv({ cls: "sisy-card-top" });
                    top.createDiv({ text: file.basename, cls: "sisy-card-title" });
                    // Timer
                    if (fm === null || fm === void 0 ? void 0 : fm.deadline) {
                        const diff = obsidian.moment(fm.deadline).diff(obsidian.moment(), 'minutes');
                        const hours = Math.floor(diff / 60);
                        const mins = diff % 60;
                        const timerText = diff < 0 ? "EXPIRED" : `${hours}h ${mins}m`;
                        const timer = top.createDiv({ text: timerText, cls: "sisy-timer" });
                        if (diff < 60)
                            timer.addClass("sisy-timer-late");
                    }
                    // Trash icon (inline, not absolute)
                    const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                    trash.style.cursor = "pointer";
                    trash.style.color = "#ff5555";
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.deleteQuest(file);
                    };
                    // Action buttons
                    const acts = card.createDiv({ cls: "sisy-actions" });
                    const bD = acts.createEl("button", { text: "OK", cls: "sisy-action-btn mod-done" });
                    bD.onclick = () => this.plugin.engine.completeQuest(file);
                    const bF = acts.createEl("button", { text: "XX", cls: "sisy-action-btn mod-fail" });
                    bF.onclick = () => this.plugin.engine.failQuest(file, true);
                }
            }
            if (count === 0) {
                const idle = parent.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
                const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
                ctaBtn.style.marginTop = "10px";
                ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            }
        });
    }
    renderChainSection(parent) {
        const chain = this.plugin.engine.getActiveChain();
        if (!chain) {
            parent.createDiv({ text: "No active chain.", cls: "sisy-empty-state" });
            return;
        }
        const chainDiv = parent.createDiv({ cls: "sisy-chain-container" });
        chainDiv.setAttribute("style", "border: 1px solid #4caf50; padding: 12px; border-radius: 4px; background: rgba(76, 175, 80, 0.05); margin-bottom: 10px;");
        const header = chainDiv.createEl("h3", { text: chain.name });
        header.setAttribute("style", "margin: 0 0 10px 0; color: #4caf50;");
        const progress = this.plugin.engine.getChainProgress();
        const progressText = chainDiv.createEl("p", { text: `Progress: ${progress.completed}/${progress.total}` });
        progressText.setAttribute("style", "margin: 5px 0; font-size: 0.9em;");
        const bar = chainDiv.createDiv();
        bar.setAttribute("style", "height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 8px 0; overflow: hidden;");
        const fill = bar.createDiv();
        fill.setAttribute("style", `width: ${progress.percent}%; height: 100%; background: #4caf50; transition: width 0.3s;`);
        const questList = chainDiv.createDiv({ cls: "sisy-chain-quests" });
        questList.setAttribute("style", "margin: 10px 0; font-size: 0.85em;");
        chain.quests.forEach((quest, idx) => {
            const item = questList.createEl("p");
            const icon = idx < progress.completed ? "OK" : idx === progress.completed ? ">>>" : "LOCK";
            const status = idx < progress.completed ? "DONE" : idx === progress.completed ? "ACTIVE" : "LOCKED";
            item.setText(`[${icon}] ${quest} (${status})`);
            item.setAttribute("style", `margin: 3px 0; padding: 3px; 
                ${idx < progress.completed ? "opacity: 0.6;" : idx === progress.completed ? "font-weight: bold; color: #4caf50;" : "opacity: 0.4;"}`);
        });
        const actions = chainDiv.createDiv();
        actions.setAttribute("style", "display: flex; gap: 5px; margin-top: 10px;");
        const breakBtn = actions.createEl("button", { text: "BREAK CHAIN" });
        breakBtn.setAttribute("style", "flex: 1; padding: 6px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-size: 0.8em;");
        breakBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.engine.breakChain();
            this.refresh();
        });
    }
    renderFilterBar(parent) {
        const filters = this.plugin.settings.filterState;
        const filterDiv = parent.createDiv({ cls: "sisy-filter-bar" });
        filterDiv.setAttribute("style", "border: 1px solid #0088ff; padding: 10px; border-radius: 4px; background: rgba(0, 136, 255, 0.05); margin-bottom: 15px;");
        // Energy filter
        const energyDiv = filterDiv.createDiv();
        energyDiv.setAttribute("style", "margin-bottom: 8px;");
        energyDiv.createEl("span", { text: "Energy: " }).setAttribute("style", "font-weight: bold;");
        const energyOptions = ["any", "high", "medium", "low"];
        energyOptions.forEach(opt => {
            const btn = energyDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeEnergy === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(opt, filters.activeContext, filters.activeTags);
                this.refresh();
            };
        });
        // Context filter
        const contextDiv = filterDiv.createDiv();
        contextDiv.setAttribute("style", "margin-bottom: 8px;");
        contextDiv.createEl("span", { text: "Context: " }).setAttribute("style", "font-weight: bold;");
        const contextOptions = ["any", "home", "office", "anywhere"];
        contextOptions.forEach(opt => {
            const btn = contextDiv.createEl("button", { text: opt.toUpperCase() });
            btn.setAttribute("style", `margin: 0 3px; padding: 4px 8px; border-radius: 3px; cursor: pointer; 
                ${filters.activeContext === opt ? "background: #0088ff; color: white;" : "background: rgba(0, 136, 255, 0.2);"}`);
            btn.onclick = () => {
                this.plugin.engine.setFilterState(filters.activeEnergy, opt, filters.activeTags);
                this.refresh();
            };
        });
        // Clear button
        const clearBtn = filterDiv.createEl("button", { text: "CLEAR FILTERS" });
        clearBtn.setAttribute("style", "width: 100%; padding: 6px; margin-top: 8px; background: rgba(255, 85, 85, 0.2); border: 1px solid #ff5555; color: #ff5555; border-radius: 3px; cursor: pointer; font-weight: bold;");
        clearBtn.onclick = () => {
            this.plugin.engine.clearFilters();
            this.refresh();
        };
    }
    renderAnalytics(parent) {
        const stats = this.plugin.engine.getGameStats();
        const analyticsDiv = parent.createDiv({ cls: "sisy-analytics" });
        analyticsDiv.setAttribute("style", "border: 1px solid #ffc107; padding: 12px; border-radius: 4px; background: rgba(255, 193, 7, 0.05); margin-bottom: 15px;");
        analyticsDiv.createEl("h3", { text: "ANALYTICS & PROGRESS" }).setAttribute("style", "margin: 0 0 10px 0; color: #ffc107;");
        // Stats grid
        const statsDiv = analyticsDiv.createDiv();
        statsDiv.setAttribute("style", "display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;");
        const stats_items = [
            { label: "Level", value: stats.level },
            { label: "Current Streak", value: stats.currentStreak },
            { label: "Longest Streak", value: stats.longestStreak },
            { label: "Total Quests", value: stats.totalQuests }
        ];
        stats_items.forEach(item => {
            const statBox = statsDiv.createDiv();
            statBox.setAttribute("style", "border: 1px solid #ffc107; padding: 8px; border-radius: 3px; background: rgba(255, 193, 7, 0.1);");
            statBox.createEl("p", { text: item.label }).setAttribute("style", "margin: 0; font-size: 0.8em; opacity: 0.7;");
            statBox.createEl("p", { text: String(item.value) }).setAttribute("style", "margin: 5px 0 0 0; font-size: 1.2em; font-weight: bold; color: #ffc107;");
        });
        // Boss progress
        analyticsDiv.createEl("h4", { text: "Boss Milestones" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        const bosses = this.plugin.settings.bossMilestones;
        if (bosses && bosses.length > 0) {
            bosses.forEach((boss) => {
                const bossItem = analyticsDiv.createDiv();
                bossItem.setAttribute("style", "margin: 6px 0; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 3px;");
                const icon = boss.defeated ? "OK" : boss.unlocked ? ">>" : "LOCK";
                const name = bossItem.createEl("span", { text: `[${icon}] Level ${boss.level}: ${boss.name}` });
                name.setAttribute("style", boss.defeated ? "color: #4caf50; font-weight: bold;" : boss.unlocked ? "color: #ffc107;" : "opacity: 0.5;");
            });
        }
        // Win condition
        if (stats.gameWon) {
            const winDiv = analyticsDiv.createDiv();
            winDiv.setAttribute("style", "margin-top: 12px; padding: 12px; background: rgba(76, 175, 80, 0.2); border: 2px solid #4caf50; border-radius: 4px; text-align: center;");
            winDiv.createEl("p", { text: "GAME WON!" }).setAttribute("style", "margin: 0; font-size: 1.2em; font-weight: bold; color: #4caf50;");
        }
    }
    stat(p, label, val, cls = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls)
            b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin.engine.off('update', this.refresh.bind(this));
        });
    }
}

const DEFAULT_SETTINGS = {
    hp: 100, maxHp: 100, xp: 0, gold: 0, xpReq: 100, level: 1, rivalDmg: 10,
    lastLogin: "", shieldedUntil: "", restDayUntil: "", skills: [],
    dailyModifier: DEFAULT_MODIFIER,
    legacy: { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 },
    muted: false, history: [], runCount: 1, lockdownUntil: "", damageTakenToday: 0,
    dailyMissions: [],
    dailyMissionDate: "",
    questsCompletedToday: 0,
    skillUsesToday: {},
    researchQuests: [],
    researchStats: { totalResearch: 0, totalCombat: 0, researchCompleted: 0, combatCompleted: 0 },
    lastResearchQuestId: 0,
    meditationCyclesCompleted: 0,
    questDeletionsToday: 0,
    lastDeletionReset: "",
    isMeditating: false,
    meditationClicksThisLockdown: 0,
    activeChains: [],
    chainHistory: [],
    currentChainId: "",
    chainQuestsCompleted: 0,
    questFilters: {},
    filterState: { activeEnergy: "any", activeContext: "any", activeTags: [] },
    dayMetrics: [],
    weeklyReports: [],
    bossMilestones: [],
    streak: { current: 0, longest: 0, lastDate: "" },
    achievements: [],
    gameWon: false
};
class SisyphusPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            yield this.engine.checkDailyLogin();
            this.updateStatusBar();
            this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon (Sidebar)', callback: () => this.activateView() });
            this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Noise', callback: () => this.audio.toggleBrownNoise() });
            this.addCommand({ id: 'reroll-chaos', name: 'Reroll Chaos', callback: () => this.engine.rollChaos(true) });
            this.addCommand({ id: 'accept-death', name: 'ACCEPT DEATH', callback: () => this.engine.triggerDeath() });
            this.addCommand({ id: 'recover', name: 'Recover (Lockdown)', callback: () => this.engine.attemptRecovery() });
            this.addCommand({
                id: 'create-research',
                name: 'Research: Create Research Quest',
                callback: () => new ResearchQuestModal(this.app, this).open()
            });
            this.addCommand({
                id: 'view-research',
                name: 'Research: View Research Library',
                callback: () => new ResearchListModal(this.app, this).open()
            });
            this.addCommand({
                id: 'meditate',
                name: 'Meditation: Start Meditation',
                callback: () => this.engine.startMeditation()
            });
            this.addCommand({
                id: 'create-chain',
                name: 'Chains: Create Quest Chain',
                callback: () => {
                    new ChainBuilderModal(this.app, this).open();
                }
            });
            this.addCommand({
                id: 'view-chains',
                name: 'Chains: View Active Chain',
                callback: () => {
                    const chain = this.engine.getActiveChain();
                    if (chain) {
                        new obsidian.Notice(`Active Chain: ${chain.name} (${this.engine.getChainProgress().completed}/${chain.quests.length})`);
                    }
                    else {
                        new obsidian.Notice("No active chain");
                    }
                }
            });
            this.addCommand({
                id: 'filter-high-energy',
                name: 'Filters: Show High Energy Quests',
                callback: () => this.engine.setFilterState("high", "any", [])
            });
            this.addCommand({
                id: 'filter-medium-energy',
                name: 'Filters: Show Medium Energy Quests',
                callback: () => this.engine.setFilterState("medium", "any", [])
            });
            this.addCommand({
                id: 'filter-low-energy',
                name: 'Filters: Show Low Energy Quests',
                callback: () => this.engine.setFilterState("low", "any", [])
            });
            this.addCommand({
                id: 'clear-filters',
                name: 'Filters: Clear All Filters',
                callback: () => this.engine.clearFilters()
            });
            this.addCommand({
                id: 'weekly-report',
                name: 'Analytics: Generate Weekly Report',
                callback: () => {
                    const report = this.engine.generateWeeklyReport();
                    new obsidian.Notice(`Week ${report.week}: ${report.totalQuests} quests, ${report.successRate}% success`);
                }
            });
            this.addCommand({
                id: 'game-stats',
                name: 'Analytics: View Game Stats',
                callback: () => {
                    const stats = this.engine.getGameStats();
                    new obsidian.Notice(`Level: ${stats.level} | Streak: ${stats.currentStreak} | Quests: ${stats.totalQuests}`);
                }
            });
            this.addCommand({
                id: 'check-bosses',
                name: 'Endgame: Check Boss Milestones',
                callback: () => this.engine.checkBossMilestones()
            });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
        });
    }
    loadStyles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
                if (cssFile instanceof obsidian.TFile) {
                    const css = yield this.app.vault.read(cssFile);
                    const style = document.createElement("style");
                    style.id = "sisyphus-styles";
                    style.innerHTML = css;
                    document.head.appendChild(style);
                }
            }
            catch (e) {
                console.error("Could not load styles.css", e);
            }
        });
    }
    onunload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (this.audio.audioCtx)
                this.audio.audioCtx.close();
            const style = document.getElementById("sisyphus-styles");
            if (style)
                style.remove();
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (leaves.length > 0) {
                leaf = leaves[0];
            }
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    refreshUI() {
        this.updateStatusBar();
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0)
            leaves[0].view.refresh();
    }
    updateStatusBar() {
        let shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const completedMissions = this.settings.dailyMissions.filter(m => m.completed).length;
        const totalMissions = this.settings.dailyMissions.length;
        const missionProgress = totalMissions > 0 ? `M${completedMissions}/${totalMissions}` : "";
        const statusText = `${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp}/${this.settings.maxHp} G${this.settings.gold} Lvl${this.settings.level} ${missionProgress}`;
        this.statusBarItem.setText(statusText);
        if (this.settings.hp < 30)
            this.statusBarItem.style.color = "red";
        else if (this.settings.gold < 0)
            this.statusBarItem.style.color = "orange";
        else
            this.statusBarItem.style.color = "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
            if (!this.settings.legacy)
                this.settings.legacy = { souls: 0, perks: { startGold: 0, startSkillPoints: 0, rivalDelay: 0 }, relics: [], deathCount: 0 };
            if (this.settings.legacy.deathCount === undefined)
                this.settings.legacy.deathCount = 0;
            if (!this.settings.history)
                this.settings.history = [];
            if (!this.settings.dailyMissions)
                this.settings.dailyMissions = [];
            if (!this.settings.dailyMissionDate)
                this.settings.dailyMissionDate = "";
            if (this.settings.questsCompletedToday === undefined)
                this.settings.questsCompletedToday = 0;
            if (!this.settings.skillUsesToday)
                this.settings.skillUsesToday = {};
            if (!this.settings.researchQuests)
                this.settings.researchQuests = [];
            if (!this.settings.researchStats)
                this.settings.researchStats = {
                    totalResearch: 0,
                    totalCombat: 0,
                    researchCompleted: 0,
                    combatCompleted: 0
                };
            if (this.settings.lastResearchQuestId === undefined)
                this.settings.lastResearchQuestId = 0;
            if (this.settings.meditationCyclesCompleted === undefined)
                this.settings.meditationCyclesCompleted = 0;
            if (this.settings.questDeletionsToday === undefined)
                this.settings.questDeletionsToday = 0;
            if (!this.settings.lastDeletionReset)
                this.settings.lastDeletionReset = "";
            if (this.settings.isMeditating === undefined)
                this.settings.isMeditating = false;
            if (this.settings.meditationClicksThisLockdown === undefined)
                this.settings.meditationClicksThisLockdown = 0;
            if (!this.settings.activeChains)
                this.settings.activeChains = [];
            if (!this.settings.chainHistory)
                this.settings.chainHistory = [];
            if (!this.settings.currentChainId)
                this.settings.currentChainId = "";
            if (this.settings.chainQuestsCompleted === undefined)
                this.settings.chainQuestsCompleted = 0;
            if (!this.settings.questFilters)
                this.settings.questFilters = {};
            if (!this.settings.filterState)
                this.settings.filterState = { activeEnergy: "any", activeContext: "any", activeTags: [] };
            if (!this.settings.dayMetrics)
                this.settings.dayMetrics = [];
            if (!this.settings.weeklyReports)
                this.settings.weeklyReports = [];
            if (!this.settings.bossMilestones)
                this.settings.bossMilestones = [];
            if (!this.settings.streak)
                this.settings.streak = { current: 0, longest: 0, lastDate: "" };
            if (!this.settings.achievements)
                this.settings.achievements = [];
            if (this.settings.gameWon === undefined)
                this.settings.gameWon = false;
            this.settings.skills = this.settings.skills.map(s => (Object.assign(Object.assign({}, s), { rust: s.rust || 0, lastUsed: s.lastUsed || new Date().toISOString(), connections: s.connections || [] })));
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvZW5naW5lcy9BbmFseXRpY3NFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9DaGFpbnNFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9GaWx0ZXJzRW5naW5lLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIEVWRU5UIEJVUyBTWVNURU1cbmV4cG9ydCBjbGFzcyBUaW55RW1pdHRlciB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnM6IHsgW2tleTogc3RyaW5nXTogRnVuY3Rpb25bXSB9ID0ge307XG5cbiAgICBvbihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkucHVzaChmbik7XG4gICAgfVxuXG4gICAgb2ZmKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0uZmlsdGVyKGYgPT4gZiAhPT0gZm4pO1xuICAgIH1cblxuICAgIHRyaWdnZXIoZXZlbnQ6IHN0cmluZywgZGF0YT86IGFueSkge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5mb3JFYWNoKGZuID0+IGZuKGRhdGEpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuNCk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAwLjE7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPTiAoQnJvd24gTm9pc2UpXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZywgTm90aWNlLCBtb21lbnQsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nOyAvLyBGaXg6IERlZmF1bHQgSW1wb3J0XG5pbXBvcnQgeyBNb2RpZmllciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIENoYW9zTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIG1vZGlmaWVyOiBNb2RpZmllcjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG06IE1vZGlmaWVyKSB7IHN1cGVyKGFwcCk7IHRoaXMubW9kaWZpZXI9bTsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IFxuICAgICAgICBjb25zdCBoMSA9IGMuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiVEhFIE9NRU5cIiB9KTsgXG4gICAgICAgIGgxLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIik7IFxuICAgICAgICBjb25zdCBpYyA9IGMuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLmljb24gfSk7IFxuICAgICAgICBpYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiZm9udC1zaXplOjgwcHg7IHRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IGgyID0gYy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5uYW1lIH0pOyBcbiAgICAgICAgaDIuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IHAgPSBjLmNyZWF0ZUVsKFwicFwiLCB7dGV4dDogdGhpcy5tb2RpZmllci5kZXNjfSk7IFxuICAgICAgICBwLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlclwiKTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiQWNrbm93bGVkZ2VcIn0pOyBcbiAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiOyBcbiAgICAgICAgYi5zdHlsZS5tYXJnaW49XCIyMHB4IGF1dG9cIjsgXG4gICAgICAgIGIub25jbGljaz0oKT0+dGhpcy5jbG9zZSgpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTaG9wTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgfSBcbiAgICBpdGVtKGVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIGNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogZGVzYyB9KTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogYCR7Y29zdH0gR2AgfSk7IFxuICAgICAgICBpZih0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgY29zdCkgeyBcbiAgICAgICAgICAgIGIuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIixcInRydWVcIik7IGIuc3R5bGUub3BhY2l0eT1cIjAuNVwiOyBcbiAgICAgICAgfSBlbHNlIHsgXG4gICAgICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgICAgICBiLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgLT0gY29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9YCk7IFxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICAgICAgbmV3IFNob3BNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJPYmplY3RpdmVcIikuYWRkVGV4dCh0ID0+IHsgXG4gICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGlmZmljdWx0eVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwiMVwiLFwiVHJpdmlhbFwiKS5hZGRPcHRpb24oXCIyXCIsXCJFYXN5XCIpLmFkZE9wdGlvbihcIjNcIixcIk1lZGl1bVwiKS5hZGRPcHRpb24oXCI0XCIsXCJIYXJkXCIpLmFkZE9wdGlvbihcIjVcIixcIlNVSUNJREVcIikuc2V0VmFsdWUoXCIzXCIpLm9uQ2hhbmdlKHY9PnRoaXMuZGlmZmljdWx0eT1wYXJzZUludCh2KSkpOyBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlByaW1hcnkgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgIGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyBcbiAgICAgICAgfSkpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlN5bmVyZ3kgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLnNldFZhbHVlKFwiTm9uZVwiKS5vbkNoYW5nZSh2ID0+IHRoaXMuc2VjU2tpbGwgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlYWRsaW5lXCIpLmFkZFRleHQodCA9PiB7IHQuaW5wdXRFbC50eXBlID0gXCJkYXRldGltZS1sb2NhbFwiOyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5kZWFkbGluZSA9IHYpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiSGlnaCBTdGFrZXNcIikuc2V0RGVzYyhcIkRvdWJsZSBHb2xkIC8gRG91YmxlIERhbWFnZVwiKS5hZGRUb2dnbGUodD0+dC5zZXRWYWx1ZShmYWxzZSkub25DaGFuZ2Uodj0+dGhpcy5oaWdoU3Rha2VzPXYpKTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgXG4gICAgICAgICAgICBpZih0aGlzLm5hbWUpe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdCh0aGlzLm5hbWUsdGhpcy5kaWZmaWN1bHR5LHRoaXMuc2tpbGwsdGhpcy5zZWNTa2lsbCx0aGlzLmRlYWRsaW5lLHRoaXMuaGlnaFN0YWtlcywgXCJOb3JtYWxcIiwgdGhpcy5pc0Jvc3MpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxNYW5hZ2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgTm9kZVwiIH0pOyBcbiAgICAgICAgbGV0IG49XCJcIjsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5vZGUgTmFtZVwiKS5hZGRUZXh0KHQ9PnQub25DaGFuZ2Uodj0+bj12KSkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIkNyZWF0ZVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jKCk9PntcbiAgICAgICAgICAgIGlmKG4pe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5wdXNoKHtuYW1lOm4sbGV2ZWw6MSx4cDowLHhwUmVxOjUsbGFzdFVzZWQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLHJ1c3Q6MCxjb25uZWN0aW9uczpbXX0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBOb2RlOiAke3MubmFtZX1gIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOYW1lXCIpLmFkZFRleHQodD0+dC5zZXRWYWx1ZShzLm5hbWUpLm9uQ2hhbmdlKHY9PnMubmFtZT12KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlJ1c3QgU3RhdHVzXCIpLnNldERlc2MoYFN0YWNrczogJHtzLnJ1c3R9YCkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIk1hbnVhbCBQb2xpc2hcIikub25DbGljayhhc3luYygpPT57IFxuICAgICAgICAgICAgcy5ydXN0PTA7IHMueHBSZXE9TWF0aC5mbG9vcihzLnhwUmVxLzEuMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIlJ1c3QgcG9saXNoZWQuXCIpOyBcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBcbiAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDoyMHB4OyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJTYXZlID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiU2F2ZVwifSk7IFxuICAgICAgICBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiU2F2ZS5vbmNsaWNrPWFzeW5jKCk9PnsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYkRlbCA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkRlbGV0ZSBOb2RlXCJ9KTsgXG4gICAgICAgIGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IFxuICAgICAgICBiRGVsLm9uY2xpY2s9YXN5bmMoKT0+eyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cblxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgdGl0bGU6IHN0cmluZyA9IFwiXCI7XG4gICAgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIgPSBcInN1cnZleVwiO1xuICAgIGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nID0gXCJOb25lXCI7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggREVQTE9ZTUVOVFwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLnRpdGxlID0gdik7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUeXBlXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcInN1cnZleVwiLCBcIlN1cnZleSAoMTAwLTIwMCB3b3JkcylcIilcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZGVlcF9kaXZlXCIsIFwiRGVlcCBEaXZlICgyMDAtNDAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcInN1cnZleVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMudHlwZSA9IHYgYXMgXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbnMoc2tpbGxzKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcIk5vbmVcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLmxpbmtlZFNraWxsID0gdilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tYmF0UXVlc3RzW2YuYmFzZW5hbWVdID0gZi5iYXNlbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGluayBDb21iYXQgUXVlc3RcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhjb21iYXRRdWVzdHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkQ29tYmF0UXVlc3QgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIFJFU0VBUkNIXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5rZWRTa2lsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZENvbWJhdFF1ZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcblxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQ29tYmF0IFF1ZXN0czogJHtzdGF0cy5jb21iYXR9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUXVlc3RzOiAke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJhdGlvOiAke3N0YXRzLnJhdGlvfToxYCB9KTtcblxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0VGV4dChcIlJFU0VBUkNIIEJMT0NLRUQ6IE5lZWQgMjoxIGNvbWJhdCB0byByZXNlYXJjaCByYXRpb1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcblxuICAgICAgICBjb25zdCBxdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAocXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoIHF1ZXN0cy5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgcGFkZGluZzogMTBweDsgbWFyZ2luOiA1cHggMDsgYm9yZGVyLXJhZGl1czogNHB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHEudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgaW5mby5zZXRUZXh0KGBUeXBlOiAke3EudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSB8IFdvcmRzOiAke3Eud29yZENvdW50fS8ke3Eud29yZExpbWl0fWApO1xuICAgICAgICAgICAgICAgIGluZm8uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXNpemU6IDAuOWVtOyBvcGFjaXR5OiAwLjg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiBncmVlbjsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHJlZDsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQ29tcGxldGVkIFJlc2VhcmNoXCIgfSk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZC5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldFRleHQoYCsgJHtxLnRpdGxlfSAoJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCk7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm9wYWNpdHk6IDAuNjsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBDaGFpbkJ1aWxkZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBzZWxlY3RlZFF1ZXN0czogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDSEFJTiBCVUlMREVSXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5jaGFpbk5hbWUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgY29uc3QgcXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3RzLnB1c2goZi5iYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKHF1ZXN0KVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWVzdHMgPSB0aGlzLnNlbGVjdGVkUXVlc3RzLmZpbHRlcihxID0+IHEgIT09IHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IGJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNSRUFURSBDSEFJTlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDdGEoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhaW5OYW1lICYmIHRoaXMuc2VsZWN0ZWRRdWVzdHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdENoYWluKHRoaXMuY2hhaW5OYW1lLCB0aGlzLnNlbGVjdGVkUXVlc3RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDY6IEFuYWx5dGljcyAmIEVuZGdhbWUgRW5naW5lXG4gKiBIYW5kbGVzIGFsbCBtZXRyaWNzIHRyYWNraW5nLCBib3NzIG1pbGVzdG9uZXMsIGFjaGlldmVtZW50cywgYW5kIHdpbiBjb25kaXRpb25cbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHNldHRpbmdzLmRheU1ldHJpY3MsIHdlZWtseVJlcG9ydHMsIGJvc3NNaWxlc3RvbmVzLCBzdHJlYWssIGFjaGlldmVtZW50c1xuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBhdWRpbyBjYWxsYmFjayBmb3Igbm90aWZpY2F0aW9uc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYWNrIGRhaWx5IG1ldHJpY3MgLSBjYWxsZWQgd2hlbmV2ZXIgYSBxdWVzdCBpcyBjb21wbGV0ZWQvZmFpbGVkL2V0Y1xuICAgICAqL1xuICAgIHRyYWNrRGFpbHlNZXRyaWNzKHR5cGU6ICdxdWVzdF9jb21wbGV0ZScgfCAncXVlc3RfZmFpbCcgfCAneHAnIHwgJ2dvbGQnIHwgJ2RhbWFnZScgfCAnc2tpbGxfbGV2ZWwnIHwgJ2NoYWluX2NvbXBsZXRlJywgYW1vdW50OiBudW1iZXIgPSAxKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXRyaWMgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmluZChtID0+IG0uZGF0ZSA9PT0gdG9kYXkpO1xuICAgICAgICBpZiAoIW1ldHJpYykge1xuICAgICAgICAgICAgbWV0cmljID0ge1xuICAgICAgICAgICAgICAgIGRhdGU6IHRvZGF5LFxuICAgICAgICAgICAgICAgIHF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICAgICAgICAgICAgICBxdWVzdHNGYWlsZWQ6IDAsXG4gICAgICAgICAgICAgICAgeHBFYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgZ29sZEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBkYW1hZ2VzVGFrZW46IDAsXG4gICAgICAgICAgICAgICAgc2tpbGxzTGV2ZWxlZDogW10sXG4gICAgICAgICAgICAgICAgY2hhaW5zQ29tcGxldGVkOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnB1c2gobWV0cmljKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfY29tcGxldGVcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9mYWlsXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnF1ZXN0c0ZhaWxlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMueHBFYXJuZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImdvbGRcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGFtYWdlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmRhbWFnZXNUYWtlbiArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuc2tpbGxzTGV2ZWxlZC5wdXNoKFwiU2tpbGwgbGV2ZWxlZFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjaGFpbl9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRhaWx5IHN0cmVhayAtIGNhbGxlZCBvbmNlIHBlciBkYXkgYXQgbG9naW5cbiAgICAgKi9cbiAgICB1cGRhdGVTdHJlYWsoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGUgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gQWxyZWFkeSBjb3VudGVkIHRvZGF5XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXknKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB5ZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIENvbnNlY3V0aXZlIGRheVxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCsrO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTdHJlYWsgYnJva2VuLCBzdGFydCBuZXcgb25lXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubGFzdERhdGUgPSB0b2RheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJvc3MgbWlsZXN0b25lcyBvbiBmaXJzdCBydW5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gbWlsZXN0b25lcyBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhbnkgYm9zc2VzIHNob3VsZCBiZSB1bmxvY2tlZCBiYXNlZCBvbiBjdXJyZW50IGxldmVsXG4gICAgICovXG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZvckVhY2goKGJvc3M6IEJvc3NNaWxlc3RvbmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IGJvc3MubGV2ZWwgJiYgIWJvc3MudW5sb2NrZWQpIHtcbiAgICAgICAgICAgICAgICBib3NzLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGBCb3NzIFVubG9ja2VkOiAke2Jvc3MubmFtZX0gKExldmVsICR7Ym9zcy5sZXZlbH0pYCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYm9zcyBhcyBkZWZlYXRlZCBhbmQgYXdhcmQgWFBcbiAgICAgKi9cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYm9zcy5kZWZlYXRlZCA9IHRydWU7XG4gICAgICAgIGJvc3MuZGVmZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayB3aW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChsZXZlbCA9PT0gNTApIHtcbiAgICAgICAgICAgIHRoaXMud2luR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgVklDVE9SWSFgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQm9zcyBEZWZlYXRlZDogJHtib3NzLm5hbWV9ISArJHtib3NzLnhwUmV3YXJkfSBYUGAsIHhwUmV3YXJkOiBib3NzLnhwUmV3YXJkIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB3aW4gY29uZGl0aW9uXG4gICAgICovXG4gICAgcHJpdmF0ZSB3aW5HYW1lKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmVuZEdhbWVEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB3ZWVrbHkgcmVwb3J0XG4gICAgICovXG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTogV2Vla2x5UmVwb3J0IHtcbiAgICAgICAgY29uc3Qgd2VlayA9IG1vbWVudCgpLndlZWsoKTtcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGNvbnN0IGVuZERhdGUgPSBtb21lbnQoKS5lbmRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWVrTWV0cmljcyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maWx0ZXIoKG06IERheU1ldHJpY3MpID0+IFxuICAgICAgICAgICAgbW9tZW50KG0uZGF0ZSkuaXNCZXR3ZWVuKG1vbWVudChzdGFydERhdGUpLCBtb21lbnQoZW5kRGF0ZSksIG51bGwsICdbXScpXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxGYWlsZWQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0ZhaWxlZCwgMCk7XG4gICAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCA+IDAgPyBNYXRoLnJvdW5kKCh0b3RhbFF1ZXN0cyAvICh0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkKSkgKiAxMDApIDogMDtcbiAgICAgICAgY29uc3QgdG90YWxYcCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEdvbGQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLmdvbGRFYXJuZWQsIDApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG9wU2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHNcbiAgICAgICAgICAgIC5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSlcbiAgICAgICAgICAgIC5zbGljZSgwLCAzKVxuICAgICAgICAgICAgLm1hcCgoczogYW55KSA9PiBzLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWF4OiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0NvbXBsZXRlZCA+IG1heC5xdWVzdHNDb21wbGV0ZWQgPyBtIDogbWF4KS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1pbjogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNGYWlsZWQgPiBtaW4ucXVlc3RzRmFpbGVkID8gbSA6IG1pbikuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXBvcnQ6IFdlZWtseVJlcG9ydCA9IHtcbiAgICAgICAgICAgIHdlZWs6IHdlZWssXG4gICAgICAgICAgICBzdGFydERhdGU6IHN0YXJ0RGF0ZSxcbiAgICAgICAgICAgIGVuZERhdGU6IGVuZERhdGUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdG90YWxRdWVzdHMsXG4gICAgICAgICAgICBzdWNjZXNzUmF0ZTogc3VjY2Vzc1JhdGUsXG4gICAgICAgICAgICB0b3RhbFhwOiB0b3RhbFhwLFxuICAgICAgICAgICAgdG90YWxHb2xkOiB0b3RhbEdvbGQsXG4gICAgICAgICAgICB0b3BTa2lsbHM6IHRvcFNraWxscyxcbiAgICAgICAgICAgIGJlc3REYXk6IGJlc3REYXksXG4gICAgICAgICAgICB3b3JzdERheTogd29yc3REYXlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cy5wdXNoKHJlcG9ydCk7XG4gICAgICAgIHJldHVybiByZXBvcnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5sb2NrIGFuIGFjaGlldmVtZW50XG4gICAgICovXG4gICAgdW5sb2NrQWNoaWV2ZW1lbnQoYWNoaWV2ZW1lbnRJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjaGlldmVtZW50ID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZCgoYTogQWNoaWV2ZW1lbnQpID0+IGEuaWQgPT09IGFjaGlldmVtZW50SWQpO1xuICAgICAgICBpZiAoIWFjaGlldmVtZW50IHx8IGFjaGlldmVtZW50LnVubG9ja2VkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZ2FtZSBzdGF0cyBzbmFwc2hvdFxuICAgICAqL1xuICAgIGdldEdhbWVTdGF0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxldmVsOiB0aGlzLnNldHRpbmdzLmxldmVsLFxuICAgICAgICAgICAgY3VycmVudFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCxcbiAgICAgICAgICAgIGxvbmdlc3RTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRoaXMuc2V0dGluZ3MueHAgKyB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCksXG4gICAgICAgICAgICBnYW1lV29uOiB0aGlzLnNldHRpbmdzLmdhbWVXb24sXG4gICAgICAgICAgICBib3NzZXNEZWZlYXRlZDogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maWx0ZXIoKGI6IEJvc3NNaWxlc3RvbmUpID0+IGIuZGVmZWF0ZWQpLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsQm9zc2VzOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBzdXJ2aXZhbCBlc3RpbWF0ZSAocm91Z2ggY2FsY3VsYXRpb24pXG4gICAgICovXG4gICAgZ2V0U3Vydml2YWxFc3RpbWF0ZSgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkYW1hZ2VQZXJGYWlsdXJlID0gMTAgKyBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgLyAyKTtcbiAgICAgICAgY29uc3QgYWN0dWFsRGFtYWdlID0gdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IGRhbWFnZVBlckZhaWx1cmUgKiAyIDogZGFtYWdlUGVyRmFpbHVyZTtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5ocCAvIE1hdGgubWF4KDEsIGFjdHVhbERhbWFnZSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDM6IE1lZGl0YXRpb24gJiBSZWNvdmVyeSBFbmdpbmVcbiAqIEhhbmRsZXMgbG9ja2Rvd24gc3RhdGUsIG1lZGl0YXRpb24gaGVhbGluZywgYW5kIHF1ZXN0IGRlbGV0aW9uIHF1b3RhXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBsb2NrZG93blVudGlsLCBpc01lZGl0YXRpbmcsIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sIFxuICogICAgICAgICAgIHF1ZXN0RGVsZXRpb25zVG9kYXksIGxhc3REZWxldGlvblJlc2V0XG4gKiBERVBFTkRFTkNJRVM6IG1vbWVudCwgU2lzeXBodXNTZXR0aW5nc1xuICogU0lERSBFRkZFQ1RTOiBQbGF5cyBhdWRpbyAoNDMyIEh6IHRvbmUpXG4gKi9cbmV4cG9ydCBjbGFzcyBNZWRpdGF0aW9uRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7IC8vIE9wdGlvbmFsIGZvciA0MzIgSHogc291bmRcbiAgICBwcml2YXRlIG1lZGl0YXRpb25Db29sZG93bk1zID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjdXJyZW50bHkgbG9ja2VkIGRvd25cbiAgICAgKi9cbiAgICBpc0xvY2tlZERvd24oKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxvY2tkb3duIHRpbWUgcmVtYWluaW5nIGluIG1pbnV0ZXNcbiAgICAgKi9cbiAgICBnZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTogeyBob3VyczogbnVtYmVyOyBtaW51dGVzOiBudW1iZXI7IHRvdGFsTWludXRlczogbnVtYmVyIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGhvdXJzOiAwLCBtaW51dGVzOiAwLCB0b3RhbE1pbnV0ZXM6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxNaW51dGVzID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IHRvdGFsTWludXRlcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHRvdGFsTWludXRlcyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgbG9ja2Rvd24gYWZ0ZXIgdGFraW5nIDUwKyBkYW1hZ2VcbiAgICAgKi9cbiAgICB0cmlnZ2VyTG9ja2Rvd24oKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IG1vbWVudCgpLmFkZCg2LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gb25lIG1lZGl0YXRpb24gY3ljbGUgKGNsaWNrKVxuICAgICAqIFJldHVybnM6IHsgc3VjY2VzcywgY3ljbGVzRG9uZSwgY3ljbGVzUmVtYWluaW5nLCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBtZWRpdGF0ZSgpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZzsgbG9ja2Rvd25SZWR1Y2VkOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJOb3QgaW4gbG9ja2Rvd24uIE5vIG5lZWQgdG8gbWVkaXRhdGUuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IE1hdGgubWF4KDAsIDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkFscmVhZHkgbWVkaXRhdGluZy4gV2FpdCAzMCBzZWNvbmRzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKys7XG4gICAgICAgIFxuICAgICAgICAvLyBQbGF5IGhlYWxpbmcgZnJlcXVlbmN5XG4gICAgICAgIHRoaXMucGxheU1lZGl0YXRpb25Tb3VuZCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGxldCBsb2NrZG93blJlZHVjZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIDEwIGN5Y2xlcyBjb21wbGV0ZVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID49IDEwKSB7XG4gICAgICAgICAgICBjb25zdCByZWR1Y2VkVGltZSA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLnN1YnRyYWN0KDUsICdob3VycycpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gcmVkdWNlZFRpbWUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk1lZGl0YXRpb24gY29tcGxldGUuIExvY2tkb3duIHJlZHVjZWQgYnkgNSBob3Vycy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogcmVtYWluaW5nLFxuICAgICAgICAgICAgbWVzc2FnZTogYE1lZGl0YXRpb24gKCR7dGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3dufS8xMCkgLSAke3JlbWFpbmluZ30gY3ljbGVzIGxlZnRgLFxuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXkgNDMyIEh6IGhlYWxpbmcgZnJlcXVlbmN5IGZvciAxIHNlY29uZFxuICAgICAqL1xuICAgIHByaXZhdGUgcGxheU1lZGl0YXRpb25Tb3VuZCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICAgICAgY29uc3Qgb3NjaWxsYXRvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgICAgICBjb25zdCBnYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnZhbHVlID0gNDMyO1xuICAgICAgICAgICAgb3NjaWxsYXRvci50eXBlID0gXCJzaW5lXCI7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMywgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5zdGFydChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgb3NjaWxsYXRvci5zdG9wKGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIG5vdCBhdmFpbGFibGUgZm9yIG1lZGl0YXRpb25cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWVkaXRhdGlvbiBzdGF0dXMgZm9yIGN1cnJlbnQgbG9ja2Rvd25cbiAgICAgKi9cbiAgICBnZXRNZWRpdGF0aW9uU3RhdHVzKCk6IHsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgdGltZVJlZHVjZWQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY3ljbGVzRG9uZSA9IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgY29uc3QgY3ljbGVzUmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMTAgLSBjeWNsZXNEb25lKTtcbiAgICAgICAgY29uc3QgdGltZVJlZHVjZWQgPSAoMTAgLSBjeWNsZXNSZW1haW5pbmcpICogMzA7IC8vIDMwIG1pbiBwZXIgY3ljbGVcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjeWNsZXNEb25lLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nLFxuICAgICAgICAgICAgdGltZVJlZHVjZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBkZWxldGlvbiBxdW90YSBpZiBuZXcgZGF5XG4gICAgICovXG4gICAgcHJpdmF0ZSBlbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgaGFzIGZyZWUgZGVsZXRpb25zIGxlZnQgdG9kYXlcbiAgICAgKi9cbiAgICBjYW5EZWxldGVRdWVzdEZyZWUoKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPCAzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZWxldGlvbiBxdW90YSBzdGF0dXNcbiAgICAgKi9cbiAgICBnZXREZWxldGlvblF1b3RhKCk6IHsgZnJlZTogbnVtYmVyOyBwYWlkOiBudW1iZXI7IHJlbWFpbmluZzogbnVtYmVyIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSk7XG4gICAgICAgIGNvbnN0IHBhaWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgLSAzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmcmVlOiByZW1haW5pbmcsXG4gICAgICAgICAgICBwYWlkOiBwYWlkLFxuICAgICAgICAgICAgcmVtYWluaW5nOiByZW1haW5pbmdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBxdWVzdCBhbmQgY2hhcmdlIGdvbGQgaWYgbmVjZXNzYXJ5XG4gICAgICogUmV0dXJuczogeyBjb3N0LCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBhcHBseURlbGV0aW9uQ29zdCgpOiB7IGNvc3Q6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID49IDMpIHtcbiAgICAgICAgICAgIC8vIFBhaWQgZGVsZXRpb25cbiAgICAgICAgICAgIGNvc3QgPSAxMDtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gQ29zdDogLSR7Y29zdH1nYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZyZWUgZGVsZXRpb25cbiAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXk7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuICgke3JlbWFpbmluZyAtIDF9IGZyZWUgZGVsZXRpb25zIHJlbWFpbmluZylgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjb3N0LCBtZXNzYWdlIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgUmVzZWFyY2hRdWVzdCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgMjogUmVzZWFyY2ggUXVlc3QgU3lzdGVtIEVuZ2luZVxuICogSGFuZGxlcyByZXNlYXJjaCBxdWVzdCBjcmVhdGlvbiwgY29tcGxldGlvbiwgd29yZCBjb3VudCB2YWxpZGF0aW9uLCBhbmQgY29tYmF0OnJlc2VhcmNoIHJhdGlvXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byByZXNlYXJjaFF1ZXN0cywgcmVzZWFyY2hTdGF0c1xuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBSRVFVSVJFTUVOVFM6IEF1ZGlvIGNhbGxiYWNrcyBmcm9tIHBhcmVudCBmb3Igbm90aWZpY2F0aW9uc1xuICovXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcmVzZWFyY2ggcXVlc3RcbiAgICAgKiBDaGVja3MgMjoxIGNvbWJhdDpyZXNlYXJjaCByYXRpbyBiZWZvcmUgYWxsb3dpbmcgY3JlYXRpb25cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiLCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgcXVlc3RJZD86IHN0cmluZyB9PiB7XG4gICAgICAgIC8vIENoZWNrIDI6MSBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgICAgaWYgKCF0aGlzLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlJFU0VBUkNIIEJMT0NLRUQ6IENvbXBsZXRlIDIgY29tYmF0IHF1ZXN0cyBwZXIgcmVzZWFyY2ggcXVlc3RcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29yZExpbWl0ID0gdHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDIwMCA6IDQwMDtcbiAgICAgICAgY29uc3QgcXVlc3RJZCA9IGByZXNlYXJjaF8keyh0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgfHwgMCkgKyAxfWA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0OiBSZXNlYXJjaFF1ZXN0ID0ge1xuICAgICAgICAgICAgaWQ6IHF1ZXN0SWQsXG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbGlua2VkU2tpbGw6IGxpbmtlZFNraWxsLFxuICAgICAgICAgICAgd29yZExpbWl0OiB3b3JkTGltaXQsXG4gICAgICAgICAgICB3b3JkQ291bnQ6IDAsXG4gICAgICAgICAgICBsaW5rZWRDb21iYXRRdWVzdDogbGlua2VkQ29tYmF0UXVlc3QsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMucHVzaChyZXNlYXJjaFF1ZXN0KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID0gcGFyc2VJbnQocXVlc3RJZC5zcGxpdCgnXycpWzFdKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2grKztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYFJlc2VhcmNoIFF1ZXN0IENyZWF0ZWQ6ICR7dHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSAoJHt3b3JkTGltaXR9IHdvcmRzKWAsXG4gICAgICAgICAgICBxdWVzdElkOiBxdWVzdElkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqIFZhbGlkYXRlcyB3b3JkIGNvdW50ICg4MC0xMjUlKSwgYXBwbGllcyBwZW5hbHRpZXMgZm9yIG92ZXJhZ2UsIGF3YXJkcyBYUFxuICAgICAqL1xuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcsIGZpbmFsV29yZENvdW50OiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlcjsgZ29sZFBlbmFsdHk6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoIXJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIHF1ZXN0IG5vdCBmb3VuZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJRdWVzdCBhbHJlYWR5IGNvbXBsZXRlZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWluaW11bSB3b3JkIGNvdW50ICg4MCUgb2YgbGltaXQpXG4gICAgICAgIGNvbnN0IG1pbldvcmRzID0gTWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMC44KTtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50IDwgbWluV29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFF1ZXN0IHRvbyBzaG9ydCEgTWluaW11bSAke21pbldvcmRzfSB3b3JkcyByZXF1aXJlZCAoeW91IGhhdmUgJHtmaW5hbFdvcmRDb3VudH0pYCxcbiAgICAgICAgICAgICAgICB4cFJld2FyZDogMCxcbiAgICAgICAgICAgICAgICBnb2xkUGVuYWx0eTogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgbWF4aW11bSB3b3JkIGNvdW50ICgxMjUlIGlzIGxvY2tlZClcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBXb3JkIGNvdW50IHRvbyBoaWdoISBNYXhpbXVtICR7TWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMS4yNSl9IHdvcmRzIGFsbG93ZWRgLFxuICAgICAgICAgICAgICAgIHhwUmV3YXJkOiAwLFxuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5OiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgWFAgcmV3YXJkXG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSBnb2xkIHBlbmFsdHkgZm9yIG92ZXJhZ2UgKDEwMC0xMjUlIHJhbmdlKVxuICAgICAgICBsZXQgZ29sZFBlbmFsdHkgPSAwO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmFnZVBlcmNlbnQgPSAoKGZpbmFsV29yZENvdW50IC0gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIC8gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICAgICAgaWYgKG92ZXJhZ2VQZXJjZW50ID4gMCkge1xuICAgICAgICAgICAgICAgIGdvbGRQZW5hbHR5ID0gTWF0aC5mbG9vcigyMCAqIChvdmVyYWdlUGVyY2VudCAvIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBd2FyZCBYUCB0byBsaW5rZWQgc2tpbGxcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSByZXNlYXJjaFF1ZXN0LmxpbmtlZFNraWxsKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC54cCArPSB4cFJld2FyZDtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkge1xuICAgICAgICAgICAgICAgIHNraWxsLmxldmVsKys7XG4gICAgICAgICAgICAgICAgc2tpbGwueHAgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBwZW5hbHR5IGFuZCBtYXJrIGNvbXBsZXRlXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBnb2xkUGVuYWx0eTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgbWVzc2FnZSA9IGBSZXNlYXJjaCBDb21wbGV0ZTogJHtyZXNlYXJjaFF1ZXN0LnRpdGxlfSEgKyR7eHBSZXdhcmR9IFhQYDtcbiAgICAgICAgaWYgKGdvbGRQZW5hbHR5ID4gMCkge1xuICAgICAgICAgICAgbWVzc2FnZSArPSBgICgtJHtnb2xkUGVuYWx0eX1nIG92ZXJhZ2UgcGVuYWx0eSlgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlLCB4cFJld2FyZCwgZ29sZFBlbmFsdHkgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSByZXNlYXJjaCBxdWVzdFxuICAgICAqL1xuICAgIGRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kSW5kZXgocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgcXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzW2luZGV4XTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVjcmVtZW50IHN0YXRzIGFwcHJvcHJpYXRlbHlcbiAgICAgICAgICAgIGlmICghcXVlc3QuY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCAtIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgLSAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBkZWxldGVkXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggcXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgd29yZCBjb3VudCBmb3IgYSByZXNlYXJjaCBxdWVzdCAoYXMgdXNlciB3cml0ZXMpXG4gICAgICovXG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQocXVlc3RJZDogc3RyaW5nLCBuZXdXb3JkQ291bnQ6IG51bWJlcik6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0KSB7XG4gICAgICAgICAgICByZXNlYXJjaFF1ZXN0LndvcmRDb3VudCA9IG5ld1dvcmRDb3VudDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBjb21iYXQ6cmVzZWFyY2ggcmF0aW9cbiAgICAgKi9cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCk6IHsgY29tYmF0OiBudW1iZXI7IHJlc2VhcmNoOiBudW1iZXI7IHJhdGlvOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb21iYXQ6IHN0YXRzLnRvdGFsQ29tYmF0LFxuICAgICAgICAgICAgcmVzZWFyY2g6IHN0YXRzLnRvdGFsUmVzZWFyY2gsXG4gICAgICAgICAgICByYXRpbzogcmF0aW8udG9GaXhlZCgyKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgY2FuIGNyZWF0ZSBtb3JlIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqIFJ1bGU6IE11c3QgaGF2ZSAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXG4gICAgICovXG4gICAgY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHJhdGlvID49IDI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFjdGl2ZSAobm90IGNvbXBsZXRlZCkgcmVzZWFyY2ggcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QWN0aXZlUmVzZWFyY2hRdWVzdHMoKTogUmVzZWFyY2hRdWVzdFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29tcGxldGVkIHJlc2VhcmNoIHF1ZXN0c1xuICAgICAqL1xuICAgIGdldENvbXBsZXRlZFJlc2VhcmNoUXVlc3RzKCk6IFJlc2VhcmNoUXVlc3RbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0ZSB3b3JkIGNvdW50IHN0YXR1cyBmb3IgYSBxdWVzdFxuICAgICAqIFJldHVybnM6IHsgc3RhdHVzOiAndG9vX3Nob3J0JyB8ICdwZXJmZWN0JyB8ICdvdmVyYWdlJyB8ICdsb2NrZWQnLCBwZXJjZW50OiBudW1iZXIgfVxuICAgICAqL1xuICAgIHZhbGlkYXRlV29yZENvdW50KHF1ZXN0SWQ6IHN0cmluZywgd29yZENvdW50OiBudW1iZXIpOiB7IHN0YXR1czogJ3Rvb19zaG9ydCcgfCAncGVyZmVjdCcgfCAnb3ZlcmFnZScgfCAnbG9ja2VkJzsgcGVyY2VudDogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmcgfSB7XG4gICAgICAgIGNvbnN0IHF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kKHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmICghcXVlc3QpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3Rvb19zaG9ydCcsIHBlcmNlbnQ6IDAsIG1lc3NhZ2U6IFwiUXVlc3Qgbm90IGZvdW5kXCIgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcGVyY2VudCA9ICh3b3JkQ291bnQgLyBxdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKHBlcmNlbnQgPCA4MCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdHVzOiAndG9vX3Nob3J0JywgcGVyY2VudCwgbWVzc2FnZTogYFRvbyBzaG9ydCAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSkuIE5lZWQgODAlIG1pbmltdW0uYCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAocGVyY2VudCA8PSAxMDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ3BlcmZlY3QnLCBwZXJjZW50LCBtZXNzYWdlOiBgUGVyZmVjdCByYW5nZSAoJHtNYXRoLmNlaWwocGVyY2VudCl9JSlgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChwZXJjZW50IDw9IDEyNSkge1xuICAgICAgICAgICAgY29uc3QgdGF4ID0gTWF0aC5mbG9vcigyMCAqICgocGVyY2VudCAtIDEwMCkgLyAxMDApKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXR1czogJ292ZXJhZ2UnLCBwZXJjZW50LCBtZXNzYWdlOiBgT3ZlcmFnZSB3YXJuaW5nOiAtJHt0YXh9ZyB0YXhgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN0YXR1czogJ2xvY2tlZCcsIHBlcmNlbnQsIG1lc3NhZ2U6IGBMb2NrZWQhIE1heGltdW0gMTI1JSBvZiB3b3JkIGxpbWl0LmAgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBRdWVzdENoYWluLCBRdWVzdENoYWluUmVjb3JkIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA0OiBRdWVzdCBDaGFpbnMgRW5naW5lXG4gKiBIYW5kbGVzIG11bHRpLXF1ZXN0IHNlcXVlbmNlcyB3aXRoIG9yZGVyaW5nLCBsb2NraW5nLCBhbmQgY29tcGxldGlvbiB0cmFja2luZ1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gYWN0aXZlQ2hhaW5zLCBjaGFpbkhpc3RvcnksIGN1cnJlbnRDaGFpbklkLCBjaGFpblF1ZXN0c0NvbXBsZXRlZFxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKiBJTlRFR1JBVElPTiBQT0lOVFM6IE5lZWRzIHRvIGhvb2sgaW50byBjb21wbGV0ZVF1ZXN0KCkgaW4gbWFpbiBlbmdpbmUgZm9yIGNoYWluIHByb2dyZXNzaW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDaGFpbnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgcXVlc3QgY2hhaW5cbiAgICAgKi9cbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3ROYW1lczogc3RyaW5nW10pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbklkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKHF1ZXN0TmFtZXMubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkNoYWluIG11c3QgaGF2ZSBhdCBsZWFzdCAyIHF1ZXN0c1wiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbklkID0gYGNoYWluXyR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBjb25zdCBjaGFpbjogUXVlc3RDaGFpbiA9IHtcbiAgICAgICAgICAgIGlkOiBjaGFpbklkLFxuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHF1ZXN0czogcXVlc3ROYW1lcyxcbiAgICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2UsXG4gICAgICAgICAgICBzdGFydGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGlzQm9zczogcXVlc3ROYW1lc1txdWVzdE5hbWVzLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoXCJib3NzXCIpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5wdXNoKGNoYWluKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IGNoYWluSWQ7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjcmVhdGVkOiAke25hbWV9ICgke3F1ZXN0TmFtZXMubGVuZ3RofSBxdWVzdHMpYCxcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluSWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW4oKTogUXVlc3RDaGFpbiB8IG51bGwge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gYy5pZCA9PT0gdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCk7XG4gICAgICAgIHJldHVybiAoY2hhaW4gJiYgIWNoYWluLmNvbXBsZXRlZCkgPyBjaGFpbiA6IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBuZXh0IHF1ZXN0IHRoYXQgc2hvdWxkIGJlIGNvbXBsZXRlZCBpbiB0aGUgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0TmV4dFF1ZXN0SW5DaGFpbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBpcyBwYXJ0IG9mIGFuIGFjdGl2ZSAoaW5jb21wbGV0ZSkgY2hhaW5cbiAgICAgKi9cbiAgICBpc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHMuaW5jbHVkZXMocXVlc3ROYW1lKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGNhbiBiZSBzdGFydGVkIChpcyBpdCB0aGUgbmV4dCBxdWVzdCBpbiB0aGUgY2hhaW4/KVxuICAgICAqL1xuICAgIGNhblN0YXJ0UXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB0cnVlOyAvLyBOb3QgaW4gYSBjaGFpbiwgY2FuIHN0YXJ0IGFueSBxdWVzdFxuICAgICAgICBcbiAgICAgICAgY29uc3QgbmV4dFF1ZXN0ID0gdGhpcy5nZXROZXh0UXVlc3RJbkNoYWluKCk7XG4gICAgICAgIHJldHVybiBuZXh0UXVlc3QgPT09IHF1ZXN0TmFtZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGEgcXVlc3QgYXMgY29tcGxldGVkIGluIHRoZSBjaGFpblxuICAgICAqIEFkdmFuY2VzIGNoYWluIGlmIHN1Y2Nlc3NmdWwsIGF3YXJkcyBib251cyBYUCBpZiBjaGFpbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICBhc3luYyBjb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lOiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluXCIsIGNoYWluQ29tcGxldGU6IGZhbHNlLCBib251c1hwOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRRdWVzdCA9IGNoYWluLnF1ZXN0c1tjaGFpbi5jdXJyZW50SW5kZXhdO1xuICAgICAgICBpZiAoY3VycmVudFF1ZXN0ICE9PSBxdWVzdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJRdWVzdCBpcyBub3QgbmV4dCBpbiBjaGFpblwiLFxuICAgICAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNoYWluLmN1cnJlbnRJbmRleCsrO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluUXVlc3RzQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBjaGFpbiBpcyBjb21wbGV0ZVxuICAgICAgICBpZiAoY2hhaW4uY3VycmVudEluZGV4ID49IGNoYWluLnF1ZXN0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbXBsZXRlQ2hhaW4oY2hhaW4pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBjaGFpbi5xdWVzdHMubGVuZ3RoIC0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gcHJvZ3Jlc3M6ICR7Y2hhaW4uY3VycmVudEluZGV4fS8ke2NoYWluLnF1ZXN0cy5sZW5ndGh9ICgke3JlbWFpbmluZ30gcmVtYWluaW5nLCAke3BlcmNlbnR9JSBjb21wbGV0ZSlgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcGxldGUgdGhlIGVudGlyZSBjaGFpblxuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY29tcGxldGVDaGFpbihjaGFpbjogUXVlc3RDaGFpbik6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgIGNoYWluLmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9udXNYcCA9IDEwMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib251c1hwO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBjaGFpbi5jb21wbGV0ZWRBdCxcbiAgICAgICAgICAgIHhwRWFybmVkOiBib251c1hwXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY29tcGxldGU6ICR7Y2hhaW4ubmFtZX0hICske2JvbnVzWHB9IFhQIEJvbnVzYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IHRydWUsXG4gICAgICAgICAgICBib251c1hwOiBib251c1hwXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnJlYWsgYW4gYWN0aXZlIGNoYWluXG4gICAgICogS2VlcHMgZWFybmVkIFhQIGZyb20gY29tcGxldGVkIHF1ZXN0c1xuICAgICAqL1xuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBLZXB0OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm8gYWN0aXZlIGNoYWluIHRvIGJyZWFrXCIsIHhwS2VwdDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHhwS2VwdCA9IGNvbXBsZXRlZCAqIDEwOyAvLyBBcHByb3hpbWF0ZSBYUCBmcm9tIGVhY2ggcXVlc3RcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgdG8gaGlzdG9yeSBhcyBicm9rZW5cbiAgICAgICAgY29uc3QgcmVjb3JkOiBRdWVzdENoYWluUmVjb3JkID0ge1xuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW4uaWQsXG4gICAgICAgICAgICBjaGFpbk5hbWU6IGNoYWluLm5hbWUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICB4cEVhcm5lZDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeS5wdXNoKHJlY29yZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gYy5pZCAhPT0gY2hhaW4uaWQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGJyb2tlbjogJHtjaGFpbi5uYW1lfS4gS2VwdCAke2NvbXBsZXRlZH0gcXVlc3QgY29tcGxldGlvbnMgKCR7eHBLZXB0fSBYUCkuYCxcbiAgICAgICAgICAgIHhwS2VwdDogeHBLZXB0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHByb2dyZXNzIG9mIGFjdGl2ZSBjaGFpblxuICAgICAqL1xuICAgIGdldENoYWluUHJvZ3Jlc3MoKTogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCwgcGVyY2VudDogMCB9O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZDogY2hhaW4uY3VycmVudEluZGV4LFxuICAgICAgICAgICAgdG90YWw6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBwZXJjZW50OiBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGNvbXBsZXRlZCBjaGFpbiByZWNvcmRzIChoaXN0b3J5KVxuICAgICAqL1xuICAgIGdldENoYWluSGlzdG9yeSgpOiBRdWVzdENoYWluUmVjb3JkW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3Rvcnk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBhY3RpdmUgY2hhaW5zIChub3QgY29tcGxldGVkKVxuICAgICAqL1xuICAgIGdldEFjdGl2ZUNoYWlucygpOiBRdWVzdENoYWluW10ge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmlsdGVyKGMgPT4gIWMuY29tcGxldGVkKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGV0YWlsZWQgc3RhdGUgb2YgYWN0aXZlIGNoYWluIChmb3IgVUkgcmVuZGVyaW5nKVxuICAgICAqL1xuICAgIGdldENoYWluRGV0YWlscygpOiB7XG4gICAgICAgIGNoYWluOiBRdWVzdENoYWluIHwgbnVsbDtcbiAgICAgICAgcHJvZ3Jlc3M6IHsgY29tcGxldGVkOiBudW1iZXI7IHRvdGFsOiBudW1iZXI7IHBlcmNlbnQ6IG51bWJlciB9O1xuICAgICAgICBxdWVzdFN0YXRlczogQXJyYXk8eyBxdWVzdDogc3RyaW5nOyBzdGF0dXM6ICdjb21wbGV0ZWQnIHwgJ2FjdGl2ZScgfCAnbG9ja2VkJyB9PjtcbiAgICB9IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHJldHVybiB7IGNoYWluOiBudWxsLCBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH0sIHF1ZXN0U3RhdGVzOiBbXSB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBxdWVzdFN0YXRlcyA9IGNoYWluLnF1ZXN0cy5tYXAoKHF1ZXN0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIGlmIChpZHggPCBjaGFpbi5jdXJyZW50SW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBxdWVzdCwgc3RhdHVzOiAnY29tcGxldGVkJyBhcyBjb25zdCB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpZHggPT09IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdhY3RpdmUnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdsb2NrZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgY2hhaW4sIHByb2dyZXNzLCBxdWVzdFN0YXRlcyB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFRGaWxlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgQ29udGV4dEZpbHRlciwgRmlsdGVyU3RhdGUsIEVuZXJneUxldmVsLCBRdWVzdENvbnRleHQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDU6IENvbnRleHQgRmlsdGVycyBFbmdpbmVcbiAqIEhhbmRsZXMgcXVlc3QgZmlsdGVyaW5nIGJ5IGVuZXJneSBsZXZlbCwgbG9jYXRpb24gY29udGV4dCwgYW5kIGN1c3RvbSB0YWdzXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBxdWVzdEZpbHRlcnMsIGZpbHRlclN0YXRlXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXMsIFRGaWxlIChmb3IgcXVlc3QgbWV0YWRhdGEpXG4gKiBOT1RFOiBUaGlzIGlzIHByaW1hcmlseSBhIFZJRVcgTEFZRVIgY29uY2VybiwgYnV0IGtlZXBpbmcgbG9naWMgaXNvbGF0ZWQgaXMgZ29vZFxuICovXG5leHBvcnQgY2xhc3MgRmlsdGVyc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIHNldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nLCBlbmVyZ3k6IEVuZXJneUxldmVsLCBjb250ZXh0OiBRdWVzdENvbnRleHQsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gPSB7XG4gICAgICAgICAgICBlbmVyZ3lMZXZlbDogZW5lcmd5LFxuICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgZ2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBDb250ZXh0RmlsdGVyIHwgbnVsbCB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBhY3RpdmUgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIsIHRhZ3M6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IGVuZXJneSBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBjb250ZXh0IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IHRhZ3NcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0ZSgpOiBGaWx0ZXJTdGF0ZSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgbWF0Y2hlcyBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgY29uc3QgcXVlc3RGaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gZmlsdGVyIHNldCBmb3IgdGhpcyBxdWVzdCwgYWx3YXlzIHNob3dcbiAgICAgICAgaWYgKCFxdWVzdEZpbHRlcikgcmV0dXJuIHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5lbmVyZ3lMZXZlbCAhPT0gZmlsdGVycy5hY3RpdmVFbmVyZ3kpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiAmJiBxdWVzdEZpbHRlci5jb250ZXh0ICE9PSBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGFncyBmaWx0ZXIgKHJlcXVpcmVzIEFOWSBvZiB0aGUgYWN0aXZlIHRhZ3MpXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgaGFzVGFnID0gZmlsdGVycy5hY3RpdmVUYWdzLnNvbWUoKHRhZzogc3RyaW5nKSA9PiBxdWVzdEZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICAgICAgaWYgKCFoYXNUYWcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlsdGVyIGEgbGlzdCBvZiBxdWVzdHMgYmFzZWQgb24gY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBmaWx0ZXJRdWVzdHMocXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHF1ZXN0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHF1ZXN0LmJhc2VuYW1lIHx8IHF1ZXN0Lm5hbWU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5xdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBlbmVyZ3kgbGV2ZWxcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUVuZXJneShlbmVyZ3k6IEVuZXJneUxldmVsLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5lbmVyZ3lMZXZlbCA9PT0gZW5lcmd5O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGNvbnRleHRcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeUNvbnRleHQoY29udGV4dDogUXVlc3RDb250ZXh0LCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyICYmIGZpbHRlci5jb250ZXh0ID09PSBjb250ZXh0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIHRhZ3NcbiAgICAgKi9cbiAgICBnZXRRdWVzdHNCeVRhZ3ModGFnczogc3RyaW5nW10sIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gdGFncy5zb21lKHRhZyA9PiBmaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGFjdGl2ZSBmaWx0ZXJzXG4gICAgICovXG4gICAgY2xlYXJGaWx0ZXJzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZVRhZ3M6IFtdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB1bmlxdWUgdGFncyB1c2VkIGFjcm9zcyBhbGwgcXVlc3RzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlVGFncygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHRhZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgXG4gICAgICAgIGZvciAoY29uc3QgcXVlc3ROYW1lIGluIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgZmlsdGVyLnRhZ3MuZm9yRWFjaCgodGFnOiBzdHJpbmcpID0+IHRhZ3MuYWRkKHRhZykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0YWdzKS5zb3J0KCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHN1bW1hcnkgc3RhdHMgYWJvdXQgZmlsdGVyZWQgc3RhdGVcbiAgICAgKi9cbiAgICBnZXRGaWx0ZXJTdGF0cyhhbGxRdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiB7XG4gICAgICAgIHRvdGFsOiBudW1iZXI7XG4gICAgICAgIGZpbHRlcmVkOiBudW1iZXI7XG4gICAgICAgIGFjdGl2ZUZpbHRlcnNDb3VudDogbnVtYmVyO1xuICAgIH0ge1xuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IHRoaXMuZmlsdGVyUXVlc3RzKGFsbFF1ZXN0cyk7XG4gICAgICAgIGNvbnN0IGFjdGl2ZUZpbHRlcnNDb3VudCA9ICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgIT09IFwiYW55XCIgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmxlbmd0aCA+IDAgPyAxIDogMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdG90YWw6IGFsbFF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBmaWx0ZXJlZDogZmlsdGVyZWQubGVuZ3RoLFxuICAgICAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBhY3RpdmVGaWx0ZXJzQ291bnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSBzcGVjaWZpYyBmaWx0ZXIgdmFsdWVcbiAgICAgKiBVc2VmdWwgZm9yIFVJIHRvZ2dsZSBidXR0b25zXG4gICAgICovXG4gICAgdG9nZ2xlRW5lcmd5RmlsdGVyKGVuZXJneTogRW5lcmd5TGV2ZWwgfCBcImFueVwiKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9PT0gZW5lcmd5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IFwiYW55XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUVuZXJneSA9IGVuZXJneSBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgY29udGV4dCBmaWx0ZXJcbiAgICAgKi9cbiAgICB0b2dnbGVDb250ZXh0RmlsdGVyKGNvbnRleHQ6IFF1ZXN0Q29udGV4dCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9IGNvbnRleHQgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGEgdGFnIGluIHRoZSBhY3RpdmUgdGFnIGxpc3RcbiAgICAgKi9cbiAgICB0b2dnbGVUYWcodGFnOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLmluZGV4T2YodGFnKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MucHVzaCh0YWcpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgVEZvbGRlciwgTm90aWNlLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBTa2lsbCwgTW9kaWZpZXIsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyLCBUaW55RW1pdHRlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgQ2hhb3NNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcblxuLy8gREVGQVVMVCBDT05TVEFOVFNcbmV4cG9ydCBjb25zdCBERUZBVUxUX01PRElGSUVSOiBNb2RpZmllciA9IHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vIGVmZmVjdHMuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9O1xuZXhwb3J0IGNvbnN0IENIQU9TX1RBQkxFOiBNb2RpZmllcltdID0gW1xuICAgIHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vcm1hbC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkZsb3cgU3RhdGVcIiwgZGVzYzogXCIrNTAlIFhQLlwiLCB4cE11bHQ6IDEuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yKXCIgfSxcbiAgICB7IG5hbWU6IFwiV2luZGZhbGxcIiwgZGVzYzogXCIrNTAlIEdvbGQuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkrBcIiB9LFxuICAgIHsgbmFtZTogXCJJbmZsYXRpb25cIiwgZGVzYzogXCJQcmljZXMgMnguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMiwgaWNvbjogXCLwn5OIXCIgfSxcbiAgICB7IG5hbWU6IFwiQnJhaW4gRm9nXCIsIGRlc2M6IFwiWFAgMC41eC5cIiwgeHBNdWx0OiAwLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Mq++4j1wiIH0sXG4gICAgeyBuYW1lOiBcIlJpdmFsIFNhYm90YWdlXCIsIGRlc2M6IFwiR29sZCAwLjV4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAwLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5W177iPXCIgfSxcbiAgICB7IG5hbWU6IFwiQWRyZW5hbGluZVwiLCBkZXNjOiBcIjJ4IFhQLCAtNSBIUC9RLlwiLCB4cE11bHQ6IDIsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SiVwiIH1cbl07XG5cbi8vIE1JU1NJT04gUE9PTFxuY29uc3QgTUlTU0lPTl9QT09MID0gW1xuICAgIHsgaWQ6IFwibW9ybmluZ193aW5cIiwgbmFtZTogXCLimIDvuI8gTW9ybmluZyBXaW5cIiwgZGVzYzogXCJDb21wbGV0ZSAxIFRyaXZpYWwgcXVlc3QgYmVmb3JlIDEwIEFNXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxNSB9LCBjaGVjazogXCJtb3JuaW5nX3RyaXZpYWxcIiB9LFxuICAgIHsgaWQ6IFwibW9tZW50dW1cIiwgbmFtZTogXCLwn5SlIE1vbWVudHVtXCIsIGRlc2M6IFwiQ29tcGxldGUgMyBxdWVzdHMgdG9kYXlcIiwgdGFyZ2V0OiAzLCByZXdhcmQ6IHsgeHA6IDIwLCBnb2xkOiAwIH0sIGNoZWNrOiBcInF1ZXN0X2NvdW50XCIgfSxcbiAgICB7IGlkOiBcInplcm9faW5ib3hcIiwgbmFtZTogXCLwn6eYIFplcm8gSW5ib3hcIiwgZGVzYzogXCJQcm9jZXNzIGFsbCBzY3JhcHMgKDAgcmVtYWluaW5nKVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTAgfSwgY2hlY2s6IFwiemVyb19zY3JhcHNcIiB9LFxuICAgIHsgaWQ6IFwic3BlY2lhbGlzdFwiLCBuYW1lOiBcIvCfjq8gU3BlY2lhbGlzdFwiLCBkZXNjOiBcIlVzZSB0aGUgc2FtZSBza2lsbCAzIHRpbWVzXCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJza2lsbF9yZXBlYXRcIiB9LFxuICAgIHsgaWQ6IFwiaGlnaF9zdGFrZXNcIiwgbmFtZTogXCLwn5KqIEhpZ2ggU3Rha2VzXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBIaWdoIFN0YWtlcyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMzAgfSwgY2hlY2s6IFwiaGlnaF9zdGFrZXNcIiB9LFxuICAgIHsgaWQ6IFwic3BlZWRfZGVtb25cIiwgbmFtZTogXCLimqEgU3BlZWQgRGVtb25cIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoaW4gMmggb2YgY3JlYXRpb25cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDI1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImZhc3RfY29tcGxldGVcIiB9LFxuICAgIHsgaWQ6IFwic3luZXJnaXN0XCIsIG5hbWU6IFwi8J+UlyBTeW5lcmdpc3RcIiwgZGVzYzogXCJDb21wbGV0ZSBxdWVzdCB3aXRoIFByaW1hcnkgKyBTZWNvbmRhcnkgc2tpbGxcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInN5bmVyZ3lcIiB9LFxuICAgIHsgaWQ6IFwic3Vydml2b3JcIiwgbmFtZTogXCLwn5uh77iPIFN1cnZpdm9yXCIsIGRlc2M6IFwiRG9uJ3QgdGFrZSBhbnkgZGFtYWdlIHRvZGF5XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAyMCB9LCBjaGVjazogXCJub19kYW1hZ2VcIiB9LFxuICAgIHsgaWQ6IFwicmlza190YWtlclwiLCBuYW1lOiBcIvCfjrIgUmlzayBUYWtlclwiLCBkZXNjOiBcIkNvbXBsZXRlIERpZmZpY3VsdHkgNCsgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcImhhcmRfcXVlc3RcIiB9XG5dO1xuXG5leHBvcnQgY2xhc3MgU2lzeXBodXNFbmdpbmUgZXh0ZW5kcyBUaW55RW1pdHRlciB7XG4gICAgYXBwOiBBcHA7XG4gICAgcGx1Z2luOiBhbnk7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcbiAgICBcbiAgICAvLyBTdWItRW5naW5lc1xuICAgIGFuYWx5dGljc0VuZ2luZTogQW5hbHl0aWNzRW5naW5lO1xuICAgIG1lZGl0YXRpb25FbmdpbmU6IE1lZGl0YXRpb25FbmdpbmU7XG4gICAgcmVzZWFyY2hFbmdpbmU6IFJlc2VhcmNoRW5naW5lO1xuICAgIGNoYWluc0VuZ2luZTogQ2hhaW5zRW5naW5lO1xuICAgIGZpbHRlcnNFbmdpbmU6IEZpbHRlcnNFbmdpbmU7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBhbnksIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXIpIHtcbiAgICAgICAgc3VwZXIoKTsgLy8gSU5JVCBFVkVOVCBFTUlUVEVSXG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICAgICAgdGhpcy5hdWRpbyA9IGF1ZGlvO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUgPSBuZXcgQW5hbHl0aWNzRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lID0gbmV3IE1lZGl0YXRpb25FbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLnJlc2VhcmNoRW5naW5lID0gbmV3IFJlc2VhcmNoRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5jaGFpbnNFbmdpbmUgPSBuZXcgQ2hhaW5zRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzRW5naW5lID0gbmV3IEZpbHRlcnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGdldCBzZXR0aW5ncygpOiBTaXN5cGh1c1NldHRpbmdzIHsgcmV0dXJuIHRoaXMucGx1Z2luLnNldHRpbmdzOyB9XG4gICAgc2V0IHNldHRpbmdzKHZhbDogU2lzeXBodXNTZXR0aW5ncykgeyB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IHZhbDsgfVxuXG4gICAgYXN5bmMgc2F2ZSgpIHsgXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyBcbiAgICAgICAgLy8gRVZFTlQgQlVTIFRSSUdHRVI6IE5vdGlmeSBVSSB0byB1cGRhdGVcbiAgICAgICAgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpO1xuICAgIH1cblxuICAgIC8vIEdBTUUgTE9PUFxuICAgIHJvbGxEYWlseU1pc3Npb25zKCkge1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBbLi4uTUlTU0lPTl9QT09MXTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQ6IERhaWx5TWlzc2lvbltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhdmFpbGFibGUubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npb24gPSBhdmFpbGFibGUuc3BsaWNlKGlkeCwgMSlbMF07XG4gICAgICAgICAgICBzZWxlY3RlZC5wdXNoKHsgLi4ubWlzc2lvbiwgY2hlY2tGdW5jOiBtaXNzaW9uLmNoZWNrLCBwcm9ncmVzczogMCwgY29tcGxldGVkOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBzZWxlY3RlZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICB9XG5cbiAgICBjaGVja0RhaWx5TWlzc2lvbnMoY29udGV4dDogeyB0eXBlPzogc3RyaW5nOyBkaWZmaWN1bHR5PzogbnVtYmVyOyBza2lsbD86IHN0cmluZzsgc2Vjb25kYXJ5U2tpbGw/OiBzdHJpbmc7IGhpZ2hTdGFrZXM/OiBib29sZWFuOyBxdWVzdENyZWF0ZWQ/OiBudW1iZXIgfSkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZvckVhY2gobWlzc2lvbiA9PiB7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIHJldHVybjtcbiAgICAgICAgICAgIHN3aXRjaCAobWlzc2lvbi5jaGVja0Z1bmMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwibW9ybmluZ190cml2aWFsXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPT09IDEgJiYgbm93LmhvdXIoKSA8IDEwKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb3VudFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5OyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGlnaF9zdGFrZXNcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuaGlnaFN0YWtlcykgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFzdF9jb21wbGV0ZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5xdWVzdENyZWF0ZWQpIHsgaWYgKG1vbWVudCgpLmRpZmYobW9tZW50KGNvbnRleHQucXVlc3RDcmVhdGVkKSwgJ2hvdXJzJykgPD0gMikgbWlzc2lvbi5wcm9ncmVzcysrOyB9IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5lcmd5XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAhPT0gXCJOb25lXCIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm5vX2RhbWFnZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImRhbWFnZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gMDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhhcmRfcXVlc3RcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPj0gNCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic2tpbGxfcmVwZWF0XCI6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSA9ICh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1heFVzZXMgPSBNYXRoLm1heCgwLCAuLi5PYmplY3QudmFsdWVzKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBtYXhVc2VzO1xuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnByb2dyZXNzID49IG1pc3Npb24udGFyZ2V0ICYmICFtaXNzaW9uLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIG1pc3Npb24uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IG1pc3Npb24ucmV3YXJkLnhwO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSBtaXNzaW9uLnJld2FyZC5nb2xkO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKchSBEYWlseSBNaXNzaW9uIENvbXBsZXRlOiAke21pc3Npb24ubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBnZXREaWZmaWN1bHR5TnVtYmVyKGRpZmZMYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgaWYgKGRpZmZMYWJlbCA9PT0gXCJUcml2aWFsXCIpIHJldHVybiAxO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIkVhc3lcIikgcmV0dXJuIDI7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiTWVkaXVtXCIpIHJldHVybiAzO1xuICAgICAgICBpZiAoZGlmZkxhYmVsID09PSBcIkhhcmRcIikgcmV0dXJuIDQ7XG4gICAgICAgIGlmIChkaWZmTGFiZWwgPT09IFwiU1VJQ0lERVwiKSByZXR1cm4gNTtcbiAgICAgICAgcmV0dXJuIDM7XG4gICAgfVxuXG4gICAgYXN5bmMgY2hlY2tEYWlseUxvZ2luKCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbikge1xuICAgICAgICAgICAgY29uc3QgZGF5c0RpZmYgPSBtb21lbnQoKS5kaWZmKG1vbWVudCh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiksICdkYXlzJyk7XG4gICAgICAgICAgICBpZiAoZGF5c0RpZmYgPiAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm90RGFtYWdlID0gKGRheXNEaWZmIC0gMSkgKiAxMDtcbiAgICAgICAgICAgICAgICBpZiAocm90RGFtYWdlID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IHJvdERhbWFnZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnB1c2goeyBkYXRlOiB0b2RheSwgc3RhdHVzOiBcInJvdFwiLCB4cEVhcm5lZDogLXJvdERhbWFnZSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudXBkYXRlU3RyZWFrKCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnNldHRpbmdzLm1heEhwLCB0aGlzLnNldHRpbmdzLmhwICsgMjApO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRvZGF5TW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzLmxhc3RVc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2RheU1vbWVudC5kaWZmKG1vbWVudChzLmxhc3RVc2VkKSwgJ2RheXMnKSA+IDMgJiYgIXRoaXMuaXNSZXN0aW5nKCkpIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBzLnJ1c3QgPSBNYXRoLm1pbigxMCwgKHMucnVzdCB8fCAwKSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcy54cFJlcSA9IE1hdGguZmxvb3Iocy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdExvZ2luID0gdG9kYXk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhpc3RvcnkucHVzaCh7IGRhdGU6IHRvZGF5LCBzdGF0dXM6IFwic3VjY2Vzc1wiLCB4cEVhcm5lZDogMCB9KTtcbiAgICAgICAgICAgIGlmKHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5sZW5ndGggPiAxNCkgdGhpcy5zZXR0aW5ncy5oaXN0b3J5LnNoaWZ0KCk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgIT09IHRvZGF5KSB0aGlzLnJvbGxEYWlseU1pc3Npb25zKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxDaGFvcyh0cnVlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgY29tcGxldGVRdWVzdChmaWxlOiBURmlsZSkge1xuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS50cmFja0RhaWx5TWV0cmljcyhcInF1ZXN0X2NvbXBsZXRlXCIsIDEpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxDb21iYXQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgaWYgKCFmbSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gZmlsZS5iYXNlbmFtZTtcbiAgICAgICAgaWYgKHRoaXMuY2hhaW5zRW5naW5lLmlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZSkgJiYgIXRoaXMuY2hhaW5zRW5naW5lLmNhblN0YXJ0UXVlc3QocXVlc3ROYW1lKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIlF1ZXN0IGxvY2tlZCBpbiBjaGFpbi4gQ29tcGxldGUgdGhlIGFjdGl2ZSBxdWVzdCBmaXJzdC5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jaGFpbnNFbmdpbmUuaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lKSkge1xuICAgICAgICAgICAgIGNvbnN0IGNoYWluUmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKGNoYWluUmVzdWx0LnN1Y2Nlc3MgJiYgY2hhaW5SZXN1bHQubWVzc2FnZSkgbmV3IE5vdGljZShjaGFpblJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGQgPSAoZm0uZ29sZF9yZXdhcmQgfHwgMCkgKiB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG4gICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IGZtLnNraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnkgPSBmbS5zZWNvbmRhcnlfc2tpbGwgfHwgXCJOb25lXCI7IFxuXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4yKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyoICR7c2tpbGwubmFtZX06IFJ1c3QgQ2xlYXJlZCFgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNraWxsLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IG5ldyBOb3RpY2UoYPCfp6AgJHtza2lsbC5uYW1lfSBVcCFgKTsgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlY1NraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICAgICAgeHAgKz0gTWF0aC5mbG9vcihzZWNTa2lsbC5sZXZlbCAqIDAuNSk7IHNlY1NraWxsLnhwICs9IDAuNTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IHhwOyB0aGlzLnNldHRpbmdzLmdvbGQgKz0gZ29sZDtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy54cCA+PSB0aGlzLnNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsKys7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSA1OyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJvc3NNc2dzID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICAgICAgYm9zc01zZ3MuZm9yRWFjaChtc2cgPT4gbmV3IE5vdGljZShtc2cpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkrKztcbiAgICAgICAgY29uc3QgcXVlc3RDcmVhdGVkID0gZm0uY3JlYXRlZCA/IG5ldyBEYXRlKGZtLmNyZWF0ZWQpLmdldFRpbWUoKSA6IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGRpZmZpY3VsdHkgPSB0aGlzLmdldERpZmZpY3VsdHlOdW1iZXIoZm0uZGlmZmljdWx0eSk7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJjb21wbGV0ZVwiLCBkaWZmaWN1bHR5LCBza2lsbDogc2tpbGxOYW1lLCBzZWNvbmRhcnlTa2lsbDogc2Vjb25kYXJ5LCBoaWdoU3Rha2VzOiBmbS5oaWdoX3N0YWtlcywgcXVlc3RDcmVhdGVkIH0pO1xuXG4gICAgICAgIGNvbnN0IGFyY2hpdmVQYXRoID0gXCJBY3RpdmVfUnVuL0FyY2hpdmVcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYXJjaGl2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoYXJjaGl2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHsgZi5zdGF0dXMgPSBcImNvbXBsZXRlZFwiOyBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgYCR7YXJjaGl2ZVBhdGh9LyR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyBmYWlsUXVlc3QoZmlsZTogVEZpbGUsIG1hbnVhbEFib3J0OiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCLwn5i0IFJlc3QgRGF5IGFjdGl2ZS4gTm8gZGFtYWdlLlwiKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTaGllbGRlZCgpICYmICFtYW51YWxBYm9ydCkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShg8J+boe+4jyBTSElFTERFRCFgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBkYW1hZ2UgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ29sZCA8IC0xMDApIGRhbWFnZSAqPSAyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSArPSBkYW1hZ2U7XG4gICAgICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7IFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwiZmFpbFwiKTtcbiAgICAgICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFtYWdlVGFrZW5Ub2RheSA+IDUwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMudGF1bnQoXCJsb2NrZG93blwiKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpOyAvLyBFVkVOVCBUUklHR0VSXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAzMCkgeyB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImhlYXJ0YmVhdFwiKTsgdGhpcy50YXVudChcImxvd19ocFwiKTsgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGdyYXZlUGF0aCA9IFwiR3JhdmV5YXJkL0ZhaWx1cmVzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihncmF2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlUGF0aH0vW0ZBSUxFRF0gJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ocCA8PSAwKSB0aGlzLnRyaWdnZXJEZWF0aCgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIuKblCBMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBpZiAodGhpcy5pc1Jlc3RpbmcoKSAmJiBoaWdoU3Rha2VzKSB7IG5ldyBOb3RpY2UoXCJDYW5ub3QgZGVwbG95IEhpZ2ggU3Rha2VzIG9uIFJlc3QgRGF5LlwiKTsgcmV0dXJuOyB9IFxuXG4gICAgICAgIGxldCB4cFJld2FyZCA9IDA7IGxldCBnb2xkUmV3YXJkID0gMDsgbGV0IGRpZmZMYWJlbCA9IFwiXCI7XG4gICAgICAgIGlmIChpc0Jvc3MpIHsgeHBSZXdhcmQgPSAxMDAwOyBnb2xkUmV3YXJkID0gMTAwMDsgZGlmZkxhYmVsID0gXCLimKDvuI8gQk9TU1wiOyB9IFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN3aXRjaChkaWZmKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMDUpOyBnb2xkUmV3YXJkID0gMTA7IGRpZmZMYWJlbCA9IFwiVHJpdmlhbFwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4xMCk7IGdvbGRSZXdhcmQgPSAyMDsgZGlmZkxhYmVsID0gXCJFYXN5XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjIwKTsgZ29sZFJld2FyZCA9IDQwOyBkaWZmTGFiZWwgPSBcIk1lZGl1bVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC40MCk7IGdvbGRSZXdhcmQgPSA4MDsgZGlmZkxhYmVsID0gXCJIYXJkXCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjYwKTsgZ29sZFJld2FyZCA9IDE1MDsgZGlmZkxhYmVsID0gXCJTVUlDSURFXCI7IGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChoaWdoU3Rha2VzICYmICFpc0Jvc3MpIHsgZ29sZFJld2FyZCA9IE1hdGguZmxvb3IoZ29sZFJld2FyZCAqIDEuNSk7IH1cbiAgICAgICAgbGV0IGRlYWRsaW5lU3RyID0gXCJOb25lXCI7IGxldCBkZWFkbGluZUZyb250bWF0dGVyID0gXCJcIjtcbiAgICAgICAgaWYgKGRlYWRsaW5lSXNvKSB7IGRlYWRsaW5lU3RyID0gbW9tZW50KGRlYWRsaW5lSXNvKS5mb3JtYXQoXCJZWVlZLU1NLUREIEhIOm1tXCIpOyBkZWFkbGluZUZyb250bWF0dGVyID0gYGRlYWRsaW5lOiAke2RlYWRsaW5lSXNvfWA7IH1cblxuICAgICAgICBjb25zdCByb290UGF0aCA9IFwiQWN0aXZlX1J1blwiOyBjb25zdCBxdWVzdHNQYXRoID0gXCJBY3RpdmVfUnVuL1F1ZXN0c1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290UGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihyb290UGF0aCk7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHF1ZXN0c1BhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIocXVlc3RzUGF0aCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IG5hbWUucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7cXVlc3RzUGF0aH0vJHtzYWZlTmFtZX0ubWRgO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlc31cbmlzX2Jvc3M6ICR7aXNCb3NzfVxuY3JlYXRlZDogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XG4ke2RlYWRsaW5lRnJvbnRtYXR0ZXJ9XG4tLS1cbiMg4pqU77iPICR7bmFtZX1cbj4gWyFJTkZPXSBNaXNzaW9uXG4+ICoqUHJpOioqICR7cHJpb3JpdHl9IHwgKipEaWZmOioqICR7ZGlmZkxhYmVsfSB8ICoqRHVlOioqICR7ZGVhZGxpbmVTdHJ9XG4+ICoqUndkOioqICR7eHBSZXdhcmR9IFhQIHwgJHtnb2xkUmV3YXJkfSBHXG4+ICoqTmV1cmFsIExpbms6KiogJHtza2lsbH0gKyAke3NlY1NraWxsfVxuYDtcbiAgICAgICAgaWYgKHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlbmFtZSkpIHsgbmV3IE5vdGljZShcIkV4aXN0cyFcIik7IHJldHVybjsgfVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpOyBcbiAgICAgICAgdGhpcy5zYXZlKCk7IC8vIFdpbGwgdHJpZ2dlciB1cGRhdGVcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZGVsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpOyBuZXcgTm90aWNlKFwiRGVwbG95bWVudCBBYm9ydGVkIChEZWxldGVkKVwiKTsgdGhpcy5zYXZlKCk7IH1cblxuICAgIGFzeW5jIGNoZWNrRGVhZGxpbmVzKCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKCEoZm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikpIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZvbGRlci5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGlmIChmbT8uZGVhZGxpbmUgJiYgbW9tZW50KCkuaXNBZnRlcihtb21lbnQoZm0uZGVhZGxpbmUpKSkgYXdhaXQgdGhpcy5mYWlsUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgdHJpZ2dlckRlYXRoKCkge1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImRlYXRoXCIpO1xuICAgICAgICBjb25zdCBlYXJuZWRTb3VscyA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDEwICsgdGhpcy5zZXR0aW5ncy5nb2xkIC8gMTApO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxlZ2FjeS5zb3VscyArPSBlYXJuZWRTb3VscztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9ICh0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50IHx8IDApICsgMTtcbiAgICAgICAgbmV3IE5vdGljZShg8J+SgCBSVU4gRU5ERUQuYCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSAxMDA7IHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDA7IHRoaXMuc2V0dGluZ3MueHAgPSAwOyB0aGlzLnNldHRpbmdzLmdvbGQgPSAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwUmVxID0gMTAwOyB0aGlzLnNldHRpbmdzLmxldmVsID0gMTsgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyA9IDEwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscyA9IFtdOyB0aGlzLnNldHRpbmdzLmhpc3RvcnkgPSBbXTsgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gXCJcIjsgdGhpcy5zZXR0aW5ncy5zaGllbGRlZFVudGlsID0gXCJcIjsgdGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBcIlwiO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBbXTsgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gXCJcIjtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7IHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICAgICAgY29uc3QgYmFzZVN0YXJ0R29sZCA9IHRoaXMuc2V0dGluZ3MubGVnYWN5LnBlcmtzLnN0YXJ0R29sZCB8fCAwO1xuICAgICAgICBjb25zdCBzY2FyUGVuYWx0eSA9IE1hdGgucG93KDAuOSwgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCA9IE1hdGguZmxvb3IoYmFzZVN0YXJ0R29sZCAqIHNjYXJQZW5hbHR5KTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ydW5Db3VudCsrO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIubmFtZSA9PT0gXCJSaXZhbCBTYWJvdGFnZVwiICYmIHRoaXMuc2V0dGluZ3MuZ29sZCA+IDEwKSB0aGlzLnNldHRpbmdzLmdvbGQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MuZ29sZCAqIDAuOSk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgICAgIGlmIChzaG93TW9kYWwpIG5ldyBDaGFvc01vZGFsKHRoaXMuYXBwLCB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIpLm9wZW4oKTtcbiAgICB9XG5cbiAgICBhc3luYyBhdHRlbXB0UmVjb3ZlcnkoKSB7XG4gICAgICAgIGlmICghdGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCJOb3QgaW4gTG9ja2Rvd24uXCIpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3QgeyBob3VycywgbWludXRlcyB9ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLmdldExvY2tkb3duVGltZVJlbWFpbmluZygpO1xuICAgICAgICBuZXcgTm90aWNlKGBSZWNvdmVyaW5nLi4uICR7aG91cnN9aCAke21pbnV0ZXN9bSByZW1haW5pbmcuYCk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGlzTG9ja2VkRG93bigpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKTsgfVxuICAgIGlzUmVzdGluZygpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsICYmIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCkpOyB9XG4gICAgaXNTaGllbGRlZCgpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5zaGllbGRlZFVudGlsKSk7IH1cblxuICAgIHRhdW50KHRyaWdnZXI6IFwiZmFpbFwifFwic2hpZWxkXCJ8XCJsb3dfaHBcInxcImxldmVsX3VwXCJ8XCJsb2NrZG93blwiKSB7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDwgMC4yKSByZXR1cm47IFxuICAgICAgICBjb25zdCBpbnN1bHRzID0ge1xuICAgICAgICAgICAgXCJmYWlsXCI6IFtcIkZvY3VzLlwiLCBcIkFnYWluLlwiLCBcIlN0YXkgc2hhcnAuXCJdLFxuICAgICAgICAgICAgXCJzaGllbGRcIjogW1wiU21hcnQgbW92ZS5cIiwgXCJCb3VnaHQgc29tZSB0aW1lLlwiXSxcbiAgICAgICAgICAgIFwibG93X2hwXCI6IFtcIkNyaXRpY2FsIGNvbmRpdGlvbi5cIiwgXCJTdXJ2aXZlLlwiXSxcbiAgICAgICAgICAgIFwibGV2ZWxfdXBcIjogW1wiU3Ryb25nZXIuXCIsIFwiU2NhbGluZyB1cC5cIl0sXG4gICAgICAgICAgICBcImxvY2tkb3duXCI6IFtcIk92ZXJoZWF0ZWQuIENvb2xpbmcgZG93bi5cIiwgXCJGb3JjZWQgcmVzdC5cIl1cbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgbXNnID0gaW5zdWx0c1t0cmlnZ2VyXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBpbnN1bHRzW3RyaWdnZXJdLmxlbmd0aCldO1xuICAgICAgICBuZXcgTm90aWNlKGBTWVNURU06IFwiJHttc2d9XCJgLCA2MDAwKTtcbiAgICB9XG4gICAgXG4gICAgcGFyc2VRdWlja0lucHV0KHRleHQ6IHN0cmluZykge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCLim5QgTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgbGV0IGRpZmYgPSAzOyBsZXQgY2xlYW5UZXh0ID0gdGV4dDtcbiAgICAgICAgaWYgKHRleHQubWF0Y2goL1xcLzEvKSkgeyBkaWZmID0gMTsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8xLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzIvKSkgeyBkaWZmID0gMjsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8yLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzMvKSkgeyBkaWZmID0gMzsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC8zLywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzQvKSkgeyBkaWZmID0gNDsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC80LywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRleHQubWF0Y2goL1xcLzUvKSkgeyBkaWZmID0gNTsgY2xlYW5UZXh0ID0gdGV4dC5yZXBsYWNlKC9cXC81LywgXCJcIikudHJpbSgpOyB9XG4gICAgICAgIGNvbnN0IGRlYWRsaW5lID0gbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLmNyZWF0ZVF1ZXN0KGNsZWFuVGV4dCwgZGlmZiwgXCJOb25lXCIsIFwiTm9uZVwiLCBkZWFkbGluZSwgZmFsc2UsIFwiTm9ybWFsXCIsIGZhbHNlKTtcbiAgICB9XG5cbiAgICAvLyBERUxFR0FURUQgTUVUSE9EU1xuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIsIGxpbmtlZFNraWxsOiBzdHJpbmcsIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZXNlYXJjaEVuZ2luZS5jcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlLCB0eXBlLCBsaW5rZWRTa2lsbCwgbGlua2VkQ29tYmF0UXVlc3QpO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyByZXR1cm47IH1cbiAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcsIGZpbmFsV29yZENvdW50OiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5yZXNlYXJjaEVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZCwgZmluYWxXb3JkQ291bnQpO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7IG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpOyByZXR1cm47IH1cbiAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucmVzZWFyY2hFbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkKTtcbiAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIHVwZGF0ZVJlc2VhcmNoV29yZENvdW50KHF1ZXN0SWQ6IHN0cmluZywgbmV3V29yZENvdW50OiBudW1iZXIpIHsgdGhpcy5yZXNlYXJjaEVuZ2luZS51cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkLCBuZXdXb3JkQ291bnQpOyB0aGlzLnNhdmUoKTsgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuXG4gICAgYXN5bmMgc3RhcnRNZWRpdGF0aW9uKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUubWVkaXRhdGUoKTtcbiAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQubWVzc2FnZSkgeyBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTsgcmV0dXJuOyB9XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBjYW5EZWxldGVRdWVzdCgpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5jYW5EZWxldGVRdWVzdEZyZWUoKTsgfVxuICAgIGFzeW5jIGRlbGV0ZVF1ZXN0V2l0aENvc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLmFwcGx5RGVsZXRpb25Db3N0KCk7XG4gICAgICAgIG5ldyBOb3RpY2UocmVzdWx0Lm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdE5hbWVzOiBzdHJpbmdbXSkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jcmVhdGVRdWVzdENoYWluKG5hbWUsIHF1ZXN0TmFtZXMpO1xuICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHsgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyByZXR1cm4gdHJ1ZTsgfVxuICAgICAgICBlbHNlIHsgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7IHJldHVybiBmYWxzZTsgfVxuICAgIH1cbiAgICBcbiAgICBnZXRBY3RpdmVDaGFpbigpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IH1cbiAgICBnZXRDaGFpblByb2dyZXNzKCkgeyByZXR1cm4gdGhpcy5jaGFpbnNFbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpOyB9XG4gICAgYXN5bmMgYnJlYWtDaGFpbigpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuYnJlYWtDaGFpbigpO1xuICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgc2V0UXVlc3RGaWx0ZXIocXVlc3RGaWxlOiBURmlsZSwgZW5lcmd5OiBhbnksIGNvbnRleHQ6IGFueSwgdGFnczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5maWx0ZXJzRW5naW5lLnNldFF1ZXN0RmlsdGVyKHF1ZXN0RmlsZS5iYXNlbmFtZSwgZW5lcmd5LCBjb250ZXh0LCB0YWdzKTtcbiAgICAgICAgbmV3IE5vdGljZShgUXVlc3QgdGFnZ2VkOiAke2VuZXJneX0gZW5lcmd5LCAke2NvbnRleHR9IGNvbnRleHRgKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIHNldEZpbHRlclN0YXRlKGVuZXJneTogYW55LCBjb250ZXh0OiBhbnksIHRhZ3M6IHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuZmlsdGVyc0VuZ2luZS5zZXRGaWx0ZXJTdGF0ZShlbmVyZ3ksIGNvbnRleHQsIHRhZ3MpO1xuICAgICAgICBuZXcgTm90aWNlKGBGaWx0ZXJzIHNldDogJHtlbmVyZ3l9IGVuZXJneSwgJHtjb250ZXh0fSBjb250ZXh0YCk7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBjbGVhckZpbHRlcnMoKSB7IHRoaXMuZmlsdGVyc0VuZ2luZS5jbGVhckZpbHRlcnMoKTsgbmV3IE5vdGljZShcIkFsbCBmaWx0ZXJzIGNsZWFyZWRcIik7IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0RmlsdGVyZWRRdWVzdHMocXVlc3RzOiBhbnlbXSkgeyByZXR1cm4gdGhpcy5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhxdWVzdHMpOyB9XG5cbiAgICBnZXRHYW1lU3RhdHMoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5nZXRHYW1lU3RhdHMoKTsgfVxuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKSB7IFxuICAgICAgICBjb25zdCBtc2dzID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICBtc2dzLmZvckVhY2gobSA9PiBuZXcgTm90aWNlKG0pKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTsgfVxufVxuIiwiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIFRGaWxlLCBURm9sZGVyLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7XG5pbXBvcnQgeyBRdWVzdE1vZGFsLCBTaG9wTW9kYWwsIFNraWxsRGV0YWlsTW9kYWwsIFNraWxsTWFuYWdlck1vZGFsIH0gZnJvbSAnLi9tb2RhbHMnO1xuaW1wb3J0IHsgU2tpbGwsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9QQU5PUFRJQ09OID0gXCJzaXN5cGh1cy1wYW5vcHRpY29uXCI7XG5cbmV4cG9ydCBjbGFzcyBQYW5vcHRpY29uVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihsZWFmKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZ2V0Vmlld1R5cGUoKSB7IHJldHVybiBWSUVXX1RZUEVfUEFOT1BUSUNPTjsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gXCJFeWUgU2lzeXBodXNcIjsgfVxuICAgIGdldEljb24oKSB7IHJldHVybiBcInNrdWxsXCI7IH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHsgXG4gICAgICAgIHRoaXMucmVmcmVzaCgpOyBcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9uKCd1cGRhdGUnLCB0aGlzLnJlZnJlc2guYmluZCh0aGlzKSk7IFxuICAgIH1cblxuICAgIGFzeW5jIHJlZnJlc2goKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDsgYy5lbXB0eSgpO1xuICAgICAgICBjb25zdCBjb250YWluZXIgPSBjLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjb25zdCBzY3JvbGwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nyb2xsLWFyZWFcIiB9KTtcblxuICAgICAgICAvLyAtLS0gMS4gSEVBREVSICYgQ1JJVElDQUwgQUxFUlRTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiRXllIFNJU1lQSFVTIE9TXCIsIGNsczogXCJzaXN5LWhlYWRlclwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICBjb25zdCBsID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0IHNpc3ktYWxlcnQtbG9ja2Rvd25cIiB9KTtcbiAgICAgICAgICAgIGwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiTE9DS0RPV04gQUNUSVZFXCIgfSk7XG4gICAgICAgICAgICBjb25zdCB7IGhvdXJzLCBtaW51dGVzOiBtaW5zIH0gPSB0aGlzLnBsdWdpbi5lbmdpbmUubWVkaXRhdGlvbkVuZ2luZS5nZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTtcbiAgICAgICAgICAgIGwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFRpbWUgUmVtYWluaW5nOiAke2hvdXJzfWggJHttaW5zfW1gIH0pO1xuICAgICAgICAgICAgY29uc3QgYnRuID0gbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQVRURU1QVCBSRUNPVkVSWVwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtZWRTdGF0dXMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0TWVkaXRhdGlvblN0YXR1cygpO1xuICAgICAgICAgICAgY29uc3QgbWVkRGl2ID0gbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIG1lZERpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDEwcHg7IHBhZGRpbmc6IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4xKTsgYm9yZGVyLXJhZGl1czogNHB4O1wiKTtcbiAgICAgICAgICAgIG1lZERpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgTWVkaXRhdGlvbjogJHttZWRTdGF0dXMuY3ljbGVzRG9uZX0vMTAgKCR7bWVkU3RhdHVzLmN5Y2xlc1JlbWFpbmluZ30gbGVmdClgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtZWRCYXIgPSBtZWREaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBtZWRCYXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJoZWlnaHQ6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjEpOyBib3JkZXItcmFkaXVzOiAzcHg7IG1hcmdpbjogNXB4IDA7IG92ZXJmbG93OiBoaWRkZW47XCIpO1xuICAgICAgICAgICAgY29uc3QgbWVkRmlsbCA9IG1lZEJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZFBlcmNlbnQgPSAobWVkU3RhdHVzLmN5Y2xlc0RvbmUgLyAxMCkgKiAxMDA7XG4gICAgICAgICAgICBtZWRGaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHttZWRQZXJjZW50fSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZDogI2FhNjRmZjsgdHJhbnNpdGlvbjogd2lkdGggMC4zcztgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkQnRuID0gbWVkRGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJNRURJVEFURVwiIH0pO1xuICAgICAgICAgICAgbWVkQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDhweDsgbWFyZ2luLXRvcDogNXB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMyk7IGJvcmRlcjogMXB4IHNvbGlkICNhYTY0ZmY7IGNvbG9yOiAjYWE2NGZmOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICAgICAgbWVkQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5yZWZyZXNoKCksIDEwMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYnRuLmFkZENsYXNzKFwic2lzeS1idG5cIik7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5hdHRlbXB0UmVjb3ZlcnkoKTtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLnBsdWdpbi5lbmdpbmUuaXNSZXN0aW5nKCkpIHtcbiAgICAgICAgICAgICBjb25zdCByID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFsZXJ0IHNpc3ktYWxlcnQtcmVzdFwiIH0pO1xuICAgICAgICAgICAgIHIuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUkVTVCBEQVkgQUNUSVZFXCIgfSk7XG4gICAgICAgICAgICAgY29uc3QgdGltZVJlbWFpbmluZyA9IG1vbWVudCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRpbWVSZW1haW5pbmcgLyA2MCk7XG4gICAgICAgICAgICAgY29uc3QgbWlucyA9IHRpbWVSZW1haW5pbmcgJSA2MDtcbiAgICAgICAgICAgICByLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGAke2hvdXJzfWggJHttaW5zfW0gcmVtYWluaW5nIHwgTm8gZGFtYWdlLCBSdXN0IHBhdXNlZGAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gMi4gSFVEIEdSSUQgKDJ4MikgLS0tXG4gICAgICAgIGNvbnN0IGh1ZCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1odWRcIiB9KTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJIRUFMVEhcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuaHB9LyR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHB9YCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCA/IFwic2lzeS1jcml0aWNhbFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiR09MRFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gXCJzaXN5LXZhbC1kZWJ0XCIgOiBcIlwiKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJMRVZFTFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbH1gKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJSSVZBTCBETUdcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWd9YCk7XG5cbiAgICAgICAgLy8gLS0tIDMuIFRIRSBPUkFDTEUgLS0tXG4gICAgICAgIGNvbnN0IG9yYWNsZSA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1vcmFjbGVcIiB9KTtcbiAgICAgICAgb3JhY2xlLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIk9SQUNMRSBQUkVESUNUSU9OXCIgfSk7XG4gICAgICAgIGNvbnN0IHN1cnZpdmFsID0gTWF0aC5mbG9vcih0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCAvICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyAqICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IDIgOiAxKSkpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHN1cnZUZXh0ID0gYFN1cnZpdmFsOiAke3N1cnZpdmFsfSBkYXlzYDtcbiAgICAgICAgY29uc3QgaXNDcmlzaXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA8IDMwIHx8IHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwO1xuICAgICAgICBcbiAgICAgICAgLy8gR2xpdGNoIExvZ2ljXG4gICAgICAgIGlmIChpc0NyaXNpcyAmJiBNYXRoLnJhbmRvbSgpIDwgMC4zKSB7XG4gICAgICAgICAgICBjb25zdCBnbGl0Y2hlcyA9IFtcIltDT1JSVVBURURdXCIsIFwiPz8/IERBWVMgTEVGVFwiLCBcIk5PIEZVVFVSRVwiLCBcIlJVTlwiXTtcbiAgICAgICAgICAgIHN1cnZUZXh0ID0gZ2xpdGNoZXNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogZ2xpdGNoZXMubGVuZ3RoKV07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdXJ2RWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgdGV4dDogc3VydlRleHQgfSk7XG4gICAgICAgIGlmIChzdXJ2aXZhbCA8IDIgfHwgc3VydlRleHQuaW5jbHVkZXMoXCI/Pz9cIikgfHwgc3VydlRleHQuaW5jbHVkZXMoXCJDT1JSVVBURURcIikpIHtcbiAgICAgICAgICAgICBzdXJ2RWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjojZmY1NTU1OyBmb250LXdlaWdodDpib2xkOyBsZXR0ZXItc3BhY2luZzogMXB4O1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgbGlnaHRzID0gb3JhY2xlLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXN0YXR1cy1saWdodHNcIiB9KTtcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwKSBsaWdodHMuY3JlYXRlRGl2KHsgdGV4dDogXCJERUJUOiBZRVNcIiwgY2xzOiBcInNpc3ktbGlnaHQtYWN0aXZlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBETEMgMTogU2NhcnMgZGlzcGxheVxuICAgICAgICBjb25zdCBzY2FyQ291bnQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZWdhY3k/LmRlYXRoQ291bnQgfHwgMDtcbiAgICAgICAgaWYgKHNjYXJDb3VudCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNjYXJFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zY2FyLWRpc3BsYXlcIiB9KTtcbiAgICAgICAgICAgIHNjYXJFbC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgU2NhcnM6ICR7c2NhckNvdW50fWAgfSk7XG4gICAgICAgICAgICBjb25zdCBwZW5hbHR5ID0gTWF0aC5wb3coMC45LCBzY2FyQ291bnQpO1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudExvc3QgPSBNYXRoLmZsb29yKCgxIC0gcGVuYWx0eSkgKiAxMDApO1xuICAgICAgICAgICAgc2NhckVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBgKC0ke3BlcmNlbnRMb3N0fSUgc3RhcnRpbmcgZ29sZClgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBETEMgMTogTmV4dCBtaWxlc3RvbmVcbiAgICAgICAgY29uc3QgbGV2ZWxNaWxlc3RvbmVzID0gWzEwLCAyMCwgMzAsIDUwXTtcbiAgICAgICAgY29uc3QgbmV4dE1pbGVzdG9uZSA9IGxldmVsTWlsZXN0b25lcy5maW5kKG0gPT4gbSA+IHRoaXMucGx1Z2luLnNldHRpbmdzLmxldmVsKTtcbiAgICAgICAgaWYgKG5leHRNaWxlc3RvbmUpIHtcbiAgICAgICAgICAgIGNvbnN0IG1pbGVzdG9uZUVsID0gb3JhY2xlLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pbGVzdG9uZVwiIH0pO1xuICAgICAgICAgICAgbWlsZXN0b25lRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYE5leHQgTWlsZXN0b25lOiBMZXZlbCAke25leHRNaWxlc3RvbmV9YCB9KTtcbiAgICAgICAgICAgIGlmIChuZXh0TWlsZXN0b25lID09PSAxMCB8fCBuZXh0TWlsZXN0b25lID09PSAyMCB8fCBuZXh0TWlsZXN0b25lID09PSAzMCB8fCBuZXh0TWlsZXN0b25lID09PSA1MCkge1xuICAgICAgICAgICAgICAgIG1pbGVzdG9uZUVsLmNyZWF0ZUVsKFwic21hbGxcIiwgeyB0ZXh0OiBcIihCb3NzIFVubG9jaylcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSA0LiBEQUlMWSBNSVNTSU9OUyAoRExDIDEpIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJUT0RBWVMgT0JKRUNUSVZFU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyRGFpbHlNaXNzaW9ucyhzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSA1LiBDT05UUk9MUyAtLS1cbiAgICAgICAgY29uc3QgY3RybHMgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY29udHJvbHNcIiB9KTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFUExPWVwiLCBjbHM6IFwic2lzeS1idG4gbW9kLWN0YVwiIH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlNIT1BcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBTaG9wTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJGT0NVU1wiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uYXVkaW8udG9nZ2xlQnJvd25Ob2lzZSgpO1xuXG4gICAgICAgIC8vIC0tLSA2LiBBQ1RJVkUgVEhSRUFUUyAtLS1cbiAgICAgICAgLy8gLS0tIERMQyA1OiBDT05URVhUIEZJTFRFUlMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkZJTFRFUiBDT05UUk9MU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyRmlsdGVyQmFyKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIERMQyA0OiBRVUVTVCBDSEFJTlMgLS0tXG4gICAgICAgIGNvbnN0IGFjdGl2ZUNoYWluID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmIChhY3RpdmVDaGFpbikge1xuICAgICAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIENIQUlOXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ2hhaW5TZWN0aW9uKHNjcm9sbCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gRExDIDI6IFJFU0VBUkNIIExJQlJBUlkgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlclJlc2VhcmNoU2VjdGlvbihzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBETEMgNjogQU5BTFlUSUNTICYgRU5ER0FNRSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQU5BTFlUSUNTICYgUFJPR1JFU1NcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckFuYWx5dGljcyhzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBBQ1RJVkUgVEhSRUFUUyAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIFRIUkVBVFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlclF1ZXN0cyhzY3JvbGwpO1xuXG4gICAgICAgICAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiTkVVUkFMIEhVQlwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaCgoczogU2tpbGwsIGlkeDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByb3cgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2tpbGwtcm93XCIgfSk7XG4gICAgICAgICAgICByb3cub25jbGljayA9ICgpID0+IG5ldyBTa2lsbERldGFpbE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbiwgaWR4KS5vcGVuKCk7XG4gICAgICAgICAgICBjb25zdCBtZXRhID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNraWxsLW1ldGFcIiB9KTtcbiAgICAgICAgICAgIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IHMubmFtZSB9KTtcbiAgICAgICAgICAgIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IGBMdmwgJHtzLmxldmVsfWAgfSk7XG4gICAgICAgICAgICBpZiAocy5ydXN0ID4gMCkge1xuICAgICAgICAgICAgICAgIG1ldGEuY3JlYXRlU3Bhbih7IHRleHQ6IGBSVVNUICR7cy5ydXN0fWAsIGNsczogXCJzaXN5LXJ1c3QtYmFkZ2VcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGJhciA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItYmdcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGxcIiB9KTtcbiAgICAgICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAkeyhzLnhwL3MueHBSZXEpKjEwMH0lOyBiYWNrZ3JvdW5kOiAke3MucnVzdCA+IDAgPyAnI2QzNTQwMCcgOiAnIzAwYjBmZid9YCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYWRkQnRuID0gc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiKyBBZGQgTmV1cmFsIE5vZGVcIiwgY2xzOiBcInNpc3ktYWRkLXNraWxsXCIgfSk7XG4gICAgICAgIGFkZEJ0bi5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsTWFuYWdlck1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuXG4gICAgICAgIC8vIC0tLSA4LiBRVUlDSyBDQVBUVVJFIC0tLVxuICAgICAgICBjb25zdCBmb290ZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcXVpY2stY2FwdHVyZVwiIH0pO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGZvb3Rlci5jcmVhdGVFbChcImlucHV0XCIsIHsgY2xzOiBcInNpc3ktcXVpY2staW5wdXRcIiwgcGxhY2Vob2xkZXI6IFwiTWlzc2lvbiAvMS4uLjVcIiB9KTtcbiAgICAgICAgaW5wdXQub25rZXlkb3duID0gYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJyAmJiBpbnB1dC52YWx1ZS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUucGFyc2VRdWlja0lucHV0KGlucHV0LnZhbHVlLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgaW5wdXQudmFsdWUgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIERMQyAxOiBSZW5kZXIgRGFpbHkgTWlzc2lvbnNcbiAgICByZW5kZXJEYWlseU1pc3Npb25zKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgbWlzc2lvbnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kYWlseU1pc3Npb25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1pc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgZW1wdHkgPSBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBtaXNzaW9ucyB0b2RheS4gQ2hlY2sgYmFjayB0b21vcnJvdy5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG1pc3Npb25zRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWRhaWx5LW1pc3Npb25zXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBtaXNzaW9ucy5mb3JFYWNoKChtaXNzaW9uOiBEYWlseU1pc3Npb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBtaXNzaW9uc0Rpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLWNhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLmNvbXBsZXRlZCkgY2FyZC5hZGRDbGFzcyhcInNpc3ktbWlzc2lvbi1jb21wbGV0ZWRcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1oZWFkZXJcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0ljb24gPSBtaXNzaW9uLmNvbXBsZXRlZCA/IFwiWUVTXCIgOiBcIi4uXCI7XG4gICAgICAgICAgICBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogc3RhdHVzSWNvbiwgY2xzOiBcInNpc3ktbWlzc2lvbi1zdGF0dXNcIiB9KTtcbiAgICAgICAgICAgIGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBtaXNzaW9uLm5hbWUsIGNsczogXCJzaXN5LW1pc3Npb24tbmFtZVwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBkZXNjID0gY2FyZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBtaXNzaW9uLmRlc2MsIGNsczogXCJzaXN5LW1pc3Npb24tZGVzY1wiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBwcm9ncmVzcyA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1wcm9ncmVzc1wiIH0pO1xuICAgICAgICAgICAgcHJvZ3Jlc3MuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYCR7bWlzc2lvbi5wcm9ncmVzc30vJHttaXNzaW9uLnRhcmdldH1gLCBjbHM6IFwic2lzeS1taXNzaW9uLWNvdW50ZXJcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYmFyID0gcHJvZ3Jlc3MuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gKG1pc3Npb24ucHJvZ3Jlc3MgLyBtaXNzaW9uLnRhcmdldCkgKiAxMDA7XG4gICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHtNYXRoLm1pbihwZXJjZW50LCAxMDApfSVgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcmV3YXJkID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLXJld2FyZFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24ucmV3YXJkLnhwID4gMCkgcmV3YXJkLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgKyR7bWlzc2lvbi5yZXdhcmQueHB9IFhQYCwgY2xzOiBcInNpc3ktcmV3YXJkLXhwXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5yZXdhcmQuZ29sZCA+IDApIHJld2FyZC5jcmVhdGVTcGFuKHsgdGV4dDogYCske21pc3Npb24ucmV3YXJkLmdvbGR9Z2AsIGNsczogXCJzaXN5LXJld2FyZC1nb2xkXCIgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGFsbENvbXBsZXRlZCA9IG1pc3Npb25zLmV2ZXJ5KG0gPT4gbS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoYWxsQ29tcGxldGVkICYmIG1pc3Npb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGJvbnVzID0gbWlzc2lvbnNEaXYuY3JlYXRlRGl2KHsgdGV4dDogXCJBbGwgTWlzc2lvbnMgQ29tcGxldGUhICs1MCBCb251cyBHb2xkXCIsIGNsczogXCJzaXN5LW1pc3Npb24tYm9udXNcIiB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbiAgICAvLyBETEMgMjogUmVuZGVyIFJlc2VhcmNoIFF1ZXN0cyBTZWN0aW9uXG4gICAgcmVuZGVyUmVzZWFyY2hTZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWN0aXZlUmVzZWFyY2ggPSByZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBjb25zdCBjb21wbGV0ZWRSZXNlYXJjaCA9IHJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcblxuICAgICAgICAvLyBTdGF0cyBiYXJcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0UmVzZWFyY2hSYXRpbygpO1xuICAgICAgICBjb25zdCBzdGF0c0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1zdGF0c1wiIH0pO1xuICAgICAgICBzdGF0c0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM2NjY7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDRweDsgbWFyZ2luLWJvdHRvbTogMTBweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjA1KTtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByYXRpb1RleHQgPSBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUmF0aW86ICR7c3RhdHMuY29tYmF0fToke3N0YXRzLnJlc2VhcmNofSAoJHtzdGF0cy5yYXRpb306MSlgIH0pO1xuICAgICAgICByYXRpb1RleHQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuOWVtO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4uZW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZyA9IHN0YXRzRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiQkxPQ0tFRDogTmVlZCAyIGNvbWJhdCBwZXIgMSByZXNlYXJjaFwiIH0pO1xuICAgICAgICAgICAgd2FybmluZy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiBvcmFuZ2U7IGZvbnQtd2VpZ2h0OiBib2xkOyBtYXJnaW46IDVweCAwO1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFjdGl2ZSBSZXNlYXJjaFxuICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJBQ1RJVkUgUkVTRUFSQ0hcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFjdGl2ZVJlc2VhcmNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWN0aXZlUmVzZWFyY2guZm9yRWFjaCgocXVlc3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtY2FyZFwiIH0pO1xuICAgICAgICAgICAgICAgIGNhcmQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjYWE2NGZmOyBwYWRkaW5nOiAxMHB4OyBtYXJnaW4tYm90dG9tOiA4cHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjA1KTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLWJvdHRvbTogNnB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHRpdGxlID0gaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHF1ZXN0LnRpdGxlIH0pO1xuICAgICAgICAgICAgICAgIHRpdGxlLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7IGZsZXg6IDE7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZUxhYmVsID0gaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHF1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlNVUlZFWVwiIDogXCJERUVQIERJVkVcIiB9KTtcbiAgICAgICAgICAgICAgICB0eXBlTGFiZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXNpemU6IDAuNzVlbTsgcGFkZGluZzogMnB4IDZweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjMpOyBib3JkZXItcmFkaXVzOiAycHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgd29yZENvdW50ID0gY2FyZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgV29yZHM6ICR7cXVlc3Qud29yZENvdW50fS8ke3F1ZXN0LndvcmRMaW1pdH1gIH0pO1xuICAgICAgICAgICAgICAgIHdvcmRDb3VudC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGJhciA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBvdmVyZmxvdzogaGlkZGVuOyBtYXJnaW46IDZweCAwO1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLm1pbigxMDAsIChxdWVzdC53b3JkQ291bnQgLyBxdWVzdC53b3JkTGltaXQpICogMTAwKTtcbiAgICAgICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHtwZXJjZW50fSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZDogI2FhNjRmZjsgdHJhbnNpdGlvbjogd2lkdGggMC4zcztgKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbnMgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGFjdGlvbnMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDsgbWFyZ2luLXRvcDogOHB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHZpZXdCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIHZpZXdCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoODUsIDI1NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICM1NWZmNTU7IGNvbG9yOiAjNTVmZjU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICAgICAgICAgIHZpZXdCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdC5pZCwgcXVlc3Qud29yZENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgICAgICAgICAgZGVsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0LmlkKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tcGxldGVkIFJlc2VhcmNoXG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkNPTVBMRVRFRCBSRVNFQVJDSFwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29tcGxldGVkUmVzZWFyY2gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBjb21wbGV0ZWQgcmVzZWFyY2guXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wbGV0ZWRSZXNlYXJjaC5mb3JFYWNoKChxdWVzdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHBhcmVudC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgKyAke3F1ZXN0LnRpdGxlfSAoJHtxdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9KWAgfSk7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm9wYWNpdHk6IDAuNjsgZm9udC1zaXplOiAwLjllbTsgbWFyZ2luOiAzcHggMDtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgICAgICAgICBhc3luYyByZW5kZXJRdWVzdHMocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gZm9sZGVyLmNoaWxkcmVuLmZpbHRlcihmID0+IGYgaW5zdGFuY2VvZiBURmlsZSkgYXMgVEZpbGVbXTtcbiAgICAgICAgICAgIGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbUEgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1CID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYik/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVBID0gZm1BPy5kZWFkbGluZSA/IG1vbWVudChmbUEuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZUIgPSBmbUI/LmRlYWRsaW5lID8gbW9tZW50KGZtQi5kZWFkbGluZSkudmFsdWVPZigpIDogOTk5OTk5OTk5OTk5OTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZUEgLSBkYXRlQjsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LWNhcmQtYm9zc1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gU3RyaW5nKGZtPy5kaWZmaWN1bHR5IHx8IFwiXCIpLm1hdGNoKC9cXGQvKTtcbiAgICAgICAgICAgICAgICBpZiAoZCkgY2FyZC5hZGRDbGFzcyhgc2lzeS1jYXJkLSR7ZFswXX1gKTtcblxuICAgICAgICAgICAgICAgIC8vIFRvcCBzZWN0aW9uIHdpdGggdGl0bGUgYW5kIHRpbWVyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLXRvcFwiIH0pO1xuICAgICAgICAgICAgICAgIHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLmJhc2VuYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVGltZXJcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQoZm0uZGVhZGxpbmUpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaW5zID0gZGlmZiAlIDYwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lclRleHQgPSBkaWZmIDwgMCA/IFwiRVhQSVJFRFwiIDogYCR7aG91cnN9aCAke21pbnN9bWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdG9wLmNyZWF0ZURpdih7IHRleHQ6IHRpbWVyVGV4dCwgY2xzOiBcInNpc3ktdGltZXJcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZmYgPCA2MCkgdGltZXIuYWRkQ2xhc3MoXCJzaXN5LXRpbWVyLWxhdGVcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVHJhc2ggaWNvbiAoaW5saW5lLCBub3QgYWJzb2x1dGUpXG4gICAgICAgICAgICAgICAgY29uc3QgdHJhc2ggPSB0b3AuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktdHJhc2hcIiwgdGV4dDogXCJbWF1cIiB9KTtcbiAgICAgICAgICAgICAgICB0cmFzaC5zdHlsZS5jdXJzb3IgPSBcInBvaW50ZXJcIjtcbiAgICAgICAgICAgICAgICB0cmFzaC5zdHlsZS5jb2xvciA9IFwiI2ZmNTU1NVwiO1xuICAgICAgICAgICAgICAgIHRyYXNoLm9uY2xpY2sgPSAoZSkgPT4geyBcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTsgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmaWxlKTsgXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIEFjdGlvbiBidXR0b25zXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0cyA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWN0aW9uc1wiIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJEID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiT0tcIiwgY2xzOiBcInNpc3ktYWN0aW9uLWJ0biBtb2QtZG9uZVwiIH0pO1xuICAgICAgICAgICAgICAgIGJELm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVRdWVzdChmaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBiRiA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlhYXCIsIGNsczogXCJzaXN5LWFjdGlvbi1idG4gbW9kLWZhaWxcIiB9KTtcbiAgICAgICAgICAgICAgICBiRi5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uZW5naW5lLmZhaWxRdWVzdChmaWxlLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkbGUgPSBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJTeXN0ZW0gSWRsZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGN0YUJ0biA9IGlkbGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIltERVBMT1kgUVVFU1RdXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSk7XG4gICAgICAgICAgICBjdGFCdG4uc3R5bGUubWFyZ2luVG9wID0gXCIxMHB4XCI7XG4gICAgICAgICAgICBjdGFCdG4ub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgXG5cbiAgICByZW5kZXJDaGFpblNlY3Rpb24ocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gYWN0aXZlIGNoYWluLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbkRpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFpbi1jb250YWluZXJcIiB9KTtcbiAgICAgICAgY2hhaW5EaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNGNhZjUwOyBwYWRkaW5nOiAxMnB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoNzYsIDE3NSwgODAsIDAuMDUpOyBtYXJnaW4tYm90dG9tOiAxMHB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IGNoYWluRGl2LmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBjaGFpbi5uYW1lIH0pO1xuICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCAxMHB4IDA7IGNvbG9yOiAjNGNhZjUwO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTtcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3NUZXh0ID0gY2hhaW5EaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFByb2dyZXNzOiAke3Byb2dyZXNzLmNvbXBsZXRlZH0vJHtwcm9ncmVzcy50b3RhbH1gIH0pO1xuICAgICAgICBwcm9ncmVzc1RleHQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuOWVtO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhciA9IGNoYWluRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBiYXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJoZWlnaHQ6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjEpOyBib3JkZXItcmFkaXVzOiAzcHg7IG1hcmdpbjogOHB4IDA7IG92ZXJmbG93OiBoaWRkZW47XCIpO1xuICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdigpO1xuICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHtwcm9ncmVzcy5wZXJjZW50fSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZDogIzRjYWY1MDsgdHJhbnNpdGlvbjogd2lkdGggMC4zcztgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHF1ZXN0TGlzdCA9IGNoYWluRGl2LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYWluLXF1ZXN0c1wiIH0pO1xuICAgICAgICBxdWVzdExpc3Quc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDEwcHggMDsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgY2hhaW4ucXVlc3RzLmZvckVhY2goKHF1ZXN0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBxdWVzdExpc3QuY3JlYXRlRWwoXCJwXCIpO1xuICAgICAgICAgICAgY29uc3QgaWNvbiA9IGlkeCA8IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiT0tcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCI+Pj5cIiA6IFwiTE9DS1wiO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gaWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJET05FXCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiQUNUSVZFXCIgOiBcIkxPQ0tFRFwiO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpdGVtLnNldFRleHQoYFske2ljb259XSAke3F1ZXN0fSAoJHtzdGF0dXN9KWApO1xuICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAzcHggMDsgcGFkZGluZzogM3B4OyBcbiAgICAgICAgICAgICAgICAke2lkeCA8IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwib3BhY2l0eTogMC42O1wiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcImZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogIzRjYWY1MDtcIiA6IFwib3BhY2l0eTogMC40O1wifWApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFjdGlvbnMgPSBjaGFpbkRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGZsZXg7IGdhcDogNXB4OyBtYXJnaW4tdG9wOiAxMHB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJyZWFrQnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQlJFQUsgQ0hBSU5cIiB9KTtcbiAgICAgICAgYnJlYWtCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjhlbTtcIik7XG4gICAgICAgIGJyZWFrQnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuYnJlYWtDaGFpbigpO1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICByZW5kZXJGaWx0ZXJCYXIocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBmaWx0ZXJzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsdGVyU3RhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWx0ZXJEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktZmlsdGVyLWJhclwiIH0pO1xuICAgICAgICBmaWx0ZXJEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjMDA4OGZmOyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMDUpOyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuZXJneSBmaWx0ZXJcbiAgICAgICAgY29uc3QgZW5lcmd5RGl2ID0gZmlsdGVyRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBlbmVyZ3lEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tYm90dG9tOiA4cHg7XCIpO1xuICAgICAgICBlbmVyZ3lEaXYuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJFbmVyZ3k6IFwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZW5lcmd5T3B0aW9ucyA9IFtcImFueVwiLCBcImhpZ2hcIiwgXCJtZWRpdW1cIiwgXCJsb3dcIl07XG4gICAgICAgIGVuZXJneU9wdGlvbnMuZm9yRWFjaChvcHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnRuID0gZW5lcmd5RGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogb3B0LnRvVXBwZXJDYXNlKCkgfSk7XG4gICAgICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogMCAzcHg7IHBhZGRpbmc6IDRweCA4cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBcbiAgICAgICAgICAgICAgICAke2ZpbHRlcnMuYWN0aXZlRW5lcmd5ID09PSBvcHQgPyBcImJhY2tncm91bmQ6ICMwMDg4ZmY7IGNvbG9yOiB3aGl0ZTtcIiA6IFwiYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4yKTtcIn1gKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShvcHQgYXMgYW55LCBmaWx0ZXJzLmFjdGl2ZUNvbnRleHQsIGZpbHRlcnMuYWN0aXZlVGFncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRleHQgZmlsdGVyXG4gICAgICAgIGNvbnN0IGNvbnRleHREaXYgPSBmaWx0ZXJEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnRleHREaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tYm90dG9tOiA4cHg7XCIpO1xuICAgICAgICBjb250ZXh0RGl2LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiQ29udGV4dDogXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb250ZXh0T3B0aW9ucyA9IFtcImFueVwiLCBcImhvbWVcIiwgXCJvZmZpY2VcIiwgXCJhbnl3aGVyZVwiXTtcbiAgICAgICAgY29udGV4dE9wdGlvbnMuZm9yRWFjaChvcHQgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnRuID0gY29udGV4dERpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IG9wdC50b1VwcGVyQ2FzZSgpIH0pO1xuICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDAgM3B4OyBwYWRkaW5nOiA0cHggOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgXG4gICAgICAgICAgICAgICAgJHtmaWx0ZXJzLmFjdGl2ZUNvbnRleHQgPT09IG9wdCA/IFwiYmFja2dyb3VuZDogIzAwODhmZjsgY29sb3I6IHdoaXRlO1wiIDogXCJiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjIpO1wifWApO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnNldEZpbHRlclN0YXRlKGZpbHRlcnMuYWN0aXZlRW5lcmd5LCBvcHQgYXMgYW55LCBmaWx0ZXJzLmFjdGl2ZVRhZ3MpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBidXR0b25cbiAgICAgICAgY29uc3QgY2xlYXJCdG4gPSBmaWx0ZXJEaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNMRUFSIEZJTFRFUlNcIiB9KTtcbiAgICAgICAgY2xlYXJCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogNnB4OyBtYXJnaW4tdG9wOiA4cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICBjbGVhckJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNsZWFyRmlsdGVycygpO1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICByZW5kZXJBbmFseXRpY3MocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFuYWx5dGljc0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbmFseXRpY3NcIiB9KTtcbiAgICAgICAgYW5hbHl0aWNzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2ZmYzEwNzsgcGFkZGluZzogMTJweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMTkzLCA3LCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTVweDtcIik7XG4gICAgICAgIFxuICAgICAgICBhbmFseXRpY3NEaXYuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQU5BTFlUSUNTICYgUFJPR1JFU1NcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMCAwIDEwcHggMDsgY29sb3I6ICNmZmMxMDc7XCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdHMgZ3JpZFxuICAgICAgICBjb25zdCBzdGF0c0RpdiA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgc3RhdHNEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmciAxZnI7IGdhcDogMTBweDsgbWFyZ2luLWJvdHRvbTogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzdGF0c19pdGVtcyA9IFtcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiTGV2ZWxcIiwgdmFsdWU6IHN0YXRzLmxldmVsIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiBcIkN1cnJlbnQgU3RyZWFrXCIsIHZhbHVlOiBzdGF0cy5jdXJyZW50U3RyZWFrIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiBcIkxvbmdlc3QgU3RyZWFrXCIsIHZhbHVlOiBzdGF0cy5sb25nZXN0U3RyZWFrIH0sXG4gICAgICAgICAgICB7IGxhYmVsOiBcIlRvdGFsIFF1ZXN0c1wiLCB2YWx1ZTogc3RhdHMudG90YWxRdWVzdHMgfVxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgc3RhdHNfaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRCb3ggPSBzdGF0c0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHN0YXRCb3guc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjZmZjMTA3OyBwYWRkaW5nOiA4cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDE5MywgNywgMC4xKTtcIik7XG4gICAgICAgICAgICBzdGF0Qm94LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGl0ZW0ubGFiZWwgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC44ZW07IG9wYWNpdHk6IDAuNztcIik7XG4gICAgICAgICAgICBzdGF0Qm94LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFN0cmluZyhpdGVtLnZhbHVlKSB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDAgMCAwOyBmb250LXNpemU6IDEuMmVtOyBmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICNmZmMxMDc7XCIpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJvc3MgcHJvZ3Jlc3NcbiAgICAgICAgYW5hbHl0aWNzRGl2LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkJvc3MgTWlsZXN0b25lc1wiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAxMnB4IDAgOHB4IDA7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJvc3NlcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzO1xuICAgICAgICBpZiAoYm9zc2VzICYmIGJvc3Nlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBib3NzZXMuZm9yRWFjaCgoYm9zczogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm9zc0l0ZW0gPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYm9zc0l0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDZweCAwOyBwYWRkaW5nOiA4cHg7IGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC4yKTsgYm9yZGVyLXJhZGl1czogM3B4O1wiKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBpY29uID0gYm9zcy5kZWZlYXRlZCA/IFwiT0tcIiA6IGJvc3MudW5sb2NrZWQgPyBcIj4+XCIgOiBcIkxPQ0tcIjtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYm9zc0l0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFske2ljb259XSBMZXZlbCAke2Jvc3MubGV2ZWx9OiAke2Jvc3MubmFtZX1gIH0pO1xuICAgICAgICAgICAgICAgIG5hbWUuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYm9zcy5kZWZlYXRlZCA/IFwiY29sb3I6ICM0Y2FmNTA7IGZvbnQtd2VpZ2h0OiBib2xkO1wiIDogYm9zcy51bmxvY2tlZCA/IFwiY29sb3I6ICNmZmMxMDc7XCIgOiBcIm9wYWNpdHk6IDAuNTtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gV2luIGNvbmRpdGlvblxuICAgICAgICBpZiAoc3RhdHMuZ2FtZVdvbikge1xuICAgICAgICAgICAgY29uc3Qgd2luRGl2ID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgd2luRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogMTJweDsgcGFkZGluZzogMTJweDsgYmFja2dyb3VuZDogcmdiYSg3NiwgMTc1LCA4MCwgMC4yKTsgYm9yZGVyOiAycHggc29saWQgIzRjYWY1MDsgYm9yZGVyLXJhZGl1czogNHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7XCIpO1xuICAgICAgICAgICAgd2luRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiR0FNRSBXT04hXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMS4yZW07IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogIzRjYWY1MDtcIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdChwOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcsIGNsczogc3RyaW5nID0gXCJcIikge1xuICAgICAgICBjb25zdCBiID0gcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0LWJveFwiIH0pOyBcbiAgICAgICAgaWYgKGNscykgYi5hZGRDbGFzcyhjbHMpO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IGxhYmVsLCBjbHM6IFwic2lzeS1zdGF0LWxhYmVsXCIgfSk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogdmFsLCBjbHM6IFwic2lzeS1zdGF0LXZhbFwiIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5vZmYoJ3VwZGF0ZScsIHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpKTtcbiAgICB9XG59IiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgU2tpbGwsIE1vZGlmaWVyLCBEYWlseU1pc3Npb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBSZXNlYXJjaFF1ZXN0TW9kYWwsIENoYWluQnVpbGRlck1vZGFsLCBSZXNlYXJjaExpc3RNb2RhbCB9IGZyb20gXCIuL3VpL21vZGFsc1wiO1xuaW1wb3J0IHsgUGFub3B0aWNvblZpZXcsIFZJRVdfVFlQRV9QQU5PUFRJQ09OIH0gZnJvbSBcIi4vdWkvdmlld1wiO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTaXN5cGh1c1NldHRpbmdzID0ge1xuICAgIGhwOiAxMDAsIG1heEhwOiAxMDAsIHhwOiAwLCBnb2xkOiAwLCB4cFJlcTogMTAwLCBsZXZlbDogMSwgcml2YWxEbWc6IDEwLFxuICAgIGxhc3RMb2dpbjogXCJcIiwgc2hpZWxkZWRVbnRpbDogXCJcIiwgcmVzdERheVVudGlsOiBcIlwiLCBza2lsbHM6IFtdLFxuICAgIGRhaWx5TW9kaWZpZXI6IERFRkFVTFRfTU9ESUZJRVIsIFxuICAgIGxlZ2FjeTogeyBzb3VsczogMCwgcGVya3M6IHsgc3RhcnRHb2xkOiAwLCBzdGFydFNraWxsUG9pbnRzOiAwLCByaXZhbERlbGF5OiAwIH0sIHJlbGljczogW10sIGRlYXRoQ291bnQ6IDAgfSwgXG4gICAgbXV0ZWQ6IGZhbHNlLCBoaXN0b3J5OiBbXSwgcnVuQ291bnQ6IDEsIGxvY2tkb3duVW50aWw6IFwiXCIsIGRhbWFnZVRha2VuVG9kYXk6IDAsXG4gICAgZGFpbHlNaXNzaW9uczogW10sIFxuICAgIGRhaWx5TWlzc2lvbkRhdGU6IFwiXCIsIFxuICAgIHF1ZXN0c0NvbXBsZXRlZFRvZGF5OiAwLCBcbiAgICBza2lsbFVzZXNUb2RheToge30sXG4gICAgcmVzZWFyY2hRdWVzdHM6IFtdLFxuICAgIHJlc2VhcmNoU3RhdHM6IHsgdG90YWxSZXNlYXJjaDogMCwgdG90YWxDb21iYXQ6IDAsIHJlc2VhcmNoQ29tcGxldGVkOiAwLCBjb21iYXRDb21wbGV0ZWQ6IDAgfSxcbiAgICBsYXN0UmVzZWFyY2hRdWVzdElkOiAwLFxuICAgIG1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3REZWxldGlvbnNUb2RheTogMCxcbiAgICBsYXN0RGVsZXRpb25SZXNldDogXCJcIixcbiAgICBpc01lZGl0YXRpbmc6IGZhbHNlLFxuICAgIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd246IDAsXG4gICAgYWN0aXZlQ2hhaW5zOiBbXSxcbiAgICBjaGFpbkhpc3Rvcnk6IFtdLFxuICAgIGN1cnJlbnRDaGFpbklkOiBcIlwiLFxuICAgIGNoYWluUXVlc3RzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RmlsdGVyczoge30sXG4gICAgZmlsdGVyU3RhdGU6IHsgYWN0aXZlRW5lcmd5OiBcImFueVwiLCBhY3RpdmVDb250ZXh0OiBcImFueVwiLCBhY3RpdmVUYWdzOiBbXSB9LFxuICAgIGRheU1ldHJpY3M6IFtdLFxuICAgIHdlZWtseVJlcG9ydHM6IFtdLFxuICAgIGJvc3NNaWxlc3RvbmVzOiBbXSxcbiAgICBzdHJlYWs6IHsgY3VycmVudDogMCwgbG9uZ2VzdDogMCwgbGFzdERhdGU6IFwiXCIgfSxcbiAgICBhY2hpZXZlbWVudHM6IFtdLFxuICAgIGdhbWVXb246IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNpc3lwaHVzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBzdGF0dXNCYXJJdGVtOiBIVE1MRWxlbWVudDtcbiAgICBlbmdpbmU6IFNpc3lwaHVzRW5naW5lO1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmxvYWRTdHlsZXMoKTtcbiAgICAgICAgdGhpcy5hdWRpbyA9IG5ldyBBdWRpb0NvbnRyb2xsZXIodGhpcy5zZXR0aW5ncy5tdXRlZCk7XG4gICAgICAgIHRoaXMuZW5naW5lID0gbmV3IFNpc3lwaHVzRW5naW5lKHRoaXMuYXBwLCB0aGlzLCB0aGlzLmF1ZGlvKTtcblxuICAgICAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEVfUEFOT1BUSUNPTiwgKGxlYWYpID0+IG5ldyBQYW5vcHRpY29uVmlldyhsZWFmLCB0aGlzKSk7XG5cbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtID0gdGhpcy5hZGRTdGF0dXNCYXJJdGVtKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLmNoZWNrRGFpbHlMb2dpbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnb3Blbi1wYW5vcHRpY29uJywgbmFtZTogJ09wZW4gUGFub3B0aWNvbiAoU2lkZWJhciknLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICd0b2dnbGUtZm9jdXMnLCBuYW1lOiAnVG9nZ2xlIEZvY3VzIE5vaXNlJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuYXVkaW8udG9nZ2xlQnJvd25Ob2lzZSgpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3Jlcm9sbC1jaGFvcycsIG5hbWU6ICdSZXJvbGwgQ2hhb3MnLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUucm9sbENoYW9zKHRydWUpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2FjY2VwdC1kZWF0aCcsIG5hbWU6ICdBQ0NFUFQgREVBVEgnLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUudHJpZ2dlckRlYXRoKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAncmVjb3ZlcicsIG5hbWU6ICdSZWNvdmVyIChMb2NrZG93biknLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuYXR0ZW1wdFJlY292ZXJ5KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2NyZWF0ZS1yZXNlYXJjaCcsXG4gICAgICAgICAgICBuYW1lOiAnUmVzZWFyY2g6IENyZWF0ZSBSZXNlYXJjaCBRdWVzdCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3ZpZXctcmVzZWFyY2gnLFxuICAgICAgICAgICAgbmFtZTogJ1Jlc2VhcmNoOiBWaWV3IFJlc2VhcmNoIExpYnJhcnknLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaExpc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ21lZGl0YXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdNZWRpdGF0aW9uOiBTdGFydCBNZWRpdGF0aW9uJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdjcmVhdGUtY2hhaW4nLFxuICAgICAgICAgICAgbmFtZTogJ0NoYWluczogQ3JlYXRlIFF1ZXN0IENoYWluJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbmV3IENoYWluQnVpbGRlck1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3ZpZXctY2hhaW5zJyxcbiAgICAgICAgICAgIG5hbWU6ICdDaGFpbnM6IFZpZXcgQWN0aXZlIENoYWluJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICAgICAgICAgIGlmIChjaGFpbikge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBBY3RpdmUgQ2hhaW46ICR7Y2hhaW4ubmFtZX0gKCR7dGhpcy5lbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpLmNvbXBsZXRlZH0vJHtjaGFpbi5xdWVzdHMubGVuZ3RofSlgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiTm8gYWN0aXZlIGNoYWluXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZmlsdGVyLWhpZ2gtZW5lcmd5JyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBTaG93IEhpZ2ggRW5lcmd5IFF1ZXN0cycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJoaWdoXCIsIFwiYW55XCIsIFtdKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdmaWx0ZXItbWVkaXVtLWVuZXJneScsXG4gICAgICAgICAgICBuYW1lOiAnRmlsdGVyczogU2hvdyBNZWRpdW0gRW5lcmd5IFF1ZXN0cycsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJtZWRpdW1cIiwgXCJhbnlcIiwgW10pXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2ZpbHRlci1sb3ctZW5lcmd5JyxcbiAgICAgICAgICAgIG5hbWU6ICdGaWx0ZXJzOiBTaG93IExvdyBFbmVyZ3kgUXVlc3RzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImxvd1wiLCBcImFueVwiLCBbXSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnY2xlYXItZmlsdGVycycsXG4gICAgICAgICAgICBuYW1lOiAnRmlsdGVyczogQ2xlYXIgQWxsIEZpbHRlcnMnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNsZWFyRmlsdGVycygpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3dlZWtseS1yZXBvcnQnLFxuICAgICAgICAgICAgbmFtZTogJ0FuYWx5dGljczogR2VuZXJhdGUgV2Vla2x5IFJlcG9ydCcsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlcG9ydCA9IHRoaXMuZW5naW5lLmdlbmVyYXRlV2Vla2x5UmVwb3J0KCk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgV2VlayAke3JlcG9ydC53ZWVrfTogJHtyZXBvcnQudG90YWxRdWVzdHN9IHF1ZXN0cywgJHtyZXBvcnQuc3VjY2Vzc1JhdGV9JSBzdWNjZXNzYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2dhbWUtc3RhdHMnLFxuICAgICAgICAgICAgbmFtZTogJ0FuYWx5dGljczogVmlldyBHYW1lIFN0YXRzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBMZXZlbDogJHtzdGF0cy5sZXZlbH0gfCBTdHJlYWs6ICR7c3RhdHMuY3VycmVudFN0cmVha30gfCBRdWVzdHM6ICR7c3RhdHMudG90YWxRdWVzdHN9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2NoZWNrLWJvc3NlcycsXG4gICAgICAgICAgICBuYW1lOiAnRW5kZ2FtZTogQ2hlY2sgQm9zcyBNaWxlc3RvbmVzJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRSaWJib25JY29uKCdza3VsbCcsICdTaXN5cGh1cyBTaWRlYmFyJywgKCkgPT4gdGhpcy5hY3RpdmF0ZVZpZXcoKSk7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJJbnRlcnZhbCh3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gdGhpcy5lbmdpbmUuY2hlY2tEZWFkbGluZXMoKSwgNjAwMDApKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3NzRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm1hbmlmZXN0LmRpciArIFwiL3N0eWxlcy5jc3NcIik7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7XG4gICAgICAgICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRV9QQU5PUFRJQ09OLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgfVxuXG4gICAgcmVmcmVzaFVJKCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGggPiAwKSAobGVhdmVzWzBdLnZpZXcgYXMgUGFub3B0aWNvblZpZXcpLnJlZnJlc2goKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGxldCBzaGllbGQgPSAodGhpcy5lbmdpbmUuaXNTaGllbGRlZCgpIHx8IHRoaXMuZW5naW5lLmlzUmVzdGluZygpKSA/ICh0aGlzLmVuZ2luZS5pc1Jlc3RpbmcoKSA/IFwiRFwiIDogXCJTXCIpIDogXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZE1pc3Npb25zID0gdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZpbHRlcihtID0+IG0uY29tcGxldGVkKS5sZW5ndGg7XG4gICAgICAgIGNvbnN0IHRvdGFsTWlzc2lvbnMgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtaXNzaW9uUHJvZ3Jlc3MgPSB0b3RhbE1pc3Npb25zID4gMCA/IGBNJHtjb21wbGV0ZWRNaXNzaW9uc30vJHt0b3RhbE1pc3Npb25zfWAgOiBcIlwiO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdHVzVGV4dCA9IGAke3RoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5pY29ufSAke3NoaWVsZH0gSFAke3RoaXMuc2V0dGluZ3MuaHB9LyR7dGhpcy5zZXR0aW5ncy5tYXhIcH0gRyR7dGhpcy5zZXR0aW5ncy5nb2xkfSBMdmwke3RoaXMuc2V0dGluZ3MubGV2ZWx9ICR7bWlzc2lvblByb2dyZXNzfWA7XG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbS5zZXRUZXh0KHN0YXR1c1RleHQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaHAgPCAzMCkgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gXCJyZWRcIjsgXG4gICAgICAgIGVsc2UgaWYgKHRoaXMuc2V0dGluZ3MuZ29sZCA8IDApIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IFwib3JhbmdlXCI7XG4gICAgICAgIGVsc2UgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gXCJcIjtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkgeyBcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sZWdhY3kpIHRoaXMuc2V0dGluZ3MubGVnYWN5ID0geyBzb3VsczogMCwgcGVya3M6IHsgc3RhcnRHb2xkOiAwLCBzdGFydFNraWxsUG9pbnRzOiAwLCByaXZhbERlbGF5OiAwIH0sIHJlbGljczogW10sIGRlYXRoQ291bnQ6IDAgfTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9IDA7IFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuaGlzdG9yeSkgdGhpcy5zZXR0aW5ncy5oaXN0b3J5ID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucykgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gW107XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlKSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgPSBcIlwiO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5ID0gMDtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cykgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cykgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzID0geyBcbiAgICAgICAgICAgIHRvdGFsUmVzZWFyY2g6IDAsIFxuICAgICAgICAgICAgdG90YWxDb21iYXQ6IDAsIFxuICAgICAgICAgICAgcmVzZWFyY2hDb21wbGV0ZWQ6IDAsIFxuICAgICAgICAgICAgY29tYmF0Q29tcGxldGVkOiAwIFxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkID09PSB1bmRlZmluZWQpIHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCA9IDA7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkID0gMDtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPSAwO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQpIHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgPSBcIlwiO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9PT0gdW5kZWZpbmVkKSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucykgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeSkgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gXCJcIjtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQgPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5jaGFpblF1ZXN0c0NvbXBsZXRlZCA9IDA7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzKSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycyA9IHt9O1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUpIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzKSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLndlZWtseVJlcG9ydHMpIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cyA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMpIHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgPSBbXTtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLnN0cmVhaykgdGhpcy5zZXR0aW5ncy5zdHJlYWsgPSB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH07XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMpIHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzID0gW107XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdhbWVXb24gPT09IHVuZGVmaW5lZCkgdGhpcy5zZXR0aW5ncy5nYW1lV29uID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLm1hcChzID0+ICh7XG4gICAgICAgICAgICAuLi5zLFxuICAgICAgICAgICAgcnVzdDogKHMgYXMgYW55KS5ydXN0IHx8IDAsXG4gICAgICAgICAgICBsYXN0VXNlZDogKHMgYXMgYW55KS5sYXN0VXNlZCB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBjb25uZWN0aW9uczogKHMgYXMgYW55KS5jb25uZWN0aW9ucyB8fCBbXVxuICAgICAgICB9KSk7XG4gICAgfVxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHsgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTsgfVxufVxuIl0sIm5hbWVzIjpbIk5vdGljZSIsIk1vZGFsIiwibW9tZW50IiwiU2V0dGluZyIsIlRGb2xkZXIiLCJURmlsZSIsIkl0ZW1WaWV3IiwiUGx1Z2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFrR0E7QUFDTyxTQUFTLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUU7QUFDN0QsSUFBSSxTQUFTLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEtBQUssWUFBWSxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLFVBQVUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUU7QUFDaEgsSUFBSSxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxVQUFVLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDL0QsUUFBUSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ25HLFFBQVEsU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO0FBQ3RHLFFBQVEsU0FBUyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0FBQ3RILFFBQVEsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzlFLEtBQUssQ0FBQyxDQUFDO0FBQ1AsQ0FBQztBQTZNRDtBQUN1QixPQUFPLGVBQWUsS0FBSyxVQUFVLEdBQUcsZUFBZSxHQUFHLFVBQVUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUU7QUFDdkgsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksR0FBRyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssRUFBRSxDQUFDLENBQUMsVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDckY7O0FDelVBO01BQ2EsV0FBVyxDQUFBO0FBQXhCLElBQUEsV0FBQSxHQUFBO1FBQ1ksSUFBUyxDQUFBLFNBQUEsR0FBa0MsRUFBRSxDQUFDO0tBY3pEO0lBWkcsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUFZLEVBQUE7UUFDMUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNsRTtJQUVELEdBQUcsQ0FBQyxLQUFhLEVBQUUsRUFBWSxFQUFBO0FBQzNCLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO1lBQUUsT0FBTztRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDdkU7SUFFRCxPQUFPLENBQUMsS0FBYSxFQUFFLElBQVUsRUFBQTtRQUM3QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDekQ7QUFDSixDQUFBO01BRVksZUFBZSxDQUFBO0FBS3hCLElBQUEsV0FBQSxDQUFZLEtBQWMsRUFBQTtRQUoxQixJQUFRLENBQUEsUUFBQSxHQUF3QixJQUFJLENBQUM7UUFDckMsSUFBYyxDQUFBLGNBQUEsR0FBK0IsSUFBSSxDQUFDO1FBQ2xELElBQUssQ0FBQSxLQUFBLEdBQVksS0FBSyxDQUFDO0FBRU8sUUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztLQUFFO0lBRW5ELFFBQVEsQ0FBQyxLQUFjLEVBQUEsRUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxFQUFFO0FBRWhELElBQUEsU0FBUyxHQUFLLEVBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQUUsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxFQUFFO0lBRXRILFFBQVEsQ0FBQyxJQUFZLEVBQUUsSUFBb0IsRUFBRSxRQUFnQixFQUFFLE1BQWMsR0FBRyxFQUFBO1FBQzVFLElBQUksSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFPO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN6QyxRQUFBLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLFFBQUEsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFFBQUEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ1osUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMxRCxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFTLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZGLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUM7S0FDbkQ7QUFFRCxJQUFBLFNBQVMsQ0FBQyxJQUE2RCxFQUFBO0FBQ25FLFFBQUEsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQUMsWUFBQSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FBRTtBQUMvRyxhQUFBLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRTtZQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUFDLFlBQUEsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQUU7QUFDekgsYUFBQSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FBRTtBQUMzRCxhQUFBLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUFFO0FBQzNELGFBQUEsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUFDLFlBQUEsVUFBVSxDQUFDLE1BQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUFFO0FBQzVILGFBQUEsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUFFO0tBQzNFO0lBRUQsZ0JBQWdCLEdBQUE7UUFDWixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDakIsUUFBQSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7QUFDckIsWUFBQSxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ2pDLFlBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDM0IsWUFBQSxJQUFJQSxlQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0gsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ3hCLFlBQUEsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0UsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxLQUFJO2dCQUN2QyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRCxnQkFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFO29CQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQyxvQkFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztBQUM5QyxvQkFBQSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLG9CQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUM7aUJBQ3BCO0FBQ0wsYUFBQyxDQUFDO1lBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxZQUFBLElBQUlBLGVBQU0sQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1NBQy9DO0tBQ0o7QUFDSjs7QUMxRUssTUFBTyxVQUFXLFNBQVFDLGNBQUssQ0FBQTtBQUVqQyxJQUFBLFdBQUEsQ0FBWSxHQUFRLEVBQUUsQ0FBVyxFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBQyxDQUFDLENBQUMsRUFBRTtJQUNuRSxNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDekIsUUFBQSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELFFBQUEsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUMxRCxRQUFBLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUMzRCxRQUFBLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFDOUQsUUFBQSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDMUQsUUFBQSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzlDLFFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDO0FBQ3RELFFBQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUM1QyxRQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUM7QUFDckQsUUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RCLFFBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsT0FBTyxDQUFDO0FBQ3hCLFFBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUMsV0FBVyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxPQUFPLEdBQUMsTUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDOUI7SUFDRCxPQUFPLEdBQUEsRUFBSyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUU7QUFDeEMsQ0FBQTtBQUVLLE1BQU8sU0FBVSxTQUFRQSxjQUFLLENBQUE7QUFFaEMsSUFBQSxXQUFBLENBQVksR0FBUSxFQUFFLE1BQXNCLEVBQUksRUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxFQUFFO0lBQ25GLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7QUFDdEQsUUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFBLFVBQUEsRUFBYSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUUsQ0FBQSxFQUFFLENBQUMsQ0FBQztBQUU1RSxRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsRUFBRSxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQzdELFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztTQUNoRyxDQUFBLENBQUMsQ0FBQztBQUNILFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7WUFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNsRixDQUFBLENBQUMsQ0FBQztBQUNILFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUNqRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBR0MsZUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUNoRixDQUFBLENBQUMsQ0FBQztBQUNILFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDaEUsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEdBQUdBLGVBQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDL0UsQ0FBQSxDQUFDLENBQUM7S0FDTjtJQUNELElBQUksQ0FBQyxFQUFlLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxJQUFZLEVBQUUsTUFBMkIsRUFBQTtBQUN2RixRQUFBLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN6QixRQUFBLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLDRGQUE0RixDQUFDLENBQUM7QUFDdEgsUUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2xDLFFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBRyxFQUFBLElBQUksQ0FBSSxFQUFBLENBQUEsRUFBRSxDQUFDLENBQUM7UUFDdEQsSUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFFO0FBQ2pDLFlBQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUMsTUFBTSxDQUFDLENBQUM7QUFBQyxZQUFBLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLEtBQUssQ0FBQztTQUM1RDthQUFNO0FBQ0gsWUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3RCLFlBQUEsQ0FBQyxDQUFDLE9BQU8sR0FBRyxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtnQkFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztnQkFDbEMsTUFBTSxNQUFNLEVBQUUsQ0FBQztnQkFDZixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2hDLGdCQUFBLElBQUlGLGVBQU0sQ0FBQyxDQUFBLE9BQUEsRUFBVSxJQUFJLENBQUEsQ0FBRSxDQUFDLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLGdCQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQy9DLGFBQUMsQ0FBQSxDQUFBO1NBQ0o7S0FDSjtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxVQUFXLFNBQVFDLGNBQUssQ0FBQTtJQUdqQyxXQUFZLENBQUEsR0FBUSxFQUFFLE1BQXNCLEVBQUE7UUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFEN0MsSUFBVSxDQUFBLFVBQUEsR0FBVyxDQUFDLENBQUM7UUFBQyxJQUFLLENBQUEsS0FBQSxHQUFXLE1BQU0sQ0FBQztRQUFDLElBQVEsQ0FBQSxRQUFBLEdBQVcsTUFBTSxDQUFDO1FBQUMsSUFBUSxDQUFBLFFBQUEsR0FBVyxFQUFFLENBQUM7UUFBQyxJQUFVLENBQUEsVUFBQSxHQUFZLEtBQUssQ0FBQztRQUFDLElBQU0sQ0FBQSxNQUFBLEdBQVksS0FBSyxDQUFDO0FBQ3pHLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7S0FBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztBQUVwRCxRQUFBLElBQUlFLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUc7QUFDcEQsWUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9CLFlBQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QyxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxVQUFVLEdBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU5TyxRQUFBLE1BQU0sTUFBTSxHQUEyQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRSxRQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUM7UUFFMUIsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUc7QUFDOUYsWUFBQSxJQUFHLENBQUMsS0FBRyxPQUFPLEVBQUM7Z0JBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQUMsZ0JBQUEsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUFFOztBQUFNLGdCQUFBLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FBQyxDQUFDO1NBQzFHLENBQUMsQ0FBQyxDQUFDO0FBRUosUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hJLFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEksUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsVUFBVSxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEosSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQUs7QUFDbEYsWUFBQSxJQUFHLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDVCxnQkFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxJQUFJLENBQUMsVUFBVSxFQUFDLElBQUksQ0FBQyxLQUFLLEVBQUMsSUFBSSxDQUFDLFFBQVEsRUFBQyxJQUFJLENBQUMsUUFBUSxFQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDeEksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2hCO1NBQ0osQ0FBQyxDQUFDLENBQUM7S0FDUDtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxpQkFBa0IsU0FBUUYsY0FBSyxDQUFBO0FBRXhDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxNQUFzQixFQUFJLEVBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsRUFBRTtJQUNuRixNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUNuRCxJQUFJLENBQUMsR0FBQyxFQUFFLENBQUM7UUFDVCxJQUFJRSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBUyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7WUFDeEksSUFBRyxDQUFDLEVBQUM7Z0JBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxXQUFXLEVBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQztnQkFDeEgsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2hCO1NBQ0osQ0FBQSxDQUFDLENBQUMsQ0FBQztLQUNQO0lBQ0QsT0FBTyxHQUFBLEVBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLENBQUE7QUFFSyxNQUFPLGdCQUFpQixTQUFRRixjQUFLLENBQUE7SUFFdkMsV0FBWSxDQUFBLEdBQVEsRUFBRSxNQUFzQixFQUFFLEtBQWEsRUFBSSxFQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBQyxLQUFLLENBQUMsRUFBRTtJQUNsSCxNQUFNLEdBQUE7QUFDRixRQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFBQyxRQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDOUUsUUFBQSxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxDQUFBLE1BQUEsRUFBUyxDQUFDLENBQUMsSUFBSSxDQUFFLENBQUEsRUFBRSxDQUFDLENBQUM7QUFDdEQsUUFBQSxJQUFJRSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVGLFFBQUEsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQVcsUUFBQSxFQUFBLENBQUMsQ0FBQyxJQUFJLENBQUEsQ0FBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFTLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUN0SSxZQUFBLENBQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxDQUFDO0FBQUMsWUFBQSxDQUFDLENBQUMsS0FBSyxHQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNiLFlBQUEsSUFBSUgsZUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDaEMsQ0FBQSxDQUFDLENBQUMsQ0FBQztBQUVKLFFBQUEsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2xDLFFBQUEsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsK0RBQStELENBQUMsQ0FBQztBQUUzRixRQUFBLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7QUFDcEQsUUFBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFCLEtBQUssQ0FBQyxPQUFPLEdBQUMscURBQVcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUEsQ0FBQztBQUUxRSxRQUFBLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUMsSUFBSSxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUM7QUFDMUQsUUFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBQyxZQUFZLENBQUMsQ0FBQztBQUN4QyxRQUFBLElBQUksQ0FBQyxPQUFPLEdBQUMsTUFBUyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDbEIsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDakIsU0FBQyxDQUFBLENBQUM7S0FDTDtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBSUssTUFBTyxrQkFBbUIsU0FBUUMsY0FBSyxDQUFBO0lBT3pDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtRQUN4QyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFOZixJQUFLLENBQUEsS0FBQSxHQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUEsSUFBQSxHQUEyQixRQUFRLENBQUM7UUFDeEMsSUFBVyxDQUFBLFdBQUEsR0FBVyxNQUFNLENBQUM7UUFDN0IsSUFBaUIsQ0FBQSxpQkFBQSxHQUFXLE1BQU0sQ0FBQztBQUkvQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0tBQ3hCO0lBRUQsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQztRQUUxRCxJQUFJRSxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNqQixPQUFPLENBQUMsZ0JBQWdCLENBQUM7YUFDekIsT0FBTyxDQUFDLENBQUMsSUFBRztBQUNULFlBQUEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNoQyxZQUFBLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDNUMsU0FBQyxDQUFDLENBQUM7UUFFUCxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNqQixPQUFPLENBQUMsZUFBZSxDQUFDO0FBQ3hCLGFBQUEsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2QsYUFBQSxTQUFTLENBQUMsUUFBUSxFQUFFLHdCQUF3QixDQUFDO0FBQzdDLGFBQUEsU0FBUyxDQUFDLFdBQVcsRUFBRSwyQkFBMkIsQ0FBQzthQUNuRCxRQUFRLENBQUMsUUFBUSxDQUFDO0FBQ2xCLGFBQUEsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQTJCLENBQUMsQ0FDMUQsQ0FBQztBQUVOLFFBQUEsTUFBTSxNQUFNLEdBQTJCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzFELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWxFLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxjQUFjLENBQUM7QUFDdkIsYUFBQSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDZCxVQUFVLENBQUMsTUFBTSxDQUFDO2FBQ2xCLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFDaEIsYUFBQSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQ3ZDLENBQUM7QUFFTixRQUFBLE1BQU0sWUFBWSxHQUEyQixFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztBQUNoRSxRQUFBLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDOUUsUUFBQSxJQUFJLFdBQVcsWUFBWUMsZ0JBQU8sRUFBRTtBQUNoQyxZQUFBLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBRztnQkFDN0IsSUFBSSxDQUFDLFlBQVlDLGNBQUssSUFBSSxDQUFDLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtvQkFDNUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO2lCQUN6QztBQUNMLGFBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxJQUFJRixnQkFBTyxDQUFDLFNBQVMsQ0FBQzthQUNqQixPQUFPLENBQUMsbUJBQW1CLENBQUM7QUFDNUIsYUFBQSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDZCxVQUFVLENBQUMsWUFBWSxDQUFDO2FBQ3hCLFFBQVEsQ0FBQyxNQUFNLENBQUM7QUFDaEIsYUFBQSxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FDN0MsQ0FBQztRQUVOLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDO0FBQ2pCLGFBQUEsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQ1osYUFBYSxDQUFDLGlCQUFpQixDQUFDO0FBQ2hDLGFBQUEsTUFBTSxFQUFFO2FBQ1IsT0FBTyxDQUFDLE1BQUs7QUFDVixZQUFBLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDWixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDbEMsSUFBSSxDQUFDLEtBQUssRUFDVixJQUFJLENBQUMsSUFBSSxFQUNULElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FDekIsQ0FBQztnQkFDRixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDaEI7U0FDSixDQUFDLENBQ0wsQ0FBQztLQUNUO0lBRUQsT0FBTyxHQUFBO0FBQ0gsUUFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO0tBQzFCO0FBQ0osQ0FBQTtBQUVLLE1BQU8saUJBQWtCLFNBQVFGLGNBQUssQ0FBQTtJQUd4QyxXQUFZLENBQUEsR0FBUSxFQUFFLE1BQXNCLEVBQUE7UUFDeEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ1gsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUN4QjtJQUVELE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFFdkQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNwRCxRQUFBLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO0FBQ3BFLFFBQUEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQSxlQUFBLEVBQWtCLEtBQUssQ0FBQyxNQUFNLENBQUUsQ0FBQSxFQUFFLENBQUMsQ0FBQztBQUNsRSxRQUFBLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUEsaUJBQUEsRUFBb0IsS0FBSyxDQUFDLFFBQVEsQ0FBRSxDQUFBLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLFFBQUEsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQSxPQUFBLEVBQVUsS0FBSyxDQUFDLEtBQUssQ0FBSSxFQUFBLENBQUEsRUFBRSxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLEVBQUU7QUFDOUMsWUFBQSxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDdEMsWUFBQSxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxtREFBbUQsQ0FBQyxDQUFDO0FBQ25GLFlBQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO1NBQzFFO1FBRUQsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBRXRELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzdFLFFBQUEsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQixTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSw0QkFBNEIsRUFBRSxDQUFDLENBQUM7U0FDbkU7YUFBTTtBQUNILFlBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQU0sS0FBSTtBQUN0QixnQkFBQSxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztBQUNoRSxnQkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwyRUFBMkUsQ0FBQyxDQUFDO0FBRXhHLGdCQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ3RELGdCQUFBLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7Z0JBRW5ELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBUyxNQUFBLEVBQUEsQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEdBQUcsUUFBUSxHQUFHLFdBQVcsQ0FBYSxVQUFBLEVBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBSSxDQUFBLEVBQUEsQ0FBQyxDQUFDLFNBQVMsQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUM3RyxnQkFBQSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO0FBRTlELGdCQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNqQyxnQkFBQSxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO0FBRTNFLGdCQUFBLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDckUsZ0JBQUEsV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsNEdBQTRHLENBQUMsQ0FBQztBQUNoSixnQkFBQSxXQUFXLENBQUMsT0FBTyxHQUFHLE1BQUs7QUFDdkIsb0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQzVELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNqQixpQkFBQyxDQUFDO0FBRUYsZ0JBQUEsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUNqRSxnQkFBQSxTQUFTLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSwwR0FBMEcsQ0FBQyxDQUFDO0FBQzVJLGdCQUFBLFNBQVMsQ0FBQyxPQUFPLEdBQUcsTUFBSztvQkFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM3QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDakIsaUJBQUMsQ0FBQztBQUNOLGFBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQy9FLFFBQUEsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUN4QixTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7U0FDL0Q7YUFBTTtBQUNILFlBQUEsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQU0sS0FBSTtnQkFDekIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBLEVBQUEsRUFBSyxDQUFDLENBQUMsS0FBSyxDQUFLLEVBQUEsRUFBQSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsR0FBRyxRQUFRLEdBQUcsV0FBVyxDQUFHLENBQUEsQ0FBQSxDQUFDLENBQUM7QUFDL0UsZ0JBQUEsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsaUNBQWlDLENBQUMsQ0FBQztBQUNsRSxhQUFDLENBQUMsQ0FBQztTQUNOO0tBQ0o7SUFFRCxPQUFPLEdBQUE7QUFDSCxRQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDMUI7QUFDSixDQUFBO0FBR0ssTUFBTyxpQkFBa0IsU0FBUUEsY0FBSyxDQUFBO0lBS3hDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtRQUN4QyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFKZixJQUFTLENBQUEsU0FBQSxHQUFXLEVBQUUsQ0FBQztRQUN2QixJQUFjLENBQUEsY0FBQSxHQUFhLEVBQUUsQ0FBQztBQUkxQixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0tBQ3hCO0lBRUQsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFcEQsSUFBSUUsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7YUFDakIsT0FBTyxDQUFDLFlBQVksQ0FBQzthQUNyQixPQUFPLENBQUMsQ0FBQyxJQUFHO0FBQ1QsWUFBQSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLFlBQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUM1QyxTQUFDLENBQUMsQ0FBQztRQUVQLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7QUFFcEQsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztBQUU1QixRQUFBLElBQUksV0FBVyxZQUFZQyxnQkFBTyxFQUFFO0FBQ2hDLFlBQUEsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFHO2dCQUM3QixJQUFJLENBQUMsWUFBWUMsY0FBSyxJQUFJLENBQUMsQ0FBQyxTQUFTLEtBQUssSUFBSSxFQUFFO0FBQzVDLG9CQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMzQjtBQUNMLGFBQUMsQ0FBQyxDQUFDO1NBQ047UUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSTtZQUMxQixJQUFJRixnQkFBTyxDQUFDLFNBQVMsQ0FBQztpQkFDakIsT0FBTyxDQUFDLEtBQUssQ0FBQztpQkFDZCxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFHO2dCQUMzQixJQUFJLENBQUMsRUFBRTtBQUNILG9CQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNuQztxQkFBTTtBQUNILG9CQUFBLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQztpQkFDdEU7YUFDSixDQUFDLENBQUMsQ0FBQztBQUNaLFNBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSUEsZ0JBQU8sQ0FBQyxTQUFTLENBQUM7QUFDakIsYUFBQSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUM7YUFDWixhQUFhLENBQUMsY0FBYyxDQUFDO0FBQzdCLGFBQUEsTUFBTSxFQUFFO2FBQ1IsT0FBTyxDQUFDLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ2hCLFlBQUEsSUFBSSxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUNuRCxnQkFBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2dCQUMvRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDaEI7aUJBQU07QUFDSCxnQkFBQSxJQUFJSCxlQUFNLENBQUMsMENBQTBDLENBQUMsQ0FBQzthQUMxRDtTQUNKLENBQUEsQ0FBQyxDQUNMLENBQUM7S0FDVDtJQUVELE9BQU8sR0FBQTtBQUNILFFBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUMxQjtBQUNKOztBQ2hZRDs7Ozs7O0FBTUc7TUFDVSxlQUFlLENBQUE7SUFJeEIsV0FBWSxDQUFBLFFBQTBCLEVBQUUsZUFBcUIsRUFBQTtBQUN6RCxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO0FBQ3pCLFFBQUEsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7S0FDMUM7QUFFRDs7QUFFRztBQUNILElBQUEsaUJBQWlCLENBQUMsSUFBbUcsRUFBRSxNQUFBLEdBQWlCLENBQUMsRUFBQTtRQUNySSxNQUFNLEtBQUssR0FBR0UsZUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTVDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ1QsWUFBQSxNQUFNLEdBQUc7QUFDTCxnQkFBQSxJQUFJLEVBQUUsS0FBSztBQUNYLGdCQUFBLGVBQWUsRUFBRSxDQUFDO0FBQ2xCLGdCQUFBLFlBQVksRUFBRSxDQUFDO0FBQ2YsZ0JBQUEsUUFBUSxFQUFFLENBQUM7QUFDWCxnQkFBQSxVQUFVLEVBQUUsQ0FBQztBQUNiLGdCQUFBLFlBQVksRUFBRSxDQUFDO0FBQ2YsZ0JBQUEsYUFBYSxFQUFFLEVBQUU7QUFDakIsZ0JBQUEsZUFBZSxFQUFFLENBQUM7YUFDckIsQ0FBQztZQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN6QztRQUVELFFBQVEsSUFBSTtBQUNSLFlBQUEsS0FBSyxnQkFBZ0I7QUFDakIsZ0JBQUEsTUFBTSxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUM7Z0JBQ2pDLE1BQU07QUFDVixZQUFBLEtBQUssWUFBWTtBQUNiLGdCQUFBLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO2dCQUM5QixNQUFNO0FBQ1YsWUFBQSxLQUFLLElBQUk7QUFDTCxnQkFBQSxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQztnQkFDMUIsTUFBTTtBQUNWLFlBQUEsS0FBSyxNQUFNO0FBQ1AsZ0JBQUEsTUFBTSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUM7Z0JBQzVCLE1BQU07QUFDVixZQUFBLEtBQUssUUFBUTtBQUNULGdCQUFBLE1BQU0sQ0FBQyxZQUFZLElBQUksTUFBTSxDQUFDO2dCQUM5QixNQUFNO0FBQ1YsWUFBQSxLQUFLLGFBQWE7QUFDZCxnQkFBQSxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDM0MsTUFBTTtBQUNWLFlBQUEsS0FBSyxnQkFBZ0I7QUFDakIsZ0JBQUEsTUFBTSxDQUFDLGVBQWUsSUFBSSxNQUFNLENBQUM7Z0JBQ2pDLE1BQU07U0FDYjtLQUNKO0FBRUQ7O0FBRUc7SUFDSCxZQUFZLEdBQUE7UUFDUixNQUFNLEtBQUssR0FBR0EsZUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztBQUUvQyxRQUFBLElBQUksUUFBUSxLQUFLLEtBQUssRUFBRTtBQUNwQixZQUFBLE9BQU87U0FDVjtBQUVELFFBQUEsTUFBTSxTQUFTLEdBQUdBLGVBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRW5FLFFBQUEsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFOztBQUV4QixZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQy9CLFlBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO0FBQzdELGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7YUFDL0Q7U0FDSjthQUFNOztZQUVILElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7U0FDcEM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0tBQ3pDO0FBRUQ7O0FBRUc7SUFDSCx3QkFBd0IsR0FBQTtRQUNwQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDM0MsWUFBQSxNQUFNLFVBQVUsR0FBRztBQUNmLGdCQUFBLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUU7QUFDdkYsZ0JBQUEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtBQUM1RixnQkFBQSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0FBQzNGLGdCQUFBLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7YUFDL0YsQ0FBQztBQUVGLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEdBQUcsVUFBaUIsQ0FBQztTQUNwRDtLQUNKO0FBRUQ7O0FBRUc7SUFDSCxtQkFBbUIsR0FBQTtRQUNmLE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQztBQUU5QixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzVFLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1NBQ25DO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBbUIsS0FBSTs7QUFDekQsWUFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ3JELGdCQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQ3JCLGdCQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQSxlQUFBLEVBQWtCLElBQUksQ0FBQyxJQUFJLENBQUEsUUFBQSxFQUFXLElBQUksQ0FBQyxLQUFLLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztBQUNuRSxnQkFBQSxJQUFJLE1BQUEsSUFBSSxDQUFDLGVBQWUsTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxTQUFTLEVBQUU7QUFDakMsb0JBQUEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7aUJBQzdDO2FBQ0o7QUFDTCxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsT0FBTyxRQUFRLENBQUM7S0FDbkI7QUFFRDs7QUFFRztBQUNILElBQUEsVUFBVSxDQUFDLEtBQWEsRUFBQTs7UUFDcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBZ0IsS0FBSyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDO1FBQ3hGLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDUCxZQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDckU7QUFFRCxRQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFlBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUM1RTtBQUVELFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTNDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUM7QUFFbEMsUUFBQSxJQUFJLE1BQUEsSUFBSSxDQUFDLGVBQWUsTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxTQUFTLEVBQUU7QUFDakMsWUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM3Qzs7QUFHRCxRQUFBLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRTtZQUNkLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUNmLFlBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQWtCLGVBQUEsRUFBQSxJQUFJLENBQUMsSUFBSSxDQUFBLFVBQUEsQ0FBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDdkc7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBa0IsZUFBQSxFQUFBLElBQUksQ0FBQyxJQUFJLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQSxHQUFBLENBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0tBQ25IO0FBRUQ7O0FBRUc7SUFDSyxPQUFPLEdBQUE7O0FBQ1gsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUVyRCxRQUFBLElBQUksTUFBQSxJQUFJLENBQUMsZUFBZSxNQUFFLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLFNBQVMsRUFBRTtBQUNqQyxZQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQzdDO0tBQ0o7QUFFRDs7QUFFRztJQUNILG9CQUFvQixHQUFBO0FBQ2hCLFFBQUEsTUFBTSxJQUFJLEdBQUdBLGVBQU0sRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzdCLFFBQUEsTUFBTSxTQUFTLEdBQUdBLGVBQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDaEUsUUFBQSxNQUFNLE9BQU8sR0FBR0EsZUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUU1RCxRQUFBLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQWEsS0FDOURBLGVBQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDQSxlQUFNLENBQUMsU0FBUyxDQUFDLEVBQUVBLGVBQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQzNFLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLENBQWEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNuRyxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLENBQWEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNoRyxRQUFBLE1BQU0sV0FBVyxHQUFHLFdBQVcsR0FBRyxXQUFXLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxXQUFXLElBQUksV0FBVyxHQUFHLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0SCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLENBQWEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4RixNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBVyxFQUFFLENBQWEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUU1RixRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUNqQyxhQUFBLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxDQUFNLE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0MsYUFBQSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNYLEdBQUcsQ0FBQyxDQUFDLENBQU0sS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFN0IsUUFBQSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUM7QUFDbEMsY0FBRSxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBZSxFQUFFLENBQWEsS0FBSyxDQUFDLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUk7Y0FDOUcsU0FBUyxDQUFDO0FBRWhCLFFBQUEsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDO0FBQ25DLGNBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQWUsRUFBRSxDQUFhLEtBQUssQ0FBQyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJO2NBQ3hHLFNBQVMsQ0FBQztBQUVoQixRQUFBLE1BQU0sTUFBTSxHQUFpQjtBQUN6QixZQUFBLElBQUksRUFBRSxJQUFJO0FBQ1YsWUFBQSxTQUFTLEVBQUUsU0FBUztBQUNwQixZQUFBLE9BQU8sRUFBRSxPQUFPO0FBQ2hCLFlBQUEsV0FBVyxFQUFFLFdBQVc7QUFDeEIsWUFBQSxXQUFXLEVBQUUsV0FBVztBQUN4QixZQUFBLE9BQU8sRUFBRSxPQUFPO0FBQ2hCLFlBQUEsU0FBUyxFQUFFLFNBQVM7QUFDcEIsWUFBQSxTQUFTLEVBQUUsU0FBUztBQUNwQixZQUFBLE9BQU8sRUFBRSxPQUFPO0FBQ2hCLFlBQUEsUUFBUSxFQUFFLFFBQVE7U0FDckIsQ0FBQztRQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN6QyxRQUFBLE9BQU8sTUFBTSxDQUFDO0tBQ2pCO0FBRUQ7O0FBRUc7QUFDSCxJQUFBLGlCQUFpQixDQUFDLGFBQXFCLEVBQUE7O1FBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQWMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLGFBQWEsQ0FBQyxDQUFDO0FBQ2hHLFFBQUEsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsUUFBUTtBQUFFLFlBQUEsT0FBTyxLQUFLLENBQUM7QUFFdkQsUUFBQSxXQUFXLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUM1QixXQUFXLENBQUMsVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFFbEQsUUFBQSxJQUFJLE1BQUEsSUFBSSxDQUFDLGVBQWUsTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxTQUFTLEVBQUU7QUFDakMsWUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM3QztBQUVELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjtBQUVEOztBQUVHO0lBQ0gsWUFBWSxHQUFBO1FBQ1IsT0FBTztBQUNILFlBQUEsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztBQUMxQixZQUFBLGFBQWEsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPO0FBQzNDLFlBQUEsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU87WUFDM0MsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO0FBQ3hHLFlBQUEsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQVcsRUFBRSxDQUFhLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0FBQ2hILFlBQUEsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTztBQUM5QixZQUFBLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFnQixLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNO0FBQzVGLFlBQUEsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU07U0FDbkQsQ0FBQztLQUNMO0FBRUQ7O0FBRUc7SUFDSCxtQkFBbUIsR0FBQTtBQUNmLFFBQUEsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyRSxRQUFBLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsZ0JBQWdCLENBQUM7QUFDdEYsUUFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztLQUNuRTtBQUNKOztBQ3BRRDs7Ozs7Ozs7QUFRRztNQUNVLGdCQUFnQixDQUFBO0lBS3pCLFdBQVksQ0FBQSxRQUEwQixFQUFFLGVBQXFCLEVBQUE7QUFGckQsUUFBQSxJQUFBLENBQUEsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO0FBR2pDLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDekIsUUFBQSxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztLQUMxQztBQUVEOztBQUVHO0lBQ0gsWUFBWSxHQUFBO0FBQ1IsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhO0FBQUUsWUFBQSxPQUFPLEtBQUssQ0FBQztBQUMvQyxRQUFBLE9BQU9BLGVBQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQ0EsZUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztLQUNqRTtBQUVEOztBQUVHO0lBQ0gsd0JBQXdCLEdBQUE7QUFDcEIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO0FBQ3RCLFlBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUM7U0FDcEQ7QUFFRCxRQUFBLE1BQU0sWUFBWSxHQUFHQSxlQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUNBLGVBQU0sRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ25GLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLFFBQUEsTUFBTSxPQUFPLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUVsQyxRQUFBLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO0tBQzNDO0FBRUQ7O0FBRUc7SUFDSCxlQUFlLEdBQUE7QUFDWCxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHQSxlQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3JFLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsR0FBRyxDQUFDLENBQUM7S0FDbEQ7QUFFRDs7O0FBR0c7SUFDSCxRQUFRLEdBQUE7O0FBQ0osUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQ3RCLE9BQU87QUFDSCxnQkFBQSxPQUFPLEVBQUUsS0FBSztBQUNkLGdCQUFBLFVBQVUsRUFBRSxDQUFDO0FBQ2IsZ0JBQUEsZUFBZSxFQUFFLENBQUM7QUFDbEIsZ0JBQUEsT0FBTyxFQUFFLHVDQUF1QztBQUNoRCxnQkFBQSxlQUFlLEVBQUUsS0FBSzthQUN6QixDQUFDO1NBQ0w7QUFFRCxRQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUU7WUFDNUIsT0FBTztBQUNILGdCQUFBLE9BQU8sRUFBRSxLQUFLO0FBQ2QsZ0JBQUEsVUFBVSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCO0FBQ3RELGdCQUFBLGVBQWUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQztBQUM3RSxnQkFBQSxPQUFPLEVBQUUsc0NBQXNDO0FBQy9DLGdCQUFBLGVBQWUsRUFBRSxLQUFLO2FBQ3pCLENBQUM7U0FDTDtBQUVELFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0FBQ2xDLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDOztRQUc3QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUUzQixNQUFNLFNBQVMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQzs7UUFJbEUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLDRCQUE0QixJQUFJLEVBQUUsRUFBRTtBQUNsRCxZQUFBLE1BQU0sV0FBVyxHQUFHQSxlQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdFLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUN4RCxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEdBQUcsQ0FBQyxDQUFDO0FBRy9DLFlBQUEsSUFBSSxNQUFBLElBQUksQ0FBQyxlQUFlLE1BQUUsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsU0FBUyxFQUFFO0FBQ2pDLGdCQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzdDOztZQUdELFVBQVUsQ0FBQyxNQUFLO0FBQ1osZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDO0FBQ3ZDLGFBQUMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUU5QixPQUFPO0FBQ0gsZ0JBQUEsT0FBTyxFQUFFLElBQUk7QUFDYixnQkFBQSxVQUFVLEVBQUUsQ0FBQztBQUNiLGdCQUFBLGVBQWUsRUFBRSxDQUFDO0FBQ2xCLGdCQUFBLE9BQU8sRUFBRSxtREFBbUQ7QUFDNUQsZ0JBQUEsZUFBZSxFQUFFLElBQUk7YUFDeEIsQ0FBQztTQUNMOztRQUdELFVBQVUsQ0FBQyxNQUFLO0FBQ1osWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDdkMsU0FBQyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTlCLE9BQU87QUFDSCxZQUFBLE9BQU8sRUFBRSxJQUFJO0FBQ2IsWUFBQSxVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEI7QUFDdEQsWUFBQSxlQUFlLEVBQUUsU0FBUztZQUMxQixPQUFPLEVBQUUsZUFBZSxJQUFJLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFVLE9BQUEsRUFBQSxTQUFTLENBQWMsWUFBQSxDQUFBO0FBQ25HLFlBQUEsZUFBZSxFQUFFLEtBQUs7U0FDekIsQ0FBQztLQUNMO0FBRUQ7O0FBRUc7SUFDSyxtQkFBbUIsR0FBQTtBQUN2QixRQUFBLElBQUk7QUFDQSxZQUFBLE1BQU0sWUFBWSxHQUFHLEtBQUssTUFBTSxDQUFDLFlBQVksSUFBSyxNQUFjLENBQUMsa0JBQWtCLEdBQUcsQ0FBQztBQUN2RixZQUFBLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQ25ELFlBQUEsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBRTNDLFlBQUEsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ2pDLFlBQUEsVUFBVSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7WUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1RCxZQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFL0UsWUFBQSxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzdCLFlBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFM0MsWUFBQSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMzQyxVQUFVLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDakQ7UUFBQyxPQUFPLENBQUMsRUFBRTtBQUNSLFlBQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1NBQ3JEO0tBQ0o7QUFFRDs7QUFFRztJQUNILG1CQUFtQixHQUFBO0FBQ2YsUUFBQSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDO0FBQzlELFFBQUEsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sV0FBVyxHQUFHLENBQUMsRUFBRSxHQUFHLGVBQWUsSUFBSSxFQUFFLENBQUM7UUFFaEQsT0FBTztZQUNILFVBQVU7WUFDVixlQUFlO1lBQ2YsV0FBVztTQUNkLENBQUM7S0FDTDtBQUVEOztBQUVHO0lBQ0ssd0JBQXdCLEdBQUE7UUFDNUIsTUFBTSxLQUFLLEdBQUdBLGVBQU0sRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU1QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEtBQUssS0FBSyxFQUFFO0FBQzNDLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7QUFDeEMsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQztTQUN6QztLQUNKO0FBRUQ7O0FBRUc7SUFDSCxrQkFBa0IsR0FBQTtRQUNkLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0FBQ2hDLFFBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQztLQUNoRDtBQUVEOztBQUVHO0lBQ0gsZ0JBQWdCLEdBQUE7UUFDWixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztBQUVoQyxRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDckUsUUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWhFLE9BQU87QUFDSCxZQUFBLElBQUksRUFBRSxTQUFTO0FBQ2YsWUFBQSxJQUFJLEVBQUUsSUFBSTtBQUNWLFlBQUEsU0FBUyxFQUFFLFNBQVM7U0FDdkIsQ0FBQztLQUNMO0FBRUQ7OztBQUdHO0lBQ0gsaUJBQWlCLEdBQUE7UUFDYixJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUVoQyxJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7UUFDYixJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFFakIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixJQUFJLENBQUMsRUFBRTs7WUFFeEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNWLFlBQUEsT0FBTyxHQUFHLENBQUEsc0JBQUEsRUFBeUIsSUFBSSxDQUFBLENBQUEsQ0FBRyxDQUFDO1NBQzlDO2FBQU07O1lBRUgsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUM7QUFDeEQsWUFBQSxPQUFPLEdBQUcsQ0FBbUIsZ0JBQUEsRUFBQSxTQUFTLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQztTQUMxRTtBQUVELFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO0FBQ3BDLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0FBRTNCLFFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQztLQUM1QjtBQUNKOztBQ2hPRDs7Ozs7OztBQU9HO01BQ1UsY0FBYyxDQUFBO0lBSXZCLFdBQVksQ0FBQSxRQUEwQixFQUFFLGVBQXFCLEVBQUE7QUFDekQsUUFBQSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztBQUN6QixRQUFBLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0tBQzFDO0FBRUQ7OztBQUdHO0FBQ0csSUFBQSxtQkFBbUIsQ0FBQyxLQUFhLEVBQUUsSUFBNEIsRUFBRSxXQUFtQixFQUFFLGlCQUF5QixFQUFBOzs7QUFFakgsWUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEVBQUU7Z0JBQ2hDLE9BQU87QUFDSCxvQkFBQSxPQUFPLEVBQUUsS0FBSztBQUNkLG9CQUFBLE9BQU8sRUFBRSwrREFBK0Q7aUJBQzNFLENBQUM7YUFDTDtBQUVELFlBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxLQUFLLFFBQVEsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0FBQ2hELFlBQUEsTUFBTSxPQUFPLEdBQUcsQ0FBWSxTQUFBLEVBQUEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUUzRSxZQUFBLE1BQU0sYUFBYSxHQUFrQjtBQUNqQyxnQkFBQSxFQUFFLEVBQUUsT0FBTztBQUNYLGdCQUFBLEtBQUssRUFBRSxLQUFLO0FBQ1osZ0JBQUEsSUFBSSxFQUFFLElBQUk7QUFDVixnQkFBQSxXQUFXLEVBQUUsV0FBVztBQUN4QixnQkFBQSxTQUFTLEVBQUUsU0FBUztBQUNwQixnQkFBQSxTQUFTLEVBQUUsQ0FBQztBQUNaLGdCQUFBLGlCQUFpQixFQUFFLGlCQUFpQjtBQUNwQyxnQkFBQSxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7QUFDbkMsZ0JBQUEsU0FBUyxFQUFFLEtBQUs7YUFDbkIsQ0FBQztZQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNqRCxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRTVDLE9BQU87QUFDSCxnQkFBQSxPQUFPLEVBQUUsSUFBSTtBQUNiLGdCQUFBLE9BQU8sRUFBRSxDQUFBLHdCQUFBLEVBQTJCLElBQUksS0FBSyxRQUFRLEdBQUcsUUFBUSxHQUFHLFdBQVcsQ0FBQSxFQUFBLEVBQUssU0FBUyxDQUFTLE9BQUEsQ0FBQTtBQUNyRyxnQkFBQSxPQUFPLEVBQUUsT0FBTzthQUNuQixDQUFDO1NBQ0wsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVEOzs7QUFHRztJQUNILHFCQUFxQixDQUFDLE9BQWUsRUFBRSxjQUFzQixFQUFBOztRQUN6RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUM7UUFDL0UsSUFBSSxDQUFDLGFBQWEsRUFBRTtBQUNoQixZQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQztTQUMvRjtBQUVELFFBQUEsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFO0FBQ3pCLFlBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDO1NBQzlGOztBQUdELFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQzFELFFBQUEsSUFBSSxjQUFjLEdBQUcsUUFBUSxFQUFFO1lBQzNCLE9BQU87QUFDSCxnQkFBQSxPQUFPLEVBQUUsS0FBSztBQUNkLGdCQUFBLE9BQU8sRUFBRSxDQUFBLHlCQUFBLEVBQTRCLFFBQVEsQ0FBQSwwQkFBQSxFQUE2QixjQUFjLENBQUcsQ0FBQSxDQUFBO0FBQzNGLGdCQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ1gsZ0JBQUEsV0FBVyxFQUFFLENBQUM7YUFDakIsQ0FBQztTQUNMOztRQUdELElBQUksY0FBYyxHQUFHLGFBQWEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxFQUFFO1lBQ2pELE9BQU87QUFDSCxnQkFBQSxPQUFPLEVBQUUsS0FBSztBQUNkLGdCQUFBLE9BQU8sRUFBRSxDQUFBLDZCQUFBLEVBQWdDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBZ0IsY0FBQSxDQUFBO0FBQ2xHLGdCQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ1gsZ0JBQUEsV0FBVyxFQUFFLENBQUM7YUFDakIsQ0FBQztTQUNMOztBQUdELFFBQUEsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLElBQUksS0FBSyxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQzs7UUFHeEQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLFFBQUEsSUFBSSxjQUFjLEdBQUcsYUFBYSxDQUFDLFNBQVMsRUFBRTtBQUMxQyxZQUFBLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxjQUFjLEdBQUcsYUFBYSxDQUFDLFNBQVMsSUFBSSxhQUFhLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQztBQUNwRyxZQUFBLElBQUksY0FBYyxHQUFHLENBQUMsRUFBRTtBQUNwQixnQkFBQSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksY0FBYyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDekQ7U0FDSjs7UUFHRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25GLElBQUksS0FBSyxFQUFFO0FBQ1AsWUFBQSxLQUFLLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQztZQUNyQixJQUFJLEtBQUssQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtnQkFDekIsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2QsZ0JBQUEsS0FBSyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDSjs7QUFHRCxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLFdBQVcsQ0FBQztBQUNsQyxRQUFBLGFBQWEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQy9CLGFBQWEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNyRCxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLENBQUM7QUFFaEQsUUFBQSxJQUFJLE1BQUEsSUFBSSxDQUFDLGVBQWUsTUFBRSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxTQUFTLEVBQUU7QUFDakMsWUFBQSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUM3QztRQUVELElBQUksT0FBTyxHQUFHLENBQXNCLG1CQUFBLEVBQUEsYUFBYSxDQUFDLEtBQUssQ0FBQSxHQUFBLEVBQU0sUUFBUSxDQUFBLEdBQUEsQ0FBSyxDQUFDO0FBQzNFLFFBQUEsSUFBSSxXQUFXLEdBQUcsQ0FBQyxFQUFFO0FBQ2pCLFlBQUEsT0FBTyxJQUFJLENBQUEsR0FBQSxFQUFNLFdBQVcsQ0FBQSxrQkFBQSxDQUFvQixDQUFDO1NBQ3BEO1FBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztLQUM1RDtBQUVEOztBQUVHO0FBQ0gsSUFBQSxtQkFBbUIsQ0FBQyxPQUFlLEVBQUE7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDO0FBQzVFLFFBQUEsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUc5QyxZQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFO2dCQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQzFHO2lCQUFNO2dCQUNILElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ2xIO1lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUM7U0FDL0Q7UUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQztLQUNsRTtBQUVEOztBQUVHO0lBQ0gsdUJBQXVCLENBQUMsT0FBZSxFQUFFLFlBQW9CLEVBQUE7UUFDekQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQy9FLElBQUksYUFBYSxFQUFFO0FBQ2YsWUFBQSxhQUFhLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztBQUN2QyxZQUFBLE9BQU8sSUFBSSxDQUFDO1NBQ2Y7QUFDRCxRQUFBLE9BQU8sS0FBSyxDQUFDO0tBQ2hCO0FBRUQ7O0FBRUc7SUFDSCxnQkFBZ0IsR0FBQTtBQUNaLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7QUFDMUMsUUFBQSxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNuRSxPQUFPO1lBQ0gsTUFBTSxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQ3pCLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYTtBQUM3QixZQUFBLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMxQixDQUFDO0tBQ0w7QUFFRDs7O0FBR0c7SUFDSCxzQkFBc0IsR0FBQTtBQUNsQixRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDO0FBQzFDLFFBQUEsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbkUsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDO0tBQ3JCO0FBRUQ7O0FBRUc7SUFDSCx1QkFBdUIsR0FBQTtBQUNuQixRQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNqRTtBQUVEOztBQUVHO0lBQ0gsMEJBQTBCLEdBQUE7QUFDdEIsUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2hFO0FBRUQ7OztBQUdHO0lBQ0gsaUJBQWlCLENBQUMsT0FBZSxFQUFFLFNBQWlCLEVBQUE7UUFDaEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxLQUFLLEVBQUU7QUFDUixZQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLENBQUM7U0FDMUU7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQztBQUVwRCxRQUFBLElBQUksT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUNkLFlBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFjLFdBQUEsRUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBLHFCQUFBLENBQXVCLEVBQUUsQ0FBQztTQUM3RztBQUVELFFBQUEsSUFBSSxPQUFPLElBQUksR0FBRyxFQUFFO0FBQ2hCLFlBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFrQixlQUFBLEVBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQSxFQUFBLENBQUksRUFBRSxDQUFDO1NBQzVGO0FBRUQsUUFBQSxJQUFJLE9BQU8sSUFBSSxHQUFHLEVBQUU7QUFDaEIsWUFBQSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyRCxZQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQSxrQkFBQSxFQUFxQixHQUFHLENBQUEsS0FBQSxDQUFPLEVBQUUsQ0FBQztTQUNuRjtRQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBcUMsbUNBQUEsQ0FBQSxFQUFFLENBQUM7S0FDeEY7QUFDSjs7QUNyT0Q7Ozs7Ozs7QUFPRztNQUNVLFlBQVksQ0FBQTtJQUlyQixXQUFZLENBQUEsUUFBMEIsRUFBRSxlQUFxQixFQUFBO0FBQ3pELFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7QUFDekIsUUFBQSxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztLQUMxQztBQUVEOztBQUVHO0lBQ0csZ0JBQWdCLENBQUMsSUFBWSxFQUFFLFVBQW9CLEVBQUE7O0FBQ3JELFlBQUEsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDdkIsT0FBTztBQUNILG9CQUFBLE9BQU8sRUFBRSxLQUFLO0FBQ2Qsb0JBQUEsT0FBTyxFQUFFLG1DQUFtQztpQkFDL0MsQ0FBQzthQUNMO1lBRUQsTUFBTSxPQUFPLEdBQUcsQ0FBUyxNQUFBLEVBQUEsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDdEMsWUFBQSxNQUFNLEtBQUssR0FBZTtBQUN0QixnQkFBQSxFQUFFLEVBQUUsT0FBTztBQUNYLGdCQUFBLElBQUksRUFBRSxJQUFJO0FBQ1YsZ0JBQUEsTUFBTSxFQUFFLFVBQVU7QUFDbEIsZ0JBQUEsWUFBWSxFQUFFLENBQUM7QUFDZixnQkFBQSxTQUFTLEVBQUUsS0FBSztBQUNoQixnQkFBQSxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7QUFDbkMsZ0JBQUEsTUFBTSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7YUFDM0UsQ0FBQztZQUVGLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztZQUV2QyxPQUFPO0FBQ0gsZ0JBQUEsT0FBTyxFQUFFLElBQUk7QUFDYixnQkFBQSxPQUFPLEVBQUUsQ0FBa0IsZUFBQSxFQUFBLElBQUksS0FBSyxVQUFVLENBQUMsTUFBTSxDQUFVLFFBQUEsQ0FBQTtBQUMvRCxnQkFBQSxPQUFPLEVBQUUsT0FBTzthQUNuQixDQUFDO1NBQ0wsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVEOztBQUVHO0lBQ0gsY0FBYyxHQUFBO0FBQ1YsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQztRQUUvQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUMxRixRQUFBLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7S0FDckQ7QUFFRDs7QUFFRztJQUNILG1CQUFtQixHQUFBO0FBQ2YsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDcEMsUUFBQSxJQUFJLENBQUMsS0FBSztBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUM7UUFFeEIsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUM7S0FDbkQ7QUFFRDs7QUFFRztBQUNILElBQUEsY0FBYyxDQUFDLFNBQWlCLEVBQUE7QUFDNUIsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pFLFFBQUEsSUFBSSxDQUFDLEtBQUs7QUFBRSxZQUFBLE9BQU8sS0FBSyxDQUFDO1FBQ3pCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDM0M7QUFFRDs7QUFFRztBQUNILElBQUEsYUFBYSxDQUFDLFNBQWlCLEVBQUE7QUFDM0IsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDcEMsUUFBQSxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU8sSUFBSSxDQUFDO0FBRXhCLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDN0MsT0FBTyxTQUFTLEtBQUssU0FBUyxDQUFDO0tBQ2xDO0FBRUQ7OztBQUdHO0FBQ0csSUFBQSxrQkFBa0IsQ0FBQyxTQUFpQixFQUFBOztBQUN0QyxZQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ1IsZ0JBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO2FBQzNGO1lBRUQsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDdEQsWUFBQSxJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE9BQU87QUFDSCxvQkFBQSxPQUFPLEVBQUUsS0FBSztBQUNkLG9CQUFBLE9BQU8sRUFBRSw0QkFBNEI7QUFDckMsb0JBQUEsYUFBYSxFQUFFLEtBQUs7QUFDcEIsb0JBQUEsT0FBTyxFQUFFLENBQUM7aUJBQ2IsQ0FBQzthQUNMO1lBRUQsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ3JCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDOztZQUdyQyxJQUFJLEtBQUssQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7QUFDM0MsZ0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3BDO1lBRUQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQztZQUMzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztZQUU3RSxPQUFPO0FBQ0gsZ0JBQUEsT0FBTyxFQUFFLElBQUk7QUFDYixnQkFBQSxPQUFPLEVBQUUsQ0FBQSxnQkFBQSxFQUFtQixLQUFLLENBQUMsWUFBWSxDQUFJLENBQUEsRUFBQSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQSxFQUFBLEVBQUssU0FBUyxDQUFBLFlBQUEsRUFBZSxPQUFPLENBQWEsV0FBQSxDQUFBO0FBQ3RILGdCQUFBLGFBQWEsRUFBRSxLQUFLO0FBQ3BCLGdCQUFBLE9BQU8sRUFBRSxDQUFDO2FBQ2IsQ0FBQztTQUNMLENBQUEsQ0FBQTtBQUFBLEtBQUE7QUFFRDs7QUFFRztBQUNXLElBQUEsYUFBYSxDQUFDLEtBQWlCLEVBQUE7OztBQUN6QyxZQUFBLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLEtBQUssQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUU3QyxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUM7QUFDcEIsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUM7QUFFNUIsWUFBQSxNQUFNLE1BQU0sR0FBcUI7Z0JBQzdCLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRTtnQkFDakIsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJO0FBQ3JCLGdCQUFBLFdBQVcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQ2hDLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztBQUM5QixnQkFBQSxRQUFRLEVBQUUsT0FBTzthQUNwQixDQUFDO1lBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXhDLFlBQUEsSUFBSSxNQUFBLElBQUksQ0FBQyxlQUFlLE1BQUUsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsU0FBUyxFQUFFO0FBQ2pDLGdCQUFBLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzdDO1lBRUQsT0FBTztBQUNILGdCQUFBLE9BQU8sRUFBRSxJQUFJO0FBQ2IsZ0JBQUEsT0FBTyxFQUFFLENBQW1CLGdCQUFBLEVBQUEsS0FBSyxDQUFDLElBQUksQ0FBQSxHQUFBLEVBQU0sT0FBTyxDQUFXLFNBQUEsQ0FBQTtBQUM5RCxnQkFBQSxhQUFhLEVBQUUsSUFBSTtBQUNuQixnQkFBQSxPQUFPLEVBQUUsT0FBTzthQUNuQixDQUFDO1NBQ0wsQ0FBQSxDQUFBO0FBQUEsS0FBQTtBQUVEOzs7QUFHRztJQUNHLFVBQVUsR0FBQTs7QUFDWixZQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ1IsZ0JBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQzthQUM3RTtBQUVELFlBQUEsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQztBQUNyQyxZQUFBLE1BQU0sTUFBTSxHQUFHLFNBQVMsR0FBRyxFQUFFLENBQUM7O0FBRzlCLFlBQUEsTUFBTSxNQUFNLEdBQXFCO2dCQUM3QixPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pCLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSTtBQUNyQixnQkFBQSxXQUFXLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ2hDLGdCQUFBLFdBQVcsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtBQUNyQyxnQkFBQSxRQUFRLEVBQUUsTUFBTTthQUNuQixDQUFDO1lBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdkYsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7WUFFbEMsT0FBTztBQUNILGdCQUFBLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxpQkFBaUIsS0FBSyxDQUFDLElBQUksQ0FBVSxPQUFBLEVBQUEsU0FBUyxDQUF1QixvQkFBQSxFQUFBLE1BQU0sQ0FBTyxLQUFBLENBQUE7QUFDM0YsZ0JBQUEsTUFBTSxFQUFFLE1BQU07YUFDakIsQ0FBQztTQUNMLENBQUEsQ0FBQTtBQUFBLEtBQUE7QUFFRDs7QUFFRztJQUNILGdCQUFnQixHQUFBO0FBQ1osUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDcEMsUUFBQSxJQUFJLENBQUMsS0FBSztBQUFFLFlBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFFMUQsT0FBTztZQUNILFNBQVMsRUFBRSxLQUFLLENBQUMsWUFBWTtBQUM3QixZQUFBLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDMUIsWUFBQSxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDO1NBQ3hFLENBQUM7S0FDTDtBQUVEOztBQUVHO0lBQ0gsZUFBZSxHQUFBO0FBQ1gsUUFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDO0tBQ3JDO0FBRUQ7O0FBRUc7SUFDSCxlQUFlLEdBQUE7QUFDWCxRQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUMvRDtBQUVEOztBQUVHO0lBQ0gsZUFBZSxHQUFBO0FBS1gsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNSLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQzdGO0FBRUQsUUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUN6QyxRQUFBLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsS0FBSTtBQUNoRCxZQUFBLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUU7QUFDMUIsZ0JBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsV0FBb0IsRUFBRSxDQUFDO2FBQ2xEO0FBQU0saUJBQUEsSUFBSSxHQUFHLEtBQUssS0FBSyxDQUFDLFlBQVksRUFBRTtBQUNuQyxnQkFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFpQixFQUFFLENBQUM7YUFDL0M7aUJBQU07QUFDSCxnQkFBQSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxRQUFpQixFQUFFLENBQUM7YUFDL0M7QUFDTCxTQUFDLENBQUMsQ0FBQztBQUVILFFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLENBQUM7S0FDM0M7QUFDSjs7QUN0UEQ7Ozs7Ozs7QUFPRztNQUNVLGFBQWEsQ0FBQTtBQUd0QixJQUFBLFdBQUEsQ0FBWSxRQUEwQixFQUFBO0FBQ2xDLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7S0FDNUI7QUFFRDs7QUFFRztBQUNILElBQUEsY0FBYyxDQUFDLFNBQWlCLEVBQUUsTUFBbUIsRUFBRSxPQUFxQixFQUFFLElBQWMsRUFBQTtBQUN4RixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHO0FBQ3BDLFlBQUEsV0FBVyxFQUFFLE1BQU07QUFDbkIsWUFBQSxPQUFPLEVBQUUsT0FBTztBQUNoQixZQUFBLElBQUksRUFBRSxJQUFJO1NBQ2IsQ0FBQztLQUNMO0FBRUQ7O0FBRUc7QUFDSCxJQUFBLGNBQWMsQ0FBQyxTQUFpQixFQUFBO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDO0tBQ3hEO0FBRUQ7O0FBRUc7QUFDSCxJQUFBLGNBQWMsQ0FBQyxNQUEyQixFQUFFLE9BQTZCLEVBQUUsSUFBYyxFQUFBO0FBQ3JGLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUc7QUFDeEIsWUFBQSxZQUFZLEVBQUUsTUFBYTtBQUMzQixZQUFBLGFBQWEsRUFBRSxPQUFjO0FBQzdCLFlBQUEsVUFBVSxFQUFFLElBQUk7U0FDbkIsQ0FBQztLQUNMO0FBRUQ7O0FBRUc7SUFDSCxjQUFjLEdBQUE7QUFDVixRQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7S0FDcEM7QUFFRDs7QUFFRztBQUNILElBQUEsa0JBQWtCLENBQUMsU0FBaUIsRUFBQTtBQUNoQyxRQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDOztBQUcxRCxRQUFBLElBQUksQ0FBQyxXQUFXO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQzs7QUFHOUIsUUFBQSxJQUFJLE9BQU8sQ0FBQyxZQUFZLEtBQUssS0FBSyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRTtBQUNwRixZQUFBLE9BQU8sS0FBSyxDQUFDO1NBQ2hCOztBQUdELFFBQUEsSUFBSSxPQUFPLENBQUMsYUFBYSxLQUFLLEtBQUssSUFBSSxXQUFXLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxhQUFhLEVBQUU7QUFDbEYsWUFBQSxPQUFPLEtBQUssQ0FBQztTQUNoQjs7UUFHRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQVcsS0FBSyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3hGLFlBQUEsSUFBSSxDQUFDLE1BQU07QUFBRSxnQkFBQSxPQUFPLEtBQUssQ0FBQztTQUM3QjtBQUVELFFBQUEsT0FBTyxJQUFJLENBQUM7S0FDZjtBQUVEOztBQUVHO0FBQ0gsSUFBQSxZQUFZLENBQUMsTUFBbUQsRUFBQTtBQUM1RCxRQUFBLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUc7WUFDekIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQy9DLFlBQUEsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDOUMsU0FBQyxDQUFDLENBQUM7S0FDTjtBQUVEOztBQUVHO0lBQ0gsaUJBQWlCLENBQUMsTUFBbUIsRUFBRSxNQUFtRCxFQUFBO0FBQ3RGLFFBQUEsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBRztZQUNyQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDckQsWUFBQSxPQUFPLE1BQU0sSUFBSSxNQUFNLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQztBQUNuRCxTQUFDLENBQUMsQ0FBQztLQUNOO0FBRUQ7O0FBRUc7SUFDSCxrQkFBa0IsQ0FBQyxPQUFxQixFQUFFLE1BQW1ELEVBQUE7QUFDekYsUUFBQSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFHO1lBQ3JCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNyRCxZQUFBLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDO0FBQ2hELFNBQUMsQ0FBQyxDQUFDO0tBQ047QUFFRDs7QUFFRztJQUNILGVBQWUsQ0FBQyxJQUFjLEVBQUUsTUFBbUQsRUFBQTtBQUMvRSxRQUFBLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUc7WUFDckIsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3JELFlBQUEsSUFBSSxDQUFDLE1BQU07QUFBRSxnQkFBQSxPQUFPLEtBQUssQ0FBQztBQUMxQixZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RCxTQUFDLENBQUMsQ0FBQztLQUNOO0FBRUQ7O0FBRUc7SUFDSCxZQUFZLEdBQUE7QUFDUixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHO0FBQ3hCLFlBQUEsWUFBWSxFQUFFLEtBQUs7QUFDbkIsWUFBQSxhQUFhLEVBQUUsS0FBSztBQUNwQixZQUFBLFVBQVUsRUFBRSxFQUFFO1NBQ2pCLENBQUM7S0FDTDtBQUVEOztBQUVHO0lBQ0gsZ0JBQWdCLEdBQUE7QUFDWixRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFFL0IsS0FBSyxNQUFNLFNBQVMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRTtZQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNyRCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBVyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN2RDtRQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUNsQztBQUVEOztBQUVHO0FBQ0gsSUFBQSxjQUFjLENBQUMsU0FBc0QsRUFBQTtRQUtqRSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEtBQUssS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ3pELGFBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxLQUFLLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzFELElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUVyRixPQUFPO1lBQ0gsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNO1lBQ3ZCLFFBQVEsRUFBRSxRQUFRLENBQUMsTUFBTTtBQUN6QixZQUFBLGtCQUFrQixFQUFFLGtCQUFrQjtTQUN6QyxDQUFDO0tBQ0w7QUFFRDs7O0FBR0c7QUFDSCxJQUFBLGtCQUFrQixDQUFDLE1BQTJCLEVBQUE7UUFDMUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEtBQUssTUFBTSxFQUFFO1lBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7U0FDbEQ7YUFBTTtZQUNILElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxNQUFhLENBQUM7U0FDMUQ7S0FDSjtBQUVEOztBQUVHO0FBQ0gsSUFBQSxtQkFBbUIsQ0FBQyxPQUE2QixFQUFBO1FBQzdDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsYUFBYSxLQUFLLE9BQU8sRUFBRTtZQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDO1NBQ25EO2FBQU07WUFDSCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEdBQUcsT0FBYyxDQUFDO1NBQzVEO0tBQ0o7QUFFRDs7QUFFRztBQUNILElBQUEsU0FBUyxDQUFDLEdBQVcsRUFBQTtBQUNqQixRQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUQsUUFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7QUFDVixZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3ZEO2FBQU07WUFDSCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2xEO0tBQ0o7QUFDSjs7QUNwTUQ7QUFDTyxNQUFNLGdCQUFnQixHQUFhLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUNsSSxNQUFNLFdBQVcsR0FBZTtJQUNuQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzFGLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtJQUM1RixFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0lBQzNGLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUU7SUFDNUYsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFO0lBQ25HLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVB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O2FBQ3ZGOztBQUdELFlBQUEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUcsRUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBLENBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUMxSSxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFHLEVBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFFLENBQUEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUM3RyxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFBLEVBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQ3pELFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUEsRUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUEsQ0FBRSxDQUFDLENBQUM7O0FBR2hFLFlBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztZQUNyRCxNQUFNLFFB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
