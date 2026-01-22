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
                info.innerHTML = `<code style="color:#aa64ff">${q.id}</code><br>Type: ${q.type === "survey" ? "Survey" : "Deep Dive"} | Words: ${q.wordCount}/${q.wordLimit}`;
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
class VictoryModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("sisy-victory-modal");
        // Epic Title
        contentEl.createEl("h1", { text: "ASCENSION ACHIEVED", cls: "sisy-victory-title" });
        // [FIXED] style moved to attr
        contentEl.createEl("div", { text: "🏆", attr: { style: "font-size: 60px; margin: 20px 0;" } });
        // Stats Container
        const stats = contentEl.createDiv();
        const legacy = this.plugin.settings.legacy;
        const metrics = this.plugin.engine.getGameStats();
        this.statLine(stats, "Final Level", "50");
        this.statLine(stats, "Total Quests", `${metrics.totalQuests}`);
        this.statLine(stats, "Deaths Endured", `${legacy.deathCount}`);
        this.statLine(stats, "Longest Streak", `${metrics.longestStreak} days`);
        // Message
        // [FIXED] style moved to attr
        contentEl.createEl("p", {
            text: "One must imagine Sisyphus happy. You have pushed the boulder to the peak.",
            attr: { style: "margin: 30px 0; font-style: italic; opacity: 0.8;" }
        });
        // Continue Button
        const btn = contentEl.createEl("button", { text: "BEGIN NEW GAME+" });
        btn.addClass("mod-cta");
        btn.style.width = "100%";
        btn.onclick = () => {
            this.close();
            // Optional: Trigger Prestige/New Game+ logic here if desired
        };
    }
    statLine(el, label, val) {
        const line = el.createDiv({ cls: "sisy-victory-stat" });
        line.innerHTML = `${label}: <span class="sisy-victory-highlight">${val}</span>`;
    }
    onClose() {
        this.contentEl.empty();
    }
}
// [APPEND TO src/ui/modals.ts]
class QuickCaptureModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚡ Quick Capture" });
        const div = contentEl.createDiv();
        const input = div.createEl("input", {
            type: "text",
            attr: {
                placeholder: "What's on your mind?",
                style: "width: 100%; padding: 10px; font-size: 1.2em; background: #222; border: 1px solid #444; color: #e0e0e0;"
            }
        });
        input.focus();
        // Handle Enter Key
        input.addEventListener("keypress", (e) => __awaiter(this, void 0, void 0, function* () {
            if (e.key === "Enter" && input.value.trim().length > 0) {
                yield this.plugin.engine.createScrap(input.value);
                this.close();
            }
        }));
        const btn = contentEl.createEl("button", { text: "Capture to Scraps" });
        btn.addClass("mod-cta");
        btn.setAttribute("style", "margin-top: 15px; width: 100%;");
        btn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            if (input.value.trim().length > 0) {
                yield this.plugin.engine.createScrap(input.value);
                this.close();
            }
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ConfirmModal extends obsidian.Modal {
    constructor(app, title, message, onConfirm) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.message });
        const div = contentEl.createDiv({ cls: "sisy-controls" });
        div.style.marginTop = "20px";
        div.style.justifyContent = "flex-end";
        const btnCancel = div.createEl("button", { text: "Cancel" });
        btnCancel.onclick = () => this.close();
        const btnConfirm = div.createEl("button", { text: "Confirm", cls: "mod-cta" });
        btnConfirm.style.backgroundColor = "#ff5555"; // Red for danger
        btnConfirm.style.color = "white";
        btnConfirm.onclick = () => {
            this.onConfirm();
            this.close();
        };
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

class ResearchEngine {
    constructor(settings, app, audioController) {
        this.settings = settings;
        this.app = app;
        this.audioController = audioController;
    }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // [FIX] Allow first research quest for free (Cold Start), otherwise enforce 2:1
            if (this.settings.researchStats.totalResearch > 0 && !this.canCreateResearchQuest()) {
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
            // [FIX] Create actual Markdown file
            const folderPath = "Active_Run/Research";
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                yield this.app.vault.createFolder(folderPath);
            }
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${folderPath}/${safeTitle}.md`;
            const content = `---
type: research
research_id: ${questId}
status: active
linked_skill: ${linkedSkill}
word_limit: ${wordLimit}
created: ${new Date().toISOString()}
---
# 📚 ${title}
> [!INFO] Research Guidelines
> **Type:** ${type} | **Target:** ${wordLimit} words
> **Linked Skill:** ${linkedSkill}

Write your research here...
`;
            try {
                yield this.app.vault.create(filename, content);
            }
            catch (e) {
                new obsidian.Notice("Error creating research file. Check console.");
                console.error(e);
            }
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
            this.settings.researchStats.totalResearch++;
            return {
                success: true,
                message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"}`,
                questId: questId
            };
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest)
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        if (researchQuest.completed)
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return { success: false, message: `Too short! Need ${minWords} words.`, xpReward: 0, goldPenalty: 0 };
        }
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return { success: false, message: `Too long! Max ${Math.ceil(researchQuest.wordLimit * 1.25)} words.`, xpReward: 0, goldPenalty: 0 };
        }
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            goldPenalty = Math.floor(20 * (overagePercent / 100));
        }
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound)
            this.audioController.playSound("success");
        let message = `Research Complete! +${xpReward} XP`;
        if (goldPenalty > 0)
            message += ` (-${goldPenalty}g tax)`;
        return { success: true, message, xpReward, goldPenalty };
    }
    deleteResearchQuest(questId) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.settings.researchQuests.findIndex(q => q.id === questId);
            if (index !== -1) {
                const quest = this.settings.researchQuests[index];
                // [FIX] Try to find and delete the file
                const files = this.app.vault.getMarkdownFiles();
                const file = files.find(f => {
                    var _a;
                    const cache = this.app.metadataCache.getFileCache(f);
                    return ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) === questId;
                });
                if (file) {
                    yield this.app.vault.delete(file);
                }
                this.settings.researchQuests.splice(index, 1);
                if (!quest.completed)
                    this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
                else
                    this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
                return { success: true, message: "Research deleted" };
            }
            return { success: false, message: "Not found" };
        });
    }
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return { combat: stats.totalCombat, research: stats.totalResearch, ratio: ratio.toFixed(2) };
    }
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
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
const BOSS_DATA = {
    10: { name: "The Gatekeeper", desc: "The first major filter.", hp_pen: 20 },
    20: { name: "The Shadow Self", desc: "Your own bad habits manifest.", hp_pen: 30 },
    30: { name: "The Mountain", desc: "The peak is visible.", hp_pen: 40 },
    50: { name: "Sisyphus Prime", desc: "One must imagine Sisyphus happy.", hp_pen: 99 }
};
const MISSION_POOL = [
    { id: "morning_win", name: "☀️ Morning Win", desc: "Complete 1 Trivial quest before 10 AM", target: 1, reward: { xp: 0, gold: 15 }, check: "morning_trivial" },
    { id: "momentum", name: "🔥 Momentum", desc: "Complete 3 quests today", target: 3, reward: { xp: 20, gold: 0 }, check: "quest_count" },
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all files in 'Scraps'", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_inbox" }, // [FIX] Correct check ID
    { id: "specialist", name: "🎯 Specialist", desc: "Use the same skill 3 times", target: 3, reward: { xp: 15, gold: 0 }, check: "skill_repeat" },
    { id: "high_stakes", name: "💪 High Stakes", desc: "Complete 1 High Stakes quest", target: 1, reward: { xp: 0, gold: 30 }, check: "high_stakes" },
    { id: "speed_demon", name: "⚡ Speed Demon", desc: "Complete quest within 2h of creation", target: 1, reward: { xp: 25, gold: 0 }, check: "fast_complete" },
    { id: "synergist", name: "🔗 Synergist", desc: "Complete quest with Primary + Secondary skill", target: 1, reward: { xp: 0, gold: 10 }, check: "synergy" },
    { id: "survivor", name: "🛡️ Survivor", desc: "Don't take any damage today", target: 1, reward: { xp: 0, gold: 20 }, check: "no_damage" },
    { id: "risk_taker", name: "🎲 Risk Taker", desc: "Complete Difficulty 4+ quest", target: 1, reward: { xp: 15, gold: 0 }, check: "hard_quest" }
];
class SisyphusEngine extends TinyEmitter {
    constructor(app, plugin, audio) {
        super();
        // [FEATURE] Undo Buffer
        this.deletedQuestBuffer = [];
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.app, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () { yield this.plugin.saveSettings(); this.trigger("update"); });
    }
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
        let justFinishedAll = false;
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                // [FIX] Zero Inbox Logic
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof obsidian.TFolder) {
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    }
                    else {
                        mission.progress = 1;
                    }
                    break;
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
                    if (context.type === "complete" && context.questCreated && obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours') <= 2)
                        mission.progress++;
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
                        mission.progress = Math.max(0, ...Object.values(this.settings.skillUsesToday));
                    }
                    break;
            }
            if (mission.progress >= mission.target && !mission.completed) {
                mission.completed = true;
                this.settings.xp += mission.reward.xp;
                this.settings.gold += mission.reward.gold;
                new obsidian.Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
                // Check if this was the last one
                if (this.settings.dailyMissions.every(m => m.completed))
                    justFinishedAll = true;
            }
        });
        // [FIX] Award Bonus Gold
        if (justFinishedAll) {
            this.settings.gold += 50;
            new obsidian.Notice("🎉 All Missions Complete! +50 Bonus Gold");
            this.audio.playSound("success");
        }
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        const map = { "Trivial": 1, "Easy": 2, "Medium": 3, "Hard": 4, "SUICIDE": 5 };
        return map[diffLabel] || 3;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(this.settings.lastLogin), 'days');
                if (daysDiff > 2) {
                    const rotDamage = (daysDiff - 1) * 10;
                    if (rotDamage > 0) {
                        this.settings.hp -= rotDamage;
                        this.settings.history.push({ date: today, status: "rot", xpEarned: -rotDamage });
                    }
                }
            }
            if (this.settings.lastLogin !== today) {
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = Math.min(this.settings.maxHp, this.settings.hp + 20);
                this.settings.damageTakenToday = 0;
                this.settings.lockdownUntil = "";
                this.settings.lastLogin = today;
                // Rust Logic
                const todayMoment = obsidian.moment();
                this.settings.skills.forEach(s => {
                    if (s.lastUsed) {
                        if (todayMoment.diff(obsidian.moment(s.lastUsed), 'days') > 3 && !this.isResting()) {
                            s.rust = Math.min(10, (s.rust || 0) + 1);
                            s.xpReq = Math.floor(s.xpReq * 1.1);
                        }
                    }
                });
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
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            const questName = file.basename;
            if (this.chainsEngine.isQuestInChain(questName)) {
                const canStart = this.chainsEngine.canStartQuest(questName);
                if (!canStart) {
                    new obsidian.Notice("Locked by Chain.");
                    return;
                }
                yield this.chainsEngine.completeChainQuest(questName);
            }
            if (fm.is_boss) {
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    const result = this.analyticsEngine.defeatBoss(level);
                    new obsidian.Notice(result.message);
                    if (this.settings.gameWon)
                        new VictoryModal(this.app, this.plugin).open();
                }
            }
            this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
            this.settings.researchStats.totalCombat++;
            let xp = (fm.xp_reward || 20) * this.settings.dailyModifier.xpMult;
            let gold = (fm.gold_reward || 0) * this.settings.dailyModifier.goldMult;
            const skillName = fm.skill || "None";
            const skill = this.settings.skills.find(s => s.name === skillName);
            if (skill) {
                skill.rust = 0;
                skill.xpReq = Math.floor(skill.xpReq / 1.1);
                skill.lastUsed = new Date().toISOString();
                skill.xp += 1;
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Leveled Up!`);
                }
            }
            const secondary = fm.secondary_skill || "None";
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
            this.settings.xp += xp;
            this.settings.gold += gold;
            // [FIX] Adrenaline self-damage counting toward lockdown
            if (this.settings.dailyModifier.name === "Adrenaline") {
                this.settings.hp -= 5;
                this.settings.damageTakenToday += 5;
                if (this.settings.damageTakenToday > 50 && !this.meditationEngine.isLockedDown()) {
                    this.meditationEngine.triggerLockdown();
                    this.trigger("lockdown");
                    new obsidian.Notice("Overexertion! LOCKDOWN INITIATED.");
                }
            }
            this.audio.playSound("success");
            if (this.settings.xp >= this.settings.xpReq) {
                this.settings.level++;
                this.settings.xp = 0;
                this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1);
                this.settings.maxHp = 100 + (this.settings.level * 5);
                this.settings.hp = this.settings.maxHp;
                this.taunt("level_up");
                const msgs = this.analyticsEngine.checkBossMilestones();
                msgs.forEach(m => new obsidian.Notice(m));
                if ([10, 20, 30, 50].includes(this.settings.level))
                    this.spawnBoss(this.settings.level);
            }
            this.settings.questsCompletedToday++;
            this.analyticsEngine.updateStreak();
            this.checkDailyMissions({
                type: "complete",
                difficulty: this.getDifficultyNumber(fm.difficulty),
                skill: skillName,
                secondarySkill: secondary,
                highStakes: fm.high_stakes
            });
            const archivePath = "Active_Run/Archive";
            if (!this.app.vault.getAbstractFileByPath(archivePath))
                yield this.app.vault.createFolder(archivePath);
            yield this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
            yield this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
            yield this.save();
        });
    }
    spawnBoss(level) {
        return __awaiter(this, void 0, void 0, function* () {
            const boss = BOSS_DATA[level];
            if (!boss)
                return;
            this.audio.playSound("heartbeat");
            new obsidian.Notice("⚠️ ANOMALY DETECTED...", 2000);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                this.audio.playSound("death");
                new obsidian.Notice(`☠️ BOSS SPAWNED: ${boss.name}`);
                yield this.createQuest(`BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None", obsidian.moment().add(3, 'days').toISOString(), true, "Critical", true);
            }), 3000);
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            var _a;
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("Rest Day protection.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice("Shielded!");
                return;
            }
            let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
            // [FIX] Apply Boss Penalty
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (fm === null || fm === void 0 ? void 0 : fm.is_boss) {
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    if (BOSS_DATA[level]) {
                        damage += BOSS_DATA[level].hp_pen;
                        new obsidian.Notice(`☠️ Boss Crush: +${BOSS_DATA[level].hp_pen} Damage`);
                    }
                }
            }
            if (this.settings.gold < 0)
                damage *= 2;
            this.settings.hp -= damage;
            this.settings.damageTakenToday += damage;
            if (!manualAbort)
                this.settings.rivalDmg += 1;
            this.audio.playSound("fail");
            this.checkDailyMissions({ type: "damage" });
            if (this.settings.damageTakenToday > 50) {
                this.meditationEngine.triggerLockdown();
                this.trigger("lockdown");
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
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
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            if (highStakes && !isBoss)
                goldReward = Math.floor(goldReward * 1.5);
            const rootPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
            const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const content = `---
type: quest
status: active
difficulty: ${diffLabel}
priority: ${priority}
xp_reward: ${xpReward}
gold_reward: ${goldReward}
skill: ${skill}
secondary_skill: ${secSkill}
high_stakes: ${highStakes ? 'true' : 'false'}
is_boss: ${isBoss}
created: ${new Date().toISOString()}
deadline: ${deadlineIso}
---
# ⚔️ ${name}`;
            yield this.app.vault.create(`${rootPath}/${safeName}.md`, content);
            this.audio.playSound("click");
            this.save();
        });
    }
    // [FEATURE] Undo Deletion System
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // Read and buffer for undo
            try {
                const content = yield this.app.vault.read(file);
                this.deletedQuestBuffer.push({
                    name: file.name,
                    content: content,
                    path: file.path,
                    deletedAt: Date.now()
                });
                // Keep buffer small (max 5 items)
                if (this.deletedQuestBuffer.length > 5)
                    this.deletedQuestBuffer.shift();
            }
            catch (e) {
                console.error("Buffer fail", e);
            }
            yield this.app.vault.delete(file);
            this.save();
        });
    }
    undoLastDeletion() {
        return __awaiter(this, void 0, void 0, function* () {
            const last = this.deletedQuestBuffer.pop();
            if (!last) {
                new obsidian.Notice("Nothing to undo.");
                return;
            }
            // Prevent undoing if > 60 seconds (optional, but good for anti-cheese)
            if (Date.now() - last.deletedAt > 60000) {
                new obsidian.Notice("Too late to undo.");
                return;
            }
            try {
                yield this.app.vault.create(last.path, last.content);
                new obsidian.Notice(`Restored: ${last.name}`);
            }
            catch (e) {
                new obsidian.Notice("Could not restore file (path may be taken).");
            }
        });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            // [FIX] Constant Zero Inbox Check
            const zeroInbox = this.settings.dailyMissions.find(m => m.checkFunc === "zero_inbox" && !m.completed);
            if (zeroInbox) {
                const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                if (scraps instanceof obsidian.TFolder && scraps.children.length === 0) {
                    // Complete mission via standard check to trigger rewards
                    this.checkDailyMissions({ type: "check" });
                }
            }
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
    rollChaos() {
        return __awaiter(this, arguments, void 0, function* (showModal = false) {
            const roll = Math.random();
            if (roll < 0.4)
                this.settings.dailyModifier = DEFAULT_MODIFIER;
            else {
                const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
                this.settings.dailyModifier = CHAOS_TABLE[idx];
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
        });
    }
    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil)); }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
            if (res.success)
                new obsidian.Notice(res.message);
            else
                new obsidian.Notice(res.message);
            yield this.save();
        });
    }
    completeResearchQuest(id, words) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    deleteResearchQuest(id) { this.researchEngine.deleteResearchQuest(id); this.save(); }
    updateResearchWordCount(id, words) { this.researchEngine.updateResearchWordCount(id, words); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () { const r = this.meditationEngine.meditate(); new obsidian.Notice(r.message); yield this.save(); });
    }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    createScrap(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = "Scraps";
            if (!this.app.vault.getAbstractFileByPath(folderPath))
                yield this.app.vault.createFolder(folderPath);
            const timestamp = obsidian.moment().format("YYYY-MM-DD HH-mm-ss");
            yield this.app.vault.create(`${folderPath}/${timestamp}.md`, content);
            new obsidian.Notice("⚡ Scrap Captured");
            this.audio.playSound("click");
        });
    }
    generateSkillGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const skills = this.settings.skills;
            if (skills.length === 0) {
                new obsidian.Notice("No neural nodes found.");
                return;
            }
            const nodes = [];
            const edges = [];
            const width = 250;
            const height = 140;
            const radius = Math.max(400, skills.length * 60);
            const centerX = 0;
            const centerY = 0;
            const angleStep = (2 * Math.PI) / skills.length;
            skills.forEach((skill, index) => {
                const angle = index * angleStep;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                let color = "4";
                if (skill.rust > 0)
                    color = "1";
                else if (skill.level >= 10)
                    color = "6";
                const statusIcon = skill.rust > 0 ? "⚠️ RUSTY" : "🟢 ACTIVE";
                const progress = Math.floor((skill.xp / skill.xpReq) * 100);
                const text = `## ${skill.name}\n**Lv ${skill.level}**\n${statusIcon}\nXP: ${skill.xp}/${skill.xpReq} (${progress}%)`;
                nodes.push({ id: skill.name, x: Math.floor(x), y: Math.floor(y), width, height, type: "text", text, color });
            });
            skills.forEach(skill => {
                if (skill.connections) {
                    skill.connections.forEach(targetName => {
                        if (skills.find(s => s.name === targetName)) {
                            edges.push({ id: `${skill.name}-${targetName}`, fromNode: skill.name, fromSide: "right", toNode: targetName, toSide: "left", color: "4" });
                        }
                    });
                }
            });
            const canvasData = { nodes, edges };
            const path = "Active_Run/Neural_Hub.canvas";
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof obsidian.TFile) {
                yield this.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub updated.");
            }
            else {
                yield this.app.vault.create(path, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub created.");
            }
        });
    }
    createQuestChain(name, quests) {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.createQuestChain(name, quests); yield this.save(); });
    }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.breakChain(); yield this.save(); });
    }
    setFilterState(energy, context, tags) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
    taunt(trigger) {
        const msgs = {
            "fail": ["Pathetic.", "Try again.", "Is that all?"],
            "level_up": ["Power overwhelming.", "Ascending."],
            "low_hp": ["Bleeding out...", "Hold on."]
        };
        const msg = msgs[trigger] ? msgs[trigger][Math.floor(Math.random() * msgs[trigger].length)] : "Observe.";
        new obsidian.Notice(`SYSTEM: ${msg}`);
    }
    parseQuickInput(text) {
        const match = text.match(/(.+?)\s*\/(\d)/);
        if (match) {
            this.createQuest(match[1], parseInt(match[2]), "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
        else {
            this.createQuest(text, 3, "None", "None", obsidian.moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
    }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            // [FIX] Archive active files to Graveyard
            const activeFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            const graveFolder = "Graveyard/Deaths/" + obsidian.moment().format("YYYY-MM-DD-HHmm");
            if (!this.app.vault.getAbstractFileByPath(graveFolder))
                yield this.app.vault.createFolder(graveFolder);
            if (activeFolder instanceof obsidian.TFolder) {
                for (const file of activeFolder.children) {
                    if (file instanceof obsidian.TFile) {
                        yield this.app.fileManager.renameFile(file, `${graveFolder}/${file.name}`);
                    }
                }
            }
            this.settings.level = 1;
            this.settings.hp = 100;
            this.settings.gold = 0;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            yield this.save();
        });
    }
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
            // [NEW] DEBT WARNING
            if (this.plugin.settings.gold < 0) {
                const d = scroll.createDiv({ cls: "sisy-alert sisy-alert-debt" });
                d.createEl("h3", { text: "⚠️ DEBT CRISIS ACTIVE" });
                d.createEl("p", { text: "ALL DAMAGE RECEIVED IS DOUBLED." });
                // [FIXED] style moved to attr
                d.createEl("p", {
                    text: `Current Balance: ${this.plugin.settings.gold}g`,
                    attr: { style: "font-weight:bold" }
                });
            }
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
                card.createEl("div", { text: `ID: ${quest.id}` }).setAttribute("style", "font-family:monospace; font-size:0.8em; color:#aa64ff; opacity:0.8; margin-bottom:4px;");
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
                // [FIX] Apply filters using the filter engine
                let files = folder.children.filter(f => f instanceof obsidian.TFile);
                files = this.plugin.engine.filtersEngine.filterQuests(files);
                // Sort by deadline
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
                    // [FIX] Deletion Warning Logic
                    const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        const quota = this.plugin.engine.meditationEngine.getDeletionQuota();
                        if (quota.free === 0) {
                            new ConfirmModal(this.app, "Paid Deletion Warning", `You have 0 free deletions left. This will cost 10g. Continue?`, () => {
                                // Just delete; engine handles cost logic if integrated, 
                                // or simply allow deletion as before but with warning.
                                this.plugin.engine.deleteQuest(file);
                                this.refresh();
                            }).open();
                        }
                        else {
                            this.plugin.engine.deleteQuest(file);
                            this.refresh();
                        }
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
            this.addCommand({
                id: 'deploy-quest-hotkey',
                name: 'Deploy Quest',
                hotkeys: [{ modifiers: ["Mod"], key: "d" }],
                callback: () => new ResearchQuestModal(this.app, this).open() // Assuming default is Research or Quest Modal?
                // Actually, we should map this to QuestModal, but you didn't export QuestModal in modals.ts properly in the snippet. 
                // Assuming QuestModal is available or we use ResearchQuestModal. 
                // Reverting to ResearchQuestModal as per your import list, 
                // OR if you have QuestModal imported, use that.
                // Let's assume you want the standard Quest creation:
                // callback: () => new QuestModal(this.app, this).open()
            });
            this.addCommand({
                id: 'undo-quest-delete',
                name: 'Undo Last Quest Deletion',
                hotkeys: [{ modifiers: ["Mod", "Shift"], key: "z" }],
                callback: () => this.engine.undoLastDeletion()
            });
            this.addCommand({
                id: 'export-stats',
                name: 'Analytics: Export Stats JSON',
                callback: () => __awaiter(this, void 0, void 0, function* () {
                    const stats = this.engine.getGameStats();
                    const path = `Sisyphus_Stats_${Date.now()}.json`;
                    yield this.app.vault.create(path, JSON.stringify(stats, null, 2));
                    new obsidian.Notice(`Stats exported to ${path}`);
                })
            });
            this.addCommand({
                id: 'accept-death',
                name: 'ACCEPT DEATH (Reset Run)',
                callback: () => this.engine.triggerDeath()
            });
            this.addCommand({
                id: 'reroll-chaos',
                name: 'Reroll Chaos',
                callback: () => this.engine.rollChaos(true)
            });
            this.addCommand({
                id: 'quick-capture',
                name: 'Quick Capture (Scrap)',
                callback: () => new QuickCaptureModal(this.app, this).open()
            });
            this.addCommand({
                id: 'generate-skill-graph',
                name: 'Neural Hub: Generate Skill Graph',
                callback: () => this.engine.generateSkillGraph()
            });
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            window.sisyphusEngine = this.engine;
            yield this.engine.checkDailyLogin();
            this.updateStatusBar();
            // --- COMMANDS ---
            this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon', callback: () => this.activateView() });
            this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Audio', callback: () => this.audio.toggleBrownNoise() });
            this.addCommand({ id: 'create-research', name: 'Research: Create Quest', callback: () => new ResearchQuestModal(this.app, this).open() });
            this.addCommand({ id: 'view-research', name: 'Research: View Library', callback: () => new ResearchListModal(this.app, this).open() });
            this.addCommand({ id: 'meditate', name: 'Meditation: Start', callback: () => this.engine.startMeditation() });
            this.addCommand({ id: 'create-chain', name: 'Chains: Create', callback: () => new ChainBuilderModal(this.app, this).open() });
            this.addCommand({ id: 'view-chains', name: 'Chains: View Active', callback: () => { const c = this.engine.getActiveChain(); new obsidian.Notice(c ? `Active: ${c.name}` : "No active chain"); } });
            this.addCommand({ id: 'filter-high', name: 'Filters: High Energy', callback: () => this.engine.setFilterState("high", "any", []) });
            this.addCommand({ id: 'clear-filters', name: 'Filters: Clear', callback: () => this.engine.clearFilters() });
            this.addCommand({ id: 'game-stats', name: 'Analytics: Stats', callback: () => { const s = this.engine.getGameStats(); new obsidian.Notice(`Lvl ${s.level} | Streak ${s.currentStreak}`); } });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
            // [FIX] Debounced Word Counter (Typewriter Fix)
            const debouncedUpdate = obsidian.debounce((file, content) => {
                var _a;
                const cache = this.app.metadataCache.getFileCache(file);
                if ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) {
                    const words = content.trim().split(/\s+/).length;
                    this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
                }
            }, 1000, true);
            this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
                if (!info || !info.file)
                    return;
                debouncedUpdate(info.file, editor.getValue());
            }));
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
            if (leaves.length > 0)
                leaf = leaves[0];
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    updateStatusBar() {
        const shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const mCount = this.settings.dailyMissions.filter(m => m.completed).length;
        this.statusBarItem.setText(`${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp} G${this.settings.gold} M${mCount}/3`);
        this.statusBarItem.style.color = this.settings.hp < 30 ? "red" : this.settings.gold < 0 ? "orange" : "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () { this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData()); });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvZW5naW5lcy9BbmFseXRpY3NFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvUmVzZWFyY2hFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9DaGFpbnNFbmdpbmUudHMiLCJzcmMvZW5naW5lcy9GaWx0ZXJzRW5naW5lLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIEVWRU5UIEJVUyBTWVNURU1cbmV4cG9ydCBjbGFzcyBUaW55RW1pdHRlciB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnM6IHsgW2tleTogc3RyaW5nXTogRnVuY3Rpb25bXSB9ID0ge307XG5cbiAgICBvbihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkucHVzaChmbik7XG4gICAgfVxuXG4gICAgb2ZmKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0uZmlsdGVyKGYgPT4gZiAhPT0gZm4pO1xuICAgIH1cblxuICAgIHRyaWdnZXIoZXZlbnQ6IHN0cmluZywgZGF0YT86IGFueSkge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5mb3JFYWNoKGZuID0+IGZuKGRhdGEpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuNCk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAwLjE7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPTiAoQnJvd24gTm9pc2UpXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU2V0dGluZywgTm90aWNlLCBtb21lbnQsIFRGaWxlLCBURm9sZGVyIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nOyAvLyBGaXg6IERlZmF1bHQgSW1wb3J0XG5pbXBvcnQgeyBNb2RpZmllciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIENoYW9zTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIG1vZGlmaWVyOiBNb2RpZmllcjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIG06IE1vZGlmaWVyKSB7IHN1cGVyKGFwcCk7IHRoaXMubW9kaWZpZXI9bTsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCBjID0gdGhpcy5jb250ZW50RWw7IFxuICAgICAgICBjb25zdCBoMSA9IGMuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiVEhFIE9NRU5cIiB9KTsgXG4gICAgICAgIGgxLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjsgY29sb3I6I2Y1NTtcIik7IFxuICAgICAgICBjb25zdCBpYyA9IGMuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLmljb24gfSk7IFxuICAgICAgICBpYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiZm9udC1zaXplOjgwcHg7IHRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IGgyID0gYy5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5uYW1lIH0pOyBcbiAgICAgICAgaDIuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyO1wiKTsgXG4gICAgICAgIGNvbnN0IHAgPSBjLmNyZWF0ZUVsKFwicFwiLCB7dGV4dDogdGhpcy5tb2RpZmllci5kZXNjfSk7IFxuICAgICAgICBwLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlclwiKTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiQWNrbm93bGVkZ2VcIn0pOyBcbiAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiLnN0eWxlLmRpc3BsYXk9XCJibG9ja1wiOyBcbiAgICAgICAgYi5zdHlsZS5tYXJnaW49XCIyMHB4IGF1dG9cIjsgXG4gICAgICAgIGIub25jbGljaz0oKT0+dGhpcy5jbG9zZSgpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTaG9wTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIvCfm5IgQkxBQ0sgTUFSS0VUXCIgfSk7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFB1cnNlOiDwn6qZICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gIH0pOyBcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SiSBTdGltcGFja1wiLCBcIkhlYWwgMjAgSFBcIiwgNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCArIDIwKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KjIFNhYm90YWdlXCIsIFwiLTUgUml2YWwgRG1nXCIsIDIwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nID0gTWF0aC5tYXgoNSwgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgLSA1KTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5uh77iPIFNoaWVsZFwiLCBcIjI0aCBQcm90ZWN0aW9uXCIsIDE1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+YtCBSZXN0IERheVwiLCBcIlNhZmUgZm9yIDI0aFwiLCAxMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXN0RGF5VW50aWwgPSBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCk7IFxuICAgICAgICB9KTsgXG4gICAgfSBcbiAgICBpdGVtKGVsOiBIVE1MRWxlbWVudCwgbmFtZTogc3RyaW5nLCBkZXNjOiBzdHJpbmcsIGNvc3Q6IG51bWJlciwgZWZmZWN0OiAoKSA9PiBQcm9taXNlPHZvaWQ+KSB7IFxuICAgICAgICBjb25zdCBjID0gZWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBjLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjsgcGFkZGluZzoxMHB4IDA7IGJvcmRlci1ib3R0b206MXB4IHNvbGlkICMzMzM7XCIpOyBcbiAgICAgICAgY29uc3QgaSA9IGMuY3JlYXRlRGl2KCk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiYlwiLCB7IHRleHQ6IG5hbWUgfSk7IFxuICAgICAgICBpLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogZGVzYyB9KTsgXG4gICAgICAgIGNvbnN0IGIgPSBjLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogYCR7Y29zdH0gR2AgfSk7IFxuICAgICAgICBpZih0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgY29zdCkgeyBcbiAgICAgICAgICAgIGIuc2V0QXR0cmlidXRlKFwiZGlzYWJsZWRcIixcInRydWVcIik7IGIuc3R5bGUub3BhY2l0eT1cIjAuNVwiOyBcbiAgICAgICAgfSBlbHNlIHsgXG4gICAgICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgICAgICBiLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgLT0gY29zdDsgXG4gICAgICAgICAgICAgICAgYXdhaXQgZWZmZWN0KCk7IFxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYEJvdWdodCAke25hbWV9YCk7IFxuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICAgICAgbmV3IFNob3BNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBuYW1lOiBzdHJpbmc7IGRpZmZpY3VsdHk6IG51bWJlciA9IDM7IHNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgc2VjU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBkZWFkbGluZTogc3RyaW5nID0gXCJcIjsgaGlnaFN0YWtlczogYm9vbGVhbiA9IGZhbHNlOyBpc0Jvc3M6IGJvb2xlYW4gPSBmYWxzZTsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqU77iPIERFUExPWU1FTlRcIiB9KTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJPYmplY3RpdmVcIikuYWRkVGV4dCh0ID0+IHsgXG4gICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5uYW1lID0gdik7IFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApOyBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGlmZmljdWx0eVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9uKFwiMVwiLFwiVHJpdmlhbFwiKS5hZGRPcHRpb24oXCIyXCIsXCJFYXN5XCIpLmFkZE9wdGlvbihcIjNcIixcIk1lZGl1bVwiKS5hZGRPcHRpb24oXCI0XCIsXCJIYXJkXCIpLmFkZE9wdGlvbihcIjVcIixcIlNVSUNJREVcIikuc2V0VmFsdWUoXCIzXCIpLm9uQ2hhbmdlKHY9PnRoaXMuZGlmZmljdWx0eT1wYXJzZUludCh2KSkpOyBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07IFxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTsgXG4gICAgICAgIHNraWxsc1tcIisgTmV3XCJdID0gXCIrIE5ld1wiOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlByaW1hcnkgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLm9uQ2hhbmdlKHYgPT4geyBcbiAgICAgICAgICAgIGlmKHY9PT1cIisgTmV3XCIpeyB0aGlzLmNsb3NlKCk7IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCx0aGlzLnBsdWdpbikub3BlbigpOyB9IGVsc2UgdGhpcy5za2lsbD12OyBcbiAgICAgICAgfSkpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlN5bmVyZ3kgTm9kZVwiKS5hZGREcm9wZG93bihkID0+IGQuYWRkT3B0aW9ucyhza2lsbHMpLnNldFZhbHVlKFwiTm9uZVwiKS5vbkNoYW5nZSh2ID0+IHRoaXMuc2VjU2tpbGwgPSB2KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlYWRsaW5lXCIpLmFkZFRleHQodCA9PiB7IHQuaW5wdXRFbC50eXBlID0gXCJkYXRldGltZS1sb2NhbFwiOyB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5kZWFkbGluZSA9IHYpOyB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiSGlnaCBTdGFrZXNcIikuc2V0RGVzYyhcIkRvdWJsZSBHb2xkIC8gRG91YmxlIERhbWFnZVwiKS5hZGRUb2dnbGUodD0+dC5zZXRWYWx1ZShmYWxzZSkub25DaGFuZ2Uodj0+dGhpcy5oaWdoU3Rha2VzPXYpKTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLmFkZEJ1dHRvbihiID0+IGIuc2V0QnV0dG9uVGV4dChcIkRlcGxveVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHsgXG4gICAgICAgICAgICBpZih0aGlzLm5hbWUpe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdCh0aGlzLm5hbWUsdGhpcy5kaWZmaWN1bHR5LHRoaXMuc2tpbGwsdGhpcy5zZWNTa2lsbCx0aGlzLmRlYWRsaW5lLHRoaXMuaGlnaFN0YWtlcywgXCJOb3JtYWxcIiwgdGhpcy5pc0Jvc3MpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxNYW5hZ2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkFkZCBOZXcgTm9kZVwiIH0pOyBcbiAgICAgICAgbGV0IG49XCJcIjsgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5vZGUgTmFtZVwiKS5hZGRUZXh0KHQ9PnQub25DaGFuZ2Uodj0+bj12KSkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIkNyZWF0ZVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jKCk9PntcbiAgICAgICAgICAgIGlmKG4pe1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5wdXNoKHtuYW1lOm4sbGV2ZWw6MSx4cDowLHhwUmVxOjUsbGFzdFVzZWQ6bmV3IERhdGUoKS50b0lTT1N0cmluZygpLHJ1c3Q6MCxjb25uZWN0aW9uczpbXX0pO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsRGV0YWlsTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgaW5kZXg6IG51bWJlcjtcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbiwgaW5kZXg6IG51bWJlcikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbj1wbHVnaW47IHRoaXMuaW5kZXg9aW5kZXg7IH1cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBjb25zdCBzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzW3RoaXMuaW5kZXhdO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBOb2RlOiAke3MubmFtZX1gIH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOYW1lXCIpLmFkZFRleHQodD0+dC5zZXRWYWx1ZShzLm5hbWUpLm9uQ2hhbmdlKHY9PnMubmFtZT12KSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIlJ1c3QgU3RhdHVzXCIpLnNldERlc2MoYFN0YWNrczogJHtzLnJ1c3R9YCkuYWRkQnV0dG9uKGI9PmIuc2V0QnV0dG9uVGV4dChcIk1hbnVhbCBQb2xpc2hcIikub25DbGljayhhc3luYygpPT57IFxuICAgICAgICAgICAgcy5ydXN0PTA7IHMueHBSZXE9TWF0aC5mbG9vcihzLnhwUmVxLzEuMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIlJ1c3QgcG9saXNoZWQuXCIpOyBcbiAgICAgICAgfSkpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpOyBcbiAgICAgICAgZGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDoyMHB4OyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJTYXZlID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiU2F2ZVwifSk7IFxuICAgICAgICBiU2F2ZS5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICBiU2F2ZS5vbmNsaWNrPWFzeW5jKCk9PnsgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgdGhpcy5jbG9zZSgpOyB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYkRlbCA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkRlbGV0ZSBOb2RlXCJ9KTsgXG4gICAgICAgIGJEZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImNvbG9yOnJlZDtcIik7IFxuICAgICAgICBiRGVsLm9uY2xpY2s9YXN5bmMoKT0+eyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5zcGxpY2UodGhpcy5pbmRleCwgMSk7IFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICB9O1xuICAgIH1cbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9XG59XG5cblxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hRdWVzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgdGl0bGU6IHN0cmluZyA9IFwiXCI7XG4gICAgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIgPSBcInN1cnZleVwiO1xuICAgIGxpbmtlZFNraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjtcbiAgICBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nID0gXCJOb25lXCI7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggREVQTE9ZTUVOVFwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiUmVzZWFyY2ggVGl0bGVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLnRpdGxlID0gdik7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUeXBlXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcInN1cnZleVwiLCBcIlN1cnZleSAoMTAwLTIwMCB3b3JkcylcIilcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwiZGVlcF9kaXZlXCIsIFwiRGVlcCBEaXZlICgyMDAtNDAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcInN1cnZleVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMudHlwZSA9IHYgYXMgXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IHNraWxsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGlua2VkIFNraWxsXCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbnMoc2tpbGxzKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcIk5vbmVcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLmxpbmtlZFNraWxsID0gdilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgY29tYmF0UXVlc3RzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29tYmF0UXVlc3RzW2YuYmFzZW5hbWVdID0gZi5iYXNlbmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiTGluayBDb21iYXQgUXVlc3RcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhjb21iYXRRdWVzdHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkQ29tYmF0UXVlc3QgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIFJFU0VBUkNIXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50aXRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5rZWRTa2lsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZENvbWJhdFF1ZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaExpc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIExJQlJBUllcIiB9KTtcblxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgQ29tYmF0IFF1ZXN0czogJHtzdGF0cy5jb21iYXR9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmVzZWFyY2ggUXVlc3RzOiAke3N0YXRzLnJlc2VhcmNofWAgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJhdGlvOiAke3N0YXRzLnJhdGlvfToxYCB9KTtcblxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogMTBweCAwO1wiKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0VGV4dChcIlJFU0VBUkNIIEJMT0NLRUQ6IE5lZWQgMjoxIGNvbWJhdCB0byByZXNlYXJjaCByYXRpb1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBY3RpdmUgUmVzZWFyY2hcIiB9KTtcblxuICAgICAgICBjb25zdCBxdWVzdHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiAhcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAocXVlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIHJlc2VhcmNoIHF1ZXN0cy5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgcGFkZGluZzogMTBweDsgbWFyZ2luOiA1cHggMDsgYm9yZGVyLXJhZGl1czogNHB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IHEudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgNXB4IDA7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGNhcmQuY3JlYXRlRWwoXCJkaXZcIik7XG4gICAgICAgICAgICAgICAgaW5mby5pbm5lckhUTUwgPSBgPGNvZGUgc3R5bGU9XCJjb2xvcjojYWE2NGZmXCI+JHtxLmlkfTwvY29kZT48YnI+VHlwZTogJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0gfCBXb3JkczogJHtxLndvcmRDb3VudH0vJHtxLndvcmRMaW1pdH1gO1xuICAgICAgICAgICAgICAgIGluZm8uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXNpemU6IDAuOWVtOyBvcGFjaXR5OiAwLjg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcGxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDT01QTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiBncmVlbjsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHEuaWQsIHEud29yZENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IHJlZDsgY29sb3I6IHdoaXRlOyBib3JkZXI6IG5vbmU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQ29tcGxldGVkIFJlc2VhcmNoXCIgfSk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+IHEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGNvbXBsZXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZC5mb3JFYWNoKChxOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldFRleHQoYCsgJHtxLnRpdGxlfSAoJHtxLnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCk7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm9wYWNpdHk6IDAuNjsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5cbmV4cG9ydCBjbGFzcyBDaGFpbkJ1aWxkZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIGNoYWluTmFtZTogc3RyaW5nID0gXCJcIjtcbiAgICBzZWxlY3RlZFF1ZXN0czogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDSEFJTiBCVUlMREVSXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJDaGFpbiBOYW1lXCIpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy5jaGFpbk5hbWUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiU2VsZWN0IFF1ZXN0c1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RGb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgY29uc3QgcXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHF1ZXN0Rm9sZGVyIGluc3RhbmNlb2YgVEZvbGRlcikge1xuICAgICAgICAgICAgcXVlc3RGb2xkZXIuY2hpbGRyZW4uZm9yRWFjaChmID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlICYmIGYuZXh0ZW5zaW9uID09PSBcIm1kXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlc3RzLnB1c2goZi5iYXNlbmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBxdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgICAgIC5zZXROYW1lKHF1ZXN0KVxuICAgICAgICAgICAgICAgIC5hZGRUb2dnbGUodCA9PiB0Lm9uQ2hhbmdlKHYgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cy5wdXNoKHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWVzdHMgPSB0aGlzLnNlbGVjdGVkUXVlc3RzLmZpbHRlcihxID0+IHEgIT09IHF1ZXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IGJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNSRUFURSBDSEFJTlwiKVxuICAgICAgICAgICAgICAgIC5zZXRDdGEoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY2hhaW5OYW1lICYmIHRoaXMuc2VsZWN0ZWRRdWVzdHMubGVuZ3RoID49IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVRdWVzdENoYWluKHRoaXMuY2hhaW5OYW1lLCB0aGlzLnNlbGVjdGVkUXVlc3RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJDaGFpbiBuZWVkcyBhIG5hbWUgYW5kIGF0IGxlYXN0IDIgcXVlc3RzXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBWaWN0b3J5TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuYWRkQ2xhc3MoXCJzaXN5LXZpY3RvcnktbW9kYWxcIik7XG5cbiAgICAgICAgLy8gRXBpYyBUaXRsZVxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMVwiLCB7IHRleHQ6IFwiQVNDRU5TSU9OIEFDSElFVkVEXCIsIGNsczogXCJzaXN5LXZpY3RvcnktdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFtGSVhFRF0gc3R5bGUgbW92ZWQgdG8gYXR0clxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBcIvCfj4ZcIiwgYXR0cjogeyBzdHlsZTogXCJmb250LXNpemU6IDYwcHg7IG1hcmdpbjogMjBweCAwO1wiIH0gfSk7XG5cbiAgICAgICAgLy8gU3RhdHMgQ29udGFpbmVyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCBsZWdhY3kgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZWdhY3k7XG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG5cbiAgICAgICAgdGhpcy5zdGF0TGluZShzdGF0cywgXCJGaW5hbCBMZXZlbFwiLCBcIjUwXCIpO1xuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIlRvdGFsIFF1ZXN0c1wiLCBgJHttZXRyaWNzLnRvdGFsUXVlc3RzfWApO1xuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkRlYXRocyBFbmR1cmVkXCIsIGAke2xlZ2FjeS5kZWF0aENvdW50fWApO1xuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkxvbmdlc3QgU3RyZWFrXCIsIGAke21ldHJpY3MubG9uZ2VzdFN0cmVha30gZGF5c2ApO1xuXG4gICAgICAgIC8vIE1lc3NhZ2VcbiAgICAgICAgLy8gW0ZJWEVEXSBzdHlsZSBtb3ZlZCB0byBhdHRyXG4gICAgICAgIGNvbnN0IG1zZyA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyBcbiAgICAgICAgICAgIHRleHQ6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS4gWW91IGhhdmUgcHVzaGVkIHRoZSBib3VsZGVyIHRvIHRoZSBwZWFrLlwiLFxuICAgICAgICAgICAgYXR0cjogeyBzdHlsZTogXCJtYXJnaW46IDMwcHggMDsgZm9udC1zdHlsZTogaXRhbGljOyBvcGFjaXR5OiAwLjg7XCIgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb250aW51ZSBCdXR0b25cbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCRUdJTiBORVcgR0FNRStcIiB9KTtcbiAgICAgICAgYnRuLmFkZENsYXNzKFwibW9kLWN0YVwiKTtcbiAgICAgICAgYnRuLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gT3B0aW9uYWw6IFRyaWdnZXIgUHJlc3RpZ2UvTmV3IEdhbWUrIGxvZ2ljIGhlcmUgaWYgZGVzaXJlZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHN0YXRMaW5lKGVsOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbGluZSA9IGVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXZpY3Rvcnktc3RhdFwiIH0pO1xuICAgICAgICBsaW5lLmlubmVySFRNTCA9IGAke2xhYmVsfTogPHNwYW4gY2xhc3M9XCJzaXN5LXZpY3RvcnktaGlnaGxpZ2h0XCI+JHt2YWx9PC9zcGFuPmA7XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cblxuXG4vLyBbQVBQRU5EIFRPIHNyYy91aS9tb2RhbHMudHNdXG5cbmV4cG9ydCBjbGFzcyBRdWlja0NhcHR1cmVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimqEgUXVpY2sgQ2FwdHVyZVwiIH0pO1xuXG4gICAgICAgIGNvbnN0IGRpdiA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBkaXYuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IFxuICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsIFxuICAgICAgICAgICAgYXR0cjogeyBcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogXCJXaGF0J3Mgb24geW91ciBtaW5kP1wiLFxuICAgICAgICAgICAgICAgIHN0eWxlOiBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiAxMHB4OyBmb250LXNpemU6IDEuMmVtOyBiYWNrZ3JvdW5kOiAjMjIyOyBib3JkZXI6IDFweCBzb2xpZCAjNDQ0OyBjb2xvcjogI2UwZTBlMDtcIlxuICAgICAgICAgICAgfSBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaW5wdXQuZm9jdXMoKTtcblxuICAgICAgICAvLyBIYW5kbGUgRW50ZXIgS2V5XG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlwcmVzc1wiLCBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIgJiYgaW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlU2NyYXAoaW5wdXQudmFsdWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYnRuID0gY29udGVudEVsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYXB0dXJlIHRvIFNjcmFwc1wiIH0pO1xuICAgICAgICBidG4uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxNXB4OyB3aWR0aDogMTAwJTtcIik7XG4gICAgICAgIGJ0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVNjcmFwKGlucHV0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDb25maXJtTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgdGl0bGU6IHN0cmluZztcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgb25Db25maXJtOiAoKSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb25Db25maXJtOiAoKSA9PiB2b2lkKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMudGl0bGUgPSB0aXRsZTtcbiAgICAgICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbiAgICAgICAgdGhpcy5vbkNvbmZpcm0gPSBvbkNvbmZpcm07XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0aGlzLnRpdGxlIH0pO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogdGhpcy5tZXNzYWdlIH0pO1xuXG4gICAgICAgIGNvbnN0IGRpdiA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBkaXYuc3R5bGUubWFyZ2luVG9wID0gXCIyMHB4XCI7XG4gICAgICAgIGRpdi5zdHlsZS5qdXN0aWZ5Q29udGVudCA9IFwiZmxleC1lbmRcIjtcblxuICAgICAgICBjb25zdCBidG5DYW5jZWwgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pO1xuICAgICAgICBidG5DYW5jZWwub25jbGljayA9ICgpID0+IHRoaXMuY2xvc2UoKTtcblxuICAgICAgICBjb25zdCBidG5Db25maXJtID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDb25maXJtXCIsIGNsczogXCJtb2QtY3RhXCIgfSk7XG4gICAgICAgIGJ0bkNvbmZpcm0uc3R5bGUuYmFja2dyb3VuZENvbG9yID0gXCIjZmY1NTU1XCI7IC8vIFJlZCBmb3IgZGFuZ2VyXG4gICAgICAgIGJ0bkNvbmZpcm0uc3R5bGUuY29sb3IgPSBcIndoaXRlXCI7XG4gICAgICAgIGJ0bkNvbmZpcm0ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25Db25maXJtKCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBEYXlNZXRyaWNzLCBXZWVrbHlSZXBvcnQsIEJvc3NNaWxlc3RvbmUsIFN0cmVhaywgQWNoaWV2ZW1lbnQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDY6IEFuYWx5dGljcyAmIEVuZGdhbWUgRW5naW5lXG4gKiBIYW5kbGVzIGFsbCBtZXRyaWNzIHRyYWNraW5nLCBib3NzIG1pbGVzdG9uZXMsIGFjaGlldmVtZW50cywgYW5kIHdpbiBjb25kaXRpb25cbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHNldHRpbmdzLmRheU1ldHJpY3MsIHdlZWtseVJlcG9ydHMsIGJvc3NNaWxlc3RvbmVzLCBzdHJlYWssIGFjaGlldmVtZW50c1xuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqL1xuZXhwb3J0IGNsYXNzIEFuYWx5dGljc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBhdWRpbyBjYWxsYmFjayBmb3Igbm90aWZpY2F0aW9uc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyYWNrIGRhaWx5IG1ldHJpY3MgLSBjYWxsZWQgd2hlbmV2ZXIgYSBxdWVzdCBpcyBjb21wbGV0ZWQvZmFpbGVkL2V0Y1xuICAgICAqL1xuICAgIHRyYWNrRGFpbHlNZXRyaWNzKHR5cGU6ICdxdWVzdF9jb21wbGV0ZScgfCAncXVlc3RfZmFpbCcgfCAneHAnIHwgJ2dvbGQnIHwgJ2RhbWFnZScgfCAnc2tpbGxfbGV2ZWwnIHwgJ2NoYWluX2NvbXBsZXRlJywgYW1vdW50OiBudW1iZXIgPSAxKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXRyaWMgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmluZChtID0+IG0uZGF0ZSA9PT0gdG9kYXkpO1xuICAgICAgICBpZiAoIW1ldHJpYykge1xuICAgICAgICAgICAgbWV0cmljID0ge1xuICAgICAgICAgICAgICAgIGRhdGU6IHRvZGF5LFxuICAgICAgICAgICAgICAgIHF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICAgICAgICAgICAgICBxdWVzdHNGYWlsZWQ6IDAsXG4gICAgICAgICAgICAgICAgeHBFYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgZ29sZEVhcm5lZDogMCxcbiAgICAgICAgICAgICAgICBkYW1hZ2VzVGFrZW46IDAsXG4gICAgICAgICAgICAgICAgc2tpbGxzTGV2ZWxlZDogW10sXG4gICAgICAgICAgICAgICAgY2hhaW5zQ29tcGxldGVkOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnB1c2gobWV0cmljKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfY29tcGxldGVcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMucXVlc3RzQ29tcGxldGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9mYWlsXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnF1ZXN0c0ZhaWxlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwieHBcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMueHBFYXJuZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImdvbGRcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuZ29sZEVhcm5lZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiZGFtYWdlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmRhbWFnZXNUYWtlbiArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwic2tpbGxfbGV2ZWxcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuc2tpbGxzTGV2ZWxlZC5wdXNoKFwiU2tpbGwgbGV2ZWxlZFwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjaGFpbl9jb21wbGV0ZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5jaGFpbnNDb21wbGV0ZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRhaWx5IHN0cmVhayAtIGNhbGxlZCBvbmNlIHBlciBkYXkgYXQgbG9naW5cbiAgICAgKi9cbiAgICB1cGRhdGVTdHJlYWsoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgY29uc3QgbGFzdERhdGUgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5sYXN0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gQWxyZWFkeSBjb3VudGVkIHRvZGF5XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG1vbWVudCgpLnN1YnRyYWN0KDEsICdkYXknKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlID09PSB5ZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIENvbnNlY3V0aXZlIGRheVxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCsrO1xuICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQgPiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTdHJlYWsgYnJva2VuLCBzdGFydCBuZXcgb25lXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsubGFzdERhdGUgPSB0b2RheTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGJvc3MgbWlsZXN0b25lcyBvbiBmaXJzdCBydW5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzID0gbWlsZXN0b25lcyBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhbnkgYm9zc2VzIHNob3VsZCBiZSB1bmxvY2tlZCBiYXNlZCBvbiBjdXJyZW50IGxldmVsXG4gICAgICovXG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzIHx8IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVCb3NzTWlsZXN0b25lcygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZvckVhY2goKGJvc3M6IEJvc3NNaWxlc3RvbmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IGJvc3MubGV2ZWwgJiYgIWJvc3MudW5sb2NrZWQpIHtcbiAgICAgICAgICAgICAgICBib3NzLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGBCb3NzIFVubG9ja2VkOiAke2Jvc3MubmFtZX0gKExldmVsICR7Ym9zcy5sZXZlbH0pYCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYm9zcyBhcyBkZWZlYXRlZCBhbmQgYXdhcmQgWFBcbiAgICAgKi9cbiAgICBkZWZlYXRCb3NzKGxldmVsOiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYm9zcyA9IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmluZCgoYjogQm9zc01pbGVzdG9uZSkgPT4gYi5sZXZlbCA9PT0gbGV2ZWwpO1xuICAgICAgICBpZiAoIWJvc3MpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3Mgbm90IGZvdW5kXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChib3NzLmRlZmVhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIGFscmVhZHkgZGVmZWF0ZWRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYm9zcy5kZWZlYXRlZCA9IHRydWU7XG4gICAgICAgIGJvc3MuZGVmZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9zcy54cFJld2FyZDtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayB3aW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChsZXZlbCA9PT0gNTApIHtcbiAgICAgICAgICAgIHRoaXMud2luR2FtZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgVklDVE9SWSFgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQm9zcyBEZWZlYXRlZDogJHtib3NzLm5hbWV9ISArJHtib3NzLnhwUmV3YXJkfSBYUGAsIHhwUmV3YXJkOiBib3NzLnhwUmV3YXJkIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVHJpZ2dlciB3aW4gY29uZGl0aW9uXG4gICAgICovXG4gICAgcHJpdmF0ZSB3aW5HYW1lKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmdhbWVXb24gPSB0cnVlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmVuZEdhbWVEYXRlID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB3ZWVrbHkgcmVwb3J0XG4gICAgICovXG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTogV2Vla2x5UmVwb3J0IHtcbiAgICAgICAgY29uc3Qgd2VlayA9IG1vbWVudCgpLndlZWsoKTtcbiAgICAgICAgY29uc3Qgc3RhcnREYXRlID0gbW9tZW50KCkuc3RhcnRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGNvbnN0IGVuZERhdGUgPSBtb21lbnQoKS5lbmRPZignd2VlaycpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3ZWVrTWV0cmljcyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maWx0ZXIoKG06IERheU1ldHJpY3MpID0+IFxuICAgICAgICAgICAgbW9tZW50KG0uZGF0ZSkuaXNCZXR3ZWVuKG1vbWVudChzdGFydERhdGUpLCBtb21lbnQoZW5kRGF0ZSksIG51bGwsICdbXScpXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0b3RhbFF1ZXN0cyA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxGYWlsZWQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0ZhaWxlZCwgMCk7XG4gICAgICAgIGNvbnN0IHN1Y2Nlc3NSYXRlID0gdG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCA+IDAgPyBNYXRoLnJvdW5kKCh0b3RhbFF1ZXN0cyAvICh0b3RhbFF1ZXN0cyArIHRvdGFsRmFpbGVkKSkgKiAxMDApIDogMDtcbiAgICAgICAgY29uc3QgdG90YWxYcCA9IHdlZWtNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApO1xuICAgICAgICBjb25zdCB0b3RhbEdvbGQgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLmdvbGRFYXJuZWQsIDApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG9wU2tpbGxzID0gdGhpcy5zZXR0aW5ncy5za2lsbHNcbiAgICAgICAgICAgIC5zb3J0KChhOiBhbnksIGI6IGFueSkgPT4gKGIubGV2ZWwgLSBhLmxldmVsKSlcbiAgICAgICAgICAgIC5zbGljZSgwLCAzKVxuICAgICAgICAgICAgLm1hcCgoczogYW55KSA9PiBzLm5hbWUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgXG4gICAgICAgICAgICA/IHdlZWtNZXRyaWNzLnJlZHVjZSgobWF4OiBEYXlNZXRyaWNzLCBtOiBEYXlNZXRyaWNzKSA9PiBtLnF1ZXN0c0NvbXBsZXRlZCA+IG1heC5xdWVzdHNDb21wbGV0ZWQgPyBtIDogbWF4KS5kYXRlXG4gICAgICAgICAgICA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcnN0RGF5ID0gd2Vla01ldHJpY3MubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1pbjogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNGYWlsZWQgPiBtaW4ucXVlc3RzRmFpbGVkID8gbSA6IG1pbikuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXBvcnQ6IFdlZWtseVJlcG9ydCA9IHtcbiAgICAgICAgICAgIHdlZWs6IHdlZWssXG4gICAgICAgICAgICBzdGFydERhdGU6IHN0YXJ0RGF0ZSxcbiAgICAgICAgICAgIGVuZERhdGU6IGVuZERhdGUsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdG90YWxRdWVzdHMsXG4gICAgICAgICAgICBzdWNjZXNzUmF0ZTogc3VjY2Vzc1JhdGUsXG4gICAgICAgICAgICB0b3RhbFhwOiB0b3RhbFhwLFxuICAgICAgICAgICAgdG90YWxHb2xkOiB0b3RhbEdvbGQsXG4gICAgICAgICAgICB0b3BTa2lsbHM6IHRvcFNraWxscyxcbiAgICAgICAgICAgIGJlc3REYXk6IGJlc3REYXksXG4gICAgICAgICAgICB3b3JzdERheTogd29yc3REYXlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Mud2Vla2x5UmVwb3J0cy5wdXNoKHJlcG9ydCk7XG4gICAgICAgIHJldHVybiByZXBvcnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVW5sb2NrIGFuIGFjaGlldmVtZW50XG4gICAgICovXG4gICAgdW5sb2NrQWNoaWV2ZW1lbnQoYWNoaWV2ZW1lbnRJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjaGlldmVtZW50ID0gdGhpcy5zZXR0aW5ncy5hY2hpZXZlbWVudHMuZmluZCgoYTogQWNoaWV2ZW1lbnQpID0+IGEuaWQgPT09IGFjaGlldmVtZW50SWQpO1xuICAgICAgICBpZiAoIWFjaGlldmVtZW50IHx8IGFjaGlldmVtZW50LnVubG9ja2VkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgIGFjaGlldmVtZW50LnVubG9ja2VkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZ2FtZSBzdGF0cyBzbmFwc2hvdFxuICAgICAqL1xuICAgIGdldEdhbWVTdGF0cygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxldmVsOiB0aGlzLnNldHRpbmdzLmxldmVsLFxuICAgICAgICAgICAgY3VycmVudFN0cmVhazogdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCxcbiAgICAgICAgICAgIGxvbmdlc3RTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QsXG4gICAgICAgICAgICB0b3RhbFF1ZXN0czogdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ucXVlc3RzQ29tcGxldGVkLCAwKSxcbiAgICAgICAgICAgIHRvdGFsWHA6IHRoaXMuc2V0dGluZ3MueHAgKyB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS54cEVhcm5lZCwgMCksXG4gICAgICAgICAgICBnYW1lV29uOiB0aGlzLnNldHRpbmdzLmdhbWVXb24sXG4gICAgICAgICAgICBib3NzZXNEZWZlYXRlZDogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maWx0ZXIoKGI6IEJvc3NNaWxlc3RvbmUpID0+IGIuZGVmZWF0ZWQpLmxlbmd0aCxcbiAgICAgICAgICAgIHRvdGFsQm9zc2VzOiB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBzdXJ2aXZhbCBlc3RpbWF0ZSAocm91Z2ggY2FsY3VsYXRpb24pXG4gICAgICovXG4gICAgZ2V0U3Vydml2YWxFc3RpbWF0ZSgpOiBudW1iZXIge1xuICAgICAgICBjb25zdCBkYW1hZ2VQZXJGYWlsdXJlID0gMTAgKyBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3Mucml2YWxEbWcgLyAyKTtcbiAgICAgICAgY29uc3QgYWN0dWFsRGFtYWdlID0gdGhpcy5zZXR0aW5ncy5nb2xkIDwgMCA/IGRhbWFnZVBlckZhaWx1cmUgKiAyIDogZGFtYWdlUGVyRmFpbHVyZTtcbiAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5ocCAvIE1hdGgubWF4KDEsIGFjdHVhbERhbWFnZSkpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDM6IE1lZGl0YXRpb24gJiBSZWNvdmVyeSBFbmdpbmVcbiAqIEhhbmRsZXMgbG9ja2Rvd24gc3RhdGUsIG1lZGl0YXRpb24gaGVhbGluZywgYW5kIHF1ZXN0IGRlbGV0aW9uIHF1b3RhXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBsb2NrZG93blVudGlsLCBpc01lZGl0YXRpbmcsIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sIFxuICogICAgICAgICAgIHF1ZXN0RGVsZXRpb25zVG9kYXksIGxhc3REZWxldGlvblJlc2V0XG4gKiBERVBFTkRFTkNJRVM6IG1vbWVudCwgU2lzeXBodXNTZXR0aW5nc1xuICogU0lERSBFRkZFQ1RTOiBQbGF5cyBhdWRpbyAoNDMyIEh6IHRvbmUpXG4gKi9cbmV4cG9ydCBjbGFzcyBNZWRpdGF0aW9uRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7IC8vIE9wdGlvbmFsIGZvciA0MzIgSHogc291bmRcbiAgICBwcml2YXRlIG1lZGl0YXRpb25Db29sZG93bk1zID0gMzAwMDA7IC8vIDMwIHNlY29uZHNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBjdXJyZW50bHkgbG9ja2VkIGRvd25cbiAgICAgKi9cbiAgICBpc0xvY2tlZERvd24oKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxvY2tkb3duIHRpbWUgcmVtYWluaW5nIGluIG1pbnV0ZXNcbiAgICAgKi9cbiAgICBnZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTogeyBob3VyczogbnVtYmVyOyBtaW51dGVzOiBudW1iZXI7IHRvdGFsTWludXRlczogbnVtYmVyIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGhvdXJzOiAwLCBtaW51dGVzOiAwLCB0b3RhbE1pbnV0ZXM6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxNaW51dGVzID0gbW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKHRvdGFsTWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IHRvdGFsTWludXRlcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgaG91cnMsIG1pbnV0ZXMsIHRvdGFsTWludXRlcyB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgbG9ja2Rvd24gYWZ0ZXIgdGFraW5nIDUwKyBkYW1hZ2VcbiAgICAgKi9cbiAgICB0cmlnZ2VyTG9ja2Rvd24oKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IG1vbWVudCgpLmFkZCg2LCAnaG91cnMnKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBlcmZvcm0gb25lIG1lZGl0YXRpb24gY3ljbGUgKGNsaWNrKVxuICAgICAqIFJldHVybnM6IHsgc3VjY2VzcywgY3ljbGVzRG9uZSwgY3ljbGVzUmVtYWluaW5nLCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBtZWRpdGF0ZSgpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZzsgbG9ja2Rvd25SZWR1Y2VkOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAoIXRoaXMuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJOb3QgaW4gbG9ja2Rvd24uIE5vIG5lZWQgdG8gbWVkaXRhdGUuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IE1hdGgubWF4KDAsIDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIkFscmVhZHkgbWVkaXRhdGluZy4gV2FpdCAzMCBzZWNvbmRzLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duKys7XG4gICAgICAgIFxuICAgICAgICAvLyBQbGF5IGhlYWxpbmcgZnJlcXVlbmN5XG4gICAgICAgIHRoaXMucGxheU1lZGl0YXRpb25Tb3VuZCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gMTAgLSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGxldCBsb2NrZG93blJlZHVjZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIDEwIGN5Y2xlcyBjb21wbGV0ZVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID49IDEwKSB7XG4gICAgICAgICAgICBjb25zdCByZWR1Y2VkVGltZSA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLnN1YnRyYWN0KDUsICdob3VycycpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gcmVkdWNlZFRpbWUudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA9IDA7XG4gICAgICAgICAgICBsb2NrZG93blJlZHVjZWQgPSB0cnVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiAwLFxuICAgICAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogMCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk1lZGl0YXRpb24gY29tcGxldGUuIExvY2tkb3duIHJlZHVjZWQgYnkgNSBob3Vycy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzZXQgbWVkaXRhdGlvbiBmbGFnIGFmdGVyIGNvb2xkb3duXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgdGhpcy5tZWRpdGF0aW9uQ29vbGRvd25Ncyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGN5Y2xlc0RvbmU6IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bixcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZzogcmVtYWluaW5nLFxuICAgICAgICAgICAgbWVzc2FnZTogYE1lZGl0YXRpb24gKCR7dGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3dufS8xMCkgLSAke3JlbWFpbmluZ30gY3ljbGVzIGxlZnRgLFxuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXkgNDMyIEh6IGhlYWxpbmcgZnJlcXVlbmN5IGZvciAxIHNlY29uZFxuICAgICAqL1xuICAgIHByaXZhdGUgcGxheU1lZGl0YXRpb25Tb3VuZCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGF1ZGlvQ29udGV4dCA9IG5ldyAod2luZG93LkF1ZGlvQ29udGV4dCB8fCAod2luZG93IGFzIGFueSkud2Via2l0QXVkaW9Db250ZXh0KSgpO1xuICAgICAgICAgICAgY29uc3Qgb3NjaWxsYXRvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgICAgICBjb25zdCBnYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnZhbHVlID0gNDMyO1xuICAgICAgICAgICAgb3NjaWxsYXRvci50eXBlID0gXCJzaW5lXCI7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMywgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAxLCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb3NjaWxsYXRvci5zdGFydChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgb3NjaWxsYXRvci5zdG9wKGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIDEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkF1ZGlvIG5vdCBhdmFpbGFibGUgZm9yIG1lZGl0YXRpb25cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWVkaXRhdGlvbiBzdGF0dXMgZm9yIGN1cnJlbnQgbG9ja2Rvd25cbiAgICAgKi9cbiAgICBnZXRNZWRpdGF0aW9uU3RhdHVzKCk6IHsgY3ljbGVzRG9uZTogbnVtYmVyOyBjeWNsZXNSZW1haW5pbmc6IG51bWJlcjsgdGltZVJlZHVjZWQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY3ljbGVzRG9uZSA9IHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjtcbiAgICAgICAgY29uc3QgY3ljbGVzUmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMTAgLSBjeWNsZXNEb25lKTtcbiAgICAgICAgY29uc3QgdGltZVJlZHVjZWQgPSAoMTAgLSBjeWNsZXNSZW1haW5pbmcpICogMzA7IC8vIDMwIG1pbiBwZXIgY3ljbGVcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjeWNsZXNEb25lLFxuICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nLFxuICAgICAgICAgICAgdGltZVJlZHVjZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBkZWxldGlvbiBxdW90YSBpZiBuZXcgZGF5XG4gICAgICovXG4gICAgcHJpdmF0ZSBlbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3REZWxldGlvblJlc2V0ICE9PSB0b2RheSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCA9IHRvZGF5O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID0gMDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHVzZXIgaGFzIGZyZWUgZGVsZXRpb25zIGxlZnQgdG9kYXlcbiAgICAgKi9cbiAgICBjYW5EZWxldGVRdWVzdEZyZWUoKTogYm9vbGVhbiB7XG4gICAgICAgIHRoaXMuZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgPCAzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZWxldGlvbiBxdW90YSBzdGF0dXNcbiAgICAgKi9cbiAgICBnZXREZWxldGlvblF1b3RhKCk6IHsgZnJlZTogbnVtYmVyOyBwYWlkOiBudW1iZXI7IHJlbWFpbmluZzogbnVtYmVyIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gTWF0aC5tYXgoMCwgMyAtIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSk7XG4gICAgICAgIGNvbnN0IHBhaWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkgLSAzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmcmVlOiByZW1haW5pbmcsXG4gICAgICAgICAgICBwYWlkOiBwYWlkLFxuICAgICAgICAgICAgcmVtYWluaW5nOiByZW1haW5pbmdcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBxdWVzdCBhbmQgY2hhcmdlIGdvbGQgaWYgbmVjZXNzYXJ5XG4gICAgICogUmV0dXJuczogeyBjb3N0LCBtZXNzYWdlIH1cbiAgICAgKi9cbiAgICBhcHBseURlbGV0aW9uQ29zdCgpOiB7IGNvc3Q6IG51bWJlcjsgbWVzc2FnZTogc3RyaW5nIH0ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvc3QgPSAwO1xuICAgICAgICBsZXQgbWVzc2FnZSA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5ID49IDMpIHtcbiAgICAgICAgICAgIC8vIFBhaWQgZGVsZXRpb25cbiAgICAgICAgICAgIGNvc3QgPSAxMDtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBgUXVlc3QgZGVsZXRlZC4gQ29zdDogLSR7Y29zdH1nYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZyZWUgZGVsZXRpb25cbiAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXk7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuICgke3JlbWFpbmluZyAtIDF9IGZyZWUgZGVsZXRpb25zIHJlbWFpbmluZylgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjb3N0LCBtZXNzYWdlIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQXBwLCBURmlsZSwgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgUmVzZWFyY2hRdWVzdCB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFJlc2VhcmNoRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7XG4gICAgYXBwOiBBcHA7IC8vIEFkZGVkIEFwcCByZWZlcmVuY2UgZm9yIGZpbGUgb3BlcmF0aW9uc1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGFwcDogQXBwLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgYXN5bmMgY3JlYXRlUmVzZWFyY2hRdWVzdCh0aXRsZTogc3RyaW5nLCB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiwgbGlua2VkU2tpbGw6IHN0cmluZywgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IHF1ZXN0SWQ/OiBzdHJpbmcgfT4ge1xuICAgICAgICAvLyBbRklYXSBBbGxvdyBmaXJzdCByZXNlYXJjaCBxdWVzdCBmb3IgZnJlZSAoQ29sZCBTdGFydCksIG90aGVyd2lzZSBlbmZvcmNlIDI6MVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggPiAwICYmICF0aGlzLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlJFU0VBUkNIIEJMT0NLRUQ6IENvbXBsZXRlIDIgY29tYmF0IHF1ZXN0cyBwZXIgcmVzZWFyY2ggcXVlc3RcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3Qgd29yZExpbWl0ID0gdHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDIwMCA6IDQwMDtcbiAgICAgICAgY29uc3QgcXVlc3RJZCA9IGByZXNlYXJjaF8keyh0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgfHwgMCkgKyAxfWA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0OiBSZXNlYXJjaFF1ZXN0ID0ge1xuICAgICAgICAgICAgaWQ6IHF1ZXN0SWQsXG4gICAgICAgICAgICB0aXRsZTogdGl0bGUsXG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbGlua2VkU2tpbGw6IGxpbmtlZFNraWxsLFxuICAgICAgICAgICAgd29yZExpbWl0OiB3b3JkTGltaXQsXG4gICAgICAgICAgICB3b3JkQ291bnQ6IDAsXG4gICAgICAgICAgICBsaW5rZWRDb21iYXRRdWVzdDogbGlua2VkQ29tYmF0UXVlc3QsXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBbRklYXSBDcmVhdGUgYWN0dWFsIE1hcmtkb3duIGZpbGVcbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IFwiQWN0aXZlX1J1bi9SZXNlYXJjaFwiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmb2xkZXJQYXRoKSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlclBhdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2FmZVRpdGxlID0gdGl0bGUucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7Zm9sZGVyUGF0aH0vJHtzYWZlVGl0bGV9Lm1kYDtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGAtLS1cbnR5cGU6IHJlc2VhcmNoXG5yZXNlYXJjaF9pZDogJHtxdWVzdElkfVxuc3RhdHVzOiBhY3RpdmVcbmxpbmtlZF9za2lsbDogJHtsaW5rZWRTa2lsbH1cbndvcmRfbGltaXQ6ICR7d29yZExpbWl0fVxuY3JlYXRlZDogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XG4tLS1cbiMg8J+TmiAke3RpdGxlfVxuPiBbIUlORk9dIFJlc2VhcmNoIEd1aWRlbGluZXNcbj4gKipUeXBlOioqICR7dHlwZX0gfCAqKlRhcmdldDoqKiAke3dvcmRMaW1pdH0gd29yZHNcbj4gKipMaW5rZWQgU2tpbGw6KiogJHtsaW5rZWRTa2lsbH1cblxuV3JpdGUgeW91ciByZXNlYXJjaCBoZXJlLi4uXG5gO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiRXJyb3IgY3JlYXRpbmcgcmVzZWFyY2ggZmlsZS4gQ2hlY2sgY29uc29sZS5cIik7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLnB1c2gocmVzZWFyY2hRdWVzdCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdFJlc2VhcmNoUXVlc3RJZCA9IHBhcnNlSW50KHF1ZXN0SWQuc3BsaXQoJ18nKVsxXSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoKys7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBSZXNlYXJjaCBRdWVzdCBDcmVhdGVkOiAke3R5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn1gLFxuICAgICAgICAgICAgcXVlc3RJZDogcXVlc3RJZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChxdWVzdElkOiBzdHJpbmcsIGZpbmFsV29yZENvdW50OiBudW1iZXIpOiB7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgeHBSZXdhcmQ6IG51bWJlcjsgZ29sZFBlbmFsdHk6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAoIXJlc2VhcmNoUXVlc3QpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIlJlc2VhcmNoIHF1ZXN0IG5vdCBmb3VuZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QuY29tcGxldGVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJRdWVzdCBhbHJlYWR5IGNvbXBsZXRlZFwiLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG1pbldvcmRzID0gTWF0aC5jZWlsKHJlc2VhcmNoUXVlc3Qud29yZExpbWl0ICogMC44KTtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50IDwgbWluV29yZHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBgVG9vIHNob3J0ISBOZWVkICR7bWluV29yZHN9IHdvcmRzLmAsIHhwUmV3YXJkOiAwLCBnb2xkUGVuYWx0eTogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCAqIDEuMjUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBgVG9vIGxvbmchIE1heCAke01hdGguY2VpbChyZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCAqIDEuMjUpfSB3b3Jkcy5gLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IHhwUmV3YXJkID0gcmVzZWFyY2hRdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gNSA6IDIwO1xuICAgICAgICBsZXQgZ29sZFBlbmFsdHkgPSAwO1xuICAgICAgICBpZiAoZmluYWxXb3JkQ291bnQgPiByZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCkge1xuICAgICAgICAgICAgY29uc3Qgb3ZlcmFnZVBlcmNlbnQgPSAoKGZpbmFsV29yZENvdW50IC0gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIC8gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpICogMTAwO1xuICAgICAgICAgICAgZ29sZFBlbmFsdHkgPSBNYXRoLmZsb29yKDIwICogKG92ZXJhZ2VQZXJjZW50IC8gMTAwKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gcmVzZWFyY2hRdWVzdC5saW5rZWRTa2lsbCk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgc2tpbGwueHAgKz0geHBSZXdhcmQ7XG4gICAgICAgICAgICBpZiAoc2tpbGwueHAgPj0gc2tpbGwueHBSZXEpIHsgc2tpbGwubGV2ZWwrKzsgc2tpbGwueHAgPSAwOyB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBnb2xkUGVuYWx0eTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICByZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICBcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSBgUmVzZWFyY2ggQ29tcGxldGUhICske3hwUmV3YXJkfSBYUGA7XG4gICAgICAgIGlmIChnb2xkUGVuYWx0eSA+IDApIG1lc3NhZ2UgKz0gYCAoLSR7Z29sZFBlbmFsdHl9ZyB0YXgpYDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2UsIHhwUmV3YXJkLCBnb2xkUGVuYWx0eSB9O1xuICAgIH1cblxuICAgIGFzeW5jIGRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZyB9PiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maW5kSW5kZXgocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgY29uc3QgcXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzW2luZGV4XTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gW0ZJWF0gVHJ5IHRvIGZpbmQgYW5kIGRlbGV0ZSB0aGUgZmlsZVxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gICAgICAgICAgICBjb25zdCBmaWxlID0gZmlsZXMuZmluZChmID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGYpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZT8uZnJvbnRtYXR0ZXI/LnJlc2VhcmNoX2lkID09PSBxdWVzdElkO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBpZiAoIXF1ZXN0LmNvbXBsZXRlZCkgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCAtIDEpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgPSBNYXRoLm1heCgwLCB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgLSAxKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBkZWxldGVkXCIgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJOb3QgZm91bmRcIiB9O1xuICAgIH1cblxuICAgIHVwZGF0ZVJlc2VhcmNoV29yZENvdW50KHF1ZXN0SWQ6IHN0cmluZywgbmV3V29yZENvdW50OiBudW1iZXIpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZChxID0+IHEuaWQgPT09IHF1ZXN0SWQpO1xuICAgICAgICBpZiAocmVzZWFyY2hRdWVzdCkge1xuICAgICAgICAgICAgcmVzZWFyY2hRdWVzdC53b3JkQ291bnQgPSBuZXdXb3JkQ291bnQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZ2V0UmVzZWFyY2hSYXRpbygpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHsgY29tYmF0OiBzdGF0cy50b3RhbENvbWJhdCwgcmVzZWFyY2g6IHN0YXRzLnRvdGFsUmVzZWFyY2gsIHJhdGlvOiByYXRpby50b0ZpeGVkKDIpIH07XG4gICAgfVxuXG4gICAgY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHM7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gc3RhdHMudG90YWxDb21iYXQgLyBNYXRoLm1heCgxLCBzdGF0cy50b3RhbFJlc2VhcmNoKTtcbiAgICAgICAgcmV0dXJuIHJhdGlvID49IDI7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgUXVlc3RDaGFpbiwgUXVlc3RDaGFpblJlY29yZCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNDogUXVlc3QgQ2hhaW5zIEVuZ2luZVxuICogSGFuZGxlcyBtdWx0aS1xdWVzdCBzZXF1ZW5jZXMgd2l0aCBvcmRlcmluZywgbG9ja2luZywgYW5kIGNvbXBsZXRpb24gdHJhY2tpbmdcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIGFjdGl2ZUNoYWlucywgY2hhaW5IaXN0b3J5LCBjdXJyZW50Q2hhaW5JZCwgY2hhaW5RdWVzdHNDb21wbGV0ZWRcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlc1xuICogSU5URUdSQVRJT04gUE9JTlRTOiBOZWVkcyB0byBob29rIGludG8gY29tcGxldGVRdWVzdCgpIGluIG1haW4gZW5naW5lIGZvciBjaGFpbiBwcm9ncmVzc2lvblxuICovXG5leHBvcnQgY2xhc3MgQ2hhaW5zRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IHF1ZXN0IGNoYWluXG4gICAgICovXG4gICAgYXN5bmMgY3JlYXRlUXVlc3RDaGFpbihuYW1lOiBzdHJpbmcsIHF1ZXN0TmFtZXM6IHN0cmluZ1tdKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgY2hhaW5JZD86IHN0cmluZyB9PiB7XG4gICAgICAgIGlmIChxdWVzdE5hbWVzLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJDaGFpbiBtdXN0IGhhdmUgYXQgbGVhc3QgMiBxdWVzdHNcIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW5JZCA9IGBjaGFpbl8ke0RhdGUubm93KCl9YDtcbiAgICAgICAgY29uc3QgY2hhaW46IFF1ZXN0Q2hhaW4gPSB7XG4gICAgICAgICAgICBpZDogY2hhaW5JZCxcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICBxdWVzdHM6IHF1ZXN0TmFtZXMsXG4gICAgICAgICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgc3RhcnRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBpc0Jvc3M6IHF1ZXN0TmFtZXNbcXVlc3ROYW1lcy5sZW5ndGggLSAxXS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiYm9zc1wiKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMucHVzaChjaGFpbik7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBjaGFpbklkO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gY3JlYXRlZDogJHtuYW1lfSAoJHtxdWVzdE5hbWVzLmxlbmd0aH0gcXVlc3RzKWAsXG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbklkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBjdXJyZW50IGFjdGl2ZSBjaGFpblxuICAgICAqL1xuICAgIGdldEFjdGl2ZUNoYWluKCk6IFF1ZXN0Q2hhaW4gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+IGMuaWQgPT09IHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQpO1xuICAgICAgICByZXR1cm4gKGNoYWluICYmICFjaGFpbi5jb21wbGV0ZWQpID8gY2hhaW4gOiBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbmV4dCBxdWVzdCB0aGF0IHNob3VsZCBiZSBjb21wbGV0ZWQgaW4gdGhlIGFjdGl2ZSBjaGFpblxuICAgICAqL1xuICAgIGdldE5leHRRdWVzdEluQ2hhaW4oKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjaGFpbi5xdWVzdHNbY2hhaW4uY3VycmVudEluZGV4XSB8fCBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgaXMgcGFydCBvZiBhbiBhY3RpdmUgKGluY29tcGxldGUpIGNoYWluXG4gICAgICovXG4gICAgaXNRdWVzdEluQ2hhaW4ocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maW5kKGMgPT4gIWMuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gY2hhaW4ucXVlc3RzLmluY2x1ZGVzKHF1ZXN0TmFtZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBjYW4gYmUgc3RhcnRlZCAoaXMgaXQgdGhlIG5leHQgcXVlc3QgaW4gdGhlIGNoYWluPylcbiAgICAgKi9cbiAgICBjYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4gdHJ1ZTsgLy8gTm90IGluIGEgY2hhaW4sIGNhbiBzdGFydCBhbnkgcXVlc3RcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG5leHRRdWVzdCA9IHRoaXMuZ2V0TmV4dFF1ZXN0SW5DaGFpbigpO1xuICAgICAgICByZXR1cm4gbmV4dFF1ZXN0ID09PSBxdWVzdE5hbWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWFyayBhIHF1ZXN0IGFzIGNvbXBsZXRlZCBpbiB0aGUgY2hhaW5cbiAgICAgKiBBZHZhbmNlcyBjaGFpbiBpZiBzdWNjZXNzZnVsLCBhd2FyZHMgYm9udXMgWFAgaWYgY2hhaW4gY29tcGxldGVzXG4gICAgICovXG4gICAgYXN5bmMgY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZTogc3RyaW5nKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgY2hhaW5Db21wbGV0ZTogYm9vbGVhbjsgYm9udXNYcDogbnVtYmVyIH0+IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIk5vIGFjdGl2ZSBjaGFpblwiLCBjaGFpbkNvbXBsZXRlOiBmYWxzZSwgYm9udXNYcDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50UXVlc3QgPSBjaGFpbi5xdWVzdHNbY2hhaW4uY3VycmVudEluZGV4XTtcbiAgICAgICAgaWYgKGN1cnJlbnRRdWVzdCAhPT0gcXVlc3ROYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiUXVlc3QgaXMgbm90IG5leHQgaW4gY2hhaW5cIixcbiAgICAgICAgICAgICAgICBjaGFpbkNvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBib251c1hwOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjaGFpbi5jdXJyZW50SW5kZXgrKztcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpblF1ZXN0c0NvbXBsZXRlZCsrO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgY2hhaW4gaXMgY29tcGxldGVcbiAgICAgICAgaWYgKGNoYWluLmN1cnJlbnRJbmRleCA+PSBjaGFpbi5xdWVzdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21wbGV0ZUNoYWluKGNoYWluKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVtYWluaW5nID0gY2hhaW4ucXVlc3RzLmxlbmd0aCAtIGNoYWluLmN1cnJlbnRJbmRleDtcbiAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIHByb2dyZXNzOiAke2NoYWluLmN1cnJlbnRJbmRleH0vJHtjaGFpbi5xdWVzdHMubGVuZ3RofSAoJHtyZW1haW5pbmd9IHJlbWFpbmluZywgJHtwZXJjZW50fSUgY29tcGxldGUpYCxcbiAgICAgICAgICAgIGNoYWluQ29tcGxldGU6IGZhbHNlLFxuICAgICAgICAgICAgYm9udXNYcDogMFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXBsZXRlIHRoZSBlbnRpcmUgY2hhaW5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNvbXBsZXRlQ2hhaW4oY2hhaW46IFF1ZXN0Q2hhaW4pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBjaGFpbkNvbXBsZXRlOiBib29sZWFuOyBib251c1hwOiBudW1iZXIgfT4ge1xuICAgICAgICBjaGFpbi5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICBjaGFpbi5jb21wbGV0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJvbnVzWHAgPSAxMDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gYm9udXNYcDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlY29yZDogUXVlc3RDaGFpblJlY29yZCA9IHtcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluLmlkLFxuICAgICAgICAgICAgY2hhaW5OYW1lOiBjaGFpbi5uYW1lLFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBjb21wbGV0ZWRBdDogY2hhaW4uY29tcGxldGVkQXQsXG4gICAgICAgICAgICB4cEVhcm5lZDogYm9udXNYcFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkucHVzaChyZWNvcmQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGNvbXBsZXRlOiAke2NoYWluLm5hbWV9ISArJHtib251c1hwfSBYUCBCb251c2AsXG4gICAgICAgICAgICBjaGFpbkNvbXBsZXRlOiB0cnVlLFxuICAgICAgICAgICAgYm9udXNYcDogYm9udXNYcFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJyZWFrIGFuIGFjdGl2ZSBjaGFpblxuICAgICAqIEtlZXBzIGVhcm5lZCBYUCBmcm9tIGNvbXBsZXRlZCBxdWVzdHNcbiAgICAgKi9cbiAgICBhc3luYyBicmVha0NoYWluKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IHhwS2VwdDogbnVtYmVyIH0+IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIk5vIGFjdGl2ZSBjaGFpbiB0byBicmVha1wiLCB4cEtlcHQ6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29tcGxldGVkID0gY2hhaW4uY3VycmVudEluZGV4O1xuICAgICAgICBjb25zdCB4cEtlcHQgPSBjb21wbGV0ZWQgKiAxMDsgLy8gQXBwcm94aW1hdGUgWFAgZnJvbSBlYWNoIHF1ZXN0XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHRvIGhpc3RvcnkgYXMgYnJva2VuXG4gICAgICAgIGNvbnN0IHJlY29yZDogUXVlc3RDaGFpblJlY29yZCA9IHtcbiAgICAgICAgICAgIGNoYWluSWQ6IGNoYWluLmlkLFxuICAgICAgICAgICAgY2hhaW5OYW1lOiBjaGFpbi5uYW1lLFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IGNoYWluLnF1ZXN0cy5sZW5ndGgsXG4gICAgICAgICAgICBjb21wbGV0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgeHBFYXJuZWQ6IHhwS2VwdFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jaGFpbkhpc3RvcnkucHVzaChyZWNvcmQpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucyA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbHRlcihjID0+IGMuaWQgIT09IGNoYWluLmlkKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCA9IFwiXCI7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBicm9rZW46ICR7Y2hhaW4ubmFtZX0uIEtlcHQgJHtjb21wbGV0ZWR9IHF1ZXN0IGNvbXBsZXRpb25zICgke3hwS2VwdH0gWFApLmAsXG4gICAgICAgICAgICB4cEtlcHQ6IHhwS2VwdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBwcm9ncmVzcyBvZiBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXRDaGFpblByb2dyZXNzKCk6IHsgY29tcGxldGVkOiBudW1iZXI7IHRvdGFsOiBudW1iZXI7IHBlcmNlbnQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb21wbGV0ZWQ6IGNoYWluLmN1cnJlbnRJbmRleCxcbiAgICAgICAgICAgIHRvdGFsOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgcGVyY2VudDogTWF0aC5mbG9vcigoY2hhaW4uY3VycmVudEluZGV4IC8gY2hhaW4ucXVlc3RzLmxlbmd0aCkgKiAxMDApXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBjb21wbGV0ZWQgY2hhaW4gcmVjb3JkcyAoaGlzdG9yeSlcbiAgICAgKi9cbiAgICBnZXRDaGFpbkhpc3RvcnkoKTogUXVlc3RDaGFpblJlY29yZFtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgYWN0aXZlIGNoYWlucyAobm90IGNvbXBsZXRlZClcbiAgICAgKi9cbiAgICBnZXRBY3RpdmVDaGFpbnMoKTogUXVlc3RDaGFpbltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbHRlcihjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGRldGFpbGVkIHN0YXRlIG9mIGFjdGl2ZSBjaGFpbiAoZm9yIFVJIHJlbmRlcmluZylcbiAgICAgKi9cbiAgICBnZXRDaGFpbkRldGFpbHMoKToge1xuICAgICAgICBjaGFpbjogUXVlc3RDaGFpbiB8IG51bGw7XG4gICAgICAgIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfTtcbiAgICAgICAgcXVlc3RTdGF0ZXM6IEFycmF5PHsgcXVlc3Q6IHN0cmluZzsgc3RhdHVzOiAnY29tcGxldGVkJyB8ICdhY3RpdmUnIHwgJ2xvY2tlZCcgfT47XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBjaGFpbjogbnVsbCwgcHJvZ3Jlc3M6IHsgY29tcGxldGVkOiAwLCB0b3RhbDogMCwgcGVyY2VudDogMCB9LCBxdWVzdFN0YXRlczogW10gfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSB0aGlzLmdldENoYWluUHJvZ3Jlc3MoKTtcbiAgICAgICAgY29uc3QgcXVlc3RTdGF0ZXMgPSBjaGFpbi5xdWVzdHMubWFwKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaWR4IDwgY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2NvbXBsZXRlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaWR4ID09PSBjaGFpbi5jdXJyZW50SW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBxdWVzdCwgc3RhdHVzOiAnYWN0aXZlJyBhcyBjb25zdCB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBxdWVzdCwgc3RhdHVzOiAnbG9ja2VkJyBhcyBjb25zdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGNoYWluLCBwcm9ncmVzcywgcXVlc3RTdGF0ZXMgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBURmlsZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIENvbnRleHRGaWx0ZXIsIEZpbHRlclN0YXRlLCBFbmVyZ3lMZXZlbCwgUXVlc3RDb250ZXh0IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA1OiBDb250ZXh0IEZpbHRlcnMgRW5naW5lXG4gKiBIYW5kbGVzIHF1ZXN0IGZpbHRlcmluZyBieSBlbmVyZ3kgbGV2ZWwsIGxvY2F0aW9uIGNvbnRleHQsIGFuZCBjdXN0b20gdGFnc1xuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gcXVlc3RGaWx0ZXJzLCBmaWx0ZXJTdGF0ZVxuICogREVQRU5ERU5DSUVTOiBTaXN5cGh1c1NldHRpbmdzIHR5cGVzLCBURmlsZSAoZm9yIHF1ZXN0IG1ldGFkYXRhKVxuICogTk9URTogVGhpcyBpcyBwcmltYXJpbHkgYSBWSUVXIExBWUVSIGNvbmNlcm4sIGJ1dCBrZWVwaW5nIGxvZ2ljIGlzb2xhdGVkIGlzIGdvb2RcbiAqL1xuZXhwb3J0IGNsYXNzIEZpbHRlcnNFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldCBmaWx0ZXIgZm9yIGEgc3BlY2lmaWMgcXVlc3RcbiAgICAgKi9cbiAgICBzZXRRdWVzdEZpbHRlcihxdWVzdE5hbWU6IHN0cmluZywgZW5lcmd5OiBFbmVyZ3lMZXZlbCwgY29udGV4dDogUXVlc3RDb250ZXh0LCB0YWdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdID0ge1xuICAgICAgICAgICAgZW5lcmd5TGV2ZWw6IGVuZXJneSxcbiAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHQsXG4gICAgICAgICAgICB0YWdzOiB0YWdzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGZpbHRlciBmb3IgYSBzcGVjaWZpYyBxdWVzdFxuICAgICAqL1xuICAgIGdldFF1ZXN0RmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nKTogQ29udGV4dEZpbHRlciB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXSB8fCBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgYWN0aXZlIGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIHNldEZpbHRlclN0YXRlKGVuZXJneTogRW5lcmd5TGV2ZWwgfCBcImFueVwiLCBjb250ZXh0OiBRdWVzdENvbnRleHQgfCBcImFueVwiLCB0YWdzOiBzdHJpbmdbXSk6IHZvaWQge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlRW5lcmd5OiBlbmVyZ3kgYXMgYW55LFxuICAgICAgICAgICAgYWN0aXZlQ29udGV4dDogY29udGV4dCBhcyBhbnksXG4gICAgICAgICAgICBhY3RpdmVUYWdzOiB0YWdzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgZ2V0RmlsdGVyU3RhdGUoKTogRmlsdGVyU3RhdGUge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IG1hdGNoZXMgY3VycmVudCBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBxdWVzdE1hdGNoZXNGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgZmlsdGVycyA9IHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGU7XG4gICAgICAgIGNvbnN0IHF1ZXN0RmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIGZpbHRlciBzZXQgZm9yIHRoaXMgcXVlc3QsIGFsd2F5cyBzaG93XG4gICAgICAgIGlmICghcXVlc3RGaWx0ZXIpIHJldHVybiB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5lcmd5IGZpbHRlclxuICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVFbmVyZ3kgIT09IFwiYW55XCIgJiYgcXVlc3RGaWx0ZXIuZW5lcmd5TGV2ZWwgIT09IGZpbHRlcnMuYWN0aXZlRW5lcmd5KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRleHQgZmlsdGVyXG4gICAgICAgIGlmIChmaWx0ZXJzLmFjdGl2ZUNvbnRleHQgIT09IFwiYW55XCIgJiYgcXVlc3RGaWx0ZXIuY29udGV4dCAhPT0gZmlsdGVycy5hY3RpdmVDb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRhZ3MgZmlsdGVyIChyZXF1aXJlcyBBTlkgb2YgdGhlIGFjdGl2ZSB0YWdzKVxuICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVUYWdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGhhc1RhZyA9IGZpbHRlcnMuYWN0aXZlVGFncy5zb21lKCh0YWc6IHN0cmluZykgPT4gcXVlc3RGaWx0ZXIudGFncy5pbmNsdWRlcyh0YWcpKTtcbiAgICAgICAgICAgIGlmICghaGFzVGFnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpbHRlciBhIGxpc3Qgb2YgcXVlc3RzIGJhc2VkIG9uIGN1cnJlbnQgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgZmlsdGVyUXVlc3RzKHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxdWVzdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxdWVzdC5iYXNlbmFtZSB8fCBxdWVzdC5uYW1lO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucXVlc3RNYXRjaGVzRmlsdGVyKHF1ZXN0TmFtZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgZW5lcmd5IGxldmVsXG4gICAgICovXG4gICAgZ2V0UXVlc3RzQnlFbmVyZ3koZW5lcmd5OiBFbmVyZ3lMZXZlbCwgcXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlciAmJiBmaWx0ZXIuZW5lcmd5TGV2ZWwgPT09IGVuZXJneTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyBjb250ZXh0XG4gICAgICovXG4gICAgZ2V0UXVlc3RzQnlDb250ZXh0KGNvbnRleHQ6IFF1ZXN0Q29udGV4dCwgcXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlciAmJiBmaWx0ZXIuY29udGV4dCA9PT0gY29udGV4dDtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHF1ZXN0cyBieSBzcGVjaWZpYyB0YWdzXG4gICAgICovXG4gICAgZ2V0UXVlc3RzQnlUYWdzKHRhZ3M6IHN0cmluZ1tdLCBxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocSA9PiB7XG4gICAgICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBxLmJhc2VuYW1lIHx8IHEubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICBpZiAoIWZpbHRlcikgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHRhZ3Muc29tZSh0YWcgPT4gZmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFyIGFsbCBhY3RpdmUgZmlsdGVyc1xuICAgICAqL1xuICAgIGNsZWFyRmlsdGVycygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZUVuZXJneTogXCJhbnlcIixcbiAgICAgICAgICAgIGFjdGl2ZUNvbnRleHQ6IFwiYW55XCIsXG4gICAgICAgICAgICBhY3RpdmVUYWdzOiBbXVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdW5pcXVlIHRhZ3MgdXNlZCBhY3Jvc3MgYWxsIHF1ZXN0c1xuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZVRhZ3MoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCB0YWdzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgIFxuICAgICAgICBmb3IgKGNvbnN0IHF1ZXN0TmFtZSBpbiB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVycykge1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIGZpbHRlci50YWdzLmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB0YWdzLmFkZCh0YWcpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGFncykuc29ydCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBzdW1tYXJ5IHN0YXRzIGFib3V0IGZpbHRlcmVkIHN0YXRlXG4gICAgICovXG4gICAgZ2V0RmlsdGVyU3RhdHMoYWxsUXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KToge1xuICAgICAgICB0b3RhbDogbnVtYmVyO1xuICAgICAgICBmaWx0ZXJlZDogbnVtYmVyO1xuICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IG51bWJlcjtcbiAgICB9IHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSB0aGlzLmZpbHRlclF1ZXN0cyhhbGxRdWVzdHMpO1xuICAgICAgICBjb25zdCBhY3RpdmVGaWx0ZXJzQ291bnQgPSAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVFbmVyZ3kgIT09IFwiYW55XCIgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5sZW5ndGggPiAwID8gMSA6IDApO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvdGFsOiBhbGxRdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgZmlsdGVyZWQ6IGZpbHRlcmVkLmxlbmd0aCxcbiAgICAgICAgICAgIGFjdGl2ZUZpbHRlcnNDb3VudDogYWN0aXZlRmlsdGVyc0NvdW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGEgc3BlY2lmaWMgZmlsdGVyIHZhbHVlXG4gICAgICogVXNlZnVsIGZvciBVSSB0b2dnbGUgYnV0dG9uc1xuICAgICAqL1xuICAgIHRvZ2dsZUVuZXJneUZpbHRlcihlbmVyZ3k6IEVuZXJneUxldmVsIHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVFbmVyZ3kgPT09IGVuZXJneSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVFbmVyZ3kgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVFbmVyZ3kgPSBlbmVyZ3kgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGNvbnRleHQgZmlsdGVyXG4gICAgICovXG4gICAgdG9nZ2xlQ29udGV4dEZpbHRlcihjb250ZXh0OiBRdWVzdENvbnRleHQgfCBcImFueVwiKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCA9IFwiYW55XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBjb250ZXh0IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHRhZyBpbiB0aGUgYWN0aXZlIHRhZyBsaXN0XG4gICAgICovXG4gICAgdG9nZ2xlVGFnKHRhZzogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5pbmRleE9mKHRhZyk7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLnNwbGljZShpZHgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVUYWdzLnB1c2godGFnKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgVEZpbGUsIFRGb2xkZXIsIE5vdGljZSwgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgU2tpbGwsIE1vZGlmaWVyLCBEYWlseU1pc3Npb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IEF1ZGlvQ29udHJvbGxlciwgVGlueUVtaXR0ZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IENoYW9zTW9kYWwsIFZpY3RvcnlNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfTU9ESUZJRVI6IE1vZGlmaWVyID0geyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm8gZWZmZWN0cy5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH07XG5leHBvcnQgY29uc3QgQ0hBT1NfVEFCTEU6IE1vZGlmaWVyW10gPSBbXG4gICAgeyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm9ybWFsLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi4piA77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiRmxvdyBTdGF0ZVwiLCBkZXNjOiBcIis1MCUgWFAuXCIsIHhwTXVsdDogMS41LCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfjIpcIiB9LFxuICAgIHsgbmFtZTogXCJXaW5kZmFsbFwiLCBkZXNjOiBcIis1MCUgR29sZC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMS41LCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SsFwiIH0sXG4gICAgeyBuYW1lOiBcIkluZmxhdGlvblwiLCBkZXNjOiBcIlByaWNlcyAyeC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAyLCBpY29uOiBcIvCfk4hcIiB9LFxuICAgIHsgbmFtZTogXCJCcmFpbiBGb2dcIiwgZGVzYzogXCJYUCAwLjV4LlwiLCB4cE11bHQ6IDAuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yr77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiUml2YWwgU2Fib3RhZ2VcIiwgZGVzYzogXCJHb2xkIDAuNXguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDAuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCflbXvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJBZHJlbmFsaW5lXCIsIGRlc2M6IFwiMnggWFAsIC01IEhQL1EuXCIsIHhwTXVsdDogMiwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5KJXCIgfVxuXTtcblxuY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgICAxMDogeyBuYW1lOiBcIlRoZSBHYXRla2VlcGVyXCIsIGRlc2M6IFwiVGhlIGZpcnN0IG1ham9yIGZpbHRlci5cIiwgaHBfcGVuOiAyMCB9LFxuICAgIDIwOiB7IG5hbWU6IFwiVGhlIFNoYWRvdyBTZWxmXCIsIGRlc2M6IFwiWW91ciBvd24gYmFkIGhhYml0cyBtYW5pZmVzdC5cIiwgaHBfcGVuOiAzMCB9LFxuICAgIDMwOiB7IG5hbWU6IFwiVGhlIE1vdW50YWluXCIsIGRlc2M6IFwiVGhlIHBlYWsgaXMgdmlzaWJsZS5cIiwgaHBfcGVuOiA0MCB9LFxuICAgIDUwOiB7IG5hbWU6IFwiU2lzeXBodXMgUHJpbWVcIiwgZGVzYzogXCJPbmUgbXVzdCBpbWFnaW5lIFNpc3lwaHVzIGhhcHB5LlwiLCBocF9wZW46IDk5IH1cbn07XG5cbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiUHJvY2VzcyBhbGwgZmlsZXMgaW4gJ1NjcmFwcydcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInplcm9faW5ib3hcIiB9LCAvLyBbRklYXSBDb3JyZWN0IGNoZWNrIElEXG4gICAgeyBpZDogXCJzcGVjaWFsaXN0XCIsIG5hbWU6IFwi8J+OryBTcGVjaWFsaXN0XCIsIGRlc2M6IFwiVXNlIHRoZSBzYW1lIHNraWxsIDMgdGltZXNcIiwgdGFyZ2V0OiAzLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcInNraWxsX3JlcGVhdFwiIH0sXG4gICAgeyBpZDogXCJoaWdoX3N0YWtlc1wiLCBuYW1lOiBcIvCfkqogSGlnaCBTdGFrZXNcIiwgZGVzYzogXCJDb21wbGV0ZSAxIEhpZ2ggU3Rha2VzIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAzMCB9LCBjaGVjazogXCJoaWdoX3N0YWtlc1wiIH0sXG4gICAgeyBpZDogXCJzcGVlZF9kZW1vblwiLCBuYW1lOiBcIuKaoSBTcGVlZCBEZW1vblwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGhpbiAyaCBvZiBjcmVhdGlvblwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMjUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiZmFzdF9jb21wbGV0ZVwiIH0sXG4gICAgeyBpZDogXCJzeW5lcmdpc3RcIiwgbmFtZTogXCLwn5SXIFN5bmVyZ2lzdFwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGggUHJpbWFyeSArIFNlY29uZGFyeSBza2lsbFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTAgfSwgY2hlY2s6IFwic3luZXJneVwiIH0sXG4gICAgeyBpZDogXCJzdXJ2aXZvclwiLCBuYW1lOiBcIvCfm6HvuI8gU3Vydml2b3JcIiwgZGVzYzogXCJEb24ndCB0YWtlIGFueSBkYW1hZ2UgdG9kYXlcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDIwIH0sIGNoZWNrOiBcIm5vX2RhbWFnZVwiIH0sXG4gICAgeyBpZDogXCJyaXNrX3Rha2VyXCIsIG5hbWU6IFwi8J+OsiBSaXNrIFRha2VyXCIsIGRlc2M6IFwiQ29tcGxldGUgRGlmZmljdWx0eSA0KyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiaGFyZF9xdWVzdFwiIH1cbl07XG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c0VuZ2luZSBleHRlbmRzIFRpbnlFbWl0dGVyIHtcbiAgICBhcHA6IEFwcDtcbiAgICBwbHVnaW46IGFueTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuICAgIGFuYWx5dGljc0VuZ2luZTogQW5hbHl0aWNzRW5naW5lO1xuICAgIG1lZGl0YXRpb25FbmdpbmU6IE1lZGl0YXRpb25FbmdpbmU7XG4gICAgcmVzZWFyY2hFbmdpbmU6IFJlc2VhcmNoRW5naW5lO1xuICAgIGNoYWluc0VuZ2luZTogQ2hhaW5zRW5naW5lO1xuICAgIGZpbHRlcnNFbmdpbmU6IEZpbHRlcnNFbmdpbmU7XG5cbiAgICAvLyBbRkVBVFVSRV0gVW5kbyBCdWZmZXJcbiAgICBwcml2YXRlIGRlbGV0ZWRRdWVzdEJ1ZmZlcjogQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZzsgcGF0aDogc3RyaW5nOyBkZWxldGVkQXQ6IG51bWJlciB9PiA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogYW55LCBhdWRpbzogQXVkaW9Db250cm9sbGVyKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuYXBwID0gYXBwO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICAgICAgdGhpcy5hdWRpbyA9IGF1ZGlvO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUgPSBuZXcgQW5hbHl0aWNzRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lID0gbmV3IE1lZGl0YXRpb25FbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLnJlc2VhcmNoRW5naW5lID0gbmV3IFJlc2VhcmNoRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmFwcCwgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMuY2hhaW5zRW5naW5lID0gbmV3IENoYWluc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMuZmlsdGVyc0VuZ2luZSA9IG5ldyBGaWx0ZXJzRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICB9XG5cbiAgICBnZXQgc2V0dGluZ3MoKTogU2lzeXBodXNTZXR0aW5ncyB7IHJldHVybiB0aGlzLnBsdWdpbi5zZXR0aW5nczsgfVxuICAgIHNldCBzZXR0aW5ncyh2YWw6IFNpc3lwaHVzU2V0dGluZ3MpIHsgdGhpcy5wbHVnaW4uc2V0dGluZ3MgPSB2YWw7IH1cblxuICAgIGFzeW5jIHNhdmUoKSB7IGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7IH1cblxuICAgIHJvbGxEYWlseU1pc3Npb25zKCkge1xuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBbLi4uTUlTU0lPTl9QT09MXTtcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWQ6IERhaWx5TWlzc2lvbltdID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYXZhaWxhYmxlLmxlbmd0aCA9PT0gMCkgYnJlYWs7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhdmFpbGFibGUubGVuZ3RoKTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npb24gPSBhdmFpbGFibGUuc3BsaWNlKGlkeCwgMSlbMF07XG4gICAgICAgICAgICBzZWxlY3RlZC5wdXNoKHsgLi4ubWlzc2lvbiwgY2hlY2tGdW5jOiBtaXNzaW9uLmNoZWNrLCBwcm9ncmVzczogMCwgY29tcGxldGVkOiBmYWxzZSB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgPSBzZWxlY3RlZDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSA9IDA7XG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkgPSB7fTtcbiAgICB9XG5cbiAgICBjaGVja0RhaWx5TWlzc2lvbnMoY29udGV4dDogeyB0eXBlPzogc3RyaW5nOyBkaWZmaWN1bHR5PzogbnVtYmVyOyBza2lsbD86IHN0cmluZzsgc2Vjb25kYXJ5U2tpbGw/OiBzdHJpbmc7IGhpZ2hTdGFrZXM/OiBib29sZWFuOyBxdWVzdENyZWF0ZWQ/OiBudW1iZXIgfSkge1xuICAgICAgICBjb25zdCBub3cgPSBtb21lbnQoKTtcbiAgICAgICAgbGV0IGp1c3RGaW5pc2hlZEFsbCA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5mb3JFYWNoKG1pc3Npb24gPT4ge1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSByZXR1cm47XG4gICAgICAgICAgICBzd2l0Y2ggKG1pc3Npb24uY2hlY2tGdW5jKSB7XG4gICAgICAgICAgICAgICAgLy8gW0ZJWF0gWmVybyBJbmJveCBMb2dpY1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ6ZXJvX2luYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwcyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlNjcmFwc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmFwcyBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibW9ybmluZ190cml2aWFsXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPT09IDEgJiYgbm93LmhvdXIoKSA8IDEwKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJxdWVzdF9jb3VudFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5OyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGlnaF9zdGFrZXNcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuaGlnaFN0YWtlcykgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFzdF9jb21wbGV0ZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5xdWVzdENyZWF0ZWQgJiYgbW9tZW50KCkuZGlmZihtb21lbnQoY29udGV4dC5xdWVzdENyZWF0ZWQpLCAnaG91cnMnKSA8PSAyKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzeW5lcmd5XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAhPT0gXCJOb25lXCIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm5vX2RhbWFnZVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImRhbWFnZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gMDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhhcmRfcXVlc3RcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSAmJiBjb250ZXh0LmRpZmZpY3VsdHkgPj0gNCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic2tpbGxfcmVwZWF0XCI6IFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSA9ICh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdIHx8IDApICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSBNYXRoLm1heCgwLCAuLi5PYmplY3QudmFsdWVzKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5wcm9ncmVzcyA+PSBtaXNzaW9uLnRhcmdldCAmJiAhbWlzc2lvbi5jb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICBtaXNzaW9uLmNvbXBsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBtaXNzaW9uLnJld2FyZC54cDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgKz0gbWlzc2lvbi5yZXdhcmQuZ29sZDtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDinIUgTWlzc2lvbiBDb21wbGV0ZTogJHttaXNzaW9uLm5hbWV9YCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyB3YXMgdGhlIGxhc3Qgb25lXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKSkganVzdEZpbmlzaGVkQWxsID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gW0ZJWF0gQXdhcmQgQm9udXMgR29sZFxuICAgICAgICBpZiAoanVzdEZpbmlzaGVkQWxsKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgKz0gNTA7XG4gICAgICAgICAgICBuZXcgTm90aWNlKFwi8J+OiSBBbGwgTWlzc2lvbnMgQ29tcGxldGUhICs1MCBCb251cyBHb2xkXCIpO1xuICAgICAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgZ2V0RGlmZmljdWx0eU51bWJlcihkaWZmTGFiZWw6IHN0cmluZyk6IG51bWJlciB7XG4gICAgICAgIGNvbnN0IG1hcDogYW55ID0geyBcIlRyaXZpYWxcIjogMSwgXCJFYXN5XCI6IDIsIFwiTWVkaXVtXCI6IDMsIFwiSGFyZFwiOiA0LCBcIlNVSUNJREVcIjogNSB9O1xuICAgICAgICByZXR1cm4gbWFwW2RpZmZMYWJlbF0gfHwgMztcbiAgICB9XG5cbiAgICBhc3luYyBjaGVja0RhaWx5TG9naW4oKSB7XG4gICAgICAgIGNvbnN0IHRvZGF5ID0gbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSB7XG4gICAgICAgICAgICBjb25zdCBkYXlzRGlmZiA9IG1vbWVudCgpLmRpZmYobW9tZW50KHRoaXMuc2V0dGluZ3MubGFzdExvZ2luKSwgJ2RheXMnKTtcbiAgICAgICAgICAgIGlmIChkYXlzRGlmZiA+IDIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByb3REYW1hZ2UgPSAoZGF5c0RpZmYgLSAxKSAqIDEwO1xuICAgICAgICAgICAgICAgIGlmIChyb3REYW1hZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gcm90RGFtYWdlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhpc3RvcnkucHVzaCh7IGRhdGU6IHRvZGF5LCBzdGF0dXM6IFwicm90XCIsIHhwRWFybmVkOiAtcm90RGFtYWdlIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4gIT09IHRvZGF5KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnNldHRpbmdzLm1heEhwLCB0aGlzLnNldHRpbmdzLmhwICsgMjApO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID0gMDtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IFwiXCI7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiA9IHRvZGF5O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSdXN0IExvZ2ljXG4gICAgICAgICAgICBjb25zdCB0b2RheU1vbWVudCA9IG1vbWVudCgpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocy5sYXN0VXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9kYXlNb21lbnQuZGlmZihtb21lbnQocy5sYXN0VXNlZCksICdkYXlzJykgPiAzICYmICF0aGlzLmlzUmVzdGluZygpKSB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgcy5ydXN0ID0gTWF0aC5taW4oMTAsIChzLnJ1c3QgfHwgMCkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMueHBSZXEgPSBNYXRoLmZsb29yKHMueHBSZXEgKiAxLjEpOyBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlICE9PSB0b2RheSkgdGhpcy5yb2xsRGFpbHlNaXNzaW9ucygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsQ2hhb3ModHJ1ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNvbXBsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmICghZm0pIHJldHVybjtcbiAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gZmlsZS5iYXNlbmFtZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmNoYWluc0VuZ2luZS5pc1F1ZXN0SW5DaGFpbihxdWVzdE5hbWUpKSB7XG4gICAgICAgICAgICAgY29uc3QgY2FuU3RhcnQgPSB0aGlzLmNoYWluc0VuZ2luZS5jYW5TdGFydFF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgICAgICAgaWYgKCFjYW5TdGFydCkgeyBuZXcgTm90aWNlKFwiTG9ja2VkIGJ5IENoYWluLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuY29tcGxldGVDaGFpblF1ZXN0KHF1ZXN0TmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZm0uaXNfYm9zcykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmaWxlLmJhc2VuYW1lLm1hdGNoKC9CT1NTX0xWTChcXGQrKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuZGVmZWF0Qm9zcyhsZXZlbCk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ2FtZVdvbikgbmV3IFZpY3RvcnlNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lLnRyYWNrRGFpbHlNZXRyaWNzKFwicXVlc3RfY29tcGxldGVcIiwgMSk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbENvbWJhdCsrO1xuICAgICAgICBcbiAgICAgICAgbGV0IHhwID0gKGZtLnhwX3Jld2FyZCB8fCAyMCkgKiB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIueHBNdWx0O1xuICAgICAgICBsZXQgZ29sZCA9IChmbS5nb2xkX3Jld2FyZCB8fCAwKSAqIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5nb2xkTXVsdDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNraWxsTmFtZSA9IGZtLnNraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgICAgIGlmIChza2lsbCkge1xuICAgICAgICAgICAgc2tpbGwucnVzdCA9IDA7XG4gICAgICAgICAgICBza2lsbC54cFJlcSA9IE1hdGguZmxvb3Ioc2tpbGwueHBSZXEgLyAxLjEpO1xuICAgICAgICAgICAgc2tpbGwubGFzdFVzZWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBza2lsbC54cCArPSAxO1xuICAgICAgICAgICAgaWYgKHNraWxsLnhwID49IHNraWxsLnhwUmVxKSB7IHNraWxsLmxldmVsKys7IHNraWxsLnhwID0gMDsgbmV3IE5vdGljZShg8J+noCAke3NraWxsLm5hbWV9IExldmVsZWQgVXAhYCk7IH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlY29uZGFyeSA9IGZtLnNlY29uZGFyeV9za2lsbCB8fCBcIk5vbmVcIjtcbiAgICAgICAgaWYgKHNlY29uZGFyeSAmJiBzZWNvbmRhcnkgIT09IFwiTm9uZVwiKSB7XG4gICAgICAgICAgICBjb25zdCBzZWNTa2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHNlY29uZGFyeSk7XG4gICAgICAgICAgICBpZiAoc2VjU2tpbGwpIHtcbiAgICAgICAgICAgICAgICBpZighc2tpbGwuY29ubmVjdGlvbnMpIHNraWxsLmNvbm5lY3Rpb25zID0gW107XG4gICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zLmluY2x1ZGVzKHNlY29uZGFyeSkpIHsgc2tpbGwuY29ubmVjdGlvbnMucHVzaChzZWNvbmRhcnkpOyBuZXcgTm90aWNlKGDwn5SXIE5ldXJhbCBMaW5rIEVzdGFibGlzaGVkYCk7IH1cbiAgICAgICAgICAgICAgICB4cCArPSBNYXRoLmZsb29yKHNlY1NraWxsLmxldmVsICogMC41KTsgXG4gICAgICAgICAgICAgICAgc2VjU2tpbGwueHAgKz0gMC41OyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0geHA7IHRoaXMuc2V0dGluZ3MuZ29sZCArPSBnb2xkO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWF0gQWRyZW5hbGluZSBzZWxmLWRhbWFnZSBjb3VudGluZyB0b3dhcmQgbG9ja2Rvd25cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5uYW1lID09PSBcIkFkcmVuYWxpbmVcIikge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSA1O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IDU7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTAgJiYgIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJsb2NrZG93blwiKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiT3ZlcmV4ZXJ0aW9uISBMT0NLRE9XTiBJTklUSUFURUQuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MueHAgPj0gdGhpcy5zZXR0aW5ncy54cFJlcSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sZXZlbCsrOyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1zZ3MgPSB0aGlzLmFuYWx5dGljc0VuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgICAgICBtc2dzLmZvckVhY2gobSA9PiBuZXcgTm90aWNlKG0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKFsxMCwgMjAsIDMwLCA1MF0uaW5jbHVkZXModGhpcy5zZXR0aW5ncy5sZXZlbCkpIHRoaXMuc3Bhd25Cb3NzKHRoaXMuc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS51cGRhdGVTdHJlYWsoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgXG4gICAgICAgICAgICB0eXBlOiBcImNvbXBsZXRlXCIsIFxuICAgICAgICAgICAgZGlmZmljdWx0eTogdGhpcy5nZXREaWZmaWN1bHR5TnVtYmVyKGZtLmRpZmZpY3VsdHkpLCBcbiAgICAgICAgICAgIHNraWxsOiBza2lsbE5hbWUsIFxuICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHNlY29uZGFyeSxcbiAgICAgICAgICAgIGhpZ2hTdGFrZXM6IGZtLmhpZ2hfc3Rha2VzIFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBhcmNoaXZlUGF0aCA9IFwiQWN0aXZlX1J1bi9BcmNoaXZlXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGFyY2hpdmVQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGFyY2hpdmVQYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmKSA9PiB7IGYuc3RhdHVzID0gXCJjb21wbGV0ZWRcIjsgZi5jb21wbGV0ZWRfYXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7IH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2FyY2hpdmVQYXRofS8ke2ZpbGUubmFtZX1gKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgc3Bhd25Cb3NzKGxldmVsOiBudW1iZXIpIHtcbiAgICAgICAgY29uc3QgYm9zcyA9IEJPU1NfREFUQVtsZXZlbF07XG4gICAgICAgIGlmICghYm9zcykgcmV0dXJuO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImhlYXJ0YmVhdFwiKTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoO+4jyBBTk9NQUxZIERFVEVDVEVELi4uXCIsIDIwMDApO1xuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQk9TUyBTUEFXTkVEOiAke2Jvc3MubmFtZX1gKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlUXVlc3QoXG4gICAgICAgICAgICAgICAgYEJPU1NfTFZMJHtsZXZlbH0gLSAke2Jvc3MubmFtZX1gLCA1LCBcIkJvc3NcIiwgXCJOb25lXCIsIFxuICAgICAgICAgICAgICAgIG1vbWVudCgpLmFkZCgzLCAnZGF5cycpLnRvSVNPU3RyaW5nKCksIHRydWUsIFwiQ3JpdGljYWxcIiwgdHJ1ZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSwgMzAwMCk7XG4gICAgfVxuXG4gICAgYXN5bmMgZmFpbFF1ZXN0KGZpbGU6IFRGaWxlLCBtYW51YWxBYm9ydDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVzdGluZygpICYmICFtYW51YWxBYm9ydCkgeyBuZXcgTm90aWNlKFwiUmVzdCBEYXkgcHJvdGVjdGlvbi5cIik7IHJldHVybjsgfVxuICAgICAgICBpZiAodGhpcy5pc1NoaWVsZGVkKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJTaGllbGRlZCFcIik7IHJldHVybjsgfVxuXG4gICAgICAgIGxldCBkYW1hZ2UgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWF0gQXBwbHkgQm9zcyBQZW5hbHR5XG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZmlsZS5iYXNlbmFtZS5tYXRjaCgvQk9TU19MVkwoXFxkKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gcGFyc2VJbnQobWF0Y2hbMV0pO1xuICAgICAgICAgICAgICAgIGlmIChCT1NTX0RBVEFbbGV2ZWxdKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhbWFnZSArPSBCT1NTX0RBVEFbbGV2ZWxdLmhwX3BlbjtcbiAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pig77iPIEJvc3MgQ3J1c2g6ICske0JPU1NfREFUQVtsZXZlbF0uaHBfcGVufSBEYW1hZ2VgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5nb2xkIDwgMCkgZGFtYWdlICo9IDI7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IGRhbWFnZTtcbiAgICAgICAgaWYgKCFtYW51YWxBYm9ydCkgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSAxO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJmYWlsXCIpO1xuICAgICAgICB0aGlzLmNoZWNrRGFpbHlNaXNzaW9ucyh7IHR5cGU6IFwiZGFtYWdlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTApIHtcbiAgICAgICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZVBhdGh9L1tGQUlMRURdICR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgY3JlYXRlUXVlc3QobmFtZTogc3RyaW5nLCBkaWZmOiBudW1iZXIsIHNraWxsOiBzdHJpbmcsIHNlY1NraWxsOiBzdHJpbmcsIGRlYWRsaW5lSXNvOiBzdHJpbmcsIGhpZ2hTdGFrZXM6IGJvb2xlYW4sIHByaW9yaXR5OiBzdHJpbmcsIGlzQm9zczogYm9vbGVhbikge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCJMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBcbiAgICAgICAgbGV0IHhwUmV3YXJkID0gMDsgbGV0IGdvbGRSZXdhcmQgPSAwOyBsZXQgZGlmZkxhYmVsID0gXCJcIjtcbiAgICAgICAgc3dpdGNoKGRpZmYpIHtcbiAgICAgICAgICAgIGNhc2UgMTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjA1KTsgZ29sZFJld2FyZCA9IDEwOyBkaWZmTGFiZWwgPSBcIlRyaXZpYWxcIjsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4xMCk7IGdvbGRSZXdhcmQgPSAyMDsgZGlmZkxhYmVsID0gXCJFYXN5XCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMjApOyBnb2xkUmV3YXJkID0gNDA7IGRpZmZMYWJlbCA9IFwiTWVkaXVtXCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuNDApOyBnb2xkUmV3YXJkID0gODA7IGRpZmZMYWJlbCA9IFwiSGFyZFwiOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNTogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjYwKTsgZ29sZFJld2FyZCA9IDE1MDsgZGlmZkxhYmVsID0gXCJTVUlDSURFXCI7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Jvc3MpIHsgeHBSZXdhcmQ9MTAwMDsgZ29sZFJld2FyZD0xMDAwOyBkaWZmTGFiZWw9XCLimKDvuI8gQk9TU1wiOyB9XG4gICAgICAgIGlmIChoaWdoU3Rha2VzICYmICFpc0Jvc3MpIGdvbGRSZXdhcmQgPSBNYXRoLmZsb29yKGdvbGRSZXdhcmQgKiAxLjUpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBcIkFjdGl2ZV9SdW4vUXVlc3RzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHJvb3RQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHJvb3RQYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhZmVOYW1lID0gbmFtZS5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksICdfJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgY29uc3QgY29udGVudCA9IGAtLS1cbnR5cGU6IHF1ZXN0XG5zdGF0dXM6IGFjdGl2ZVxuZGlmZmljdWx0eTogJHtkaWZmTGFiZWx9XG5wcmlvcml0eTogJHtwcmlvcml0eX1cbnhwX3Jld2FyZDogJHt4cFJld2FyZH1cbmdvbGRfcmV3YXJkOiAke2dvbGRSZXdhcmR9XG5za2lsbDogJHtza2lsbH1cbnNlY29uZGFyeV9za2lsbDogJHtzZWNTa2lsbH1cbmhpZ2hfc3Rha2VzOiAke2hpZ2hTdGFrZXMgPyAndHJ1ZScgOiAnZmFsc2UnfVxuaXNfYm9zczogJHtpc0Jvc3N9XG5jcmVhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cbmRlYWRsaW5lOiAke2RlYWRsaW5lSXNvfVxuLS0tXG4jIOKalO+4jyAke25hbWV9YDtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtyb290UGF0aH0vJHtzYWZlTmFtZX0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICAgICAgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIC8vIFtGRUFUVVJFXSBVbmRvIERlbGV0aW9uIFN5c3RlbVxuICAgIGFzeW5jIGRlbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7IFxuICAgICAgICAvLyBSZWFkIGFuZCBidWZmZXIgZm9yIHVuZG9cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucHVzaCh7XG4gICAgICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcGF0aDogZmlsZS5wYXRoLFxuICAgICAgICAgICAgICAgIGRlbGV0ZWRBdDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBLZWVwIGJ1ZmZlciBzbWFsbCAobWF4IDUgaXRlbXMpXG4gICAgICAgICAgICBpZiAodGhpcy5kZWxldGVkUXVlc3RCdWZmZXIubGVuZ3RoID4gNSkgdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIuc2hpZnQoKTtcbiAgICAgICAgfSBjYXRjaChlKSB7IGNvbnNvbGUuZXJyb3IoXCJCdWZmZXIgZmFpbFwiLCBlKTsgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTsgXG4gICAgICAgIHRoaXMuc2F2ZSgpOyBcbiAgICB9XG5cbiAgICBhc3luYyB1bmRvTGFzdERlbGV0aW9uKCkge1xuICAgICAgICBjb25zdCBsYXN0ID0gdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucG9wKCk7XG4gICAgICAgIGlmICghbGFzdCkgeyBuZXcgTm90aWNlKFwiTm90aGluZyB0byB1bmRvLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICAvLyBQcmV2ZW50IHVuZG9pbmcgaWYgPiA2MCBzZWNvbmRzIChvcHRpb25hbCwgYnV0IGdvb2QgZm9yIGFudGktY2hlZXNlKVxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGxhc3QuZGVsZXRlZEF0ID4gNjAwMDApIHsgbmV3IE5vdGljZShcIlRvbyBsYXRlIHRvIHVuZG8uXCIpOyByZXR1cm47IH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGxhc3QucGF0aCwgbGFzdC5jb250ZW50KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlc3RvcmVkOiAke2xhc3QubmFtZX1gKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkNvdWxkIG5vdCByZXN0b3JlIGZpbGUgKHBhdGggbWF5IGJlIHRha2VuKS5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjaGVja0RlYWRsaW5lcygpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYXSBDb25zdGFudCBaZXJvIEluYm94IENoZWNrXG4gICAgICAgIGNvbnN0IHplcm9JbmJveCA9IHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5maW5kKG0gPT4gbS5jaGVja0Z1bmMgPT09IFwiemVyb19pbmJveFwiICYmICFtLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICh6ZXJvSW5ib3gpIHtcbiAgICAgICAgICAgIGNvbnN0IHNjcmFwcyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlNjcmFwc1wiKTtcbiAgICAgICAgICAgIGlmIChzY3JhcHMgaW5zdGFuY2VvZiBURm9sZGVyICYmIHNjcmFwcy5jaGlsZHJlbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDb21wbGV0ZSBtaXNzaW9uIHZpYSBzdGFuZGFyZCBjaGVjayB0byB0cmlnZ2VyIHJld2FyZHNcbiAgICAgICAgICAgICAgICB0aGlzLmNoZWNrRGFpbHlNaXNzaW9ucyh7IHR5cGU6IFwiY2hlY2tcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lICYmIG1vbWVudCgpLmlzQWZ0ZXIobW9tZW50KGZtLmRlYWRsaW5lKSkpIGF3YWl0IHRoaXMuZmFpbFF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJvbGxDaGFvcyhzaG93TW9kYWw6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICBjb25zdCByb2xsID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgaWYgKHJvbGwgPCAwLjQpIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllciA9IERFRkFVTFRfTU9ESUZJRVI7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKENIQU9TX1RBQkxFLmxlbmd0aCAtIDEpKSArIDE7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBDSEFPU19UQUJMRVtpZHhdO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAoc2hvd01vZGFsKSBuZXcgQ2hhb3NNb2RhbCh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYXR0ZW1wdFJlY292ZXJ5KCkge1xuICAgICAgICBpZiAoIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTm90IGluIExvY2tkb3duLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXMgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTtcbiAgICAgICAgbmV3IE5vdGljZShgUmVjb3ZlcmluZy4uLiAke2hvdXJzfWggJHttaW51dGVzfW0gcmVtYWluaW5nLmApO1xuICAgIH1cblxuICAgIGlzTG9ja2VkRG93bigpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKTsgfVxuICAgIGlzUmVzdGluZygpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsICYmIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCkpOyB9XG4gICAgaXNTaGllbGRlZCgpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5zaGllbGRlZFVudGlsKSk7IH1cblxuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogYW55LCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdCh0aXRsZSwgdHlwZSwgbGlua2VkU2tpbGwsIGxpbmtlZENvbWJhdFF1ZXN0KTtcbiAgICAgICAgaWYocmVzLnN1Y2Nlc3MpIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpOyBlbHNlIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkOiBzdHJpbmcsIHdvcmRzOiBudW1iZXIpIHsgdGhpcy5yZXNlYXJjaEVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QoaWQsIHdvcmRzKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBkZWxldGVSZXNlYXJjaFF1ZXN0KGlkOiBzdHJpbmcpIHsgdGhpcy5yZXNlYXJjaEVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KGlkKTsgdGhpcy5zYXZlKCk7IH1cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQsIHdvcmRzKTsgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuICAgIFxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHsgY29uc3QgciA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5tZWRpdGF0ZSgpOyBuZXcgTm90aWNlKHIubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBhc3luYyBjcmVhdGVTY3JhcChjb250ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IFwiU2NyYXBzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQgSEgtbW0tc3NcIik7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShgJHtmb2xkZXJQYXRofS8ke3RpbWVzdGFtcH0ubWRgLCBjb250ZW50KTtcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoSBTY3JhcCBDYXB0dXJlZFwiKTsgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgZ2VuZXJhdGVTa2lsbEdyYXBoKCkgeyAvKiBFeGlzdGluZyBDYW52YXMgTG9naWMgKi8gXG4gICAgICAgIGNvbnN0IHNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzO1xuICAgICAgICBpZiAoc2tpbGxzLmxlbmd0aCA9PT0gMCkgeyBuZXcgTm90aWNlKFwiTm8gbmV1cmFsIG5vZGVzIGZvdW5kLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdOyBjb25zdCBlZGdlczogYW55W10gPSBbXTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSAyNTA7IGNvbnN0IGhlaWdodCA9IDE0MDsgXG4gICAgICAgIGNvbnN0IHJhZGl1cyA9IE1hdGgubWF4KDQwMCwgc2tpbGxzLmxlbmd0aCAqIDYwKTtcbiAgICAgICAgY29uc3QgY2VudGVyWCA9IDA7IGNvbnN0IGNlbnRlclkgPSAwOyBjb25zdCBhbmdsZVN0ZXAgPSAoMiAqIE1hdGguUEkpIC8gc2tpbGxzLmxlbmd0aDtcblxuICAgICAgICBza2lsbHMuZm9yRWFjaCgoc2tpbGwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IGluZGV4ICogYW5nbGVTdGVwO1xuICAgICAgICAgICAgY29uc3QgeCA9IGNlbnRlclggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICAgICAgICBjb25zdCB5ID0gY2VudGVyWSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICAgICAgICAgIGxldCBjb2xvciA9IFwiNFwiOyBcbiAgICAgICAgICAgIGlmIChza2lsbC5ydXN0ID4gMCkgY29sb3IgPSBcIjFcIjsgZWxzZSBpZiAoc2tpbGwubGV2ZWwgPj0gMTApIGNvbG9yID0gXCI2XCI7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gc2tpbGwucnVzdCA+IDAgPyBcIuKaoO+4jyBSVVNUWVwiIDogXCLwn5+iIEFDVElWRVwiO1xuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLmZsb29yKChza2lsbC54cCAvIHNraWxsLnhwUmVxKSAqIDEwMCk7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCMjICR7c2tpbGwubmFtZX1cXG4qKkx2ICR7c2tpbGwubGV2ZWx9KipcXG4ke3N0YXR1c0ljb259XFxuWFA6ICR7c2tpbGwueHB9LyR7c2tpbGwueHBSZXF9ICgke3Byb2dyZXNzfSUpYDsgXG4gICAgICAgICAgICBub2Rlcy5wdXNoKHsgaWQ6IHNraWxsLm5hbWUsIHg6IE1hdGguZmxvb3IoeCksIHk6IE1hdGguZmxvb3IoeSksIHdpZHRoLCBoZWlnaHQsIHR5cGU6IFwidGV4dFwiLCB0ZXh0LCBjb2xvciB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2tpbGxzLmZvckVhY2goc2tpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKHNraWxsLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwuY29ubmVjdGlvbnMuZm9yRWFjaCh0YXJnZXROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSB0YXJnZXROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXMucHVzaCh7IGlkOiBgJHtza2lsbC5uYW1lfS0ke3RhcmdldE5hbWV9YCwgZnJvbU5vZGU6IHNraWxsLm5hbWUsIGZyb21TaWRlOiBcInJpZ2h0XCIsIHRvTm9kZTogdGFyZ2V0TmFtZSwgdG9TaWRlOiBcImxlZnRcIiwgY29sb3I6IFwiNFwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNhbnZhc0RhdGEgPSB7IG5vZGVzLCBlZGdlcyB9O1xuICAgICAgICBjb25zdCBwYXRoID0gXCJBY3RpdmVfUnVuL05ldXJhbF9IdWIuY2FudmFzXCI7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpKTsgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgdXBkYXRlZC5cIik7IH0gXG4gICAgICAgIGVsc2UgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpOyBuZXcgTm90aWNlKFwiTmV1cmFsIEh1YiBjcmVhdGVkLlwiKTsgfVxuICAgIH1cblxuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdHM6IHN0cmluZ1tdKSB7IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmNyZWF0ZVF1ZXN0Q2hhaW4obmFtZSwgcXVlc3RzKTsgYXdhaXQgdGhpcy5zYXZlKCk7IH1cbiAgICBnZXRBY3RpdmVDaGFpbigpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IH1cbiAgICBnZXRDaGFpblByb2dyZXNzKCkgeyByZXR1cm4gdGhpcy5jaGFpbnNFbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpOyB9XG4gICAgYXN5bmMgYnJlYWtDaGFpbigpIHsgYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuYnJlYWtDaGFpbigpOyBhd2FpdCB0aGlzLnNhdmUoKTsgfVxuICAgIFxuICAgIHNldEZpbHRlclN0YXRlKGVuZXJneTogYW55LCBjb250ZXh0OiBhbnksIHRhZ3M6IHN0cmluZ1tdKSB7IHRoaXMuZmlsdGVyc0VuZ2luZS5zZXRGaWx0ZXJTdGF0ZShlbmVyZ3ksIGNvbnRleHQsIHRhZ3MpOyB0aGlzLnNhdmUoKTsgfVxuICAgIGNsZWFyRmlsdGVycygpIHsgdGhpcy5maWx0ZXJzRW5naW5lLmNsZWFyRmlsdGVycygpOyB0aGlzLnNhdmUoKTsgfVxuICAgIFxuICAgIGdldEdhbWVTdGF0cygpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdldEdhbWVTdGF0cygpOyB9XG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKTsgfVxuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTsgfVxuXG4gICAgdGF1bnQodHJpZ2dlcjogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1zZ3M6IGFueSA9IHsgXG4gICAgICAgICAgICBcImZhaWxcIjogW1wiUGF0aGV0aWMuXCIsIFwiVHJ5IGFnYWluLlwiLCBcIklzIHRoYXQgYWxsP1wiXSwgXG4gICAgICAgICAgICBcImxldmVsX3VwXCI6IFtcIlBvd2VyIG92ZXJ3aGVsbWluZy5cIiwgXCJBc2NlbmRpbmcuXCJdLFxuICAgICAgICAgICAgXCJsb3dfaHBcIjogW1wiQmxlZWRpbmcgb3V0Li4uXCIsIFwiSG9sZCBvbi5cIl0gXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG1zZyA9IG1zZ3NbdHJpZ2dlcl0gPyBtc2dzW3RyaWdnZXJdW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1zZ3NbdHJpZ2dlcl0ubGVuZ3RoKV0gOiBcIk9ic2VydmUuXCI7XG4gICAgICAgIG5ldyBOb3RpY2UoYFNZU1RFTTogJHttc2d9YCk7XG4gICAgfVxuICAgIFxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKC8oLis/KVxccypcXC8oXFxkKS8pO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlUXVlc3QobWF0Y2hbMV0sIHBhcnNlSW50KG1hdGNoWzJdKSwgXCJOb25lXCIsIFwiTm9uZVwiLCBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCksIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVF1ZXN0KHRleHQsIDMsIFwiTm9uZVwiLCBcIk5vbmVcIiwgbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpLCBmYWxzZSwgXCJOb3JtYWxcIiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgdHJpZ2dlckRlYXRoKCkgeyBcbiAgICAgICAgLy8gW0ZJWF0gQXJjaGl2ZSBhY3RpdmUgZmlsZXMgdG8gR3JhdmV5YXJkXG4gICAgICAgIGNvbnN0IGFjdGl2ZUZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBncmF2ZUZvbGRlciA9IFwiR3JhdmV5YXJkL0RlYXRocy9cIiArIG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tREQtSEhtbVwiKTtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZ3JhdmVGb2xkZXIpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVGb2xkZXIpO1xuXG4gICAgICAgIGlmIChhY3RpdmVGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYWN0aXZlRm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlRm9sZGVyfS8ke2ZpbGUubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsID0gMTsgdGhpcy5zZXR0aW5ncy5ocCA9IDEwMDsgdGhpcy5zZXR0aW5ncy5nb2xkID0gMDsgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgPSAodGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCB8fCAwKSArIDE7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBURmlsZSwgVEZvbGRlciwgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IFNpc3lwaHVzUGx1Z2luIGZyb20gJy4uL21haW4nO1xuaW1wb3J0IHsgUXVlc3RNb2RhbCwgU2hvcE1vZGFsLCBTa2lsbERldGFpbE1vZGFsLCBTa2lsbE1hbmFnZXJNb2RhbCwgQ29uZmlybU1vZGFsIH0gZnJvbSAnLi9tb2RhbHMnO1xuaW1wb3J0IHsgU2tpbGwsIERhaWx5TWlzc2lvbiB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IFZJRVdfVFlQRV9QQU5PUFRJQ09OID0gXCJzaXN5cGh1cy1wYW5vcHRpY29uXCI7XG5cbmV4cG9ydCBjbGFzcyBQYW5vcHRpY29uVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuXG4gICAgY29uc3RydWN0b3IobGVhZjogV29ya3NwYWNlTGVhZiwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihsZWFmKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgZ2V0Vmlld1R5cGUoKSB7IHJldHVybiBWSUVXX1RZUEVfUEFOT1BUSUNPTjsgfVxuICAgIGdldERpc3BsYXlUZXh0KCkgeyByZXR1cm4gXCJFeWUgU2lzeXBodXNcIjsgfVxuICAgIGdldEljb24oKSB7IHJldHVybiBcInNrdWxsXCI7IH1cblxuICAgIGFzeW5jIG9uT3BlbigpIHsgXG4gICAgICAgIHRoaXMucmVmcmVzaCgpOyBcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9uKCd1cGRhdGUnLCB0aGlzLnJlZnJlc2guYmluZCh0aGlzKSk7IFxuICAgIH1cblxuICAgIGFzeW5jIHJlZnJlc2goKSB7XG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDsgYy5lbXB0eSgpO1xuICAgICAgICBjb25zdCBjb250YWluZXIgPSBjLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjb25zdCBzY3JvbGwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nyb2xsLWFyZWFcIiB9KTtcblxuICAgICAgICAvLyAtLS0gMS4gSEVBREVSICYgQ1JJVElDQUwgQUxFUlRTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiRXllIFNJU1lQSFVTIE9TXCIsIGNsczogXCJzaXN5LWhlYWRlclwiIH0pO1xuICAgICAgIC8vIFtORVddIERFQlQgV0FSTklOR1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1kZWJ0XCIgfSk7XG4gICAgICAgICAgICBkLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIuKaoO+4jyBERUJUIENSSVNJUyBBQ1RJVkVcIiB9KTtcbiAgICAgICAgICAgIGQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJBTEwgREFNQUdFIFJFQ0VJVkVEIElTIERPVUJMRUQuXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFtGSVhFRF0gc3R5bGUgbW92ZWQgdG8gYXR0clxuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyBcbiAgICAgICAgICAgICAgICB0ZXh0OiBgQ3VycmVudCBCYWxhbmNlOiAke3RoaXMucGx1Z2luLnNldHRpbmdzLmdvbGR9Z2AsIFxuICAgICAgICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IFwiZm9udC13ZWlnaHQ6Ym9sZFwiIH0gXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBcblxuICAgICAgICBpZih0aGlzLnBsdWdpbi5lbmdpbmUuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGwgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1sb2NrZG93blwiIH0pO1xuICAgICAgICAgICAgbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJMT0NLRE9XTiBBQ1RJVkVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXM6IG1pbnMgfSA9IHRoaXMucGx1Z2luLmVuZ2luZS5tZWRpdGF0aW9uRW5naW5lLmdldExvY2tkb3duVGltZVJlbWFpbmluZygpO1xuICAgICAgICAgICAgbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgVGltZSBSZW1haW5pbmc6ICR7aG91cnN9aCAke21pbnN9bWAgfSk7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJBVFRFTVBUIFJFQ09WRVJZXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZFN0YXR1cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7XG4gICAgICAgICAgICBjb25zdCBtZWREaXYgPSBsLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogMTBweDsgcGFkZGluZzogMTBweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjEpOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuICAgICAgICAgICAgbWVkRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBNZWRpdGF0aW9uOiAke21lZFN0YXR1cy5jeWNsZXNEb25lfS8xMCAoJHttZWRTdGF0dXMuY3ljbGVzUmVtYWluaW5nfSBsZWZ0KWAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJhciA9IG1lZERpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIG1lZEJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgbWFyZ2luOiA1cHggMDsgb3ZlcmZsb3c6IGhpZGRlbjtcIik7XG4gICAgICAgICAgICBjb25zdCBtZWRGaWxsID0gbWVkQmFyLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgY29uc3QgbWVkUGVyY2VudCA9IChtZWRTdGF0dXMuY3ljbGVzRG9uZSAvIDEwKSAqIDEwMDtcbiAgICAgICAgICAgIG1lZEZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke21lZFBlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjYWE2NGZmOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtZWRCdG4gPSBtZWREaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIk1FRElUQVRFXCIgfSk7XG4gICAgICAgICAgICBtZWRCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogOHB4OyBtYXJnaW4tdG9wOiA1cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgY29sb3I6ICNhYTY0ZmY7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgICAgICBtZWRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc3RhcnRNZWRpdGF0aW9uKCk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnJlZnJlc2goKSwgMTAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJzaXN5LWJ0blwiKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uZW5naW5lLmF0dGVtcHRSZWNvdmVyeSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMucGx1Z2luLmVuZ2luZS5pc1Jlc3RpbmcoKSkge1xuICAgICAgICAgICAgIGNvbnN0IHIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1yZXN0XCIgfSk7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJSRVNUIERBWSBBQ1RJVkVcIiB9KTtcbiAgICAgICAgICAgICBjb25zdCB0aW1lUmVtYWluaW5nID0gbW9tZW50KHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc3REYXlVbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodGltZVJlbWFpbmluZyAvIDYwKTtcbiAgICAgICAgICAgICBjb25zdCBtaW5zID0gdGltZVJlbWFpbmluZyAlIDYwO1xuICAgICAgICAgICAgIHIuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCR7aG91cnN9aCAke21pbnN9bSByZW1haW5pbmcgfCBObyBkYW1hZ2UsIFJ1c3QgcGF1c2VkYCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSAyLiBIVUQgR1JJRCAoMngyKSAtLS1cbiAgICAgICAgY29uc3QgaHVkID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWh1ZFwiIH0pO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkhFQUxUSFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocH0vJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA8IDMwID8gXCJzaXN5LWNyaXRpY2FsXCIgOiBcIlwiKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJHT0xEXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmdvbGR9YCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyBcInNpc3ktdmFsLWRlYnRcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkxFVkVMXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxldmVsfWApO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIlJJVkFMIERNR1wiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZ31gKTtcblxuICAgICAgICAvLyAtLS0gMy4gVEhFIE9SQUNMRSAtLS1cbiAgICAgICAgY29uc3Qgb3JhY2xlID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW9yYWNsZVwiIH0pO1xuICAgICAgICBvcmFjbGUuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiT1JBQ0xFIFBSRURJQ1RJT05cIiB9KTtcbiAgICAgICAgY29uc3Qgc3Vydml2YWwgPSBNYXRoLmZsb29yKHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIC8gKHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nICogKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gMiA6IDEpKSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgc3VydlRleHQgPSBgU3Vydml2YWw6ICR7c3Vydml2YWx9IGRheXNgO1xuICAgICAgICBjb25zdCBpc0NyaXNpcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBHbGl0Y2ggTG9naWNcbiAgICAgICAgaWYgKGlzQ3Jpc2lzICYmIE1hdGgucmFuZG9tKCkgPCAwLjMpIHtcbiAgICAgICAgICAgIGNvbnN0IGdsaXRjaGVzID0gW1wiW0NPUlJVUFRFRF1cIiwgXCI/Pz8gREFZUyBMRUZUXCIsIFwiTk8gRlVUVVJFXCIsIFwiUlVOXCJdO1xuICAgICAgICAgICAgc3VydlRleHQgPSBnbGl0Y2hlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBnbGl0Y2hlcy5sZW5ndGgpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1cnZFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyB0ZXh0OiBzdXJ2VGV4dCB9KTtcbiAgICAgICAgaWYgKHN1cnZpdmFsIDwgMiB8fCBzdXJ2VGV4dC5pbmNsdWRlcyhcIj8/P1wiKSB8fCBzdXJ2VGV4dC5pbmNsdWRlcyhcIkNPUlJVUFRFRFwiKSkge1xuICAgICAgICAgICAgIHN1cnZFbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiNmZjU1NTU7IGZvbnQtd2VpZ2h0OmJvbGQ7IGxldHRlci1zcGFjaW5nOiAxcHg7XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaWdodHMgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdHVzLWxpZ2h0c1wiIH0pO1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIGxpZ2h0cy5jcmVhdGVEaXYoeyB0ZXh0OiBcIkRFQlQ6IFlFU1wiLCBjbHM6IFwic2lzeS1saWdodC1hY3RpdmVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERMQyAxOiBTY2FycyBkaXNwbGF5XG4gICAgICAgIGNvbnN0IHNjYXJDb3VudCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmxlZ2FjeT8uZGVhdGhDb3VudCB8fCAwO1xuICAgICAgICBpZiAoc2NhckNvdW50ID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2NhckVsID0gb3JhY2xlLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjYXItZGlzcGxheVwiIH0pO1xuICAgICAgICAgICAgc2NhckVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBTY2FyczogJHtzY2FyQ291bnR9YCB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBlbmFsdHkgPSBNYXRoLnBvdygwLjksIHNjYXJDb3VudCk7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50TG9zdCA9IE1hdGguZmxvb3IoKDEgLSBwZW5hbHR5KSAqIDEwMCk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IGAoLSR7cGVyY2VudExvc3R9JSBzdGFydGluZyBnb2xkKWAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERMQyAxOiBOZXh0IG1pbGVzdG9uZVxuICAgICAgICBjb25zdCBsZXZlbE1pbGVzdG9uZXMgPSBbMTAsIDIwLCAzMCwgNTBdO1xuICAgICAgICBjb25zdCBuZXh0TWlsZXN0b25lID0gbGV2ZWxNaWxlc3RvbmVzLmZpbmQobSA9PiBtID4gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlsZXN0b25lXCIgfSk7XG4gICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgTmV4dCBNaWxlc3RvbmU6IExldmVsICR7bmV4dE1pbGVzdG9uZX1gIH0pO1xuICAgICAgICAgICAgaWYgKG5leHRNaWxlc3RvbmUgPT09IDEwIHx8IG5leHRNaWxlc3RvbmUgPT09IDIwIHx8IG5leHRNaWxlc3RvbmUgPT09IDMwIHx8IG5leHRNaWxlc3RvbmUgPT09IDUwKSB7XG4gICAgICAgICAgICAgICAgbWlsZXN0b25lRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IFwiKEJvc3MgVW5sb2NrKVwiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDQuIERBSUxZIE1JU1NJT05TIChETEMgMSkgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlRPREFZUyBPQkpFQ1RJVkVTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJEYWlseU1pc3Npb25zKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIDUuIENPTlRST0xTIC0tLVxuICAgICAgICBjb25zdCBjdHJscyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVQTE9ZXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiU0hPUFwiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFNob3BNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZPQ1VTXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hdWRpby50b2dnbGVCcm93bk5vaXNlKCk7XG5cbiAgICAgICAgLy8gLS0tIDYuIEFDVElWRSBUSFJFQVRTIC0tLVxuICAgICAgICAvLyAtLS0gRExDIDU6IENPTlRFWFQgRklMVEVSUyAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiRklMVEVSIENPTlRST0xTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJGaWx0ZXJCYXIoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDQ6IFFVRVNUIENIQUlOUyAtLS1cbiAgICAgICAgY29uc3QgYWN0aXZlQ2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKGFjdGl2ZUNoYWluKSB7XG4gICAgICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBQ1RJVkUgQ0hBSU5cIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFpblNlY3Rpb24oc2Nyb2xsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSBETEMgMjogUkVTRUFSQ0ggTElCUkFSWSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiUkVTRUFSQ0ggTElCUkFSWVwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyUmVzZWFyY2hTZWN0aW9uKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIERMQyA2OiBBTkFMWVRJQ1MgJiBFTkRHQU1FIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBTkFMWVRJQ1MgJiBQUk9HUkVTU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyQW5hbHl0aWNzKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIEFDVElWRSBUSFJFQVRTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBQ1RJVkUgVEhSRUFUU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyUXVlc3RzKHNjcm9sbCk7XG5cbiAgICAgICAgICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJORVVSQUwgSFVCXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKChzOiBTa2lsbCwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1yb3dcIiB9KTtcbiAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsRGV0YWlsTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBpZHgpLm9wZW4oKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGEgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2tpbGwtbWV0YVwiIH0pO1xuICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogcy5uYW1lIH0pO1xuICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogYEx2bCAke3MubGV2ZWx9YCB9KTtcbiAgICAgICAgICAgIGlmIChzLnJ1c3QgPiAwKSB7XG4gICAgICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogYFJVU1QgJHtzLnJ1c3R9YCwgY2xzOiBcInNpc3ktcnVzdC1iYWRnZVwiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYmFyID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7KHMueHAvcy54cFJlcSkqMTAwfSU7IGJhY2tncm91bmQ6ICR7cy5ydXN0ID4gMCA/ICcjZDM1NDAwJyA6ICcjMDBiMGZmJ31gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhZGRCdG4gPSBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCIrIEFkZCBOZXVyYWwgTm9kZVwiLCBjbHM6IFwic2lzeS1hZGQtc2tpbGxcIiB9KTtcbiAgICAgICAgYWRkQnRuLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG5cbiAgICAgICAgLy8gLS0tIDguIFFVSUNLIENBUFRVUkUgLS0tXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1xdWljay1jYXB0dXJlXCIgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZm9vdGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic2lzeS1xdWljay1pbnB1dFwiLCBwbGFjZWhvbGRlcjogXCJNaXNzaW9uIC8xLi4uNVwiIH0pO1xuICAgICAgICBpbnB1dC5vbmtleWRvd24gPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIGlucHV0LnZhbHVlLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5wYXJzZVF1aWNrSW5wdXQoaW5wdXQudmFsdWUudHJpbSgpKTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRExDIDE6IFJlbmRlciBEYWlseSBNaXNzaW9uc1xuICAgIHJlbmRlckRhaWx5TWlzc2lvbnMocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBtaXNzaW9ucyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgfHwgW107XG4gICAgICAgIFxuICAgICAgICBpZiAobWlzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBlbXB0eSA9IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIG1pc3Npb25zIHRvZGF5LiBDaGVjayBiYWNrIHRvbW9ycm93LlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlzc2lvbnNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktZGFpbHktbWlzc2lvbnNcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIG1pc3Npb25zLmZvckVhY2goKG1pc3Npb246IERhaWx5TWlzc2lvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FyZCA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tY2FyZFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSBjYXJkLmFkZENsYXNzKFwic2lzeS1taXNzaW9uLWNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLWhlYWRlclwiIH0pO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSWNvbiA9IG1pc3Npb24uY29tcGxldGVkID8gXCJZRVNcIiA6IFwiLi5cIjtcbiAgICAgICAgICAgIGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBzdGF0dXNJY29uLCBjbHM6IFwic2lzeS1taXNzaW9uLXN0YXR1c1wiIH0pO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IG1pc3Npb24ubmFtZSwgY2xzOiBcInNpc3ktbWlzc2lvbi1uYW1lXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBjYXJkLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IG1pc3Npb24uZGVzYywgY2xzOiBcInNpc3ktbWlzc2lvbi1kZXNjXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHByb2dyZXNzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLXByb2dyZXNzXCIgfSk7XG4gICAgICAgICAgICBwcm9ncmVzcy5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgJHttaXNzaW9uLnByb2dyZXNzfS8ke21pc3Npb24udGFyZ2V0fWAsIGNsczogXCJzaXN5LW1pc3Npb24tY291bnRlclwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXIgPSBwcm9ncmVzcy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItYmdcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGxcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAobWlzc2lvbi5wcm9ncmVzcyAvIG1pc3Npb24udGFyZ2V0KSAqIDEwMDtcbiAgICAgICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke01hdGgubWluKHBlcmNlbnQsIDEwMCl9JWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByZXdhcmQgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcmV3YXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5yZXdhcmQueHAgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC54cH0gWFBgLCBjbHM6IFwic2lzeS1yZXdhcmQteHBcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC5nb2xkID4gMCkgcmV3YXJkLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgKyR7bWlzc2lvbi5yZXdhcmQuZ29sZH1nYCwgY2xzOiBcInNpc3ktcmV3YXJkLWdvbGRcIiB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYWxsQ29tcGxldGVkID0gbWlzc2lvbnMuZXZlcnkobSA9PiBtLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChhbGxDb21wbGV0ZWQgJiYgbWlzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgYm9udXMgPSBtaXNzaW9uc0Rpdi5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFsbCBNaXNzaW9ucyBDb21wbGV0ZSEgKzUwIEJvbnVzIEdvbGRcIiwgY2xzOiBcInNpc3ktbWlzc2lvbi1ib251c1wiIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8vIERMQyAyOiBSZW5kZXIgUmVzZWFyY2ggUXVlc3RzIFNlY3Rpb25cbiAgICByZW5kZXJSZXNlYXJjaFNlY3Rpb24ocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzIHx8IFtdO1xuICAgICAgICBjb25zdCBhY3RpdmVSZXNlYXJjaCA9IHJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZFJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gcS5jb21wbGV0ZWQpO1xuXG4gICAgICAgIC8vIFN0YXRzIGJhclxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzXCIgfSk7XG4gICAgICAgIHN0YXRzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzY2NjsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMDUpO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJhdGlvVGV4dCA9IHN0YXRzRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSZXNlYXJjaCBSYXRpbzogJHtzdGF0cy5jb21iYXR9OiR7c3RhdHMucmVzZWFyY2h9ICgke3N0YXRzLnJhdGlvfToxKWAgfSk7XG4gICAgICAgIHJhdGlvVGV4dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5lbmdpbmUuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJCTE9DS0VEOiBOZWVkIDIgY29tYmF0IHBlciAxIHJlc2VhcmNoXCIgfSk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogNXB4IDA7XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWN0aXZlIFJlc2VhcmNoXG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBSRVNFQVJDSFwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWN0aXZlUmVzZWFyY2gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBhY3RpdmUgcmVzZWFyY2guXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY3RpdmVSZXNlYXJjaC5mb3JFYWNoKChxdWVzdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1jYXJkXCIgfSk7XG4gICAgICAgICAgICAgICAgY2FyZC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNhYTY0ZmY7IHBhZGRpbmc6IDEwcHg7IG1hcmdpbi1ib3R0b206IDhweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMDUpO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBtYXJnaW4tYm90dG9tOiA2cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcXVlc3QudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgdGl0bGUuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDsgZmxleDogMTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlTGFiZWwgPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU1VSVkVZXCIgOiBcIkRFRVAgRElWRVwiIH0pO1xuICAgICAgICAgICAgICAgIHR5cGVMYWJlbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC43NWVtOyBwYWRkaW5nOiAycHggNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMyk7IGJvcmRlci1yYWRpdXM6IDJweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjYXJkLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogYElEOiAke3F1ZXN0LmlkfWAgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LWZhbWlseTptb25vc3BhY2U7IGZvbnQtc2l6ZTowLjhlbTsgY29sb3I6I2FhNjRmZjsgb3BhY2l0eTowLjg7IG1hcmdpbi1ib3R0b206NHB4O1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB3b3JkQ291bnQgPSBjYXJkLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBXb3JkczogJHtxdWVzdC53b3JkQ291bnR9LyR7cXVlc3Qud29yZExpbWl0fWAgfSk7XG4gICAgICAgICAgICAgICAgd29yZENvdW50LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYmFyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBiYXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJoZWlnaHQ6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjEpOyBib3JkZXItcmFkaXVzOiAzcHg7IG92ZXJmbG93OiBoaWRkZW47IG1hcmdpbjogNnB4IDA7XCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGgubWluKDEwMCwgKHF1ZXN0LndvcmRDb3VudCAvIHF1ZXN0LndvcmRMaW1pdCkgKiAxMDApO1xuICAgICAgICAgICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke3BlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjYWE2NGZmOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGZsZXg7IGdhcDogNXB4OyBtYXJnaW4tdG9wOiA4cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgdmlld0J0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgdmlld0J0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSg4NSwgMjU1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgIzU1ZmY1NTsgY29sb3I6ICM1NWZmNTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgICAgICAgICAgdmlld0J0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0LmlkLCBxdWVzdC53b3JkQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlQnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wbGV0ZWQgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQ09NUExFVEVEIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb21wbGV0ZWRSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZFJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gcGFyZW50LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGArICR7cXVlc3QudGl0bGV9ICgke3F1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCB9KTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtOyBtYXJnaW46IDNweCAwO1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5hc3luYyByZW5kZXJRdWVzdHMocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIC8vIFtGSVhdIEFwcGx5IGZpbHRlcnMgdXNpbmcgdGhlIGZpbHRlciBlbmdpbmVcbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhmaWxlcykgYXMgVEZpbGVbXTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvcnQgYnkgZGVhZGxpbmVcbiAgICAgICAgICAgIGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbUEgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1CID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYik/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVBID0gZm1BPy5kZWFkbGluZSA/IG1vbWVudChmbUEuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZUIgPSBmbUI/LmRlYWRsaW5lID8gbW9tZW50KGZtQi5kZWFkbGluZSkudmFsdWVPZigpIDogOTk5OTk5OTk5OTk5OTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZUEgLSBkYXRlQjsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LWNhcmQtYm9zc1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gU3RyaW5nKGZtPy5kaWZmaWN1bHR5IHx8IFwiXCIpLm1hdGNoKC9cXGQvKTtcbiAgICAgICAgICAgICAgICBpZiAoZCkgY2FyZC5hZGRDbGFzcyhgc2lzeS1jYXJkLSR7ZFswXX1gKTtcblxuICAgICAgICAgICAgICAgIC8vIFRvcCBzZWN0aW9uIHdpdGggdGl0bGUgYW5kIHRpbWVyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLXRvcFwiIH0pO1xuICAgICAgICAgICAgICAgIHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLmJhc2VuYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVGltZXJcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQoZm0uZGVhZGxpbmUpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaW5zID0gZGlmZiAlIDYwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lclRleHQgPSBkaWZmIDwgMCA/IFwiRVhQSVJFRFwiIDogYCR7aG91cnN9aCAke21pbnN9bWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdG9wLmNyZWF0ZURpdih7IHRleHQ6IHRpbWVyVGV4dCwgY2xzOiBcInNpc3ktdGltZXJcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZmYgPCA2MCkgdGltZXIuYWRkQ2xhc3MoXCJzaXN5LXRpbWVyLWxhdGVcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gW0ZJWF0gRGVsZXRpb24gV2FybmluZyBMb2dpY1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXRyYXNoXCIsIHRleHQ6IFwiW1hdXCIgfSk7XG4gICAgICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVvdGEgPSB0aGlzLnBsdWdpbi5lbmdpbmUubWVkaXRhdGlvbkVuZ2luZS5nZXREZWxldGlvblF1b3RhKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocXVvdGEuZnJlZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IENvbmZpcm1Nb2RhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYWlkIERlbGV0aW9uIFdhcm5pbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYFlvdSBoYXZlIDAgZnJlZSBkZWxldGlvbnMgbGVmdC4gVGhpcyB3aWxsIGNvc3QgMTBnLiBDb250aW51ZT9gLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEp1c3QgZGVsZXRlOyBlbmdpbmUgaGFuZGxlcyBjb3N0IGxvZ2ljIGlmIGludGVncmF0ZWQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvciBzaW1wbHkgYWxsb3cgZGVsZXRpb24gYXMgYmVmb3JlIGJ1dCB3aXRoIHdhcm5pbmcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUXVlc3QoZmlsZSk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hY3Rpb25zXCIgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYkQgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJPS1wiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1kb25lXCIgfSk7XG4gICAgICAgICAgICAgICAgYkQub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJGID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiWFhcIiwgY2xzOiBcInNpc3ktYWN0aW9uLWJ0biBtb2QtZmFpbFwiIH0pO1xuICAgICAgICAgICAgICAgIGJGLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuZmFpbFF1ZXN0KGZpbGUsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaWRsZSA9IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlN5c3RlbSBJZGxlLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgY3RhQnRuID0gaWRsZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiW0RFUExPWSBRVUVTVF1cIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KTtcbiAgICAgICAgICAgIGN0YUJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEwcHhcIjtcbiAgICAgICAgICAgIGN0YUJ0bi5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIH1cbiAgICB9ICAgIFxuXG4gICAgcmVuZGVyQ2hhaW5TZWN0aW9uKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgY2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY2hhaW4pIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSBjaGFpbi5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY2hhaW5EaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNoYWluRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzRjYWY1MDsgcGFkZGluZzogMTJweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBoZWFkZXIgPSBjaGFpbkRpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogY2hhaW4ubmFtZSB9KTtcbiAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogIzRjYWY1MDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9ncmVzcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHByb2dyZXNzVGV4dCA9IGNoYWluRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBQcm9ncmVzczogJHtwcm9ncmVzcy5jb21wbGV0ZWR9LyR7cHJvZ3Jlc3MudG90YWx9YCB9KTtcbiAgICAgICAgcHJvZ3Jlc3NUZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiYXIgPSBjaGFpbkRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgYmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDhweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cHJvZ3Jlc3MucGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICM0Y2FmNTA7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdExpc3QgPSBjaGFpbkRpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jaGFpbi1xdWVzdHNcIiB9KTtcbiAgICAgICAgcXVlc3RMaXN0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAxMHB4IDA7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNoYWluLnF1ZXN0cy5mb3JFYWNoKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpdGVtID0gcXVlc3RMaXN0LmNyZWF0ZUVsKFwicFwiKTtcbiAgICAgICAgICAgIGNvbnN0IGljb24gPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIk9LXCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiPj4+XCIgOiBcIkxPQ0tcIjtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGlkeCA8IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiRE9ORVwiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkFDVElWRVwiIDogXCJMT0NLRURcIjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaXRlbS5zZXRUZXh0KGBbJHtpY29ufV0gJHtxdWVzdH0gKCR7c3RhdHVzfSlgKTtcbiAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogM3B4IDA7IHBhZGRpbmc6IDNweDsgXG4gICAgICAgICAgICAgICAgJHtpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIm9wYWNpdHk6IDAuNjtcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIgOiBcIm9wYWNpdHk6IDAuNDtcIn1gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhY3Rpb25zID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGFjdGlvbnMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDsgbWFyZ2luLXRvcDogMTBweDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBicmVha0J0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJSRUFLIENIQUlOXCIgfSk7XG4gICAgICAgIGJyZWFrQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44ZW07XCIpO1xuICAgICAgICBicmVha0J0bi5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmJyZWFrQ2hhaW4oKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyRmlsdGVyQmFyKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZmlsdGVycyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmlsdGVyRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWZpbHRlci1iYXJcIiB9KTtcbiAgICAgICAgZmlsdGVyRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzAwODhmZjsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjA1KTsgbWFyZ2luLWJvdHRvbTogMTVweDtcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBFbmVyZ3kgZmlsdGVyXG4gICAgICAgIGNvbnN0IGVuZXJneURpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgZW5lcmd5RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgZW5lcmd5RGl2LmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IFwiRW5lcmd5OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGVuZXJneU9wdGlvbnMgPSBbXCJhbnlcIiwgXCJoaWdoXCIsIFwibWVkaXVtXCIsIFwibG93XCJdO1xuICAgICAgICBlbmVyZ3lPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGVuZXJneURpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IG9wdC50b1VwcGVyQ2FzZSgpIH0pO1xuICAgICAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDAgM3B4OyBwYWRkaW5nOiA0cHggOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgXG4gICAgICAgICAgICAgICAgJHtmaWx0ZXJzLmFjdGl2ZUVuZXJneSA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUob3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVDb250ZXh0LCBmaWx0ZXJzLmFjdGl2ZVRhZ3MpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBjb25zdCBjb250ZXh0RGl2ID0gZmlsdGVyRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBjb250ZXh0RGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLWJvdHRvbTogOHB4O1wiKTtcbiAgICAgICAgY29udGV4dERpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkNvbnRleHQ6IFwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29udGV4dE9wdGlvbnMgPSBbXCJhbnlcIiwgXCJob21lXCIsIFwib2ZmaWNlXCIsIFwiYW55d2hlcmVcIl07XG4gICAgICAgIGNvbnRleHRPcHRpb25zLmZvckVhY2gob3B0ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGNvbnRleHREaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVDb250ZXh0ID09PSBvcHQgPyBcImJhY2tncm91bmQ6ICMwMDg4ZmY7IGNvbG9yOiB3aGl0ZTtcIiA6IFwiYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4yKTtcIn1gKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShmaWx0ZXJzLmFjdGl2ZUVuZXJneSwgb3B0IGFzIGFueSwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYnV0dG9uXG4gICAgICAgIGNvbnN0IGNsZWFyQnRuID0gZmlsdGVyRGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDTEVBUiBGSUxURVJTXCIgfSk7XG4gICAgICAgIGNsZWFyQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDZweDsgbWFyZ2luLXRvcDogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgY2xlYXJCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jbGVhckZpbHRlcnMoKTtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgcmVuZGVyQW5hbHl0aWNzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhbmFseXRpY3NEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYW5hbHl0aWNzXCIgfSk7XG4gICAgICAgIGFuYWx5dGljc0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDE5MywgNywgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgYW5hbHl0aWNzRGl2LmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCAxMHB4IDA7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0YXRzIGdyaWRcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIHN0YXRzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEwcHg7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc3RhdHNfaXRlbXMgPSBbXG4gICAgICAgICAgICB7IGxhYmVsOiBcIkxldmVsXCIsIHZhbHVlOiBzdGF0cy5sZXZlbCB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJDdXJyZW50IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMuY3VycmVudFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJMb25nZXN0IFN0cmVha1wiLCB2YWx1ZTogc3RhdHMubG9uZ2VzdFN0cmVhayB9LFxuICAgICAgICAgICAgeyBsYWJlbDogXCJUb3RhbCBRdWVzdHNcIiwgdmFsdWU6IHN0YXRzLnRvdGFsUXVlc3RzIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHN0YXRzX2l0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdGF0Qm94ID0gc3RhdHNEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBzdGF0Qm94LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2ZmYzEwNzsgcGFkZGluZzogOHB4OyBib3JkZXItcmFkaXVzOiAzcHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMSk7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBpdGVtLmxhYmVsIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOGVtOyBvcGFjaXR5OiAwLjc7XCIpO1xuICAgICAgICAgICAgc3RhdEJveC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBTdHJpbmcoaXRlbS52YWx1ZSkgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwIDAgMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCb3NzIHByb2dyZXNzXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJCb3NzIE1pbGVzdG9uZXNcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTJweCAwIDhweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib3NzZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcztcbiAgICAgICAgaWYgKGJvc3NlcyAmJiBib3NzZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYm9zc2VzLmZvckVhY2goKGJvc3M6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvc3NJdGVtID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJvc3NJdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA2cHggMDsgcGFkZGluZzogOHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuMik7IGJvcmRlci1yYWRpdXM6IDNweDtcIik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgaWNvbiA9IGJvc3MuZGVmZWF0ZWQgPyBcIk9LXCIgOiBib3NzLnVubG9ja2VkID8gXCI+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGJvc3NJdGVtLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBbJHtpY29ufV0gTGV2ZWwgJHtib3NzLmxldmVsfTogJHtib3NzLm5hbWV9YCB9KTtcbiAgICAgICAgICAgICAgICBuYW1lLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGJvc3MuZGVmZWF0ZWQgPyBcImNvbG9yOiAjNGNhZjUwOyBmb250LXdlaWdodDogYm9sZDtcIiA6IGJvc3MudW5sb2NrZWQgPyBcImNvbG9yOiAjZmZjMTA3O1wiIDogXCJvcGFjaXR5OiAwLjU7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFdpbiBjb25kaXRpb25cbiAgICAgICAgaWYgKHN0YXRzLmdhbWVXb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHdpbkRpdiA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHdpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDEycHg7IHBhZGRpbmc6IDEycHg7IGJhY2tncm91bmQ6IHJnYmEoNzYsIDE3NSwgODAsIDAuMik7IGJvcmRlcjogMnB4IHNvbGlkICM0Y2FmNTA7IGJvcmRlci1yYWRpdXM6IDRweDsgdGV4dC1hbGlnbjogY2VudGVyO1wiKTtcbiAgICAgICAgICAgIHdpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkdBTUUgV09OIVwiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwOyBmb250LXNpemU6IDEuMmVtOyBmb250LXdlaWdodDogYm9sZDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN0YXQocDogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbDogc3RyaW5nLCBjbHM6IHN0cmluZyA9IFwiXCIpIHtcbiAgICAgICAgY29uc3QgYiA9IHAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdC1ib3hcIiB9KTsgXG4gICAgICAgIGlmIChjbHMpIGIuYWRkQ2xhc3MoY2xzKTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNpc3ktc3RhdC1sYWJlbFwiIH0pO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IHZhbCwgY2xzOiBcInNpc3ktc3RhdC12YWxcIiB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub2ZmKCd1cGRhdGUnLCB0aGlzLnJlZnJlc2guYmluZCh0aGlzKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmLCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5pbXBvcnQgeyBSZXNlYXJjaFF1ZXN0TW9kYWwsIENoYWluQnVpbGRlck1vZGFsLCBSZXNlYXJjaExpc3RNb2RhbCwgUXVpY2tDYXB0dXJlTW9kYWwgfSBmcm9tIFwiLi91aS9tb2RhbHNcIjtcblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU2lzeXBodXNTZXR0aW5ncyA9IHtcbiAgICBocDogMTAwLCBtYXhIcDogMTAwLCB4cDogMCwgZ29sZDogMCwgeHBSZXE6IDEwMCwgbGV2ZWw6IDEsIHJpdmFsRG1nOiAxMCxcbiAgICBsYXN0TG9naW46IFwiXCIsIHNoaWVsZGVkVW50aWw6IFwiXCIsIHJlc3REYXlVbnRpbDogXCJcIiwgc2tpbGxzOiBbXSxcbiAgICBkYWlseU1vZGlmaWVyOiBERUZBVUxUX01PRElGSUVSLCBcbiAgICBsZWdhY3k6IHsgc291bHM6IDAsIHBlcmtzOiB7IHN0YXJ0R29sZDogMCwgc3RhcnRTa2lsbFBvaW50czogMCwgcml2YWxEZWxheTogMCB9LCByZWxpY3M6IFtdLCBkZWF0aENvdW50OiAwIH0sIFxuICAgIG11dGVkOiBmYWxzZSwgaGlzdG9yeTogW10sIHJ1bkNvdW50OiAxLCBsb2NrZG93blVudGlsOiBcIlwiLCBkYW1hZ2VUYWtlblRvZGF5OiAwLFxuICAgIGRhaWx5TWlzc2lvbnM6IFtdLCBcbiAgICBkYWlseU1pc3Npb25EYXRlOiBcIlwiLCBcbiAgICBxdWVzdHNDb21wbGV0ZWRUb2RheTogMCwgXG4gICAgc2tpbGxVc2VzVG9kYXk6IHt9LFxuICAgIHJlc2VhcmNoUXVlc3RzOiBbXSxcbiAgICByZXNlYXJjaFN0YXRzOiB7IHRvdGFsUmVzZWFyY2g6IDAsIHRvdGFsQ29tYmF0OiAwLCByZXNlYXJjaENvbXBsZXRlZDogMCwgY29tYmF0Q29tcGxldGVkOiAwIH0sXG4gICAgbGFzdFJlc2VhcmNoUXVlc3RJZDogMCxcbiAgICBtZWRpdGF0aW9uQ3ljbGVzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RGVsZXRpb25zVG9kYXk6IDAsXG4gICAgbGFzdERlbGV0aW9uUmVzZXQ6IFwiXCIsXG4gICAgaXNNZWRpdGF0aW5nOiBmYWxzZSxcbiAgICBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duOiAwLFxuICAgIGFjdGl2ZUNoYWluczogW10sXG4gICAgY2hhaW5IaXN0b3J5OiBbXSxcbiAgICBjdXJyZW50Q2hhaW5JZDogXCJcIixcbiAgICBjaGFpblF1ZXN0c0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdEZpbHRlcnM6IHt9LFxuICAgIGZpbHRlclN0YXRlOiB7IGFjdGl2ZUVuZXJneTogXCJhbnlcIiwgYWN0aXZlQ29udGV4dDogXCJhbnlcIiwgYWN0aXZlVGFnczogW10gfSxcbiAgICBkYXlNZXRyaWNzOiBbXSxcbiAgICB3ZWVrbHlSZXBvcnRzOiBbXSxcbiAgICBib3NzTWlsZXN0b25lczogW10sXG4gICAgc3RyZWFrOiB7IGN1cnJlbnQ6IDAsIGxvbmdlc3Q6IDAsIGxhc3REYXRlOiBcIlwiIH0sXG4gICAgYWNoaWV2ZW1lbnRzOiBbXSxcbiAgICBnYW1lV29uOiBmYWxzZVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTaXN5cGh1c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgc3RhdHVzQmFySXRlbTogSFRNTEVsZW1lbnQ7XG4gICAgZW5naW5lOiBTaXN5cGh1c0VuZ2luZTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuXG4gICAgYXN5bmMgb25sb2FkKCkge1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2RlcGxveS1xdWVzdC1ob3RrZXknLFxuICAgICAgICAgICAgbmFtZTogJ0RlcGxveSBRdWVzdCcsXG4gICAgICAgICAgICBob3RrZXlzOiBbeyBtb2RpZmllcnM6IFtcIk1vZFwiXSwga2V5OiBcImRcIiB9XSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgLy8gQXNzdW1pbmcgZGVmYXVsdCBpcyBSZXNlYXJjaCBvciBRdWVzdCBNb2RhbD9cbiAgICAgICAgICAgIC8vIEFjdHVhbGx5LCB3ZSBzaG91bGQgbWFwIHRoaXMgdG8gUXVlc3RNb2RhbCwgYnV0IHlvdSBkaWRuJ3QgZXhwb3J0IFF1ZXN0TW9kYWwgaW4gbW9kYWxzLnRzIHByb3Blcmx5IGluIHRoZSBzbmlwcGV0LiBcbiAgICAgICAgICAgIC8vIEFzc3VtaW5nIFF1ZXN0TW9kYWwgaXMgYXZhaWxhYmxlIG9yIHdlIHVzZSBSZXNlYXJjaFF1ZXN0TW9kYWwuIFxuICAgICAgICAgICAgLy8gUmV2ZXJ0aW5nIHRvIFJlc2VhcmNoUXVlc3RNb2RhbCBhcyBwZXIgeW91ciBpbXBvcnQgbGlzdCwgXG4gICAgICAgICAgICAvLyBPUiBpZiB5b3UgaGF2ZSBRdWVzdE1vZGFsIGltcG9ydGVkLCB1c2UgdGhhdC5cbiAgICAgICAgICAgIC8vIExldCdzIGFzc3VtZSB5b3Ugd2FudCB0aGUgc3RhbmRhcmQgUXVlc3QgY3JlYXRpb246XG4gICAgICAgICAgICAvLyBjYWxsYmFjazogKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICd1bmRvLXF1ZXN0LWRlbGV0ZScsXG4gICAgICAgICAgICBuYW1lOiAnVW5kbyBMYXN0IFF1ZXN0IERlbGV0aW9uJyxcbiAgICAgICAgICAgIGhvdGtleXM6IFt7IG1vZGlmaWVyczogW1wiTW9kXCIsIFwiU2hpZnRcIl0sIGtleTogXCJ6XCIgfV0sXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUudW5kb0xhc3REZWxldGlvbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ2V4cG9ydC1zdGF0cycsXG4gICAgICAgICAgICBuYW1lOiAnQW5hbHl0aWNzOiBFeHBvcnQgU3RhdHMgSlNPTicsXG4gICAgICAgICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5lbmdpbmUuZ2V0R2FtZVN0YXRzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBTaXN5cGh1c19TdGF0c18ke0RhdGUubm93KCl9Lmpzb25gO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBKU09OLnN0cmluZ2lmeShzdGF0cywgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFN0YXRzIGV4cG9ydGVkIHRvICR7cGF0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBcbiAgICAgICAgICAgIGlkOiAnYWNjZXB0LWRlYXRoJywgXG4gICAgICAgICAgICBuYW1lOiAnQUNDRVBUIERFQVRIIChSZXNldCBSdW4pJywgXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUudHJpZ2dlckRlYXRoKCkgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxuICAgICAgICAgICAgaWQ6ICdyZXJvbGwtY2hhb3MnLCBcbiAgICAgICAgICAgIG5hbWU6ICdSZXJvbGwgQ2hhb3MnLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5yb2xsQ2hhb3ModHJ1ZSkgXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdxdWljay1jYXB0dXJlJyxcbiAgICAgICAgICAgIG5hbWU6ICdRdWljayBDYXB0dXJlIChTY3JhcCknLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBRdWlja0NhcHR1cmVNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZ2VuZXJhdGUtc2tpbGwtZ3JhcGgnLFxuICAgICAgICAgICAgbmFtZTogJ05ldXJhbCBIdWI6IEdlbmVyYXRlIFNraWxsIEdyYXBoJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5nZW5lcmF0ZVNraWxsR3JhcGgoKVxuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMubG9hZFN0eWxlcygpO1xuICAgICAgICB0aGlzLmF1ZGlvID0gbmV3IEF1ZGlvQ29udHJvbGxlcih0aGlzLnNldHRpbmdzLm11dGVkKTtcbiAgICAgICAgdGhpcy5lbmdpbmUgPSBuZXcgU2lzeXBodXNFbmdpbmUodGhpcy5hcHAsIHRoaXMsIHRoaXMuYXVkaW8pO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJWaWV3KFZJRVdfVFlQRV9QQU5PUFRJQ09OLCAobGVhZikgPT4gbmV3IFBhbm9wdGljb25WaWV3KGxlYWYsIHRoaXMpKTtcblxuICAgICAgICB0aGlzLnN0YXR1c0Jhckl0ZW0gPSB0aGlzLmFkZFN0YXR1c0Jhckl0ZW0oKTtcbiAgICAgICAgKHdpbmRvdyBhcyBhbnkpLnNpc3lwaHVzRW5naW5lID0gdGhpcy5lbmdpbmU7XG4gICAgICAgIFxuICAgICAgICBhd2FpdCB0aGlzLmVuZ2luZS5jaGVja0RhaWx5TG9naW4oKTtcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcblxuICAgICAgICAvLyAtLS0gQ09NTUFORFMgLS0tXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnb3Blbi1wYW5vcHRpY29uJywgbmFtZTogJ09wZW4gUGFub3B0aWNvbicsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3RvZ2dsZS1mb2N1cycsIG5hbWU6ICdUb2dnbGUgRm9jdXMgQXVkaW8nLCBjYWxsYmFjazogKCkgPT4gdGhpcy5hdWRpby50b2dnbGVCcm93bk5vaXNlKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnY3JlYXRlLXJlc2VhcmNoJywgbmFtZTogJ1Jlc2VhcmNoOiBDcmVhdGUgUXVlc3QnLCBjYWxsYmFjazogKCkgPT4gbmV3IFJlc2VhcmNoUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ3ZpZXctcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IFZpZXcgTGlicmFyeScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hMaXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdtZWRpdGF0ZScsIG5hbWU6ICdNZWRpdGF0aW9uOiBTdGFydCcsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtY2hhaW4nLCBuYW1lOiAnQ2hhaW5zOiBDcmVhdGUnLCBjYWxsYmFjazogKCkgPT4gbmV3IENoYWluQnVpbGRlck1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1jaGFpbnMnLCBuYW1lOiAnQ2hhaW5zOiBWaWV3IEFjdGl2ZScsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IGMgPSB0aGlzLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyBuZXcgTm90aWNlKGMgPyBgQWN0aXZlOiAke2MubmFtZX1gIDogXCJObyBhY3RpdmUgY2hhaW5cIik7IH0gfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZmlsdGVyLWhpZ2gnLCBuYW1lOiAnRmlsdGVyczogSGlnaCBFbmVyZ3knLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoXCJoaWdoXCIsIFwiYW55XCIsIFtdKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjbGVhci1maWx0ZXJzJywgbmFtZTogJ0ZpbHRlcnM6IENsZWFyJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmNsZWFyRmlsdGVycygpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2dhbWUtc3RhdHMnLCBuYW1lOiAnQW5hbHl0aWNzOiBTdGF0cycsIGNhbGxiYWNrOiAoKSA9PiB7IGNvbnN0IHMgPSB0aGlzLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTsgbmV3IE5vdGljZShgTHZsICR7cy5sZXZlbH0gfCBTdHJlYWsgJHtzLmN1cnJlbnRTdHJlYWt9YCk7IH0gfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZFJpYmJvbkljb24oJ3NrdWxsJywgJ1Npc3lwaHVzIFNpZGViYXInLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICAgICAgdGhpcy5yZWdpc3RlckludGVydmFsKHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiB0aGlzLmVuZ2luZS5jaGVja0RlYWRsaW5lcygpLCA2MDAwMCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWF0gRGVib3VuY2VkIFdvcmQgQ291bnRlciAoVHlwZXdyaXRlciBGaXgpXG4gICAgICAgIGNvbnN0IGRlYm91bmNlZFVwZGF0ZSA9IGRlYm91bmNlKChmaWxlOiBURmlsZSwgY29udGVudDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICAgICAgICAgICAgaWYgKGNhY2hlPy5mcm9udG1hdHRlcj8ucmVzZWFyY2hfaWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3b3JkcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KC9cXHMrLykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXMuZW5naW5lLnVwZGF0ZVJlc2VhcmNoV29yZENvdW50KGNhY2hlLmZyb250bWF0dGVyLnJlc2VhcmNoX2lkLCB3b3Jkcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwMDAsIHRydWUpO1xuXG4gICAgICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2VkaXRvci1jaGFuZ2UnLCAoZWRpdG9yLCBpbmZvKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWluZm8gfHwgIWluZm8uZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgZGVib3VuY2VkVXBkYXRlKGluZm8uZmlsZSwgZWRpdG9yLmdldFZhbHVlKCkpO1xuICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgYXN5bmMgbG9hZFN0eWxlcygpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNzc0ZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5tYW5pZmVzdC5kaXIgKyBcIi9zdHlsZXMuY3NzXCIpO1xuICAgICAgICAgICAgaWYgKGNzc0ZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNzcyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoY3NzRmlsZSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgICAgICAgICAgc3R5bGUuaWQgPSBcInNpc3lwaHVzLXN0eWxlc1wiO1xuICAgICAgICAgICAgICAgIHN0eWxlLmlubmVySFRNTCA9IGNzcztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkgeyBjb25zb2xlLmVycm9yKFwiQ291bGQgbm90IGxvYWQgc3R5bGVzLmNzc1wiLCBlKTsgfVxuICAgIH1cblxuICAgIGFzeW5jIG9udW5sb2FkKCkge1xuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYodGhpcy5hdWRpby5hdWRpb0N0eCkgdGhpcy5hdWRpby5hdWRpb0N0eC5jbG9zZSgpO1xuICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2lzeXBodXMtc3R5bGVzXCIpO1xuICAgICAgICBpZiAoc3R5bGUpIHN0eWxlLnJlbW92ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIGFjdGl2YXRlVmlldygpIHtcbiAgICAgICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xuICAgICAgICBsZXQgbGVhZjogV29ya3NwYWNlTGVhZiB8IG51bGwgPSBudWxsO1xuICAgICAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9QQU5PUFRJQ09OKTtcbiAgICAgICAgaWYgKGxlYXZlcy5sZW5ndGggPiAwKSBsZWFmID0gbGVhdmVzWzBdO1xuICAgICAgICBlbHNlIHsgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpOyBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IFZJRVdfVFlQRV9QQU5PUFRJQ09OLCBhY3RpdmU6IHRydWUgfSk7IH1cbiAgICAgICAgd29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XG4gICAgfVxuXG4gICAgdXBkYXRlU3RhdHVzQmFyKCkge1xuICAgICAgICBjb25zdCBzaGllbGQgPSAodGhpcy5lbmdpbmUuaXNTaGllbGRlZCgpIHx8IHRoaXMuZW5naW5lLmlzUmVzdGluZygpKSA/ICh0aGlzLmVuZ2luZS5pc1Jlc3RpbmcoKSA/IFwiRFwiIDogXCJTXCIpIDogXCJcIjtcbiAgICAgICAgY29uc3QgbUNvdW50ID0gdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZpbHRlcihtID0+IG0uY29tcGxldGVkKS5sZW5ndGg7XG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbS5zZXRUZXh0KGAke3RoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci5pY29ufSAke3NoaWVsZH0gSFAke3RoaXMuc2V0dGluZ3MuaHB9IEcke3RoaXMuc2V0dGluZ3MuZ29sZH0gTSR7bUNvdW50fS8zYCk7XG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbS5zdHlsZS5jb2xvciA9IHRoaXMuc2V0dGluZ3MuaHAgPCAzMCA/IFwicmVkXCIgOiB0aGlzLnNldHRpbmdzLmdvbGQgPCAwID8gXCJvcmFuZ2VcIiA6IFwiXCI7XG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGxvYWRTZXR0aW5ncygpIHsgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7IH1cbiAgICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7IGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7IH1cbn1cbiJdLCJuYW1lcyI6WyJOb3RpY2UiLCJNb2RhbCIsIm1vbWVudCIsIlNl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Q0FBQSxFQUFHLEtBQUssQ0FBSyxFQUFBLEVBQUEsSUFBSSxDQUFzQyxvQ0FBQSxDQUFBLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZGOztBQUdELFlBQUEsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUcsRUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBLENBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUMxSSxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFHLEVBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFFLENBQUEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUM3RyxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFBLEVBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQ3pELFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUEsRUFBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUEsQ0FBRSxDQUFDLENBQUM7O0FBR2hFLFlBQUEsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sQ0FBQyxRQUFR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
