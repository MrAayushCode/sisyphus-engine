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
// [APPEND TO src/ui/modals.ts]
class QuestTemplateModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        // Hardcoded templates for now - v2.0 could allow user-customizable ones
        this.templates = [
            { name: "Morning Routine", diff: 1, skill: "Discipline", deadline: "10:00 AM" },
            { name: "Deep Work Block", diff: 3, skill: "Focus", deadline: "+2h" },
            { name: "Exercise", diff: 2, skill: "Health", deadline: "+12h" },
            { name: "Code Review", diff: 2, skill: "Engineering", deadline: "+4h" }
        ];
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚡ Quick Deploy Templates" });
        const grid = contentEl.createDiv();
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gap = "10px";
        this.templates.forEach(template => {
            const btn = grid.createEl("button", { text: template.name });
            btn.addClass("sisy-btn");
            btn.style.textAlign = "left";
            btn.style.padding = "15px";
            // Subtext
            btn.createDiv({
                text: `Diff: ${template.diff} | Skill: ${template.skill}`,
                attr: { style: "font-size: 0.8em; opacity: 0.7; margin-top: 5px;" }
            });
            btn.onclick = () => {
                const deadline = template.deadline.startsWith("+")
                    ? obsidian.moment().add(parseInt(template.deadline), 'hours').toISOString()
                    : obsidian.moment().set({ hour: 10, minute: 0 }).toISOString();
                this.plugin.engine.createQuest(template.name, template.diff, template.skill, "None", deadline, false, "Normal", false);
                new obsidian.Notice(`Deployed: ${template.name}`);
                this.close();
            };
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}

const ACHIEVEMENT_DEFINITIONS = [
    // --- EARLY GAME ---
    { id: "first_blood", name: "First Blood", description: "Complete your first quest.", rarity: "common" },
    { id: "week_warrior", name: "Week Warrior", description: "Maintain a 7-day streak.", rarity: "common" },
    { id: "warm_up", name: "Warm Up", description: "Complete 10 total quests.", rarity: "common" },
    // --- MID GAME ---
    { id: "skill_adept", name: "Apprentice", description: "Reach Level 5 in any skill.", rarity: "rare" },
    { id: "chain_gang", name: "Chain Gang", description: "Complete a Quest Chain.", rarity: "rare" },
    { id: "researcher", name: "Scholar", description: "Complete 5 Research Quests.", rarity: "rare" },
    { id: "rich", name: "Capitalist", description: "Hold 500 gold at once.", rarity: "rare" },
    // --- END GAME ---
    { id: "boss_slayer", name: "Giant Slayer", description: "Defeat your first Boss.", rarity: "epic" },
    { id: "ascended", name: "Sisyphus Happy", description: "Reach Level 50.", rarity: "legendary" },
    { id: "immortal", name: "Immortal", description: "Reach Level 20 with 0 Deaths.", rarity: "legendary" }
];

class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Ensure all achievements exist in settings
     */
    initializeAchievements() {
        // If achievements array is empty or missing definitions, sync it
        if (!this.settings.achievements)
            this.settings.achievements = [];
        ACHIEVEMENT_DEFINITIONS.forEach(def => {
            const exists = this.settings.achievements.find(a => a.id === def.id);
            if (!exists) {
                this.settings.achievements.push(Object.assign(Object.assign({}, def), { unlocked: false }));
            }
        });
    }
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = { date: today, questsCompleted: 0, questsFailed: 0, xpEarned: 0, goldEarned: 0, damagesTaken: 0, skillsLeveled: [], chainsCompleted: 0 };
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
        // Trigger Achievement Check after every metric update
        this.checkAchievements();
    }
    updateStreak() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate !== today) {
            const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
            if (lastDate === yesterday) {
                this.settings.streak.current++;
                if (this.settings.streak.current > this.settings.streak.longest)
                    this.settings.streak.longest = this.settings.streak.current;
            }
            else {
                this.settings.streak.current = 1;
            }
            this.settings.streak.lastDate = today;
        }
        this.checkAchievements();
    }
    checkAchievements() {
        this.initializeAchievements();
        const s = this.settings;
        const totalQuests = s.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        // 1. First Blood
        if (totalQuests >= 1)
            this.unlock("first_blood");
        // 2. Warm Up
        if (totalQuests >= 10)
            this.unlock("warm_up");
        // 3. Week Warrior
        if (s.streak.current >= 7)
            this.unlock("week_warrior");
        // 4. Skill Adept
        if (s.skills.some(skill => skill.level >= 5))
            this.unlock("skill_adept");
        // 5. Chain Gang
        if (s.chainHistory.length >= 1)
            this.unlock("chain_gang");
        // 6. Researcher
        if (s.researchStats.researchCompleted >= 5)
            this.unlock("researcher");
        // 7. Capitalist
        if (s.gold >= 500)
            this.unlock("rich");
        // 8. Giant Slayer
        if (s.bossMilestones.some(b => b.defeated))
            this.unlock("boss_slayer");
        // 9. Ascended
        if (s.level >= 50)
            this.unlock("ascended");
        // 10. Immortal
        if (s.level >= 20 && s.legacy.deathCount === 0)
            this.unlock("immortal");
    }
    unlock(id) {
        const ach = this.settings.achievements.find(a => a.id === id);
        if (ach && !ach.unlocked) {
            ach.unlocked = true;
            ach.unlockedAt = new Date().toISOString();
            if (this.audioController)
                this.audioController.playSound("success");
            // We return true so the caller can show a notice if they want, 
            // though usually the Notice is better handled here if we had access to that API easily, 
            // or let the engine handle the notification.
        }
    }
    // ... (Keep existing boss/report methods below as they were) ...
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            this.settings.bossMilestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
        }
    }
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0)
            this.initializeBossMilestones();
        this.settings.bossMilestones.forEach((boss) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if (this.audioController)
                    this.audioController.playSound("success");
            }
        });
        return messages;
    }
    defeatBoss(level) {
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss)
            return { success: false, message: "Boss not found", xpReward: 0 };
        if (boss.defeated)
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if (this.audioController)
            this.audioController.playSound("success");
        if (level === 50)
            this.winGame();
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }
    winGame() {
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if (this.audioController)
            this.audioController.playSound("success");
    }
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
        const topSkills = this.settings.skills.sort((a, b) => (b.level - a.level)).slice(0, 3).map((s) => s.name);
        const bestDay = weekMetrics.length > 0 ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date : startDate;
        const worstDay = weekMetrics.length > 0 ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date : startDate;
        const report = { week, startDate, endDate, totalQuests, successRate, totalXp, totalGold, topSkills, bestDay, worstDay };
        this.settings.weeklyReports.push(report);
        return report;
    }
    unlockAchievement(achievementId) {
        // This is a manual override if needed, logic is mostly in checkAchievements now
        this.checkAchievements();
        return true;
    }
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
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all files in 'Scraps'", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_inbox" },
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
                if (this.settings.dailyMissions.every(m => m.completed))
                    justFinishedAll = true;
            }
        });
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
            // [FIX] Quest Chain Integration
            if (this.chainsEngine.isQuestInChain(questName)) {
                const canStart = this.chainsEngine.canStartQuest(questName);
                if (!canStart) {
                    new obsidian.Notice("Locked by Chain.");
                    return;
                }
                const chainResult = yield this.chainsEngine.completeChainQuest(questName);
                if (chainResult.success) {
                    new obsidian.Notice(chainResult.message);
                    if (chainResult.chainComplete) {
                        this.settings.xp += chainResult.bonusXp;
                        new obsidian.Notice(`🎉 Chain Bonus: +${chainResult.bonusXp} XP!`);
                    }
                }
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
                // 1. Create the quest file
                yield this.createQuest(`BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None", obsidian.moment().add(3, 'days').toISOString(), true, "Critical", true);
                // 2. Inject HP into frontmatter (Delayed)
                setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                    const safeName = `BOSS_LVL${level}_-_${boss.name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    // Try to find the file we just created
                    const files = this.app.vault.getMarkdownFiles();
                    const file = files.find(f => f.name.toLowerCase() === `${safeName}.md`);
                    if (file instanceof obsidian.TFile) {
                        const maxHp = 100 + (level * 20);
                        yield this.app.fileManager.processFrontMatter(file, (fm) => {
                            fm.boss_hp = maxHp;
                            fm.boss_max_hp = maxHp;
                        });
                        // Force UI Refresh after data is definitely saved
                        this.trigger("update");
                    }
                }), 500);
            }), 3000);
        });
    }
    damageBoss(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm || !fm.is_boss)
                return;
            const damage = 25;
            const currentHp = fm.boss_hp || 100;
            const newHp = currentHp - damage;
            if (newHp <= 0) {
                yield this.completeQuest(file);
                new obsidian.Notice("⚔️ FINAL BLOW! Boss Defeated!");
            }
            else {
                // Apply damage
                yield this.app.fileManager.processFrontMatter(file, (f) => {
                    f.boss_hp = newHp;
                });
                this.audio.playSound("fail");
                new obsidian.Notice(`⚔️ Boss Damaged! ${newHp}/${fm.boss_max_hp} HP remaining`);
                // Force UI refresh slightly after to show new HP bar
                setTimeout(() => this.trigger("update"), 200);
            }
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
    // [FIX] Apply Deletion Cost
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check deletion quota and apply cost
            const costResult = this.meditationEngine.applyDeletionCost();
            if (costResult.cost > 0 && this.settings.gold < costResult.cost) {
                new obsidian.Notice("Insufficient gold for paid deletion!");
                return;
            }
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
            if (costResult.message)
                new obsidian.Notice(costResult.message);
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
            const zeroInbox = this.settings.dailyMissions.find(m => m.checkFunc === "zero_inbox" && !m.completed);
            if (zeroInbox) {
                const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                if (scraps instanceof obsidian.TFolder && scraps.children.length === 0) {
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
            // --- 1. HEADER & SOUND TOGGLE ---
            const header = scroll.createDiv({ cls: "sisy-header" });
            header.style.display = "flex";
            header.style.justifyContent = "space-between";
            header.style.alignItems = "center";
            header.createSpan({ text: "Eye SISYPHUS OS" });
            const soundBtn = header.createEl("span", { text: this.plugin.settings.muted ? "🔇" : "🔊" });
            soundBtn.style.cursor = "pointer";
            soundBtn.style.fontSize = "0.8em";
            soundBtn.title = "Toggle Sound";
            soundBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.muted = !this.plugin.settings.muted;
                this.plugin.audio.setMuted(this.plugin.settings.muted);
                yield this.plugin.saveSettings();
                this.refresh();
            });
            // [NEW] DEBT WARNING
            if (this.plugin.settings.gold < 0) {
                const d = scroll.createDiv({ cls: "sisy-alert sisy-alert-debt" });
                d.createEl("h3", { text: "⚠️ DEBT CRISIS ACTIVE" });
                d.createEl("p", { text: "ALL DAMAGE RECEIVED IS DOUBLED." });
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
                    // [MODIFIED] Boss HP Bar
                    if ((fm === null || fm === void 0 ? void 0 : fm.is_boss) && (fm === null || fm === void 0 ? void 0 : fm.boss_max_hp)) {
                        const hpBar = card.createDiv();
                        hpBar.setAttribute("style", "height: 8px; background: #333; margin: 8px 0; border-radius: 4px; overflow: hidden; border: 1px solid #555;");
                        const hpPercent = (fm.boss_hp / fm.boss_max_hp) * 100;
                        const hpFill = hpBar.createDiv();
                        hpFill.setAttribute("style", `width: ${hpPercent}%; height: 100%; background: #ff5555; transition: width 0.3s;`);
                        // [FIXED LINE BELOW] style is now inside attr
                        card.createDiv({
                            text: `${fm.boss_hp}/${fm.boss_max_hp} HP`,
                            attr: { style: "font-size: 0.8em; text-align: center; color: #ff5555; margin-bottom: 5px;" }
                        });
                    }
                    // Action buttons
                    const acts = card.createDiv({ cls: "sisy-actions" });
                    // If it's a boss, show ATTACK button instead of OK
                    if (fm === null || fm === void 0 ? void 0 : fm.is_boss) {
                        const bAttack = acts.createEl("button", { text: "⚔️ ATTACK", cls: "sisy-action-btn" });
                        bAttack.setAttribute("style", "border-color: #ff5555; color: #ff5555; background: rgba(255, 85, 85, 0.1); font-weight: bold;");
                        bAttack.onclick = (e) => {
                            e.stopPropagation();
                            this.plugin.engine.damageBoss(file);
                        };
                    }
                    else {
                        // Standard Quest Button
                        const bD = acts.createEl("button", { text: "OK", cls: "sisy-action-btn mod-done" });
                        bD.onclick = (e) => {
                            e.stopPropagation();
                            this.plugin.engine.completeQuest(file);
                        };
                    }
                    const bF = acts.createEl("button", { text: "XX", cls: "sisy-action-btn mod-fail" });
                    bF.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.failQuest(file, true);
                    };
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
        // [NEW] Achievements Section
        analyticsDiv.createEl("h4", { text: "Achievements" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        const achList = analyticsDiv.createDiv({ cls: "sisy-achievement-list" });
        const achievements = this.plugin.settings.achievements || [];
        if (achievements.length === 0) {
            // Force init if empty
            this.plugin.engine.analyticsEngine.initializeAchievements();
        }
        achievements.forEach(ach => {
            const badge = achList.createSpan({ cls: `sisy-achievement sisy-achievement-${ach.rarity}` });
            if (!ach.unlocked)
                badge.addClass("sisy-achievement-locked");
            badge.setText(ach.unlocked ? ach.name : "???");
            badge.setAttribute("title", ach.unlocked ? ach.description : "Locked Achievement");
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
                id: 'quest-templates',
                name: 'Deploy Quest from Template',
                callback: () => new QuestTemplateModal(this.app, this).open()
            });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy91aS9tb2RhbHMudHMiLCJzcmMvYWNoaWV2ZW1lbnRzLnRzIiwic3JjL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZS50cyIsInNyYy9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvQ2hhaW5zRW5naW5lLnRzIiwic3JjL2VuZ2luZXMvRmlsdGVyc0VuZ2luZS50cyIsInNyYy9lbmdpbmUudHMiLCJzcmMvdWkvdmlldy50cyIsInNyYy9tYWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcclxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXHJcblxyXG5QZXJtaXNzaW9uIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBhbmQvb3IgZGlzdHJpYnV0ZSB0aGlzIHNvZnR3YXJlIGZvciBhbnlcclxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxyXG5cclxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiBBTkQgVEhFIEFVVEhPUiBESVNDTEFJTVMgQUxMIFdBUlJBTlRJRVMgV0lUSFxyXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcclxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxyXG5JTkRJUkVDVCwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTIE9SIEFOWSBEQU1BR0VTIFdIQVRTT0VWRVIgUkVTVUxUSU5HIEZST01cclxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1JcclxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxyXG5QRVJGT1JNQU5DRSBPRiBUSElTIFNPRlRXQVJFLlxyXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xyXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSwgU3VwcHJlc3NlZEVycm9yLCBTeW1ib2wsIEl0ZXJhdG9yICovXHJcblxyXG52YXIgZXh0ZW5kU3RhdGljcyA9IGZ1bmN0aW9uKGQsIGIpIHtcclxuICAgIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcclxuICAgIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XHJcbiAgICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDbGFzcyBleHRlbmRzIHZhbHVlIFwiICsgU3RyaW5nKGIpICsgXCIgaXMgbm90IGEgY29uc3RydWN0b3Igb3IgbnVsbFwiKTtcclxuICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2Fzc2lnbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uIF9fYXNzaWduKHQpIHtcclxuICAgICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XHJcbiAgICB2YXIgdCA9IHt9O1xyXG4gICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXHJcbiAgICAgICAgdFtwXSA9IHNbcF07XHJcbiAgICBpZiAocyAhPSBudWxsICYmIHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXHJcbiAgICAgICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcclxuICAgICAgICB9XHJcbiAgICByZXR1cm4gdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3BhcmFtKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2VzRGVjb3JhdGUoY3RvciwgZGVzY3JpcHRvckluLCBkZWNvcmF0b3JzLCBjb250ZXh0SW4sIGluaXRpYWxpemVycywgZXh0cmFJbml0aWFsaXplcnMpIHtcclxuICAgIGZ1bmN0aW9uIGFjY2VwdChmKSB7IGlmIChmICE9PSB2b2lkIDAgJiYgdHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uIGV4cGVjdGVkXCIpOyByZXR1cm4gZjsgfVxyXG4gICAgdmFyIGtpbmQgPSBjb250ZXh0SW4ua2luZCwga2V5ID0ga2luZCA9PT0gXCJnZXR0ZXJcIiA/IFwiZ2V0XCIgOiBraW5kID09PSBcInNldHRlclwiID8gXCJzZXRcIiA6IFwidmFsdWVcIjtcclxuICAgIHZhciB0YXJnZXQgPSAhZGVzY3JpcHRvckluICYmIGN0b3IgPyBjb250ZXh0SW5bXCJzdGF0aWNcIl0gPyBjdG9yIDogY3Rvci5wcm90b3R5cGUgOiBudWxsO1xyXG4gICAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ySW4gfHwgKHRhcmdldCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSkgOiB7fSk7XHJcbiAgICB2YXIgXywgZG9uZSA9IGZhbHNlO1xyXG4gICAgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB2YXIgY29udGV4dCA9IHt9O1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluKSBjb250ZXh0W3BdID0gcCA9PT0gXCJhY2Nlc3NcIiA/IHt9IDogY29udGV4dEluW3BdO1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluLmFjY2VzcykgY29udGV4dC5hY2Nlc3NbcF0gPSBjb250ZXh0SW4uYWNjZXNzW3BdO1xyXG4gICAgICAgIGNvbnRleHQuYWRkSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbiAoZikgeyBpZiAoZG9uZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBhZGQgaW5pdGlhbGl6ZXJzIGFmdGVyIGRlY29yYXRpb24gaGFzIGNvbXBsZXRlZFwiKTsgZXh0cmFJbml0aWFsaXplcnMucHVzaChhY2NlcHQoZiB8fCBudWxsKSk7IH07XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9ICgwLCBkZWNvcmF0b3JzW2ldKShraW5kID09PSBcImFjY2Vzc29yXCIgPyB7IGdldDogZGVzY3JpcHRvci5nZXQsIHNldDogZGVzY3JpcHRvci5zZXQgfSA6IGRlc2NyaXB0b3Jba2V5XSwgY29udGV4dCk7XHJcbiAgICAgICAgaWYgKGtpbmQgPT09IFwiYWNjZXNzb3JcIikge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSB2b2lkIDApIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0ID09PSBudWxsIHx8IHR5cGVvZiByZXN1bHQgIT09IFwib2JqZWN0XCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWRcIik7XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5nZXQpKSBkZXNjcmlwdG9yLmdldCA9IF87XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5zZXQpKSBkZXNjcmlwdG9yLnNldCA9IF87XHJcbiAgICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5pbml0KSkgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKF8gPSBhY2NlcHQocmVzdWx0KSkge1xyXG4gICAgICAgICAgICBpZiAoa2luZCA9PT0gXCJmaWVsZFwiKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICAgICAgZWxzZSBkZXNjcmlwdG9yW2tleV0gPSBfO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0YXJnZXQpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGNvbnRleHRJbi5uYW1lLCBkZXNjcmlwdG9yKTtcclxuICAgIGRvbmUgPSB0cnVlO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcnVuSW5pdGlhbGl6ZXJzKHRoaXNBcmcsIGluaXRpYWxpemVycywgdmFsdWUpIHtcclxuICAgIHZhciB1c2VWYWx1ZSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbml0aWFsaXplcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YWx1ZSA9IHVzZVZhbHVlID8gaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZywgdmFsdWUpIDogaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdXNlVmFsdWUgPyB2YWx1ZSA6IHZvaWQgMDtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Byb3BLZXkoeCkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcInN5bWJvbFwiID8geCA6IFwiXCIuY29uY2F0KHgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0RnVuY3Rpb25OYW1lKGYsIG5hbWUsIHByZWZpeCkge1xyXG4gICAgaWYgKHR5cGVvZiBuYW1lID09PSBcInN5bWJvbFwiKSBuYW1lID0gbmFtZS5kZXNjcmlwdGlvbiA/IFwiW1wiLmNvbmNhdChuYW1lLmRlc2NyaXB0aW9uLCBcIl1cIikgOiBcIlwiO1xyXG4gICAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmLCBcIm5hbWVcIiwgeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBwcmVmaXggPyBcIlwiLmNvbmNhdChwcmVmaXgsIFwiIFwiLCBuYW1lKSA6IG5hbWUgfSk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcclxuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxyXG4gICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2dlbmVyYXRvcih0aGlzQXJnLCBib2R5KSB7XHJcbiAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnID0gT2JqZWN0LmNyZWF0ZSgodHlwZW9mIEl0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBJdGVyYXRvciA6IE9iamVjdCkucHJvdG90eXBlKTtcclxuICAgIHJldHVybiBnLm5leHQgPSB2ZXJiKDApLCBnW1widGhyb3dcIl0gPSB2ZXJiKDEpLCBnW1wicmV0dXJuXCJdID0gdmVyYigyKSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XHJcbiAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xyXG4gICAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcclxuICAgICAgICBkZXNjID0geyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbVtrXTsgfSB9O1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcclxufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBvW2syXSA9IG1ba107XHJcbn0pO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXhwb3J0U3RhcihtLCBvKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XHJcbiAgICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xyXG4gICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XHJcbiAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAobyAmJiBpID49IG8ubGVuZ3RoKSBvID0gdm9pZCAwO1xyXG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XHJcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XHJcbiAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XHJcbiAgICBmaW5hbGx5IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbi8qKiBAZGVwcmVjYXRlZCAqL1xyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XHJcbiAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcclxuICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXkodG8sIGZyb20sIHBhY2spIHtcclxuICAgIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGFyIHx8ICEoaSBpbiBmcm9tKSkge1xyXG4gICAgICAgICAgICBpZiAoIWFyKSBhciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20sIDAsIGkpO1xyXG4gICAgICAgICAgICBhcltpXSA9IGZyb21baV07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcclxuICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgcmV0dXJuIGkgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgQXN5bmNJdGVyYXRvciA9PT0gXCJmdW5jdGlvblwiID8gQXN5bmNJdGVyYXRvciA6IE9iamVjdCkucHJvdG90eXBlKSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiLCBhd2FpdFJldHVybiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIGF3YWl0UmV0dXJuKGYpIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBQcm9taXNlLnJlc29sdmUodikudGhlbihmLCByZWplY3QpOyB9OyB9XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaWYgKGdbbl0pIHsgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgaWYgKGYpIGlbbl0gPSBmKGlbbl0pOyB9IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBmYWxzZSB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XHJcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fbWFrZVRlbXBsYXRlT2JqZWN0KGNvb2tlZCwgcmF3KSB7XHJcbiAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgcmV0dXJuIGNvb2tlZDtcclxufTtcclxuXHJcbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBcImRlZmF1bHRcIiwgeyBlbnVtZXJhYmxlOiB0cnVlLCB2YWx1ZTogdiB9KTtcclxufSkgOiBmdW5jdGlvbihvLCB2KSB7XHJcbiAgICBvW1wiZGVmYXVsdFwiXSA9IHY7XHJcbn07XHJcblxyXG52YXIgb3duS2V5cyA9IGZ1bmN0aW9uKG8pIHtcclxuICAgIG93bktleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyB8fCBmdW5jdGlvbiAobykge1xyXG4gICAgICAgIHZhciBhciA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGsgaW4gbykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBrKSkgYXJbYXIubGVuZ3RoXSA9IGs7XHJcbiAgICAgICAgcmV0dXJuIGFyO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBvd25LZXlzKG8pO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcclxuICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgPSBvd25LZXlzKG1vZCksIGkgPSAwOyBpIDwgay5sZW5ndGg7IGkrKykgaWYgKGtbaV0gIT09IFwiZGVmYXVsdFwiKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGtbaV0pO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcclxuICAgIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIGdldHRlclwiKTtcclxuICAgIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwibVwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBtZXRob2QgaXMgbm90IHdyaXRhYmxlXCIpO1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcclxuICAgIHJldHVybiAoa2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIsIHZhbHVlKSA6IGYgPyBmLnZhbHVlID0gdmFsdWUgOiBzdGF0ZS5zZXQocmVjZWl2ZXIsIHZhbHVlKSksIHZhbHVlO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEluKHN0YXRlLCByZWNlaXZlcikge1xyXG4gICAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XHJcbiAgICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcclxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZC5cIik7XHJcbiAgICAgICAgdmFyIGRpc3Bvc2UsIGlubmVyO1xyXG4gICAgICAgIGlmIChhc3luYykge1xyXG4gICAgICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XHJcbiAgICAgICAgICAgIGlmIChhc3luYykgaW5uZXIgPSBkaXNwb3NlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XHJcbiAgICAgICAgaWYgKGlubmVyKSBkaXNwb3NlID0gZnVuY3Rpb24oKSB7IHRyeSB7IGlubmVyLmNhbGwodGhpcyk7IH0gY2F0Y2ggKGUpIHsgcmV0dXJuIFByb21pc2UucmVqZWN0KGUpOyB9IH07XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxuXHJcbn1cclxuXHJcbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XHJcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcclxuICAgIHJldHVybiBlLm5hbWUgPSBcIlN1cHByZXNzZWRFcnJvclwiLCBlLmVycm9yID0gZXJyb3IsIGUuc3VwcHJlc3NlZCA9IHN1cHByZXNzZWQsIGU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kaXNwb3NlUmVzb3VyY2VzKGVudikge1xyXG4gICAgZnVuY3Rpb24gZmFpbChlKSB7XHJcbiAgICAgICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xyXG4gICAgICAgIGVudi5oYXNFcnJvciA9IHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgciwgcyA9IDA7XHJcbiAgICBmdW5jdGlvbiBuZXh0KCkge1xyXG4gICAgICAgIHdoaWxlIChyID0gZW52LnN0YWNrLnBvcCgpKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXIuYXN5bmMgJiYgcyA9PT0gMSkgcmV0dXJuIHMgPSAwLCBlbnYuc3RhY2sucHVzaChyKSwgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihuZXh0KTtcclxuICAgICAgICAgICAgICAgIGlmIChyLmRpc3Bvc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gci5kaXNwb3NlLmNhbGwoci52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHIuYXN5bmMpIHJldHVybiBzIHw9IDIsIFByb21pc2UucmVzb2x2ZShyZXN1bHQpLnRoZW4obmV4dCwgZnVuY3Rpb24oZSkgeyBmYWlsKGUpOyByZXR1cm4gbmV4dCgpOyB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgcyB8PSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBmYWlsKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzID09PSAxKSByZXR1cm4gZW52Lmhhc0Vycm9yID8gUHJvbWlzZS5yZWplY3QoZW52LmVycm9yKSA6IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXh0KCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbihwYXRoLCBwcmVzZXJ2ZUpzeCkge1xyXG4gICAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiICYmIC9eXFwuXFwuP1xcLy8udGVzdChwYXRoKSkge1xyXG4gICAgICAgIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLih0c3gpJHwoKD86XFwuZCk/KSgoPzpcXC5bXi4vXSs/KT8pXFwuKFtjbV0/KXRzJC9pLCBmdW5jdGlvbiAobSwgdHN4LCBkLCBleHQsIGNtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0c3ggPyBwcmVzZXJ2ZUpzeCA/IFwiLmpzeFwiIDogXCIuanNcIiA6IGQgJiYgKCFleHQgfHwgIWNtKSA/IG0gOiAoZCArIGV4dCArIFwiLlwiICsgY20udG9Mb3dlckNhc2UoKSArIFwianNcIik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGF0aDtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG4gICAgX19leHRlbmRzOiBfX2V4dGVuZHMsXHJcbiAgICBfX2Fzc2lnbjogX19hc3NpZ24sXHJcbiAgICBfX3Jlc3Q6IF9fcmVzdCxcclxuICAgIF9fZGVjb3JhdGU6IF9fZGVjb3JhdGUsXHJcbiAgICBfX3BhcmFtOiBfX3BhcmFtLFxyXG4gICAgX19lc0RlY29yYXRlOiBfX2VzRGVjb3JhdGUsXHJcbiAgICBfX3J1bkluaXRpYWxpemVyczogX19ydW5Jbml0aWFsaXplcnMsXHJcbiAgICBfX3Byb3BLZXk6IF9fcHJvcEtleSxcclxuICAgIF9fc2V0RnVuY3Rpb25OYW1lOiBfX3NldEZ1bmN0aW9uTmFtZSxcclxuICAgIF9fbWV0YWRhdGE6IF9fbWV0YWRhdGEsXHJcbiAgICBfX2F3YWl0ZXI6IF9fYXdhaXRlcixcclxuICAgIF9fZ2VuZXJhdG9yOiBfX2dlbmVyYXRvcixcclxuICAgIF9fY3JlYXRlQmluZGluZzogX19jcmVhdGVCaW5kaW5nLFxyXG4gICAgX19leHBvcnRTdGFyOiBfX2V4cG9ydFN0YXIsXHJcbiAgICBfX3ZhbHVlczogX192YWx1ZXMsXHJcbiAgICBfX3JlYWQ6IF9fcmVhZCxcclxuICAgIF9fc3ByZWFkOiBfX3NwcmVhZCxcclxuICAgIF9fc3ByZWFkQXJyYXlzOiBfX3NwcmVhZEFycmF5cyxcclxuICAgIF9fc3ByZWFkQXJyYXk6IF9fc3ByZWFkQXJyYXksXHJcbiAgICBfX2F3YWl0OiBfX2F3YWl0LFxyXG4gICAgX19hc3luY0dlbmVyYXRvcjogX19hc3luY0dlbmVyYXRvcixcclxuICAgIF9fYXN5bmNEZWxlZ2F0b3I6IF9fYXN5bmNEZWxlZ2F0b3IsXHJcbiAgICBfX2FzeW5jVmFsdWVzOiBfX2FzeW5jVmFsdWVzLFxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3Q6IF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxyXG4gICAgX19pbXBvcnRTdGFyOiBfX2ltcG9ydFN0YXIsXHJcbiAgICBfX2ltcG9ydERlZmF1bHQ6IF9faW1wb3J0RGVmYXVsdCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRHZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRHZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0OiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEluOiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXHJcbiAgICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZTogX19hZGREaXNwb3NhYmxlUmVzb3VyY2UsXHJcbiAgICBfX2Rpc3Bvc2VSZXNvdXJjZXM6IF9fZGlzcG9zZVJlc291cmNlcyxcclxuICAgIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uOiBfX3Jld3JpdGVSZWxhdGl2ZUltcG9ydEV4dGVuc2lvbixcclxufTtcclxuIiwiaW1wb3J0IHsgTm90aWNlIH0gZnJvbSAnb2JzaWRpYW4nO1xuXG4vLyBFVkVOVCBCVVMgU1lTVEVNXG5leHBvcnQgY2xhc3MgVGlueUVtaXR0ZXIge1xuICAgIHByaXZhdGUgbGlzdGVuZXJzOiB7IFtrZXk6IHN0cmluZ106IEZ1bmN0aW9uW10gfSA9IHt9O1xuXG4gICAgb24oZXZlbnQ6IHN0cmluZywgZm46IEZ1bmN0aW9uKSB7XG4gICAgICAgICh0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0gfHwgW10pLnB1c2goZm4pO1xuICAgIH1cblxuICAgIG9mZihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgaWYgKCF0aGlzLmxpc3RlbmVyc1tldmVudF0pIHJldHVybjtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5saXN0ZW5lcnNbZXZlbnRdLmZpbHRlcihmID0+IGYgIT09IGZuKTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyKGV2ZW50OiBzdHJpbmcsIGRhdGE/OiBhbnkpIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkuZm9yRWFjaChmbiA9PiBmbihkYXRhKSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXVkaW9Db250cm9sbGVyIHtcbiAgICBhdWRpb0N0eDogQXVkaW9Db250ZXh0IHwgbnVsbCA9IG51bGw7XG4gICAgYnJvd25Ob2lzZU5vZGU6IFNjcmlwdFByb2Nlc3Nvck5vZGUgfCBudWxsID0gbnVsbDtcbiAgICBtdXRlZDogYm9vbGVhbiA9IGZhbHNlO1xuXG4gICAgY29uc3RydWN0b3IobXV0ZWQ6IGJvb2xlYW4pIHsgdGhpcy5tdXRlZCA9IG11dGVkOyB9XG5cbiAgICBzZXRNdXRlZChtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIGluaXRBdWRpbygpIHsgaWYgKCF0aGlzLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvQ3R4ID0gbmV3ICh3aW5kb3cuQXVkaW9Db250ZXh0IHx8ICh3aW5kb3cgYXMgYW55KS53ZWJraXRBdWRpb0NvbnRleHQpKCk7IH1cblxuICAgIHBsYXlUb25lKGZyZXE6IG51bWJlciwgdHlwZTogT3NjaWxsYXRvclR5cGUsIGR1cmF0aW9uOiBudW1iZXIsIHZvbDogbnVtYmVyID0gMC4xKSB7XG4gICAgICAgIGlmICh0aGlzLm11dGVkKSByZXR1cm47XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGNvbnN0IG9zYyA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgY29uc3QgZ2FpbiA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgb3NjLnR5cGUgPSB0eXBlO1xuICAgICAgICBvc2MuZnJlcXVlbmN5LnZhbHVlID0gZnJlcTtcbiAgICAgICAgb3NjLmNvbm5lY3QoZ2Fpbik7XG4gICAgICAgIGdhaW4uY29ubmVjdCh0aGlzLmF1ZGlvQ3R4IS5kZXN0aW5hdGlvbik7XG4gICAgICAgIG9zYy5zdGFydCgpO1xuICAgICAgICBnYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUodm9sLCB0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSk7XG4gICAgICAgIGdhaW4uZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDAwMDEsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgICAgICBvc2Muc3RvcCh0aGlzLmF1ZGlvQ3R4IS5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICBwbGF5U291bmQodHlwZTogXCJzdWNjZXNzXCJ8XCJmYWlsXCJ8XCJkZWF0aFwifFwiY2xpY2tcInxcImhlYXJ0YmVhdFwifFwibWVkaXRhdGVcIikge1xuICAgICAgICBpZiAodHlwZSA9PT0gXCJzdWNjZXNzXCIpIHsgdGhpcy5wbGF5VG9uZSg2MDAsIFwic2luZVwiLCAwLjEpOyBzZXRUaW1lb3V0KCgpID0+IHRoaXMucGxheVRvbmUoODAwLCBcInNpbmVcIiwgMC4yKSwgMTAwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImZhaWxcIikgeyB0aGlzLnBsYXlUb25lKDE1MCwgXCJzYXd0b290aFwiLCAwLjQpOyBzZXRUaW1lb3V0KCgpID0+IHRoaXMucGxheVRvbmUoMTAwLCBcInNhd3Rvb3RoXCIsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJkZWF0aFwiKSB7IHRoaXMucGxheVRvbmUoNTAsIFwic3F1YXJlXCIsIDEuMCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJjbGlja1wiKSB7IHRoaXMucGxheVRvbmUoODAwLCBcInNpbmVcIiwgMC4wNSk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJoZWFydGJlYXRcIikgeyB0aGlzLnBsYXlUb25lKDYwLCBcInNpbmVcIiwgMC4xLCAwLjUpOyBzZXRUaW1lb3V0KCgpPT50aGlzLnBsYXlUb25lKDUwLCBcInNpbmVcIiwgMC4xLCAwLjQpLCAxNTApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwibWVkaXRhdGVcIikgeyB0aGlzLnBsYXlUb25lKDQzMiwgXCJzaW5lXCIsIDIuMCwgMC4wNSk7IH1cbiAgICB9XG5cbiAgICB0b2dnbGVCcm93bk5vaXNlKCkge1xuICAgICAgICB0aGlzLmluaXRBdWRpbygpO1xuICAgICAgICBpZiAodGhpcy5icm93bk5vaXNlTm9kZSkgeyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUuZGlzY29ubmVjdCgpOyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUgPSBudWxsOyBcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJGb2N1cyBBdWRpbzogT0ZGXCIpOyBcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlclNpemUgPSA0MDk2OyBcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUgPSB0aGlzLmF1ZGlvQ3R4IS5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgMSwgMSk7XG4gICAgICAgICAgICBsZXQgbGFzdE91dCA9IDA7XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gKGUpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXQgPSBlLm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJ1ZmZlclNpemU7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB3aGl0ZSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSA9IChsYXN0T3V0ICsgKDAuMDIgKiB3aGl0ZSkpIC8gMS4wMjsgXG4gICAgICAgICAgICAgICAgICAgIGxhc3RPdXQgPSBvdXRwdXRbaV07IFxuICAgICAgICAgICAgICAgICAgICBvdXRwdXRbaV0gKj0gMC4xOyBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJGb2N1cyBBdWRpbzogT04gKEJyb3duIE5vaXNlKVwiKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgTW9kYWwsIFNldHRpbmcsIE5vdGljZSwgbW9tZW50LCBURmlsZSwgVEZvbGRlciB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuLi9tYWluJzsgLy8gRml4OiBEZWZhdWx0IEltcG9ydFxuaW1wb3J0IHsgTW9kaWZpZXIgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBDaGFvc01vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBtb2RpZmllcjogTW9kaWZpZXI7IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBtOiBNb2RpZmllcikgeyBzdXBlcihhcHApOyB0aGlzLm1vZGlmaWVyPW07IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsOyBcbiAgICAgICAgY29uc3QgaDEgPSBjLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBcIlRIRSBPTUVOXCIgfSk7IFxuICAgICAgICBoMS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXI7IGNvbG9yOiNmNTU7XCIpOyBcbiAgICAgICAgY29uc3QgaWMgPSBjLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogdGhpcy5tb2RpZmllci5pY29uIH0pOyBcbiAgICAgICAgaWMuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcImZvbnQtc2l6ZTo4MHB4OyB0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBoMiA9IGMuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IHRoaXMubW9kaWZpZXIubmFtZSB9KTsgXG4gICAgICAgIGgyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJ0ZXh0LWFsaWduOmNlbnRlcjtcIik7IFxuICAgICAgICBjb25zdCBwID0gYy5jcmVhdGVFbChcInBcIiwge3RleHQ6IHRoaXMubW9kaWZpZXIuZGVzY30pOyBcbiAgICAgICAgcC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXJcIik7IFxuICAgICAgICBjb25zdCBiID0gYy5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIkFja25vd2xlZGdlXCJ9KTsgXG4gICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgYi5zdHlsZS5kaXNwbGF5PVwiYmxvY2tcIjsgXG4gICAgICAgIGIuc3R5bGUubWFyZ2luPVwiMjBweCBhdXRvXCI7IFxuICAgICAgICBiLm9uY2xpY2s9KCk9PnRoaXMuY2xvc2UoKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2hvcE1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLwn5uSIEJMQUNLIE1BUktFVFwiIH0pOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBQdXJzZTog8J+qmSAke3RoaXMucGx1Z2luLnNldHRpbmdzLmdvbGR9YCB9KTsgXG4gICAgICAgIFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfkokgU3RpbXBhY2tcIiwgXCJIZWFsIDIwIEhQXCIsIDUwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPSBNYXRoLm1pbih0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgKyAyMCk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+SoyBTYWJvdGFnZVwiLCBcIi01IFJpdmFsIERtZ1wiLCAyMDAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyA9IE1hdGgubWF4KDUsIHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nIC0gNSk7IFxuICAgICAgICB9KTsgXG4gICAgICAgIHRoaXMuaXRlbShjb250ZW50RWwsIFwi8J+boe+4jyBTaGllbGRcIiwgXCIyNGggUHJvdGVjdGlvblwiLCAxNTAsIGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaGllbGRlZFVudGlsID0gbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfmLQgUmVzdCBEYXlcIiwgXCJTYWZlIGZvciAyNGhcIiwgMTAwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzdERheVVudGlsID0gbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpOyBcbiAgICAgICAgfSk7IFxuICAgIH0gXG4gICAgaXRlbShlbDogSFRNTEVsZW1lbnQsIG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBjb3N0OiBudW1iZXIsIGVmZmVjdDogKCkgPT4gUHJvbWlzZTx2b2lkPikgeyBcbiAgICAgICAgY29uc3QgYyA9IGVsLmNyZWF0ZURpdigpOyBcbiAgICAgICAgYy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47IHBhZGRpbmc6MTBweCAwOyBib3JkZXItYm90dG9tOjFweCBzb2xpZCAjMzMzO1wiKTsgXG4gICAgICAgIGNvbnN0IGkgPSBjLmNyZWF0ZURpdigpOyBcbiAgICAgICAgaS5jcmVhdGVFbChcImJcIiwgeyB0ZXh0OiBuYW1lIH0pOyBcbiAgICAgICAgaS5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IGRlc2MgfSk7IFxuICAgICAgICBjb25zdCBiID0gYy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IGAke2Nvc3R9IEdgIH0pOyBcbiAgICAgICAgaWYodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IGNvc3QpIHsgXG4gICAgICAgICAgICBiLnNldEF0dHJpYnV0ZShcImRpc2FibGVkXCIsXCJ0cnVlXCIpOyBiLnN0eWxlLm9wYWNpdHk9XCIwLjVcIjsgXG4gICAgICAgIH0gZWxzZSB7IFxuICAgICAgICAgICAgYi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7IFxuICAgICAgICAgICAgYi5vbmNsaWNrID0gYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIC09IGNvc3Q7IFxuICAgICAgICAgICAgICAgIGF3YWl0IGVmZmVjdCgpOyBcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyBcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBCb3VnaHQgJHtuYW1lfWApOyBcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7IFxuICAgICAgICAgICAgICAgIG5ldyBTaG9wTW9kYWwodGhpcy5hcHAsdGhpcy5wbHVnaW4pLm9wZW4oKTsgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgUXVlc3RNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgXG4gICAgbmFtZTogc3RyaW5nOyBkaWZmaWN1bHR5OiBudW1iZXIgPSAzOyBza2lsbDogc3RyaW5nID0gXCJOb25lXCI7IHNlY1NraWxsOiBzdHJpbmcgPSBcIk5vbmVcIjsgZGVhZGxpbmU6IHN0cmluZyA9IFwiXCI7IGhpZ2hTdGFrZXM6IGJvb2xlYW4gPSBmYWxzZTsgaXNCb3NzOiBib29sZWFuID0gZmFsc2U7IFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luID0gcGx1Z2luOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzOyBcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIuKalO+4jyBERVBMT1lNRU5UXCIgfSk7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiT2JqZWN0aXZlXCIpLmFkZFRleHQodCA9PiB7IFxuICAgICAgICAgICAgdC5vbkNoYW5nZSh2ID0+IHRoaXMubmFtZSA9IHYpOyBcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTsgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRpZmZpY3VsdHlcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbihcIjFcIixcIlRyaXZpYWxcIikuYWRkT3B0aW9uKFwiMlwiLFwiRWFzeVwiKS5hZGRPcHRpb24oXCIzXCIsXCJNZWRpdW1cIikuYWRkT3B0aW9uKFwiNFwiLFwiSGFyZFwiKS5hZGRPcHRpb24oXCI1XCIsXCJTVUlDSURFXCIpLnNldFZhbHVlKFwiM1wiKS5vbkNoYW5nZSh2PT50aGlzLmRpZmZpY3VsdHk9cGFyc2VJbnQodikpKTsgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBza2lsbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9OyBcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2gocyA9PiBza2lsbHNbcy5uYW1lXSA9IHMubmFtZSk7IFxuICAgICAgICBza2lsbHNbXCIrIE5ld1wiXSA9IFwiKyBOZXdcIjsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJQcmltYXJ5IE5vZGVcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbnMoc2tpbGxzKS5vbkNoYW5nZSh2ID0+IHsgXG4gICAgICAgICAgICBpZih2PT09XCIrIE5ld1wiKXsgdGhpcy5jbG9zZSgpOyBuZXcgU2tpbGxNYW5hZ2VyTW9kYWwodGhpcy5hcHAsdGhpcy5wbHVnaW4pLm9wZW4oKTsgfSBlbHNlIHRoaXMuc2tpbGw9djsgXG4gICAgICAgIH0pKTsgXG4gICAgICAgIFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJTeW5lcmd5IE5vZGVcIikuYWRkRHJvcGRvd24oZCA9PiBkLmFkZE9wdGlvbnMoc2tpbGxzKS5zZXRWYWx1ZShcIk5vbmVcIikub25DaGFuZ2UodiA9PiB0aGlzLnNlY1NraWxsID0gdikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEZWFkbGluZVwiKS5hZGRUZXh0KHQgPT4geyB0LmlucHV0RWwudHlwZSA9IFwiZGF0ZXRpbWUtbG9jYWxcIjsgdC5vbkNoYW5nZSh2ID0+IHRoaXMuZGVhZGxpbmUgPSB2KTsgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkhpZ2ggU3Rha2VzXCIpLnNldERlc2MoXCJEb3VibGUgR29sZCAvIERvdWJsZSBEYW1hZ2VcIikuYWRkVG9nZ2xlKHQ9PnQuc2V0VmFsdWUoZmFsc2UpLm9uQ2hhbmdlKHY9PnRoaXMuaGlnaFN0YWtlcz12KSk7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5hZGRCdXR0b24oYiA9PiBiLnNldEJ1dHRvblRleHQoXCJEZXBsb3lcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7IFxuICAgICAgICAgICAgaWYodGhpcy5uYW1lKXtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUXVlc3QodGhpcy5uYW1lLHRoaXMuZGlmZmljdWx0eSx0aGlzLnNraWxsLHRoaXMuc2VjU2tpbGwsdGhpcy5kZWFkbGluZSx0aGlzLmhpZ2hTdGFrZXMsIFwiTm9ybWFsXCIsIHRoaXMuaXNCb3NzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9IFxuICAgICAgICB9KSk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNraWxsTWFuYWdlck1vZGFsIGV4dGVuZHMgTW9kYWwgeyBcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJBZGQgTmV3IE5vZGVcIiB9KTsgXG4gICAgICAgIGxldCBuPVwiXCI7IFxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJOb2RlIE5hbWVcIikuYWRkVGV4dCh0PT50Lm9uQ2hhbmdlKHY9Pm49dikpLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJDcmVhdGVcIikuc2V0Q3RhKCkub25DbGljayhhc3luYygpPT57XG4gICAgICAgICAgICBpZihuKXtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMucHVzaCh7bmFtZTpuLGxldmVsOjEseHA6MCx4cFJlcTo1LGxhc3RVc2VkOm5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxydXN0OjAsY29ubmVjdGlvbnM6W119KTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTa2lsbERldGFpbE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IGluZGV4OiBudW1iZXI7XG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4sIGluZGV4OiBudW1iZXIpIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW49cGx1Z2luOyB0aGlzLmluZGV4PWluZGV4OyB9XG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgY29uc3QgcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxsc1t0aGlzLmluZGV4XTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgTm9kZTogJHtzLm5hbWV9YCB9KTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTmFtZVwiKS5hZGRUZXh0KHQ9PnQuc2V0VmFsdWUocy5uYW1lKS5vbkNoYW5nZSh2PT5zLm5hbWU9dikpO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJSdXN0IFN0YXR1c1wiKS5zZXREZXNjKGBTdGFja3M6ICR7cy5ydXN0fWApLmFkZEJ1dHRvbihiPT5iLnNldEJ1dHRvblRleHQoXCJNYW51YWwgUG9saXNoXCIpLm9uQ2xpY2soYXN5bmMoKT0+eyBcbiAgICAgICAgICAgIHMucnVzdD0wOyBzLnhwUmVxPU1hdGguZmxvb3Iocy54cFJlcS8xLjEpOyBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJSdXN0IHBvbGlzaGVkLlwiKTsgXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpdiA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6MjBweDsgZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiU2F2ZSA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7dGV4dDpcIlNhdmVcIn0pOyBcbiAgICAgICAgYlNhdmUuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgYlNhdmUub25jbGljaz1hc3luYygpPT57IGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IHRoaXMuY2xvc2UoKTsgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJEZWwgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJEZWxldGUgTm9kZVwifSk7IFxuICAgICAgICBiRGVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJjb2xvcjpyZWQ7XCIpOyBcbiAgICAgICAgYkRlbC5vbmNsaWNrPWFzeW5jKCk9PnsgXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuc3BsaWNlKHRoaXMuaW5kZXgsIDEpOyBcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5zYXZlKCk7IFxuICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgfTtcbiAgICB9XG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuXG5cblxuZXhwb3J0IGNsYXNzIFJlc2VhcmNoUXVlc3RNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIHRpdGxlOiBzdHJpbmcgPSBcIlwiO1xuICAgIHR5cGU6IFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiID0gXCJzdXJ2ZXlcIjtcbiAgICBsaW5rZWRTa2lsbDogc3RyaW5nID0gXCJOb25lXCI7XG4gICAgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZyA9IFwiTm9uZVwiO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJFU0VBUkNIIERFUExPWU1FTlRcIiB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIlJlc2VhcmNoIFRpdGxlXCIpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ID0+IHtcbiAgICAgICAgICAgICAgICB0Lm9uQ2hhbmdlKHYgPT4gdGhpcy50aXRsZSA9IHYpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiUmVzZWFyY2ggVHlwZVwiKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4gZFxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oXCJzdXJ2ZXlcIiwgXCJTdXJ2ZXkgKDEwMC0yMDAgd29yZHMpXCIpXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbihcImRlZXBfZGl2ZVwiLCBcIkRlZXAgRGl2ZSAoMjAwLTQwMCB3b3JkcylcIilcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUoXCJzdXJ2ZXlcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLnR5cGUgPSB2IGFzIFwic3VydmV5XCIgfCBcImRlZXBfZGl2ZVwiKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBza2lsbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9O1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHMuZm9yRWFjaChzID0+IHNraWxsc1tzLm5hbWVdID0gcy5uYW1lKTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkxpbmtlZCBTa2lsbFwiKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4gZFxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb25zKHNraWxscylcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUoXCJOb25lXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRTa2lsbCA9IHYpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGNvbWJhdFF1ZXN0czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgXCJOb25lXCI6IFwiTm9uZVwiIH07XG4gICAgICAgIGNvbnN0IHF1ZXN0Rm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmIChxdWVzdEZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIHF1ZXN0Rm9sZGVyLmNoaWxkcmVuLmZvckVhY2goZiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYgaW5zdGFuY2VvZiBURmlsZSAmJiBmLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbWJhdFF1ZXN0c1tmLmJhc2VuYW1lXSA9IGYuYmFzZW5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkxpbmsgQ29tYmF0IFF1ZXN0XCIpXG4gICAgICAgICAgICAuYWRkRHJvcGRvd24oZCA9PiBkXG4gICAgICAgICAgICAgICAgLmFkZE9wdGlvbnMoY29tYmF0UXVlc3RzKVxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZShcIk5vbmVcIilcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UodiA9PiB0aGlzLmxpbmtlZENvbWJhdFF1ZXN0ID0gdilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLmFkZEJ1dHRvbihiID0+IGJcbiAgICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkNSRUFURSBSRVNFQVJDSFwiKVxuICAgICAgICAgICAgICAgIC5zZXRDdGEoKVxuICAgICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVSZXNlYXJjaFF1ZXN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlua2VkU2tpbGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saW5rZWRDb21iYXRRdWVzdFxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUmVzZWFyY2hMaXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIgfSk7XG5cbiAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0UmVzZWFyY2hSYXRpbygpO1xuICAgICAgICBjb25zdCBzdGF0c0VsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzXCIgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYENvbWJhdCBRdWVzdHM6ICR7c3RhdHMuY29tYmF0fWAgfSk7XG4gICAgICAgIHN0YXRzRWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFF1ZXN0czogJHtzdGF0cy5yZXNlYXJjaH1gIH0pO1xuICAgICAgICBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSYXRpbzogJHtzdGF0cy5yYXRpb306MWAgfSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5lbmdpbmUuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgd2FybmluZy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiBvcmFuZ2U7IGZvbnQtd2VpZ2h0OiBib2xkOyBtYXJnaW46IDEwcHggMDtcIik7XG4gICAgICAgICAgICB3YXJuaW5nLnNldFRleHQoXCJSRVNFQVJDSCBCTE9DS0VEOiBOZWVkIDI6MSBjb21iYXQgdG8gcmVzZWFyY2ggcmF0aW9cIik7XG4gICAgICAgIH1cblxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQWN0aXZlIFJlc2VhcmNoXCIgfSk7XG5cbiAgICAgICAgY29uc3QgcXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgaWYgKHF1ZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaCBxdWVzdHMuXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBxdWVzdHMuZm9yRWFjaCgocTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1jYXJkXCIgfSk7XG4gICAgICAgICAgICAgICAgY2FyZC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM0NDQ7IHBhZGRpbmc6IDEwcHg7IG1hcmdpbjogNXB4IDA7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBxLnRpdGxlIH0pO1xuICAgICAgICAgICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMCAwIDVweCAwO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBjYXJkLmNyZWF0ZUVsKFwiZGl2XCIpO1xuICAgICAgICAgICAgICAgIGluZm8uaW5uZXJIVE1MID0gYDxjb2RlIHN0eWxlPVwiY29sb3I6I2FhNjRmZlwiPiR7cS5pZH08L2NvZGU+PGJyPlR5cGU6ICR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9IHwgV29yZHM6ICR7cS53b3JkQ291bnR9LyR7cS53b3JkTGltaXR9YDtcbiAgICAgICAgICAgICAgICBpbmZvLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjllbTsgb3BhY2l0eTogMC44O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbnMgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGFjdGlvbnMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiA4cHg7IGRpc3BsYXk6IGZsZXg7IGdhcDogNXB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBsZXRlQnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ09NUExFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBjb21wbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDVweDsgYmFja2dyb3VuZDogZ3JlZW47IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7XG4gICAgICAgICAgICAgICAgY29tcGxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUmVzZWFyY2hRdWVzdChxLmlkLCBxLndvcmRDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlQnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNXB4OyBiYWNrZ3JvdW5kOiByZWQ7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyOiBub25lOyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjtcIik7XG4gICAgICAgICAgICAgICAgZGVsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KHEuaWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkNvbXBsZXRlZCBSZXNlYXJjaFwiIH0pO1xuICAgICAgICBjb25zdCBjb21wbGV0ZWQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChjb21wbGV0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBjb21wbGV0ZWQgcmVzZWFyY2guXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wbGV0ZWQuZm9yRWFjaCgocTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIik7XG4gICAgICAgICAgICAgICAgaXRlbS5zZXRUZXh0KGArICR7cS50aXRsZX0gKCR7cS50eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9KWApO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgQ2hhaW5CdWlsZGVyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBjaGFpbk5hbWU6IHN0cmluZyA9IFwiXCI7XG4gICAgc2VsZWN0ZWRRdWVzdHM6IHN0cmluZ1tdID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQ0hBSU4gQlVJTERFUlwiIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5zZXROYW1lKFwiQ2hhaW4gTmFtZVwiKVxuICAgICAgICAgICAgLmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5vbkNoYW5nZSh2ID0+IHRoaXMuY2hhaW5OYW1lID0gdik7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0LmlucHV0RWwuZm9jdXMoKSwgNTApO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlNlbGVjdCBRdWVzdHNcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHF1ZXN0Rm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGNvbnN0IHF1ZXN0czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChxdWVzdEZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIHF1ZXN0Rm9sZGVyLmNoaWxkcmVuLmZvckVhY2goZiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGYgaW5zdGFuY2VvZiBURmlsZSAmJiBmLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXN0cy5wdXNoKGYuYmFzZW5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcXVlc3RzLmZvckVhY2goKHF1ZXN0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgICAgICAuc2V0TmFtZShxdWVzdClcbiAgICAgICAgICAgICAgICAuYWRkVG9nZ2xlKHQgPT4gdC5vbkNoYW5nZSh2ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2VsZWN0ZWRRdWVzdHMucHVzaChxdWVzdCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzID0gdGhpcy5zZWxlY3RlZFF1ZXN0cy5maWx0ZXIocSA9PiBxICE9PSBxdWVzdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgQ0hBSU5cIilcbiAgICAgICAgICAgICAgICAuc2V0Q3RhKClcbiAgICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNoYWluTmFtZSAmJiB0aGlzLnNlbGVjdGVkUXVlc3RzLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUXVlc3RDaGFpbih0aGlzLmNoYWluTmFtZSwgdGhpcy5zZWxlY3RlZFF1ZXN0cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiQ2hhaW4gbmVlZHMgYSBuYW1lIGFuZCBhdCBsZWFzdCAyIHF1ZXN0c1wiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVmljdG9yeU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmFkZENsYXNzKFwic2lzeS12aWN0b3J5LW1vZGFsXCIpO1xuXG4gICAgICAgIC8vIEVwaWMgVGl0bGVcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiBcIkFTQ0VOU0lPTiBBQ0hJRVZFRFwiLCBjbHM6IFwic2lzeS12aWN0b3J5LXRpdGxlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYRURdIHN0eWxlIG1vdmVkIHRvIGF0dHJcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogXCLwn4+GXCIsIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiA2MHB4OyBtYXJnaW46IDIwcHggMDtcIiB9IH0pO1xuXG4gICAgICAgIC8vIFN0YXRzIENvbnRhaW5lclxuICAgICAgICBjb25zdCBzdGF0cyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29uc3QgbGVnYWN5ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5O1xuICAgICAgICBjb25zdCBtZXRyaWNzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuXG4gICAgICAgIHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiRmluYWwgTGV2ZWxcIiwgXCI1MFwiKTtcbiAgICAgICAgdGhpcy5zdGF0TGluZShzdGF0cywgXCJUb3RhbCBRdWVzdHNcIiwgYCR7bWV0cmljcy50b3RhbFF1ZXN0c31gKTtcbiAgICAgICAgdGhpcy5zdGF0TGluZShzdGF0cywgXCJEZWF0aHMgRW5kdXJlZFwiLCBgJHtsZWdhY3kuZGVhdGhDb3VudH1gKTtcbiAgICAgICAgdGhpcy5zdGF0TGluZShzdGF0cywgXCJMb25nZXN0IFN0cmVha1wiLCBgJHttZXRyaWNzLmxvbmdlc3RTdHJlYWt9IGRheXNgKTtcblxuICAgICAgICAvLyBNZXNzYWdlXG4gICAgICAgIC8vIFtGSVhFRF0gc3R5bGUgbW92ZWQgdG8gYXR0clxuICAgICAgICBjb25zdCBtc2cgPSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgXG4gICAgICAgICAgICB0ZXh0OiBcIk9uZSBtdXN0IGltYWdpbmUgU2lzeXBodXMgaGFwcHkuIFlvdSBoYXZlIHB1c2hlZCB0aGUgYm91bGRlciB0byB0aGUgcGVhay5cIixcbiAgICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IFwibWFyZ2luOiAzMHB4IDA7IGZvbnQtc3R5bGU6IGl0YWxpYzsgb3BhY2l0eTogMC44O1wiIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udGludWUgQnV0dG9uXG4gICAgICAgIGNvbnN0IGJ0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQkVHSU4gTkVXIEdBTUUrXCIgfSk7XG4gICAgICAgIGJ0bi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgICAgIGJ0bi5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIC8vIE9wdGlvbmFsOiBUcmlnZ2VyIFByZXN0aWdlL05ldyBHYW1lKyBsb2dpYyBoZXJlIGlmIGRlc2lyZWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBzdGF0TGluZShlbDogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGxpbmUgPSBlbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS12aWN0b3J5LXN0YXRcIiB9KTtcbiAgICAgICAgbGluZS5pbm5lckhUTUwgPSBgJHtsYWJlbH06IDxzcGFuIGNsYXNzPVwic2lzeS12aWN0b3J5LWhpZ2hsaWdodFwiPiR7dmFsfTwvc3Bhbj5gO1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5cblxuLy8gW0FQUEVORCBUTyBzcmMvdWkvbW9kYWxzLnRzXVxuXG5leHBvcnQgY2xhc3MgUXVpY2tDYXB0dXJlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi4pqhIFF1aWNrIENhcHR1cmVcIiB9KTtcblxuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZGl2LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBcbiAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLCBcbiAgICAgICAgICAgIGF0dHI6IHsgXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IFwiV2hhdCdzIG9uIHlvdXIgbWluZD9cIixcbiAgICAgICAgICAgICAgICBzdHlsZTogXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogMTBweDsgZm9udC1zaXplOiAxLjJlbTsgYmFja2dyb3VuZDogIzIyMjsgYm9yZGVyOiAxcHggc29saWQgIzQ0NDsgY29sb3I6ICNlMGUwZTA7XCJcbiAgICAgICAgICAgIH0gXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlucHV0LmZvY3VzKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIEVudGVyIEtleVxuICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5cHJlc3NcIiwgYXN5bmMgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmIGlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVNjcmFwKGlucHV0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGJ0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FwdHVyZSB0byBTY3JhcHNcIiB9KTtcbiAgICAgICAgYnRuLmFkZENsYXNzKFwibW9kLWN0YVwiKTtcbiAgICAgICAgYnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogMTVweDsgd2lkdGg6IDEwMCU7XCIpO1xuICAgICAgICBidG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGlmIChpbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVTY3JhcChpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29uZmlybU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICAgIG9uQ29uZmlybTogKCkgPT4gdm9pZDtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9uQ29uZmlybTogKCkgPT4gdm9pZCkge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnRpdGxlID0gdGl0bGU7XG4gICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgICAgIHRoaXMub25Db25maXJtID0gb25Db25maXJtO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy50aXRsZSB9KTtcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IHRoaXMubWVzc2FnZSB9KTtcblxuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY29udHJvbHNcIiB9KTtcbiAgICAgICAgZGl2LnN0eWxlLm1hcmdpblRvcCA9IFwiMjBweFwiO1xuICAgICAgICBkaXYuc3R5bGUuanVzdGlmeUNvbnRlbnQgPSBcImZsZXgtZW5kXCI7XG5cbiAgICAgICAgY29uc3QgYnRuQ2FuY2VsID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcbiAgICAgICAgYnRuQ2FuY2VsLm9uY2xpY2sgPSAoKSA9PiB0aGlzLmNsb3NlKCk7XG5cbiAgICAgICAgY29uc3QgYnRuQ29uZmlybSA9IGRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ29uZmlybVwiLCBjbHM6IFwibW9kLWN0YVwiIH0pO1xuICAgICAgICBidG5Db25maXJtLnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiI2ZmNTU1NVwiOyAvLyBSZWQgZm9yIGRhbmdlclxuICAgICAgICBidG5Db25maXJtLnN0eWxlLmNvbG9yID0gXCJ3aGl0ZVwiO1xuICAgICAgICBidG5Db25maXJtLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uQ29uZmlybSgpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuXG4vLyBbQVBQRU5EIFRPIHNyYy91aS9tb2RhbHMudHNdXG5cbmV4cG9ydCBjbGFzcyBRdWVzdFRlbXBsYXRlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICAvLyBIYXJkY29kZWQgdGVtcGxhdGVzIGZvciBub3cgLSB2Mi4wIGNvdWxkIGFsbG93IHVzZXItY3VzdG9taXphYmxlIG9uZXNcbiAgICB0ZW1wbGF0ZXMgPSBbXG4gICAgICAgIHsgbmFtZTogXCJNb3JuaW5nIFJvdXRpbmVcIiwgZGlmZjogMSwgc2tpbGw6IFwiRGlzY2lwbGluZVwiLCBkZWFkbGluZTogXCIxMDowMCBBTVwiIH0sXG4gICAgICAgIHsgbmFtZTogXCJEZWVwIFdvcmsgQmxvY2tcIiwgZGlmZjogMywgc2tpbGw6IFwiRm9jdXNcIiwgZGVhZGxpbmU6IFwiKzJoXCIgfSxcbiAgICAgICAgeyBuYW1lOiBcIkV4ZXJjaXNlXCIsIGRpZmY6IDIsIHNraWxsOiBcIkhlYWx0aFwiLCBkZWFkbGluZTogXCIrMTJoXCIgfSxcbiAgICAgICAgeyBuYW1lOiBcIkNvZGUgUmV2aWV3XCIsIGRpZmY6IDIsIHNraWxsOiBcIkVuZ2luZWVyaW5nXCIsIGRlYWRsaW5lOiBcIis0aFwiIH1cbiAgICBdO1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimqEgUXVpY2sgRGVwbG95IFRlbXBsYXRlc1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZ3JpZCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgZ3JpZC5zdHlsZS5kaXNwbGF5ID0gXCJncmlkXCI7XG4gICAgICAgIGdyaWQuc3R5bGUuZ3JpZFRlbXBsYXRlQ29sdW1ucyA9IFwiMWZyIDFmclwiO1xuICAgICAgICBncmlkLnN0eWxlLmdhcCA9IFwiMTBweFwiO1xuXG4gICAgICAgIHRoaXMudGVtcGxhdGVzLmZvckVhY2godGVtcGxhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgYnRuID0gZ3JpZC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IHRlbXBsYXRlLm5hbWUgfSk7XG4gICAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJzaXN5LWJ0blwiKTtcbiAgICAgICAgICAgIGJ0bi5zdHlsZS50ZXh0QWxpZ24gPSBcImxlZnRcIjtcbiAgICAgICAgICAgIGJ0bi5zdHlsZS5wYWRkaW5nID0gXCIxNXB4XCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN1YnRleHRcbiAgICAgICAgICAgIGJ0bi5jcmVhdGVEaXYoeyBcbiAgICAgICAgICAgICAgICB0ZXh0OiBgRGlmZjogJHt0ZW1wbGF0ZS5kaWZmfSB8IFNraWxsOiAke3RlbXBsYXRlLnNraWxsfWAsIFxuICAgICAgICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IFwiZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43OyBtYXJnaW4tdG9wOiA1cHg7XCIgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlYWRsaW5lID0gdGVtcGxhdGUuZGVhZGxpbmUuc3RhcnRzV2l0aChcIitcIikgXG4gICAgICAgICAgICAgICAgICAgID8gbW9tZW50KCkuYWRkKHBhcnNlSW50KHRlbXBsYXRlLmRlYWRsaW5lKSwgJ2hvdXJzJykudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICA6IG1vbWVudCgpLnNldCh7IGhvdXI6IDEwLCBtaW51dGU6IDAgfSkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZS5uYW1lLCBcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGUuZGlmZiwgXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlLnNraWxsLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb25lXCIsIFxuICAgICAgICAgICAgICAgICAgICBkZWFkbGluZSwgXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlLCBcbiAgICAgICAgICAgICAgICAgICAgXCJOb3JtYWxcIiwgXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGBEZXBsb3llZDogJHt0ZW1wbGF0ZS5uYW1lfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG9uQ2xvc2UoKSB7XG4gICAgICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgQWNoaWV2ZW1lbnQgfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IEFDSElFVkVNRU5UX0RFRklOSVRJT05TOiBPbWl0PEFjaGlldmVtZW50LCBcInVubG9ja2VkXCIgfCBcInVubG9ja2VkQXRcIj5bXSA9IFtcbiAgICAvLyAtLS0gRUFSTFkgR0FNRSAtLS1cbiAgICB7IGlkOiBcImZpcnN0X2Jsb29kXCIsIG5hbWU6IFwiRmlyc3QgQmxvb2RcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGUgeW91ciBmaXJzdCBxdWVzdC5cIiwgcmFyaXR5OiBcImNvbW1vblwiIH0sXG4gICAgeyBpZDogXCJ3ZWVrX3dhcnJpb3JcIiwgbmFtZTogXCJXZWVrIFdhcnJpb3JcIiwgZGVzY3JpcHRpb246IFwiTWFpbnRhaW4gYSA3LWRheSBzdHJlYWsuXCIsIHJhcml0eTogXCJjb21tb25cIiB9LFxuICAgIHsgaWQ6IFwid2FybV91cFwiLCBuYW1lOiBcIldhcm0gVXBcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGUgMTAgdG90YWwgcXVlc3RzLlwiLCByYXJpdHk6IFwiY29tbW9uXCIgfSxcblxuICAgIC8vIC0tLSBNSUQgR0FNRSAtLS1cbiAgICB7IGlkOiBcInNraWxsX2FkZXB0XCIsIG5hbWU6IFwiQXBwcmVudGljZVwiLCBkZXNjcmlwdGlvbjogXCJSZWFjaCBMZXZlbCA1IGluIGFueSBza2lsbC5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuICAgIHsgaWQ6IFwiY2hhaW5fZ2FuZ1wiLCBuYW1lOiBcIkNoYWluIEdhbmdcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGUgYSBRdWVzdCBDaGFpbi5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuICAgIHsgaWQ6IFwicmVzZWFyY2hlclwiLCBuYW1lOiBcIlNjaG9sYXJcIiwgZGVzY3JpcHRpb246IFwiQ29tcGxldGUgNSBSZXNlYXJjaCBRdWVzdHMuXCIsIHJhcml0eTogXCJyYXJlXCIgfSxcbiAgICB7IGlkOiBcInJpY2hcIiwgbmFtZTogXCJDYXBpdGFsaXN0XCIsIGRlc2NyaXB0aW9uOiBcIkhvbGQgNTAwIGdvbGQgYXQgb25jZS5cIiwgcmFyaXR5OiBcInJhcmVcIiB9LFxuXG4gICAgLy8gLS0tIEVORCBHQU1FIC0tLVxuICAgIHsgaWQ6IFwiYm9zc19zbGF5ZXJcIiwgbmFtZTogXCJHaWFudCBTbGF5ZXJcIiwgZGVzY3JpcHRpb246IFwiRGVmZWF0IHlvdXIgZmlyc3QgQm9zcy5cIiwgcmFyaXR5OiBcImVwaWNcIiB9LFxuICAgIHsgaWQ6IFwiYXNjZW5kZWRcIiwgbmFtZTogXCJTaXN5cGh1cyBIYXBweVwiLCBkZXNjcmlwdGlvbjogXCJSZWFjaCBMZXZlbCA1MC5cIiwgcmFyaXR5OiBcImxlZ2VuZGFyeVwiIH0sXG4gICAgeyBpZDogXCJpbW1vcnRhbFwiLCBuYW1lOiBcIkltbW9ydGFsXCIsIGRlc2NyaXB0aW9uOiBcIlJlYWNoIExldmVsIDIwIHdpdGggMCBEZWF0aHMuXCIsIHJhcml0eTogXCJsZWdlbmRhcnlcIiB9XG5dO1xuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgRGF5TWV0cmljcywgV2Vla2x5UmVwb3J0LCBCb3NzTWlsZXN0b25lLCBTdHJlYWssIEFjaGlldmVtZW50IH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgQUNISUVWRU1FTlRfREVGSU5JVElPTlMgfSBmcm9tICcuLi9hY2hpZXZlbWVudHMnO1xuXG5leHBvcnQgY2xhc3MgQW5hbHl0aWNzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBhdWRpb0NvbnRyb2xsZXI/OiBhbnk7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRW5zdXJlIGFsbCBhY2hpZXZlbWVudHMgZXhpc3QgaW4gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNoaWV2ZW1lbnRzKCkge1xuICAgICAgICAvLyBJZiBhY2hpZXZlbWVudHMgYXJyYXkgaXMgZW1wdHkgb3IgbWlzc2luZyBkZWZpbml0aW9ucywgc3luYyBpdFxuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzKSB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cyA9IFtdO1xuXG4gICAgICAgIEFDSElFVkVNRU5UX0RFRklOSVRJT05TLmZvckVhY2goZGVmID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLmZpbmQoYSA9PiBhLmlkID09PSBkZWYuaWQpO1xuICAgICAgICAgICAgaWYgKCFleGlzdHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLmFjaGlldmVtZW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgLi4uZGVmLFxuICAgICAgICAgICAgICAgICAgICB1bmxvY2tlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgdHJhY2tEYWlseU1ldHJpY3ModHlwZTogJ3F1ZXN0X2NvbXBsZXRlJyB8ICdxdWVzdF9mYWlsJyB8ICd4cCcgfCAnZ29sZCcgfCAnZGFtYWdlJyB8ICdza2lsbF9sZXZlbCcgfCAnY2hhaW5fY29tcGxldGUnLCBhbW91bnQ6IG51bWJlciA9IDEpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgbGV0IG1ldHJpYyA9IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5maW5kKG0gPT4gbS5kYXRlID09PSB0b2RheSk7XG4gICAgICAgIGlmICghbWV0cmljKSB7XG4gICAgICAgICAgICBtZXRyaWMgPSB7IGRhdGU6IHRvZGF5LCBxdWVzdHNDb21wbGV0ZWQ6IDAsIHF1ZXN0c0ZhaWxlZDogMCwgeHBFYXJuZWQ6IDAsIGdvbGRFYXJuZWQ6IDAsIGRhbWFnZXNUYWtlbjogMCwgc2tpbGxzTGV2ZWxlZDogW10sIGNoYWluc0NvbXBsZXRlZDogMCB9O1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnB1c2gobWV0cmljKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfY29tcGxldGVcIjogbWV0cmljLnF1ZXN0c0NvbXBsZXRlZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2ZhaWxcIjogbWV0cmljLnF1ZXN0c0ZhaWxlZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInhwXCI6IG1ldHJpYy54cEVhcm5lZCArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImdvbGRcIjogbWV0cmljLmdvbGRFYXJuZWQgKz0gYW1vdW50OyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJkYW1hZ2VcIjogbWV0cmljLmRhbWFnZXNUYWtlbiArPSBhbW91bnQ7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInNraWxsX2xldmVsXCI6IG1ldHJpYy5za2lsbHNMZXZlbGVkLnB1c2goXCJTa2lsbCBsZXZlbGVkXCIpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJjaGFpbl9jb21wbGV0ZVwiOiBtZXRyaWMuY2hhaW5zQ29tcGxldGVkICs9IGFtb3VudDsgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIEFjaGlldmVtZW50IENoZWNrIGFmdGVyIGV2ZXJ5IG1ldHJpYyB1cGRhdGVcbiAgICAgICAgdGhpcy5jaGVja0FjaGlldmVtZW50cygpO1xuICAgIH1cblxuICAgIHVwZGF0ZVN0cmVhaygpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBsYXN0RGF0ZSA9IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKGxhc3REYXRlICE9PSB0b2RheSkge1xuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbW9tZW50KCkuc3VidHJhY3QoMSwgJ2RheScpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgICAgICBpZiAobGFzdERhdGUgPT09IHllc3RlcmRheSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA+IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QpIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlID0gdG9kYXk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jaGVja0FjaGlldmVtZW50cygpO1xuICAgIH1cblxuICAgIGNoZWNrQWNoaWV2ZW1lbnRzKCkge1xuICAgICAgICB0aGlzLmluaXRpYWxpemVBY2hpZXZlbWVudHMoKTtcbiAgICAgICAgY29uc3QgcyA9IHRoaXMuc2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IHRvdGFsUXVlc3RzID0gcy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtLCBtKSA9PiBzdW0gKyBtLnF1ZXN0c0NvbXBsZXRlZCwgMCk7XG5cbiAgICAgICAgLy8gMS4gRmlyc3QgQmxvb2RcbiAgICAgICAgaWYgKHRvdGFsUXVlc3RzID49IDEpIHRoaXMudW5sb2NrKFwiZmlyc3RfYmxvb2RcIik7XG5cbiAgICAgICAgLy8gMi4gV2FybSBVcFxuICAgICAgICBpZiAodG90YWxRdWVzdHMgPj0gMTApIHRoaXMudW5sb2NrKFwid2FybV91cFwiKTtcblxuICAgICAgICAvLyAzLiBXZWVrIFdhcnJpb3JcbiAgICAgICAgaWYgKHMuc3RyZWFrLmN1cnJlbnQgPj0gNykgdGhpcy51bmxvY2soXCJ3ZWVrX3dhcnJpb3JcIik7XG5cbiAgICAgICAgLy8gNC4gU2tpbGwgQWRlcHRcbiAgICAgICAgaWYgKHMuc2tpbGxzLnNvbWUoc2tpbGwgPT4gc2tpbGwubGV2ZWwgPj0gNSkpIHRoaXMudW5sb2NrKFwic2tpbGxfYWRlcHRcIik7XG5cbiAgICAgICAgLy8gNS4gQ2hhaW4gR2FuZ1xuICAgICAgICBpZiAocy5jaGFpbkhpc3RvcnkubGVuZ3RoID49IDEpIHRoaXMudW5sb2NrKFwiY2hhaW5fZ2FuZ1wiKTtcblxuICAgICAgICAvLyA2LiBSZXNlYXJjaGVyXG4gICAgICAgIGlmIChzLnJlc2VhcmNoU3RhdHMucmVzZWFyY2hDb21wbGV0ZWQgPj0gNSkgdGhpcy51bmxvY2soXCJyZXNlYXJjaGVyXCIpO1xuXG4gICAgICAgIC8vIDcuIENhcGl0YWxpc3RcbiAgICAgICAgaWYgKHMuZ29sZCA+PSA1MDApIHRoaXMudW5sb2NrKFwicmljaFwiKTtcblxuICAgICAgICAvLyA4LiBHaWFudCBTbGF5ZXJcbiAgICAgICAgaWYgKHMuYm9zc01pbGVzdG9uZXMuc29tZShiID0+IGIuZGVmZWF0ZWQpKSB0aGlzLnVubG9jayhcImJvc3Nfc2xheWVyXCIpO1xuXG4gICAgICAgIC8vIDkuIEFzY2VuZGVkXG4gICAgICAgIGlmIChzLmxldmVsID49IDUwKSB0aGlzLnVubG9jayhcImFzY2VuZGVkXCIpO1xuXG4gICAgICAgIC8vIDEwLiBJbW1vcnRhbFxuICAgICAgICBpZiAocy5sZXZlbCA+PSAyMCAmJiBzLmxlZ2FjeS5kZWF0aENvdW50ID09PSAwKSB0aGlzLnVubG9jayhcImltbW9ydGFsXCIpO1xuICAgIH1cblxuICAgIHVubG9jayhpZDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGFjaCA9IHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLmZpbmQoYSA9PiBhLmlkID09PSBpZCk7XG4gICAgICAgIGlmIChhY2ggJiYgIWFjaC51bmxvY2tlZCkge1xuICAgICAgICAgICAgYWNoLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGFjaC51bmxvY2tlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgLy8gV2UgcmV0dXJuIHRydWUgc28gdGhlIGNhbGxlciBjYW4gc2hvdyBhIG5vdGljZSBpZiB0aGV5IHdhbnQsIFxuICAgICAgICAgICAgLy8gdGhvdWdoIHVzdWFsbHkgdGhlIE5vdGljZSBpcyBiZXR0ZXIgaGFuZGxlZCBoZXJlIGlmIHdlIGhhZCBhY2Nlc3MgdG8gdGhhdCBBUEkgZWFzaWx5LCBcbiAgICAgICAgICAgIC8vIG9yIGxldCB0aGUgZW5naW5lIGhhbmRsZSB0aGUgbm90aWZpY2F0aW9uLlxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gLi4uIChLZWVwIGV4aXN0aW5nIGJvc3MvcmVwb3J0IG1ldGhvZHMgYmVsb3cgYXMgdGhleSB3ZXJlKSAuLi5cbiAgICBpbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKSB7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAxMCwgbmFtZTogXCJUaGUgRmlyc3QgVHJpYWxcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiA1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAyMCwgbmFtZTogXCJUaGUgTmVtZXNpcyBSZXR1cm5zXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogMTAwMCB9LFxuICAgICAgICAgICAgICAgIHsgbGV2ZWw6IDMwLCBuYW1lOiBcIlRoZSBSZWFwZXIgQXdha2Vuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDE1MDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiA1MCwgbmFtZTogXCJUaGUgRmluYWwgQXNjZW5zaW9uXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwMCB9XG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2VzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMgfHwgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHRoaXMuaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZvckVhY2goKGJvc3M6IEJvc3NNaWxlc3RvbmUpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxldmVsID49IGJvc3MubGV2ZWwgJiYgIWJvc3MudW5sb2NrZWQpIHtcbiAgICAgICAgICAgICAgICBib3NzLnVubG9ja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGBCb3NzIFVubG9ja2VkOiAke2Jvc3MubmFtZX0gKExldmVsICR7Ym9zcy5sZXZlbH0pYCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VzO1xuICAgIH1cblxuICAgIGRlZmVhdEJvc3MobGV2ZWw6IG51bWJlcik6IHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cFJld2FyZDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBib3NzID0gdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5maW5kKChiOiBCb3NzTWlsZXN0b25lKSA9PiBiLmxldmVsID09PSBsZXZlbCk7XG4gICAgICAgIGlmICghYm9zcykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiQm9zcyBub3QgZm91bmRcIiwgeHBSZXdhcmQ6IDAgfTtcbiAgICAgICAgaWYgKGJvc3MuZGVmZWF0ZWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiBcIkJvc3MgYWxyZWFkeSBkZWZlYXRlZFwiLCB4cFJld2FyZDogMCB9O1xuICAgICAgICBcbiAgICAgICAgYm9zcy5kZWZlYXRlZCA9IHRydWU7XG4gICAgICAgIGJvc3MuZGVmZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSBib3NzLnhwUmV3YXJkO1xuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXIpIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIGlmIChsZXZlbCA9PT0gNTApIHRoaXMud2luR2FtZSgpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgKyR7Ym9zcy54cFJld2FyZH0gWFBgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgd2luR2FtZSgpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nYW1lV29uID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5lbmRHYW1lRGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyKSB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgIH1cblxuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCk6IFdlZWtseVJlcG9ydCB7XG4gICAgICAgIGNvbnN0IHdlZWsgPSBtb21lbnQoKS53ZWVrKCk7XG4gICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN0YXJ0T2YoJ3dlZWsnKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBlbmREYXRlID0gbW9tZW50KCkuZW5kT2YoJ3dlZWsnKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2Vla01ldHJpY3MgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmlsdGVyKChtOiBEYXlNZXRyaWNzKSA9PiBcbiAgICAgICAgICAgIG1vbWVudChtLmRhdGUpLmlzQmV0d2Vlbihtb21lbnQoc3RhcnREYXRlKSwgbW9tZW50KGVuZERhdGUpLCBudWxsLCAnW10nKVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxRdWVzdHMgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0NvbXBsZXRlZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsRmFpbGVkID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNGYWlsZWQsIDApO1xuICAgICAgICBjb25zdCBzdWNjZXNzUmF0ZSA9IHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQgPiAwID8gTWF0aC5yb3VuZCgodG90YWxRdWVzdHMgLyAodG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCkpICogMTAwKSA6IDA7XG4gICAgICAgIGNvbnN0IHRvdGFsWHAgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxHb2xkID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5nb2xkRWFybmVkLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvcFNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLnNvcnQoKGE6IGFueSwgYjogYW55KSA9PiAoYi5sZXZlbCAtIGEubGV2ZWwpKS5zbGljZSgwLCAzKS5tYXAoKHM6IGFueSkgPT4gcy5uYW1lKTtcbiAgICAgICAgY29uc3QgYmVzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1heDogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNDb21wbGV0ZWQgPiBtYXgucXVlc3RzQ29tcGxldGVkID8gbSA6IG1heCkuZGF0ZSA6IHN0YXJ0RGF0ZTtcbiAgICAgICAgY29uc3Qgd29yc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwID8gd2Vla01ldHJpY3MucmVkdWNlKChtaW46IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzRmFpbGVkID4gbWluLnF1ZXN0c0ZhaWxlZCA/IG0gOiBtaW4pLmRhdGUgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZXBvcnQ6IFdlZWtseVJlcG9ydCA9IHsgd2Vlaywgc3RhcnREYXRlLCBlbmREYXRlLCB0b3RhbFF1ZXN0cywgc3VjY2Vzc1JhdGUsIHRvdGFsWHAsIHRvdGFsR29sZCwgdG9wU2tpbGxzLCBiZXN0RGF5LCB3b3JzdERheSB9O1xuICAgICAgICB0aGlzLnNldHRpbmdzLndlZWtseVJlcG9ydHMucHVzaChyZXBvcnQpO1xuICAgICAgICByZXR1cm4gcmVwb3J0O1xuICAgIH1cblxuICAgIHVubG9ja0FjaGlldmVtZW50KGFjaGlldmVtZW50SWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICAvLyBUaGlzIGlzIGEgbWFudWFsIG92ZXJyaWRlIGlmIG5lZWRlZCwgbG9naWMgaXMgbW9zdGx5IGluIGNoZWNrQWNoaWV2ZW1lbnRzIG5vd1xuICAgICAgICB0aGlzLmNoZWNrQWNoaWV2ZW1lbnRzKCk7XG4gICAgICAgIHJldHVybiB0cnVlOyBcbiAgICB9XG5cbiAgICBnZXRHYW1lU3RhdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsZXZlbDogdGhpcy5zZXR0aW5ncy5sZXZlbCxcbiAgICAgICAgICAgIGN1cnJlbnRTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQsXG4gICAgICAgICAgICBsb25nZXN0U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0LFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0NvbXBsZXRlZCwgMCksXG4gICAgICAgICAgICB0b3RhbFhwOiB0aGlzLnNldHRpbmdzLnhwICsgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApLFxuICAgICAgICAgICAgZ2FtZVdvbjogdGhpcy5zZXR0aW5ncy5nYW1lV29uLFxuICAgICAgICAgICAgYm9zc2VzRGVmZWF0ZWQ6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmlsdGVyKChiOiBCb3NzTWlsZXN0b25lKSA9PiBiLmRlZmVhdGVkKS5sZW5ndGgsXG4gICAgICAgICAgICB0b3RhbEJvc3NlczogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGhcbiAgICAgICAgfTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyAzOiBNZWRpdGF0aW9uICYgUmVjb3ZlcnkgRW5naW5lXG4gKiBIYW5kbGVzIGxvY2tkb3duIHN0YXRlLCBtZWRpdGF0aW9uIGhlYWxpbmcsIGFuZCBxdWVzdCBkZWxldGlvbiBxdW90YVxuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gbG9ja2Rvd25VbnRpbCwgaXNNZWRpdGF0aW5nLCBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLCBcbiAqICAgICAgICAgICBxdWVzdERlbGV0aW9uc1RvZGF5LCBsYXN0RGVsZXRpb25SZXNldFxuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3NcbiAqIFNJREUgRUZGRUNUUzogUGxheXMgYXVkaW8gKDQzMiBIeiB0b25lKVxuICovXG5leHBvcnQgY2xhc3MgTWVkaXRhdGlvbkVuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBmb3IgNDMyIEh6IHNvdW5kXG4gICAgcHJpdmF0ZSBtZWRpdGF0aW9uQ29vbGRvd25NcyA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgY3VycmVudGx5IGxvY2tlZCBkb3duXG4gICAgICovXG4gICAgaXNMb2NrZWREb3duKCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsb2NrZG93biB0aW1lIHJlbWFpbmluZyBpbiBtaW51dGVzXG4gICAgICovXG4gICAgZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk6IHsgaG91cnM6IG51bWJlcjsgbWludXRlczogbnVtYmVyOyB0b3RhbE1pbnV0ZXM6IG51bWJlciB9IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBob3VyczogMCwgbWludXRlczogMCwgdG90YWxNaW51dGVzOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsTWludXRlcyA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0b3RhbE1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSB0b3RhbE1pbnV0ZXMgJSA2MDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGhvdXJzLCBtaW51dGVzLCB0b3RhbE1pbnV0ZXMgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmlnZ2VyIGxvY2tkb3duIGFmdGVyIHRha2luZyA1MCsgZGFtYWdlXG4gICAgICovXG4gICAgdHJpZ2dlckxvY2tkb3duKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSBtb21lbnQoKS5hZGQoNiwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIG9uZSBtZWRpdGF0aW9uIGN5Y2xlIChjbGljaylcbiAgICAgKiBSZXR1cm5zOiB7IHN1Y2Nlc3MsIGN5Y2xlc0RvbmUsIGN5Y2xlc1JlbWFpbmluZywgbWVzc2FnZSB9XG4gICAgICovXG4gICAgbWVkaXRhdGUoKTogeyBzdWNjZXNzOiBib29sZWFuOyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmc7IGxvY2tkb3duUmVkdWNlZDogYm9vbGVhbiB9IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTm90IGluIGxvY2tkb3duLiBObyBuZWVkIHRvIG1lZGl0YXRlLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiBNYXRoLm1heCgwLCAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJBbHJlYWR5IG1lZGl0YXRpbmcuIFdhaXQgMzAgc2Vjb25kcy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bisrO1xuICAgICAgICBcbiAgICAgICAgLy8gUGxheSBoZWFsaW5nIGZyZXF1ZW5jeVxuICAgICAgICB0aGlzLnBsYXlNZWRpdGF0aW9uU291bmQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBsZXQgbG9ja2Rvd25SZWR1Y2VkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiAxMCBjeWNsZXMgY29tcGxldGVcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA+PSAxMCkge1xuICAgICAgICAgICAgY29uc3QgcmVkdWNlZFRpbWUgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5zdWJ0cmFjdCg1LCAnaG91cnMnKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IHJlZHVjZWRUaW1lLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLXJlc2V0IG1lZGl0YXRpb24gZmxhZyBhZnRlciBjb29sZG93blxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHRoaXMubWVkaXRhdGlvbkNvb2xkb3duTXMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZWRpdGF0aW9uIGNvbXBsZXRlLiBMb2NrZG93biByZWR1Y2VkIGJ5IDUgaG91cnMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2V0IG1lZGl0YXRpb24gZmxhZyBhZnRlciBjb29sZG93blxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgIH0sIHRoaXMubWVkaXRhdGlvbkNvb2xkb3duTXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBjeWNsZXNEb25lOiB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBNZWRpdGF0aW9uICgke3RoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bn0vMTApIC0gJHtyZW1haW5pbmd9IGN5Y2xlcyBsZWZ0YCxcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5IDQzMiBIeiBoZWFsaW5nIGZyZXF1ZW5jeSBmb3IgMSBzZWNvbmRcbiAgICAgKi9cbiAgICBwcml2YXRlIHBsYXlNZWRpdGF0aW9uU291bmQoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICAgICAgICAgIGNvbnN0IG9zY2lsbGF0b3IgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICAgICAgY29uc3QgZ2Fpbk5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmZyZXF1ZW5jeS52YWx1ZSA9IDQzMjtcbiAgICAgICAgICAgIG9zY2lsbGF0b3IudHlwZSA9IFwic2luZVwiO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjMsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMSwgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgICAgICBnYWluTm9kZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3Iuc3RhcnQoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIG9zY2lsbGF0b3Iuc3RvcChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpbyBub3QgYXZhaWxhYmxlIGZvciBtZWRpdGF0aW9uXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IG1lZGl0YXRpb24gc3RhdHVzIGZvciBjdXJyZW50IGxvY2tkb3duXG4gICAgICovXG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpOiB7IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IHRpbWVSZWR1Y2VkOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGN5Y2xlc0RvbmUgPSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGNvbnN0IGN5Y2xlc1JlbWFpbmluZyA9IE1hdGgubWF4KDAsIDEwIC0gY3ljbGVzRG9uZSk7XG4gICAgICAgIGNvbnN0IHRpbWVSZWR1Y2VkID0gKDEwIC0gY3ljbGVzUmVtYWluaW5nKSAqIDMwOyAvLyAzMCBtaW4gcGVyIGN5Y2xlXG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3ljbGVzRG9uZSxcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZyxcbiAgICAgICAgICAgIHRpbWVSZWR1Y2VkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgZGVsZXRpb24gcXVvdGEgaWYgbmV3IGRheVxuICAgICAqL1xuICAgIHByaXZhdGUgZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgPSB0b2RheTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGhhcyBmcmVlIGRlbGV0aW9ucyBsZWZ0IHRvZGF5XG4gICAgICovXG4gICAgY2FuRGVsZXRlUXVlc3RGcmVlKCk6IGJvb2xlYW4ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5IDwgMztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVsZXRpb24gcXVvdGEgc3RhdHVzXG4gICAgICovXG4gICAgZ2V0RGVsZXRpb25RdW90YSgpOiB7IGZyZWU6IG51bWJlcjsgcGFpZDogbnVtYmVyOyByZW1haW5pbmc6IG51bWJlciB9IHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IE1hdGgubWF4KDAsIDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkpO1xuICAgICAgICBjb25zdCBwYWlkID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5IC0gMyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZnJlZTogcmVtYWluaW5nLFxuICAgICAgICAgICAgcGFpZDogcGFpZCxcbiAgICAgICAgICAgIHJlbWFpbmluZzogcmVtYWluaW5nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgcXVlc3QgYW5kIGNoYXJnZSBnb2xkIGlmIG5lY2Vzc2FyeVxuICAgICAqIFJldHVybnM6IHsgY29zdCwgbWVzc2FnZSB9XG4gICAgICovXG4gICAgYXBwbHlEZWxldGlvbkNvc3QoKTogeyBjb3N0OiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb3N0ID0gMDtcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA+PSAzKSB7XG4gICAgICAgICAgICAvLyBQYWlkIGRlbGV0aW9uXG4gICAgICAgICAgICBjb3N0ID0gMTA7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuIENvc3Q6IC0ke2Nvc3R9Z2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGcmVlIGRlbGV0aW9uXG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5O1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiAoJHtyZW1haW5pbmcgLSAxfSBmcmVlIGRlbGV0aW9ucyByZW1haW5pbmcpYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5Kys7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBjb3N0O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgY29zdCwgbWVzc2FnZSB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgVEZpbGUsIE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFJlc2VhcmNoUXVlc3QgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaEVuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuICAgIGFwcDogQXBwOyAvLyBBZGRlZCBBcHAgcmVmZXJlbmNlIGZvciBmaWxlIG9wZXJhdGlvbnNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhcHA6IEFwcCwgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIsIGxpbmtlZFNraWxsOiBzdHJpbmcsIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBxdWVzdElkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgLy8gW0ZJWF0gQWxsb3cgZmlyc3QgcmVzZWFyY2ggcXVlc3QgZm9yIGZyZWUgKENvbGQgU3RhcnQpLCBvdGhlcndpc2UgZW5mb3JjZSAyOjFcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoID4gMCAmJiAhdGhpcy5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJSRVNFQVJDSCBCTE9DS0VEOiBDb21wbGV0ZSAyIGNvbWJhdCBxdWVzdHMgcGVyIHJlc2VhcmNoIHF1ZXN0XCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcmRMaW1pdCA9IHR5cGUgPT09IFwic3VydmV5XCIgPyAyMDAgOiA0MDA7XG4gICAgICAgIGNvbnN0IHF1ZXN0SWQgPSBgcmVzZWFyY2hfJHsodGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkIHx8IDApICsgMX1gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdDogUmVzZWFyY2hRdWVzdCA9IHtcbiAgICAgICAgICAgIGlkOiBxdWVzdElkLFxuICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIGxpbmtlZFNraWxsOiBsaW5rZWRTa2lsbCxcbiAgICAgICAgICAgIHdvcmRMaW1pdDogd29yZExpbWl0LFxuICAgICAgICAgICAgd29yZENvdW50OiAwLFxuICAgICAgICAgICAgbGlua2VkQ29tYmF0UXVlc3Q6IGxpbmtlZENvbWJhdFF1ZXN0LFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gW0ZJWF0gQ3JlYXRlIGFjdHVhbCBNYXJrZG93biBmaWxlXG4gICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBcIkFjdGl2ZV9SdW4vUmVzZWFyY2hcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyUGF0aCkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXJQYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNhZmVUaXRsZSA9IHRpdGxlLnJlcGxhY2UoL1teYS16MC05XS9naSwgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke2ZvbGRlclBhdGh9LyR7c2FmZVRpdGxlfS5tZGA7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBgLS0tXG50eXBlOiByZXNlYXJjaFxucmVzZWFyY2hfaWQ6ICR7cXVlc3RJZH1cbnN0YXR1czogYWN0aXZlXG5saW5rZWRfc2tpbGw6ICR7bGlua2VkU2tpbGx9XG53b3JkX2xpbWl0OiAke3dvcmRMaW1pdH1cbmNyZWF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxuLS0tXG4jIPCfk5ogJHt0aXRsZX1cbj4gWyFJTkZPXSBSZXNlYXJjaCBHdWlkZWxpbmVzXG4+ICoqVHlwZToqKiAke3R5cGV9IHwgKipUYXJnZXQ6KiogJHt3b3JkTGltaXR9IHdvcmRzXG4+ICoqTGlua2VkIFNraWxsOioqICR7bGlua2VkU2tpbGx9XG5cbldyaXRlIHlvdXIgcmVzZWFyY2ggaGVyZS4uLlxuYDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGZpbGVuYW1lLCBjb250ZW50KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkVycm9yIGNyZWF0aW5nIHJlc2VhcmNoIGZpbGUuIENoZWNrIGNvbnNvbGUuXCIpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5wdXNoKHJlc2VhcmNoUXVlc3QpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgPSBwYXJzZUludChxdWVzdElkLnNwbGl0KCdfJylbMV0pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCsrO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgUmVzZWFyY2ggUXVlc3QgQ3JlYXRlZDogJHt0eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9YCxcbiAgICAgICAgICAgIHF1ZXN0SWQ6IHF1ZXN0SWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nLCBmaW5hbFdvcmRDb3VudDogbnVtYmVyKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IHhwUmV3YXJkOiBudW1iZXI7IGdvbGRQZW5hbHR5OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKCFyZXNlYXJjaFF1ZXN0KSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBub3QgZm91bmRcIiwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUXVlc3QgYWxyZWFkeSBjb21wbGV0ZWRcIiwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBtaW5Xb3JkcyA9IE1hdGguY2VpbChyZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCAqIDAuOCk7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA8IG1pbldvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogYFRvbyBzaG9ydCEgTmVlZCAke21pbldvcmRzfSB3b3Jkcy5gLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogYFRvbyBsb25nISBNYXggJHtNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KX0gd29yZHMuYCwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgbGV0IGdvbGRQZW5hbHR5ID0gMDtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJhZ2VQZXJjZW50ID0gKChmaW5hbFdvcmRDb3VudCAtIHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSAvIHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSAqIDEwMDtcbiAgICAgICAgICAgIGdvbGRQZW5hbHR5ID0gTWF0aC5mbG9vcigyMCAqIChvdmVyYWdlUGVyY2VudCAvIDEwMCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHJlc2VhcmNoUXVlc3QubGlua2VkU2tpbGwpO1xuICAgICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgICAgIHNraWxsLnhwICs9IHhwUmV3YXJkO1xuICAgICAgICAgICAgaWYgKHNraWxsLnhwID49IHNraWxsLnhwUmVxKSB7IHNraWxsLmxldmVsKys7IHNraWxsLnhwID0gMDsgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgLT0gZ29sZFBlbmFsdHk7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXNzYWdlID0gYFJlc2VhcmNoIENvbXBsZXRlISArJHt4cFJld2FyZH0gWFBgO1xuICAgICAgICBpZiAoZ29sZFBlbmFsdHkgPiAwKSBtZXNzYWdlICs9IGAgKC0ke2dvbGRQZW5hbHR5fWcgdGF4KWA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlLCB4cFJld2FyZCwgZ29sZFBlbmFsdHkgfTtcbiAgICB9XG5cbiAgICBhc3luYyBkZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZEluZGV4KHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0c1tpbmRleF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFtGSVhdIFRyeSB0byBmaW5kIGFuZCBkZWxldGUgdGhlIGZpbGVcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzLmZpbmQoZiA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCA9PT0gcXVlc3RJZDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgaWYgKCFxdWVzdC5jb21wbGV0ZWQpIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggLSAxKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkIC0gMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggZGVsZXRlZFwiIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm90IGZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJlc2VhcmNoUXVlc3Qud29yZENvdW50ID0gbmV3V29yZENvdW50O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7IGNvbWJhdDogc3RhdHMudG90YWxDb21iYXQsIHJlc2VhcmNoOiBzdGF0cy50b3RhbFJlc2VhcmNoLCByYXRpbzogcmF0aW8udG9GaXhlZCgyKSB9O1xuICAgIH1cblxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiByYXRpbyA+PSAyO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFF1ZXN0Q2hhaW4sIFF1ZXN0Q2hhaW5SZWNvcmQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDQ6IFF1ZXN0IENoYWlucyBFbmdpbmVcbiAqIEhhbmRsZXMgbXVsdGktcXVlc3Qgc2VxdWVuY2VzIHdpdGggb3JkZXJpbmcsIGxvY2tpbmcsIGFuZCBjb21wbGV0aW9uIHRyYWNraW5nXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBhY3RpdmVDaGFpbnMsIGNoYWluSGlzdG9yeSwgY3VycmVudENoYWluSWQsIGNoYWluUXVlc3RzQ29tcGxldGVkXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqIElOVEVHUkFUSU9OIFBPSU5UUzogTmVlZHMgdG8gaG9vayBpbnRvIGNvbXBsZXRlUXVlc3QoKSBpbiBtYWluIGVuZ2luZSBmb3IgY2hhaW4gcHJvZ3Jlc3Npb25cbiAqL1xuZXhwb3J0IGNsYXNzIENoYWluc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBxdWVzdCBjaGFpblxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdE5hbWVzOiBzdHJpbmdbXSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluSWQ/OiBzdHJpbmcgfT4ge1xuICAgICAgICBpZiAocXVlc3ROYW1lcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQ2hhaW4gbXVzdCBoYXZlIGF0IGxlYXN0IDIgcXVlc3RzXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluSWQgPSBgY2hhaW5fJHtEYXRlLm5vdygpfWA7XG4gICAgICAgIGNvbnN0IGNoYWluOiBRdWVzdENoYWluID0ge1xuICAgICAgICAgICAgaWQ6IGNoYWluSWQsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcXVlc3RzOiBxdWVzdE5hbWVzLFxuICAgICAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHN0YXJ0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgaXNCb3NzOiBxdWVzdE5hbWVzW3F1ZXN0TmFtZXMubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJvc3NcIilcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLnB1c2goY2hhaW4pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gY2hhaW5JZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGNyZWF0ZWQ6ICR7bmFtZX0gKCR7cXVlc3ROYW1lcy5sZW5ndGh9IHF1ZXN0cylgLFxuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW5JZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY3VycmVudCBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXRBY3RpdmVDaGFpbigpOiBRdWVzdENoYWluIHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiBjLmlkID09PSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKTtcbiAgICAgICAgcmV0dXJuIChjaGFpbiAmJiAhY2hhaW4uY29tcGxldGVkKSA/IGNoYWluIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIG5leHQgcXVlc3QgdGhhdCBzaG91bGQgYmUgY29tcGxldGVkIGluIHRoZSBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXROZXh0UXVlc3RJbkNoYWluKCk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGlzIHBhcnQgb2YgYW4gYWN0aXZlIChpbmNvbXBsZXRlKSBjaGFpblxuICAgICAqL1xuICAgIGlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0cy5pbmNsdWRlcyhxdWVzdE5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgY2FuIGJlIHN0YXJ0ZWQgKGlzIGl0IHRoZSBuZXh0IHF1ZXN0IGluIHRoZSBjaGFpbj8pXG4gICAgICovXG4gICAgY2FuU3RhcnRRdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHRydWU7IC8vIE5vdCBpbiBhIGNoYWluLCBjYW4gc3RhcnQgYW55IHF1ZXN0XG4gICAgICAgIFxuICAgICAgICBjb25zdCBuZXh0UXVlc3QgPSB0aGlzLmdldE5leHRRdWVzdEluQ2hhaW4oKTtcbiAgICAgICAgcmV0dXJuIG5leHRRdWVzdCA9PT0gcXVlc3ROYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYSBxdWVzdCBhcyBjb21wbGV0ZWQgaW4gdGhlIGNoYWluXG4gICAgICogQWR2YW5jZXMgY2hhaW4gaWYgc3VjY2Vzc2Z1bCwgYXdhcmRzIGJvbnVzIFhQIGlmIGNoYWluIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIGFzeW5jIGNvbXBsZXRlQ2hhaW5RdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW5cIiwgY2hhaW5Db21wbGV0ZTogZmFsc2UsIGJvbnVzWHA6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFF1ZXN0ID0gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UXVlc3QgIT09IHF1ZXN0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlF1ZXN0IGlzIG5vdCBuZXh0IGluIGNoYWluXCIsXG4gICAgICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYm9udXNYcDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY2hhaW4uY3VycmVudEluZGV4Kys7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGNoYWluIGlzIGNvbXBsZXRlXG4gICAgICAgIGlmIChjaGFpbi5jdXJyZW50SW5kZXggPj0gY2hhaW4ucXVlc3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGVDaGFpbihjaGFpbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGNoYWluLnF1ZXN0cy5sZW5ndGggLSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBwcm9ncmVzczogJHtjaGFpbi5jdXJyZW50SW5kZXh9LyR7Y2hhaW4ucXVlc3RzLmxlbmd0aH0gKCR7cmVtYWluaW5nfSByZW1haW5pbmcsICR7cGVyY2VudH0lIGNvbXBsZXRlKWAsXG4gICAgICAgICAgICBjaGFpbkNvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZSB0aGUgZW50aXJlIGNoYWluXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjb21wbGV0ZUNoYWluKGNoYWluOiBRdWVzdENoYWluKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgY2hhaW5Db21wbGV0ZTogYm9vbGVhbjsgYm9udXNYcDogbnVtYmVyIH0+IHtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib251c1hwID0gMTAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGJvbnVzWHA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IGNoYWluLmNvbXBsZXRlZEF0LFxuICAgICAgICAgICAgeHBFYXJuZWQ6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjb21wbGV0ZTogJHtjaGFpbi5uYW1lfSEgKyR7Ym9udXNYcH0gWFAgQm9udXNgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCcmVhayBhbiBhY3RpdmUgY2hhaW5cbiAgICAgKiBLZWVwcyBlYXJuZWQgWFAgZnJvbSBjb21wbGV0ZWQgcXVlc3RzXG4gICAgICovXG4gICAgYXN5bmMgYnJlYWtDaGFpbigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cEtlcHQ6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW4gdG8gYnJlYWtcIiwgeHBLZXB0OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IGNoYWluLmN1cnJlbnRJbmRleDtcbiAgICAgICAgY29uc3QgeHBLZXB0ID0gY29tcGxldGVkICogMTA7IC8vIEFwcHJveGltYXRlIFhQIGZyb20gZWFjaCBxdWVzdFxuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0byBoaXN0b3J5IGFzIGJyb2tlblxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHhwRWFybmVkOiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjaGFpbi5pZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gYnJva2VuOiAke2NoYWluLm5hbWV9LiBLZXB0ICR7Y29tcGxldGVkfSBxdWVzdCBjb21wbGV0aW9ucyAoJHt4cEtlcHR9IFhQKS5gLFxuICAgICAgICAgICAgeHBLZXB0OiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgc2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcsIGVuZXJneTogRW5lcmd5TGV2ZWwsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXSA9IHtcbiAgICAgICAgICAgIGVuZXJneUxldmVsOiBlbmVyZ3ksXG4gICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgdGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBmaWx0ZXIgZm9yIGEgc3BlY2lmaWMgcXVlc3RcbiAgICAgKi9cbiAgICBnZXRRdWVzdEZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IENvbnRleHRGaWx0ZXIgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGFjdGl2ZSBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IEVuZXJneUxldmVsIHwgXCJhbnlcIiwgY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIiwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZUVuZXJneTogZW5lcmd5IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZUNvbnRleHQ6IGNvbnRleHQgYXMgYW55LFxuICAgICAgICAgICAgYWN0aXZlVGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRlKCk6IEZpbHRlclN0YXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBtYXRjaGVzIGN1cnJlbnQgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgcXVlc3RNYXRjaGVzRmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBxdWVzdEZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBmaWx0ZXIgc2V0IGZvciB0aGlzIHF1ZXN0LCBhbHdheXMgc2hvd1xuICAgICAgICBpZiAoIXF1ZXN0RmlsdGVyKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuZXJneSBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmVuZXJneUxldmVsICE9PSBmaWx0ZXJzLmFjdGl2ZUVuZXJneSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVDb250ZXh0ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmNvbnRleHQgIT09IGZpbHRlcnMuYWN0aXZlQ29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUYWdzIGZpbHRlciAocmVxdWlyZXMgQU5ZIG9mIHRoZSBhY3RpdmUgdGFncylcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlVGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNUYWcgPSBmaWx0ZXJzLmFjdGl2ZVRhZ3Muc29tZSgodGFnOiBzdHJpbmcpID0+IHF1ZXN0RmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgICAgICBpZiAoIWhhc1RhZykgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgYSBsaXN0IG9mIHF1ZXN0cyBiYXNlZCBvbiBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGZpbHRlclF1ZXN0cyhxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocXVlc3QgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcXVlc3QuYmFzZW5hbWUgfHwgcXVlc3QubmFtZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGVuZXJneSBsZXZlbFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5RW5lcmd5KGVuZXJneTogRW5lcmd5TGV2ZWwsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmVuZXJneUxldmVsID09PSBlbmVyZ3k7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgY29udGV4dFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5Q29udGV4dChjb250ZXh0OiBRdWVzdENvbnRleHQsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmNvbnRleHQgPT09IGNvbnRleHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgdGFnc1xuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5VGFncyh0YWdzOiBzdHJpbmdbXSwgcXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0YWdzLnNvbWUodGFnID0+IGZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgYWN0aXZlIGZpbHRlcnNcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlVGFnczogW11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHVuaXF1ZSB0YWdzIHVzZWQgYWNyb3NzIGFsbCBxdWVzdHNcbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVUYWdzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgdGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBxdWVzdE5hbWUgaW4gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICBmaWx0ZXIudGFncy5mb3JFYWNoKCh0YWc6IHN0cmluZykgPT4gdGFncy5hZGQodGFnKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VtbWFyeSBzdGF0cyBhYm91dCBmaWx0ZXJlZCBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRzKGFsbFF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IHtcbiAgICAgICAgdG90YWw6IG51bWJlcjtcbiAgICAgICAgZmlsdGVyZWQ6IG51bWJlcjtcbiAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBudW1iZXI7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJRdWVzdHMoYWxsUXVlc3RzKTtcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsdGVyc0NvdW50ID0gKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCA/IDEgOiAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogYWxsUXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGZpbHRlcmVkOiBmaWx0ZXJlZC5sZW5ndGgsXG4gICAgICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IGFjdGl2ZUZpbHRlcnNDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHNwZWNpZmljIGZpbHRlciB2YWx1ZVxuICAgICAqIFVzZWZ1bCBmb3IgVUkgdG9nZ2xlIGJ1dHRvbnNcbiAgICAgKi9cbiAgICB0b2dnbGVFbmVyZ3lGaWx0ZXIoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID09PSBlbmVyZ3kpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gZW5lcmd5IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBjb250ZXh0IGZpbHRlclxuICAgICAqL1xuICAgIHRvZ2dsZUNvbnRleHRGaWx0ZXIoY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gY29udGV4dCBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSB0YWcgaW4gdGhlIGFjdGl2ZSB0YWcgbGlzdFxuICAgICAqL1xuICAgIHRvZ2dsZVRhZyh0YWc6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MuaW5kZXhPZih0YWcpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5wdXNoKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIFRGaWxlLCBURm9sZGVyLCBOb3RpY2UsIG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFNraWxsLCBNb2RpZmllciwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBBdWRpb0NvbnRyb2xsZXIsIFRpbnlFbWl0dGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBDaGFvc01vZGFsLCBWaWN0b3J5TW9kYWwgfSBmcm9tICcuL3VpL21vZGFscyc7XG5pbXBvcnQgeyBBbmFseXRpY3NFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvQW5hbHl0aWNzRW5naW5lJztcbmltcG9ydCB7IE1lZGl0YXRpb25FbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvTWVkaXRhdGlvbkVuZ2luZSc7XG5pbXBvcnQgeyBSZXNlYXJjaEVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9SZXNlYXJjaEVuZ2luZSc7XG5pbXBvcnQgeyBDaGFpbnNFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvQ2hhaW5zRW5naW5lJztcbmltcG9ydCB7IEZpbHRlcnNFbmdpbmUgfSBmcm9tICcuL2VuZ2luZXMvRmlsdGVyc0VuZ2luZSc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX01PRElGSUVSOiBNb2RpZmllciA9IHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vIGVmZmVjdHMuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLimIDvuI9cIiB9O1xuZXhwb3J0IGNvbnN0IENIQU9TX1RBQkxFOiBNb2RpZmllcltdID0gW1xuICAgIHsgbmFtZTogXCJDbGVhciBTa2llc1wiLCBkZXNjOiBcIk5vcm1hbC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH0sXG4gICAgeyBuYW1lOiBcIkZsb3cgU3RhdGVcIiwgZGVzYzogXCIrNTAlIFhQLlwiLCB4cE11bHQ6IDEuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yKXCIgfSxcbiAgICB7IG5hbWU6IFwiV2luZGZhbGxcIiwgZGVzYzogXCIrNTAlIEdvbGQuXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfkrBcIiB9LFxuICAgIHsgbmFtZTogXCJJbmZsYXRpb25cIiwgZGVzYzogXCJQcmljZXMgMnguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMiwgaWNvbjogXCLwn5OIXCIgfSxcbiAgICB7IG5hbWU6IFwiQnJhaW4gRm9nXCIsIGRlc2M6IFwiWFAgMC41eC5cIiwgeHBNdWx0OiAwLjUsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+Mq++4j1wiIH0sXG4gICAgeyBuYW1lOiBcIlJpdmFsIFNhYm90YWdlXCIsIGRlc2M6IFwiR29sZCAwLjV4LlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAwLjUsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5W177iPXCIgfSxcbiAgICB7IG5hbWU6IFwiQWRyZW5hbGluZVwiLCBkZXNjOiBcIjJ4IFhQLCAtNSBIUC9RLlwiLCB4cE11bHQ6IDIsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SiVwiIH1cbl07XG5cbmNvbnN0IEJPU1NfREFUQTogUmVjb3JkPG51bWJlciwgeyBuYW1lOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgaHBfcGVuOiBudW1iZXIgfT4gPSB7XG4gICAgMTA6IHsgbmFtZTogXCJUaGUgR2F0ZWtlZXBlclwiLCBkZXNjOiBcIlRoZSBmaXJzdCBtYWpvciBmaWx0ZXIuXCIsIGhwX3BlbjogMjAgfSxcbiAgICAyMDogeyBuYW1lOiBcIlRoZSBTaGFkb3cgU2VsZlwiLCBkZXNjOiBcIllvdXIgb3duIGJhZCBoYWJpdHMgbWFuaWZlc3QuXCIsIGhwX3BlbjogMzAgfSxcbiAgICAzMDogeyBuYW1lOiBcIlRoZSBNb3VudGFpblwiLCBkZXNjOiBcIlRoZSBwZWFrIGlzIHZpc2libGUuXCIsIGhwX3BlbjogNDAgfSxcbiAgICA1MDogeyBuYW1lOiBcIlNpc3lwaHVzIFByaW1lXCIsIGRlc2M6IFwiT25lIG11c3QgaW1hZ2luZSBTaXN5cGh1cyBoYXBweS5cIiwgaHBfcGVuOiA5OSB9XG59O1xuXG5jb25zdCBNSVNTSU9OX1BPT0wgPSBbXG4gICAgeyBpZDogXCJtb3JuaW5nX3dpblwiLCBuYW1lOiBcIuKYgO+4jyBNb3JuaW5nIFdpblwiLCBkZXNjOiBcIkNvbXBsZXRlIDEgVHJpdmlhbCBxdWVzdCBiZWZvcmUgMTAgQU1cIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDE1IH0sIGNoZWNrOiBcIm1vcm5pbmdfdHJpdmlhbFwiIH0sXG4gICAgeyBpZDogXCJtb21lbnR1bVwiLCBuYW1lOiBcIvCflKUgTW9tZW50dW1cIiwgZGVzYzogXCJDb21wbGV0ZSAzIHF1ZXN0cyB0b2RheVwiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMjAsIGdvbGQ6IDAgfSwgY2hlY2s6IFwicXVlc3RfY291bnRcIiB9LFxuICAgIHsgaWQ6IFwiemVyb19pbmJveFwiLCBuYW1lOiBcIvCfp5ggWmVybyBJbmJveFwiLCBkZXNjOiBcIlByb2Nlc3MgYWxsIGZpbGVzIGluICdTY3JhcHMnXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJ6ZXJvX2luYm94XCIgfSxcbiAgICB7IGlkOiBcInNwZWNpYWxpc3RcIiwgbmFtZTogXCLwn46vIFNwZWNpYWxpc3RcIiwgZGVzYzogXCJVc2UgdGhlIHNhbWUgc2tpbGwgMyB0aW1lc1wiLCB0YXJnZXQ6IDMsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwic2tpbGxfcmVwZWF0XCIgfSxcbiAgICB7IGlkOiBcImhpZ2hfc3Rha2VzXCIsIG5hbWU6IFwi8J+SqiBIaWdoIFN0YWtlc1wiLCBkZXNjOiBcIkNvbXBsZXRlIDEgSGlnaCBTdGFrZXMgcXVlc3RcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDMwIH0sIGNoZWNrOiBcImhpZ2hfc3Rha2VzXCIgfSxcbiAgICB7IGlkOiBcInNwZWVkX2RlbW9uXCIsIG5hbWU6IFwi4pqhIFNwZWVkIERlbW9uXCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aGluIDJoIG9mIGNyZWF0aW9uXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAyNSwgZ29sZDogMCB9LCBjaGVjazogXCJmYXN0X2NvbXBsZXRlXCIgfSxcbiAgICB7IGlkOiBcInN5bmVyZ2lzdFwiLCBuYW1lOiBcIvCflJcgU3luZXJnaXN0XCIsIGRlc2M6IFwiQ29tcGxldGUgcXVlc3Qgd2l0aCBQcmltYXJ5ICsgU2Vjb25kYXJ5IHNraWxsXCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAxMCB9LCBjaGVjazogXCJzeW5lcmd5XCIgfSxcbiAgICB7IGlkOiBcInN1cnZpdm9yXCIsIG5hbWU6IFwi8J+boe+4jyBTdXJ2aXZvclwiLCBkZXNjOiBcIkRvbid0IHRha2UgYW55IGRhbWFnZSB0b2RheVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMjAgfSwgY2hlY2s6IFwibm9fZGFtYWdlXCIgfSxcbiAgICB7IGlkOiBcInJpc2tfdGFrZXJcIiwgbmFtZTogXCLwn46yIFJpc2sgVGFrZXJcIiwgZGVzYzogXCJDb21wbGV0ZSBEaWZmaWN1bHR5IDQrIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAxNSwgZ29sZDogMCB9LCBjaGVjazogXCJoYXJkX3F1ZXN0XCIgfVxuXTtcblxuZXhwb3J0IGNsYXNzIFNpc3lwaHVzRW5naW5lIGV4dGVuZHMgVGlueUVtaXR0ZXIge1xuICAgIGFwcDogQXBwO1xuICAgIHBsdWdpbjogYW55O1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG4gICAgYW5hbHl0aWNzRW5naW5lOiBBbmFseXRpY3NFbmdpbmU7XG4gICAgbWVkaXRhdGlvbkVuZ2luZTogTWVkaXRhdGlvbkVuZ2luZTtcbiAgICByZXNlYXJjaEVuZ2luZTogUmVzZWFyY2hFbmdpbmU7XG4gICAgY2hhaW5zRW5naW5lOiBDaGFpbnNFbmdpbmU7XG4gICAgZmlsdGVyc0VuZ2luZTogRmlsdGVyc0VuZ2luZTtcblxuICAgIC8vIFtGRUFUVVJFXSBVbmRvIEJ1ZmZlclxuICAgIHByaXZhdGUgZGVsZXRlZFF1ZXN0QnVmZmVyOiBBcnJheTx7IG5hbWU6IHN0cmluZzsgY29udGVudDogc3RyaW5nOyBwYXRoOiBzdHJpbmc7IGRlbGV0ZWRBdDogbnVtYmVyIH0+ID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBhbnksIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmF1ZGlvID0gYXVkaW87XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZSA9IG5ldyBBbmFseXRpY3NFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLm1lZGl0YXRpb25FbmdpbmUgPSBuZXcgTWVkaXRhdGlvbkVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIHRoaXMucmVzZWFyY2hFbmdpbmUgPSBuZXcgUmVzZWFyY2hFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXBwLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5jaGFpbnNFbmdpbmUgPSBuZXcgQ2hhaW5zRW5naW5lKHRoaXMucGx1Z2luLnNldHRpbmdzLCB0aGlzLmF1ZGlvKTtcbiAgICAgICAgdGhpcy5maWx0ZXJzRW5naW5lID0gbmV3IEZpbHRlcnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIH1cblxuICAgIGdldCBzZXR0aW5ncygpOiBTaXN5cGh1c1NldHRpbmdzIHsgcmV0dXJuIHRoaXMucGx1Z2luLnNldHRpbmdzOyB9XG4gICAgc2V0IHNldHRpbmdzKHZhbDogU2lzeXBodXNTZXR0aW5ncykgeyB0aGlzLnBsdWdpbi5zZXR0aW5ncyA9IHZhbDsgfVxuXG4gICAgYXN5bmMgc2F2ZSgpIHsgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7IHRoaXMudHJpZ2dlcihcInVwZGF0ZVwiKTsgfVxuXG4gICAgcm9sbERhaWx5TWlzc2lvbnMoKSB7XG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IFsuLi5NSVNTSU9OX1BPT0xdO1xuICAgICAgICBjb25zdCBzZWxlY3RlZDogRGFpbHlNaXNzaW9uW10gPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhdmFpbGFibGUubGVuZ3RoID09PSAwKSBicmVhaztcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGF2YWlsYWJsZS5sZW5ndGgpO1xuICAgICAgICAgICAgY29uc3QgbWlzc2lvbiA9IGF2YWlsYWJsZS5zcGxpY2UoaWR4LCAxKVswXTtcbiAgICAgICAgICAgIHNlbGVjdGVkLnB1c2goeyAuLi5taXNzaW9uLCBjaGVja0Z1bmM6IG1pc3Npb24uY2hlY2ssIHByb2dyZXNzOiAwLCBjb21wbGV0ZWQ6IGZhbHNlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyA9IHNlbGVjdGVkO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5ID0gMDtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSA9IHt9O1xuICAgIH1cblxuICAgIGNoZWNrRGFpbHlNaXNzaW9ucyhjb250ZXh0OiB7IHR5cGU/OiBzdHJpbmc7IGRpZmZpY3VsdHk/OiBudW1iZXI7IHNraWxsPzogc3RyaW5nOyBzZWNvbmRhcnlTa2lsbD86IHN0cmluZzsgaGlnaFN0YWtlcz86IGJvb2xlYW47IHF1ZXN0Q3JlYXRlZD86IG51bWJlciB9KSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IG1vbWVudCgpO1xuICAgICAgICBsZXQganVzdEZpbmlzaGVkQWxsID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zLmZvckVhY2gobWlzc2lvbiA9PiB7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIHJldHVybjtcbiAgICAgICAgICAgIHN3aXRjaCAobWlzc2lvbi5jaGVja0Z1bmMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiemVyb19pbmJveFwiOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JhcHMgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gc2NyYXBzLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIm1vcm5pbmdfdHJpdmlhbFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5kaWZmaWN1bHR5ID09PSAxICYmIG5vdy5ob3VyKCkgPCAxMCkgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwicXVlc3RfY291bnRcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiKSBtaXNzaW9uLnByb2dyZXNzID0gdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhpZ2hfc3Rha2VzXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmhpZ2hTdGFrZXMpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImZhc3RfY29tcGxldGVcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQucXVlc3RDcmVhdGVkICYmIG1vbWVudCgpLmRpZmYobW9tZW50KGNvbnRleHQucXVlc3RDcmVhdGVkKSwgJ2hvdXJzJykgPD0gMikgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic3luZXJneVwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5za2lsbCAmJiBjb250ZXh0LnNlY29uZGFyeVNraWxsICYmIGNvbnRleHQuc2Vjb25kYXJ5U2tpbGwgIT09IFwiTm9uZVwiKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJub19kYW1hZ2VcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJkYW1hZ2VcIikgbWlzc2lvbi5wcm9ncmVzcyA9IDA7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoYXJkX3F1ZXN0XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LmRpZmZpY3VsdHkgJiYgY29udGV4dC5kaWZmaWN1bHR5ID49IDQpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInNraWxsX3JlcGVhdFwiOiBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuc2tpbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gPSAodGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheVtjb250ZXh0LnNraWxsXSB8fCAwKSArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gTWF0aC5tYXgoMCwgLi4uT2JqZWN0LnZhbHVlcyh0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1pc3Npb24ucHJvZ3Jlc3MgPj0gbWlzc2lvbi50YXJnZXQgJiYgIW1pc3Npb24uY29tcGxldGVkKSB7XG4gICAgICAgICAgICAgICAgbWlzc2lvbi5jb21wbGV0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0gbWlzc2lvbi5yZXdhcmQueHA7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5nb2xkICs9IG1pc3Npb24ucmV3YXJkLmdvbGQ7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShg4pyFIE1pc3Npb24gQ29tcGxldGU6ICR7bWlzc2lvbi5uYW1lfWApO1xuICAgICAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZXZlcnkobSA9PiBtLmNvbXBsZXRlZCkpIGp1c3RGaW5pc2hlZEFsbCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChqdXN0RmluaXNoZWRBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSA1MDtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCLwn46JIEFsbCBNaXNzaW9ucyBDb21wbGV0ZSEgKzUwIEJvbnVzIEdvbGRcIik7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBnZXREaWZmaWN1bHR5TnVtYmVyKGRpZmZMYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgbWFwOiBhbnkgPSB7IFwiVHJpdmlhbFwiOiAxLCBcIkVhc3lcIjogMiwgXCJNZWRpdW1cIjogMywgXCJIYXJkXCI6IDQsIFwiU1VJQ0lERVwiOiA1IH07XG4gICAgICAgIHJldHVybiBtYXBbZGlmZkxhYmVsXSB8fCAzO1xuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGFpbHlMb2dpbigpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGRheXNEaWZmID0gbW9tZW50KCkuZGlmZihtb21lbnQodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pLCAnZGF5cycpO1xuICAgICAgICAgICAgaWYgKGRheXNEaWZmID4gMikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdERhbWFnZSA9IChkYXlzRGlmZiAtIDEpICogMTA7XG4gICAgICAgICAgICAgICAgaWYgKHJvdERhbWFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSByb3REYW1hZ2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdG9kYXksIHN0YXR1czogXCJyb3RcIiwgeHBFYXJuZWQ6IC1yb3REYW1hZ2UgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDAgKyAodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDUpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMuc2V0dGluZ3MubWF4SHAsIHRoaXMuc2V0dGluZ3MuaHAgKyAyMCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gXCJcIjtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdExvZ2luID0gdG9kYXk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJ1c3QgTG9naWNcbiAgICAgICAgICAgIGNvbnN0IHRvZGF5TW9tZW50ID0gbW9tZW50KCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzLmxhc3RVc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b2RheU1vbWVudC5kaWZmKG1vbWVudChzLmxhc3RVc2VkKSwgJ2RheXMnKSA+IDMgJiYgIXRoaXMuaXNSZXN0aW5nKCkpIHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBzLnJ1c3QgPSBNYXRoLm1pbigxMCwgKHMucnVzdCB8fCAwKSArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcy54cFJlcSA9IE1hdGguZmxvb3Iocy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbkRhdGUgIT09IHRvZGF5KSB0aGlzLnJvbGxEYWlseU1pc3Npb25zKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJvbGxDaGFvcyh0cnVlKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgY29tcGxldGVRdWVzdChmaWxlOiBURmlsZSkge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCJMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgaWYgKCFmbSkgcmV0dXJuO1xuICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBmaWxlLmJhc2VuYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWF0gUXVlc3QgQ2hhaW4gSW50ZWdyYXRpb25cbiAgICAgICAgaWYgKHRoaXMuY2hhaW5zRW5naW5lLmlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZSkpIHtcbiAgICAgICAgICAgICBjb25zdCBjYW5TdGFydCA9IHRoaXMuY2hhaW5zRW5naW5lLmNhblN0YXJ0UXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgICAgICBpZiAoIWNhblN0YXJ0KSB7IG5ldyBOb3RpY2UoXCJMb2NrZWQgYnkgQ2hhaW4uXCIpOyByZXR1cm47IH1cbiAgICAgICAgICAgICBcbiAgICAgICAgICAgICBjb25zdCBjaGFpblJlc3VsdCA9IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmNvbXBsZXRlQ2hhaW5RdWVzdChxdWVzdE5hbWUpO1xuICAgICAgICAgICAgIGlmIChjaGFpblJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoY2hhaW5SZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgIGlmIChjaGFpblJlc3VsdC5jaGFpbkNvbXBsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGNoYWluUmVzdWx0LmJvbnVzWHA7XG4gICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDwn46JIENoYWluIEJvbnVzOiArJHtjaGFpblJlc3VsdC5ib251c1hwfSBYUCFgKTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmbS5pc19ib3NzKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IGZpbGUuYmFzZW5hbWUubWF0Y2goL0JPU1NfTFZMKFxcZCspLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZXZlbCA9IHBhcnNlSW50KG1hdGNoWzFdKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFuYWx5dGljc0VuZ2luZS5kZWZlYXRCb3NzKGxldmVsKTtcbiAgICAgICAgICAgICAgICBuZXcgTm90aWNlKHJlc3VsdC5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5nYW1lV29uKSBuZXcgVmljdG9yeU1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudHJhY2tEYWlseU1ldHJpY3MoXCJxdWVzdF9jb21wbGV0ZVwiLCAxKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsQ29tYmF0Kys7XG4gICAgICAgIFxuICAgICAgICBsZXQgeHAgPSAoZm0ueHBfcmV3YXJkIHx8IDIwKSAqIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllci54cE11bHQ7XG4gICAgICAgIGxldCBnb2xkID0gKGZtLmdvbGRfcmV3YXJkIHx8IDApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmdvbGRNdWx0O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGxOYW1lID0gZm0uc2tpbGwgfHwgXCJOb25lXCI7XG4gICAgICAgIGNvbnN0IHNraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gc2tpbGxOYW1lKTtcbiAgICAgICAgaWYgKHNraWxsKSB7XG4gICAgICAgICAgICBza2lsbC5ydXN0ID0gMDtcbiAgICAgICAgICAgIHNraWxsLnhwUmVxID0gTWF0aC5mbG9vcihza2lsbC54cFJlcSAvIDEuMSk7XG4gICAgICAgICAgICBza2lsbC5sYXN0VXNlZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgICAgIHNraWxsLnhwICs9IDE7XG4gICAgICAgICAgICBpZiAoc2tpbGwueHAgPj0gc2tpbGwueHBSZXEpIHsgc2tpbGwubGV2ZWwrKzsgc2tpbGwueHAgPSAwOyBuZXcgTm90aWNlKGDwn6egICR7c2tpbGwubmFtZX0gTGV2ZWxlZCBVcCFgKTsgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2Vjb25kYXJ5ID0gZm0uc2Vjb25kYXJ5X3NraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlY1NraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgIGlmIChzZWNTa2lsbCkge1xuICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucykgc2tpbGwuY29ubmVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICBpZighc2tpbGwuY29ubmVjdGlvbnMuaW5jbHVkZXMoc2Vjb25kYXJ5KSkgeyBza2lsbC5jb25uZWN0aW9ucy5wdXNoKHNlY29uZGFyeSk7IG5ldyBOb3RpY2UoYPCflJcgTmV1cmFsIExpbmsgRXN0YWJsaXNoZWRgKTsgfVxuICAgICAgICAgICAgICAgIHhwICs9IE1hdGguZmxvb3Ioc2VjU2tpbGwubGV2ZWwgKiAwLjUpOyBcbiAgICAgICAgICAgICAgICBzZWNTa2lsbC54cCArPSAwLjU7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy54cCArPSB4cDsgdGhpcy5zZXR0aW5ncy5nb2xkICs9IGdvbGQ7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgPT09IFwiQWRyZW5hbGluZVwiKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IDU7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgKz0gNTtcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPiA1MCAmJiAhdGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJPdmVyZXhlcnRpb24hIExPQ0tET1dOIElOSVRJQVRFRC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy54cCA+PSB0aGlzLnNldHRpbmdzLnhwUmVxKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmxldmVsKys7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cCA9IDA7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwUmVxID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMS4xKTsgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1heEhwID0gMTAwICsgKHRoaXMuc2V0dGluZ3MubGV2ZWwgKiA1KTsgXG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmhwID0gdGhpcy5zZXR0aW5ncy5tYXhIcDtcbiAgICAgICAgICAgIHRoaXMudGF1bnQoXCJsZXZlbF91cFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbXNncyA9IHRoaXMuYW5hbHl0aWNzRW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKTtcbiAgICAgICAgICAgIG1zZ3MuZm9yRWFjaChtID0+IG5ldyBOb3RpY2UobSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoWzEwLCAyMCwgMzAsIDUwXS5pbmNsdWRlcyh0aGlzLnNldHRpbmdzLmxldmVsKSkgdGhpcy5zcGF3bkJvc3ModGhpcy5zZXR0aW5ncy5sZXZlbCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHRpbmdzLnF1ZXN0c0NvbXBsZXRlZFRvZGF5Kys7XG4gICAgICAgIHRoaXMuYW5hbHl0aWNzRW5naW5lLnVwZGF0ZVN0cmVhaygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyBcbiAgICAgICAgICAgIHR5cGU6IFwiY29tcGxldGVcIiwgXG4gICAgICAgICAgICBkaWZmaWN1bHR5OiB0aGlzLmdldERpZmZpY3VsdHlOdW1iZXIoZm0uZGlmZmljdWx0eSksIFxuICAgICAgICAgICAgc2tpbGw6IHNraWxsTmFtZSwgXG4gICAgICAgICAgICBzZWNvbmRhcnlTa2lsbDogc2Vjb25kYXJ5LFxuICAgICAgICAgICAgaGlnaFN0YWtlczogZm0uaGlnaF9zdGFrZXMgXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGFyY2hpdmVQYXRoID0gXCJBY3RpdmVfUnVuL0FyY2hpdmVcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYXJjaGl2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoYXJjaGl2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGYpID0+IHsgZi5zdGF0dXMgPSBcImNvbXBsZXRlZFwiOyBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgYCR7YXJjaGl2ZVBhdGh9LyR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG5cblxuICBhc3luYyBzcGF3bkJvc3MobGV2ZWw6IG51bWJlcikge1xuICAgICAgICBjb25zdCBib3NzID0gQk9TU19EQVRBW2xldmVsXTtcbiAgICAgICAgaWYgKCFib3NzKSByZXR1cm47XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiaGVhcnRiZWF0XCIpO1xuICAgICAgICBuZXcgTm90aWNlKFwi4pqg77iPIEFOT01BTFkgREVURUNURUQuLi5cIiwgMjAwMCk7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQk9TUyBTUEFXTkVEOiAke2Jvc3MubmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMS4gQ3JlYXRlIHRoZSBxdWVzdCBmaWxlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZVF1ZXN0KFxuICAgICAgICAgICAgICAgIGBCT1NTX0xWTCR7bGV2ZWx9IC0gJHtib3NzLm5hbWV9YCwgNSwgXCJCb3NzXCIsIFwiTm9uZVwiLCBcbiAgICAgICAgICAgICAgICBtb21lbnQoKS5hZGQoMywgJ2RheXMnKS50b0lTT1N0cmluZygpLCB0cnVlLCBcIkNyaXRpY2FsXCIsIHRydWVcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8vIDIuIEluamVjdCBIUCBpbnRvIGZyb250bWF0dGVyIChEZWxheWVkKVxuICAgICAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZU5hbWUgPSBgQk9TU19MVkwke2xldmVsfV8tXyR7Ym9zcy5uYW1lfWAucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgdGhlIGZpbGUgd2UganVzdCBjcmVhdGVkXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzLmZpbmQoZiA9PiBmLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gYCR7c2FmZU5hbWV9Lm1kYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXhIcCA9IDEwMCArIChsZXZlbCAqIDIwKTsgXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfaHAgPSBtYXhIcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZtLmJvc3NfbWF4X2hwID0gbWF4SHA7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3JjZSBVSSBSZWZyZXNoIGFmdGVyIGRhdGEgaXMgZGVmaW5pdGVseSBzYXZlZFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIik7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDUwMCk7IFxuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG5cblxuXG4gIGFzeW5jIGRhbWFnZUJvc3MoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmICghZm0gfHwgIWZtLmlzX2Jvc3MpIHJldHVybjtcblxuICAgICAgICBjb25zdCBkYW1hZ2UgPSAyNTsgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRIcCA9IGZtLmJvc3NfaHAgfHwgMTAwO1xuICAgICAgICBjb25zdCBuZXdIcCA9IGN1cnJlbnRIcCAtIGRhbWFnZTtcblxuICAgICAgICBpZiAobmV3SHAgPD0gMCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb21wbGV0ZVF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIuKalO+4jyBGSU5BTCBCTE9XISBCb3NzIERlZmVhdGVkIVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFwcGx5IGRhbWFnZVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmKSA9PiB7XG4gICAgICAgICAgICAgICAgZi5ib3NzX2hwID0gbmV3SHA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZmFpbFwiKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKalO+4jyBCb3NzIERhbWFnZWQhICR7bmV3SHB9LyR7Zm0uYm9zc19tYXhfaHB9IEhQIHJlbWFpbmluZ2ApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3JjZSBVSSByZWZyZXNoIHNsaWdodGx5IGFmdGVyIHRvIHNob3cgbmV3IEhQIGJhclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnRyaWdnZXIoXCJ1cGRhdGVcIiksIDIwMCk7IFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZmFpbFF1ZXN0KGZpbGU6IFRGaWxlLCBtYW51YWxBYm9ydDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIGlmICh0aGlzLmlzUmVzdGluZygpICYmICFtYW51YWxBYm9ydCkgeyBuZXcgTm90aWNlKFwiUmVzdCBEYXkgcHJvdGVjdGlvbi5cIik7IHJldHVybjsgfVxuICAgICAgICBpZiAodGhpcy5pc1NoaWVsZGVkKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJTaGllbGRlZCFcIik7IHJldHVybjsgfVxuXG4gICAgICAgIGxldCBkYW1hZ2UgPSAxMCArIE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy5yaXZhbERtZyAvIDIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgIGlmIChmbT8uaXNfYm9zcykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmaWxlLmJhc2VuYW1lLm1hdGNoKC9CT1NTX0xWTChcXGQrKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgaWYgKEJPU1NfREFUQVtsZXZlbF0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGFtYWdlICs9IEJPU1NfREFUQVtsZXZlbF0uaHBfcGVuO1xuICAgICAgICAgICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQm9zcyBDcnVzaDogKyR7Qk9TU19EQVRBW2xldmVsXS5ocF9wZW59IERhbWFnZWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdvbGQgPCAwKSBkYW1hZ2UgKj0gMjtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuaHAgLT0gZGFtYWdlO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgKz0gZGFtYWdlO1xuICAgICAgICBpZiAoIW1hbnVhbEFib3J0KSB0aGlzLnNldHRpbmdzLnJpdmFsRG1nICs9IDE7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImZhaWxcIik7XG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgdHlwZTogXCJkYW1hZ2VcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPiA1MCkge1xuICAgICAgICAgICAgdGhpcy5tZWRpdGF0aW9uRW5naW5lLnRyaWdnZXJMb2NrZG93bigpO1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKFwibG9ja2Rvd25cIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGdyYXZlUGF0aCA9IFwiR3JhdmV5YXJkL0ZhaWx1cmVzXCI7XG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGdyYXZlUGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihncmF2ZVBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5yZW5hbWVGaWxlKGZpbGUsIGAke2dyYXZlUGF0aH0vW0ZBSUxFRF0gJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdChuYW1lOiBzdHJpbmcsIGRpZmY6IG51bWJlciwgc2tpbGw6IHN0cmluZywgc2VjU2tpbGw6IHN0cmluZywgZGVhZGxpbmVJc286IHN0cmluZywgaGlnaFN0YWtlczogYm9vbGVhbiwgcHJpb3JpdHk6IHN0cmluZywgaXNCb3NzOiBib29sZWFuKSB7XG4gICAgICAgIGlmICh0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIkxPQ0tET1dOIEFDVElWRVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBsZXQgeHBSZXdhcmQgPSAwOyBsZXQgZ29sZFJld2FyZCA9IDA7IGxldCBkaWZmTGFiZWwgPSBcIlwiO1xuICAgICAgICBzd2l0Y2goZGlmZikge1xuICAgICAgICAgICAgY2FzZSAxOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMDUpOyBnb2xkUmV3YXJkID0gMTA7IGRpZmZMYWJlbCA9IFwiVHJpdmlhbFwiOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjEwKTsgZ29sZFJld2FyZCA9IDIwOyBkaWZmTGFiZWwgPSBcIkVhc3lcIjsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4yMCk7IGdvbGRSZXdhcmQgPSA0MDsgZGlmZkxhYmVsID0gXCJNZWRpdW1cIjsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC40MCk7IGdvbGRSZXdhcmQgPSA4MDsgZGlmZkxhYmVsID0gXCJIYXJkXCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA1OiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuNjApOyBnb2xkUmV3YXJkID0gMTUwOyBkaWZmTGFiZWwgPSBcIlNVSUNJREVcIjsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzQm9zcykgeyB4cFJld2FyZD0xMDAwOyBnb2xkUmV3YXJkPTEwMDA7IGRpZmZMYWJlbD1cIuKYoO+4jyBCT1NTXCI7IH1cbiAgICAgICAgaWYgKGhpZ2hTdGFrZXMgJiYgIWlzQm9zcykgZ29sZFJld2FyZCA9IE1hdGguZmxvb3IoZ29sZFJld2FyZCAqIDEuNSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByb290UGF0aCA9IFwiQWN0aXZlX1J1bi9RdWVzdHNcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocm9vdFBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIocm9vdFBhdGgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FmZU5hbWUgPSBuYW1lLnJlcGxhY2UoL1teYS16MC05XS9naSwgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBjb250ZW50ID0gYC0tLVxudHlwZTogcXVlc3RcbnN0YXR1czogYWN0aXZlXG5kaWZmaWN1bHR5OiAke2RpZmZMYWJlbH1cbnByaW9yaXR5OiAke3ByaW9yaXR5fVxueHBfcmV3YXJkOiAke3hwUmV3YXJkfVxuZ29sZF9yZXdhcmQ6ICR7Z29sZFJld2FyZH1cbnNraWxsOiAke3NraWxsfVxuc2Vjb25kYXJ5X3NraWxsOiAke3NlY1NraWxsfVxuaGlnaF9zdGFrZXM6ICR7aGlnaFN0YWtlcyA/ICd0cnVlJyA6ICdmYWxzZSd9XG5pc19ib3NzOiAke2lzQm9zc31cbmNyZWF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxuZGVhZGxpbmU6ICR7ZGVhZGxpbmVJc299XG4tLS1cbiMg4pqU77iPICR7bmFtZX1gO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGAke3Jvb3RQYXRofS8ke3NhZmVOYW1lfS5tZGAsIGNvbnRlbnQpO1xuICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcImNsaWNrXCIpO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgLy8gW0ZJWF0gQXBwbHkgRGVsZXRpb24gQ29zdFxuICAgIGFzeW5jIGRlbGV0ZVF1ZXN0KGZpbGU6IFRGaWxlKSB7IFxuICAgICAgICAvLyBDaGVjayBkZWxldGlvbiBxdW90YSBhbmQgYXBwbHkgY29zdFxuICAgICAgICBjb25zdCBjb3N0UmVzdWx0ID0gdGhpcy5tZWRpdGF0aW9uRW5naW5lLmFwcGx5RGVsZXRpb25Db3N0KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY29zdFJlc3VsdC5jb3N0ID4gMCAmJiB0aGlzLnNldHRpbmdzLmdvbGQgPCBjb3N0UmVzdWx0LmNvc3QpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJbnN1ZmZpY2llbnQgZ29sZCBmb3IgcGFpZCBkZWxldGlvbiFcIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlYWQgYW5kIGJ1ZmZlciBmb3IgdW5kb1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmRlbGV0ZWRRdWVzdEJ1ZmZlci5wdXNoKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgY29udGVudDogY29udGVudCxcbiAgICAgICAgICAgICAgICBwYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgICAgICAgICAgZGVsZXRlZEF0OiBEYXRlLm5vdygpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIEtlZXAgYnVmZmVyIHNtYWxsIChtYXggNSBpdGVtcylcbiAgICAgICAgICAgIGlmICh0aGlzLmRlbGV0ZWRRdWVzdEJ1ZmZlci5sZW5ndGggPiA1KSB0aGlzLmRlbGV0ZWRRdWVzdEJ1ZmZlci5zaGlmdCgpO1xuICAgICAgICB9IGNhdGNoKGUpIHsgY29uc29sZS5lcnJvcihcIkJ1ZmZlciBmYWlsXCIsIGUpOyB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgICAgICBpZiAoY29zdFJlc3VsdC5tZXNzYWdlKSBuZXcgTm90aWNlKGNvc3RSZXN1bHQubWVzc2FnZSk7XG4gICAgICAgIHRoaXMuc2F2ZSgpOyBcbiAgICB9XG5cbiAgICBhc3luYyB1bmRvTGFzdERlbGV0aW9uKCkge1xuICAgICAgICBjb25zdCBsYXN0ID0gdGhpcy5kZWxldGVkUXVlc3RCdWZmZXIucG9wKCk7XG4gICAgICAgIGlmICghbGFzdCkgeyBuZXcgTm90aWNlKFwiTm90aGluZyB0byB1bmRvLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIFxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGxhc3QuZGVsZXRlZEF0ID4gNjAwMDApIHsgbmV3IE5vdGljZShcIlRvbyBsYXRlIHRvIHVuZG8uXCIpOyByZXR1cm47IH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGxhc3QucGF0aCwgbGFzdC5jb250ZW50KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlc3RvcmVkOiAke2xhc3QubmFtZX1gKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkNvdWxkIG5vdCByZXN0b3JlIGZpbGUgKHBhdGggbWF5IGJlIHRha2VuKS5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjaGVja0RlYWRsaW5lcygpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB6ZXJvSW5ib3ggPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmluZChtID0+IG0uY2hlY2tGdW5jID09PSBcInplcm9faW5ib3hcIiAmJiAhbS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoemVyb0luYm94KSB7XG4gICAgICAgICAgICBjb25zdCBzY3JhcHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJTY3JhcHNcIik7XG4gICAgICAgICAgICBpZiAoc2NyYXBzIGluc3RhbmNlb2YgVEZvbGRlciAmJiBzY3JhcHMuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jaGVja0RhaWx5TWlzc2lvbnMoeyB0eXBlOiBcImNoZWNrXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgaWYgKGZtPy5kZWFkbGluZSAmJiBtb21lbnQoKS5pc0FmdGVyKG1vbWVudChmbS5kZWFkbGluZSkpKSBhd2FpdCB0aGlzLmZhaWxRdWVzdChmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBhc3luYyByb2xsQ2hhb3Moc2hvd01vZGFsOiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3Qgcm9sbCA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIGlmIChyb2xsIDwgMC40KSB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBERUZBVUxUX01PRElGSUVSO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChDSEFPU19UQUJMRS5sZW5ndGggLSAxKSkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyID0gQ0hBT1NfVEFCTEVbaWR4XTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgaWYgKHNob3dNb2RhbCkgbmV3IENoYW9zTW9kYWwodGhpcy5hcHAsIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllcikub3BlbigpO1xuICAgIH1cblxuICAgIGFzeW5jIGF0dGVtcHRSZWNvdmVyeSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCkpIHsgbmV3IE5vdGljZShcIk5vdCBpbiBMb2NrZG93bi5cIik7IHJldHVybjsgfVxuICAgICAgICBjb25zdCB7IGhvdXJzLCBtaW51dGVzIH0gPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFJlY292ZXJpbmcuLi4gJHtob3Vyc31oICR7bWludXRlc31tIHJlbWFpbmluZy5gKTtcbiAgICB9XG5cbiAgICBpc0xvY2tlZERvd24oKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuaXNMb2NrZWREb3duKCk7IH1cbiAgICBpc1Jlc3RpbmcoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5yZXN0RGF5VW50aWwpKTsgfVxuICAgIGlzU2hpZWxkZWQoKSB7IHJldHVybiB0aGlzLnNldHRpbmdzLnNoaWVsZGVkVW50aWwgJiYgbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCkpOyB9XG5cbiAgICBhc3luYyBjcmVhdGVSZXNlYXJjaFF1ZXN0KHRpdGxlOiBzdHJpbmcsIHR5cGU6IGFueSwgbGlua2VkU2tpbGw6IHN0cmluZywgbGlua2VkQ29tYmF0UXVlc3Q6IHN0cmluZykge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCB0aGlzLnJlc2VhcmNoRW5naW5lLmNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGUsIHR5cGUsIGxpbmtlZFNraWxsLCBsaW5rZWRDb21iYXRRdWVzdCk7XG4gICAgICAgIGlmKHJlcy5zdWNjZXNzKSBuZXcgTm90aWNlKHJlcy5tZXNzYWdlKTsgZWxzZSBuZXcgTm90aWNlKHJlcy5tZXNzYWdlKTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIFxuICAgIGNvbXBsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkLCB3b3Jkcyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgZGVsZXRlUmVzZWFyY2hRdWVzdChpZDogc3RyaW5nKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChpZCk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgdXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQ6IHN0cmluZywgd29yZHM6IG51bWJlcikgeyB0aGlzLnJlc2VhcmNoRW5naW5lLnVwZGF0ZVJlc2VhcmNoV29yZENvdW50KGlkLCB3b3Jkcyk7IH1cbiAgICBnZXRSZXNlYXJjaFJhdGlvKCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7IH1cbiAgICBjYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkgeyByZXR1cm4gdGhpcy5yZXNlYXJjaEVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCk7IH1cbiAgICBcbiAgICBhc3luYyBzdGFydE1lZGl0YXRpb24oKSB7IGNvbnN0IHIgPSB0aGlzLm1lZGl0YXRpb25FbmdpbmUubWVkaXRhdGUoKTsgbmV3IE5vdGljZShyLm1lc3NhZ2UpOyBhd2FpdCB0aGlzLnNhdmUoKTsgfVxuICAgIGdldE1lZGl0YXRpb25TdGF0dXMoKSB7IHJldHVybiB0aGlzLm1lZGl0YXRpb25FbmdpbmUuZ2V0TWVkaXRhdGlvblN0YXR1cygpOyB9XG4gICAgYXN5bmMgY3JlYXRlU2NyYXAoY29udGVudDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBcIlNjcmFwc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmb2xkZXJQYXRoKSkgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKGZvbGRlclBhdGgpO1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREIEhILW1tLXNzXCIpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoYCR7Zm9sZGVyUGF0aH0vJHt0aW1lc3RhbXB9Lm1kYCwgY29udGVudCk7XG4gICAgICAgIG5ldyBOb3RpY2UoXCLimqEgU2NyYXAgQ2FwdHVyZWRcIik7IHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiY2xpY2tcIik7XG4gICAgfVxuICAgIFxuICAgIGFzeW5jIGdlbmVyYXRlU2tpbGxHcmFwaCgpIHsgXG4gICAgICAgIGNvbnN0IHNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzO1xuICAgICAgICBpZiAoc2tpbGxzLmxlbmd0aCA9PT0gMCkgeyBuZXcgTm90aWNlKFwiTm8gbmV1cmFsIG5vZGVzIGZvdW5kLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdOyBjb25zdCBlZGdlczogYW55W10gPSBbXTtcbiAgICAgICAgY29uc3Qgd2lkdGggPSAyNTA7IGNvbnN0IGhlaWdodCA9IDE0MDsgXG4gICAgICAgIGNvbnN0IHJhZGl1cyA9IE1hdGgubWF4KDQwMCwgc2tpbGxzLmxlbmd0aCAqIDYwKTtcbiAgICAgICAgY29uc3QgY2VudGVyWCA9IDA7IGNvbnN0IGNlbnRlclkgPSAwOyBjb25zdCBhbmdsZVN0ZXAgPSAoMiAqIE1hdGguUEkpIC8gc2tpbGxzLmxlbmd0aDtcblxuICAgICAgICBza2lsbHMuZm9yRWFjaCgoc2tpbGwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhbmdsZSA9IGluZGV4ICogYW5nbGVTdGVwO1xuICAgICAgICAgICAgY29uc3QgeCA9IGNlbnRlclggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSk7XG4gICAgICAgICAgICBjb25zdCB5ID0gY2VudGVyWSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKTtcbiAgICAgICAgICAgIGxldCBjb2xvciA9IFwiNFwiOyBcbiAgICAgICAgICAgIGlmIChza2lsbC5ydXN0ID4gMCkgY29sb3IgPSBcIjFcIjsgZWxzZSBpZiAoc2tpbGwubGV2ZWwgPj0gMTApIGNvbG9yID0gXCI2XCI7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gc2tpbGwucnVzdCA+IDAgPyBcIuKaoO+4jyBSVVNUWVwiIDogXCLwn5+iIEFDVElWRVwiO1xuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLmZsb29yKChza2lsbC54cCAvIHNraWxsLnhwUmVxKSAqIDEwMCk7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gYCMjICR7c2tpbGwubmFtZX1cXG4qKkx2ICR7c2tpbGwubGV2ZWx9KipcXG4ke3N0YXR1c0ljb259XFxuWFA6ICR7c2tpbGwueHB9LyR7c2tpbGwueHBSZXF9ICgke3Byb2dyZXNzfSUpYDsgXG4gICAgICAgICAgICBub2Rlcy5wdXNoKHsgaWQ6IHNraWxsLm5hbWUsIHg6IE1hdGguZmxvb3IoeCksIHk6IE1hdGguZmxvb3IoeSksIHdpZHRoLCBoZWlnaHQsIHR5cGU6IFwidGV4dFwiLCB0ZXh0LCBjb2xvciB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2tpbGxzLmZvckVhY2goc2tpbGwgPT4ge1xuICAgICAgICAgICAgaWYgKHNraWxsLmNvbm5lY3Rpb25zKSB7XG4gICAgICAgICAgICAgICAgc2tpbGwuY29ubmVjdGlvbnMuZm9yRWFjaCh0YXJnZXROYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSB0YXJnZXROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWRnZXMucHVzaCh7IGlkOiBgJHtza2lsbC5uYW1lfS0ke3RhcmdldE5hbWV9YCwgZnJvbU5vZGU6IHNraWxsLm5hbWUsIGZyb21TaWRlOiBcInJpZ2h0XCIsIHRvTm9kZTogdGFyZ2V0TmFtZSwgdG9TaWRlOiBcImxlZnRcIiwgY29sb3I6IFwiNFwiIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNhbnZhc0RhdGEgPSB7IG5vZGVzLCBlZGdlcyB9O1xuICAgICAgICBjb25zdCBwYXRoID0gXCJBY3RpdmVfUnVuL05ldXJhbF9IdWIuY2FudmFzXCI7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHsgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpKTsgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgdXBkYXRlZC5cIik7IH0gXG4gICAgICAgIGVsc2UgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpOyBuZXcgTm90aWNlKFwiTmV1cmFsIEh1YiBjcmVhdGVkLlwiKTsgfVxuICAgIH1cblxuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdHM6IHN0cmluZ1tdKSB7IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmNyZWF0ZVF1ZXN0Q2hhaW4obmFtZSwgcXVlc3RzKTsgYXdhaXQgdGhpcy5zYXZlKCk7IH1cbiAgICBnZXRBY3RpdmVDaGFpbigpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IH1cbiAgICBnZXRDaGFpblByb2dyZXNzKCkgeyByZXR1cm4gdGhpcy5jaGFpbnNFbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpOyB9XG4gICAgYXN5bmMgYnJlYWtDaGFpbigpIHsgYXdhaXQgdGhpcy5jaGFpbnNFbmdpbmUuYnJlYWtDaGFpbigpOyBhd2FpdCB0aGlzLnNhdmUoKTsgfVxuICAgIFxuICAgIHNldEZpbHRlclN0YXRlKGVuZXJneTogYW55LCBjb250ZXh0OiBhbnksIHRhZ3M6IHN0cmluZ1tdKSB7IHRoaXMuZmlsdGVyc0VuZ2luZS5zZXRGaWx0ZXJTdGF0ZShlbmVyZ3ksIGNvbnRleHQsIHRhZ3MpOyB0aGlzLnNhdmUoKTsgfVxuICAgIGNsZWFyRmlsdGVycygpIHsgdGhpcy5maWx0ZXJzRW5naW5lLmNsZWFyRmlsdGVycygpOyB0aGlzLnNhdmUoKTsgfVxuICAgIFxuICAgIGdldEdhbWVTdGF0cygpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmdldEdhbWVTdGF0cygpOyB9XG4gICAgY2hlY2tCb3NzTWlsZXN0b25lcygpIHsgcmV0dXJuIHRoaXMuYW5hbHl0aWNzRW5naW5lLmNoZWNrQm9zc01pbGVzdG9uZXMoKTsgfVxuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKTsgfVxuXG4gICAgdGF1bnQodHJpZ2dlcjogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IG1zZ3M6IGFueSA9IHsgXG4gICAgICAgICAgICBcImZhaWxcIjogW1wiUGF0aGV0aWMuXCIsIFwiVHJ5IGFnYWluLlwiLCBcIklzIHRoYXQgYWxsP1wiXSwgXG4gICAgICAgICAgICBcImxldmVsX3VwXCI6IFtcIlBvd2VyIG92ZXJ3aGVsbWluZy5cIiwgXCJBc2NlbmRpbmcuXCJdLFxuICAgICAgICAgICAgXCJsb3dfaHBcIjogW1wiQmxlZWRpbmcgb3V0Li4uXCIsIFwiSG9sZCBvbi5cIl0gXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG1zZyA9IG1zZ3NbdHJpZ2dlcl0gPyBtc2dzW3RyaWdnZXJdW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1zZ3NbdHJpZ2dlcl0ubGVuZ3RoKV0gOiBcIk9ic2VydmUuXCI7XG4gICAgICAgIG5ldyBOb3RpY2UoYFNZU1RFTTogJHttc2d9YCk7XG4gICAgfVxuICAgIFxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSB0ZXh0Lm1hdGNoKC8oLis/KVxccypcXC8oXFxkKS8pO1xuICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlUXVlc3QobWF0Y2hbMV0sIHBhcnNlSW50KG1hdGNoWzJdKSwgXCJOb25lXCIsIFwiTm9uZVwiLCBtb21lbnQoKS5hZGQoMjQsICdob3VycycpLnRvSVNPU3RyaW5nKCksIGZhbHNlLCBcIk5vcm1hbFwiLCBmYWxzZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVF1ZXN0KHRleHQsIDMsIFwiTm9uZVwiLCBcIk5vbmVcIiwgbW9tZW50KCkuYWRkKDI0LCAnaG91cnMnKS50b0lTT1N0cmluZygpLCBmYWxzZSwgXCJOb3JtYWxcIiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgdHJpZ2dlckRlYXRoKCkgeyBcbiAgICAgICAgY29uc3QgYWN0aXZlRm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGNvbnN0IGdyYXZlRm9sZGVyID0gXCJHcmF2ZXlhcmQvRGVhdGhzL1wiICsgbW9tZW50KCkuZm9ybWF0KFwiWVlZWS1NTS1ERC1ISG1tXCIpO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZUZvbGRlcikpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihncmF2ZUZvbGRlcik7XG5cbiAgICAgICAgaWYgKGFjdGl2ZUZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBhY3RpdmVGb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnJlbmFtZUZpbGUoZmlsZSwgYCR7Z3JhdmVGb2xkZXJ9LyR7ZmlsZS5uYW1lfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MubGV2ZWwgPSAxOyB0aGlzLnNldHRpbmdzLmhwID0gMTAwOyB0aGlzLnNldHRpbmdzLmdvbGQgPSAwOyBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZWdhY3kuZGVhdGhDb3VudCA9ICh0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50IHx8IDApICsgMTtcbiAgICAgICAgYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYsIFRGaWxlLCBURm9sZGVyLCBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7XG5pbXBvcnQgeyBRdWVzdE1vZGFsLCBTaG9wTW9kYWwsIFNraWxsRGV0YWlsTW9kYWwsIFNraWxsTWFuYWdlck1vZGFsLCBDb25maXJtTW9kYWwgfSBmcm9tICcuL21vZGFscyc7XG5pbXBvcnQgeyBTa2lsbCwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgVklFV19UWVBFX1BBTk9QVElDT04gPSBcInNpc3lwaHVzLXBhbm9wdGljb25cIjtcblxuZXhwb3J0IGNsYXNzIFBhbm9wdGljb25WaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGxlYWYpO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRV9QQU5PUFRJQ09OOyB9XG4gICAgZ2V0RGlzcGxheVRleHQoKSB7IHJldHVybiBcIkV5ZSBTaXN5cGh1c1wiOyB9XG4gICAgZ2V0SWNvbigpIHsgcmV0dXJuIFwic2t1bGxcIjsgfVxuXG4gICAgYXN5bmMgb25PcGVuKCkgeyBcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VwZGF0ZScsIHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpKTsgXG4gICAgfVxuXG4gICAgYXN5bmMgcmVmcmVzaCgpIHtcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsOyBjLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGMuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNvbnN0IHNjcm9sbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zY3JvbGwtYXJlYVwiIH0pO1xuXG4gICAgICAgIC8vIC0tLSAxLiBIRUFERVIgJiBTT1VORCBUT0dHTEUgLS0tXG4gICAgICAgIGNvbnN0IGhlYWRlciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1oZWFkZXJcIiB9KTtcbiAgICAgICAgaGVhZGVyLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjtcbiAgICAgICAgaGVhZGVyLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gXCJzcGFjZS1iZXR3ZWVuXCI7XG4gICAgICAgIGhlYWRlci5zdHlsZS5hbGlnbkl0ZW1zID0gXCJjZW50ZXJcIjtcbiAgICAgICAgXG4gICAgICAgIGhlYWRlci5jcmVhdGVTcGFuKHsgdGV4dDogXCJFeWUgU0lTWVBIVVMgT1NcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNvdW5kQnRuID0gaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHRoaXMucGx1Z2luLnNldHRpbmdzLm11dGVkID8gXCLwn5SHXCIgOiBcIvCflIpcIiB9KTtcbiAgICAgICAgc291bmRCdG4uc3R5bGUuY3Vyc29yID0gXCJwb2ludGVyXCI7XG4gICAgICAgIHNvdW5kQnRuLnN0eWxlLmZvbnRTaXplID0gXCIwLjhlbVwiO1xuICAgICAgICBzb3VuZEJ0bi50aXRsZSA9IFwiVG9nZ2xlIFNvdW5kXCI7XG4gICAgICAgIHNvdW5kQnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQgPSAhdGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQ7XG4gICAgICAgICAgICAgdGhpcy5wbHVnaW4uYXVkaW8uc2V0TXV0ZWQodGhpcy5wbHVnaW4uc2V0dGluZ3MubXV0ZWQpO1xuICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICB9O1xuXG4gICAgICAgLy8gW05FV10gREVCVCBXQVJOSU5HXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkge1xuICAgICAgICAgICAgY29uc3QgZCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LWRlYnRcIiB9KTtcbiAgICAgICAgICAgIGQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwi4pqg77iPIERFQlQgQ1JJU0lTIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkFMTCBEQU1BR0UgUkVDRUlWRUQgSVMgRE9VQkxFRC5cIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyBcbiAgICAgICAgICAgICAgICB0ZXh0OiBgQ3VycmVudCBCYWxhbmNlOiAke3RoaXMucGx1Z2luLnNldHRpbmdzLmdvbGR9Z2AsIFxuICAgICAgICAgICAgICAgIGF0dHI6IHsgc3R5bGU6IFwiZm9udC13ZWlnaHQ6Ym9sZFwiIH0gXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBcblxuICAgICAgICBpZih0aGlzLnBsdWdpbi5lbmdpbmUuaXNMb2NrZWREb3duKCkpIHtcbiAgICAgICAgICAgIGNvbnN0IGwgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1sb2NrZG93blwiIH0pO1xuICAgICAgICAgICAgbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJMT0NLRE9XTiBBQ1RJVkVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXM6IG1pbnMgfSA9IHRoaXMucGx1Z2luLmVuZ2luZS5tZWRpdGF0aW9uRW5naW5lLmdldExvY2tkb3duVGltZVJlbWFpbmluZygpO1xuICAgICAgICAgICAgbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgVGltZSBSZW1haW5pbmc6ICR7aG91cnN9aCAke21pbnN9bWAgfSk7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBsLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJBVFRFTVBUIFJFQ09WRVJZXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZFN0YXR1cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7XG4gICAgICAgICAgICBjb25zdCBtZWREaXYgPSBsLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogMTBweDsgcGFkZGluZzogMTBweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjEpOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuICAgICAgICAgICAgbWVkRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBNZWRpdGF0aW9uOiAke21lZFN0YXR1cy5jeWNsZXNEb25lfS8xMCAoJHttZWRTdGF0dXMuY3ljbGVzUmVtYWluaW5nfSBsZWZ0KWAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJhciA9IG1lZERpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIG1lZEJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgbWFyZ2luOiA1cHggMDsgb3ZlcmZsb3c6IGhpZGRlbjtcIik7XG4gICAgICAgICAgICBjb25zdCBtZWRGaWxsID0gbWVkQmFyLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgY29uc3QgbWVkUGVyY2VudCA9IChtZWRTdGF0dXMuY3ljbGVzRG9uZSAvIDEwKSAqIDEwMDtcbiAgICAgICAgICAgIG1lZEZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke21lZFBlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjYWE2NGZmOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBtZWRCdG4gPSBtZWREaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIk1FRElUQVRFXCIgfSk7XG4gICAgICAgICAgICBtZWRCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJ3aWR0aDogMTAwJTsgcGFkZGluZzogOHB4OyBtYXJnaW4tdG9wOiA1cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgY29sb3I6ICNhYTY0ZmY7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgICAgICBtZWRCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc3RhcnRNZWRpdGF0aW9uKCk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLnJlZnJlc2goKSwgMTAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJzaXN5LWJ0blwiKTtcbiAgICAgICAgICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4gdGhpcy5wbHVnaW4uZW5naW5lLmF0dGVtcHRSZWNvdmVyeSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMucGx1Z2luLmVuZ2luZS5pc1Jlc3RpbmcoKSkge1xuICAgICAgICAgICAgIGNvbnN0IHIgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYWxlcnQgc2lzeS1hbGVydC1yZXN0XCIgfSk7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJSRVNUIERBWSBBQ1RJVkVcIiB9KTtcbiAgICAgICAgICAgICBjb25zdCB0aW1lUmVtYWluaW5nID0gbW9tZW50KHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc3REYXlVbnRpbCkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IodGltZVJlbWFpbmluZyAvIDYwKTtcbiAgICAgICAgICAgICBjb25zdCBtaW5zID0gdGltZVJlbWFpbmluZyAlIDYwO1xuICAgICAgICAgICAgIHIuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCR7aG91cnN9aCAke21pbnN9bSByZW1haW5pbmcgfCBObyBkYW1hZ2UsIFJ1c3QgcGF1c2VkYCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSAyLiBIVUQgR1JJRCAoMngyKSAtLS1cbiAgICAgICAgY29uc3QgaHVkID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWh1ZFwiIH0pO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkhFQUxUSFwiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocH0vJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhIcH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ocCA8IDMwID8gXCJzaXN5LWNyaXRpY2FsXCIgOiBcIlwiKTtcbiAgICAgICAgdGhpcy5zdGF0KGh1ZCwgXCJHT0xEXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmdvbGR9YCwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyBcInNpc3ktdmFsLWRlYnRcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkxFVkVMXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmxldmVsfWApO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIlJJVkFMIERNR1wiLCBgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZ31gKTtcblxuICAgICAgICAvLyAtLS0gMy4gVEhFIE9SQUNMRSAtLS1cbiAgICAgICAgY29uc3Qgb3JhY2xlID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW9yYWNsZVwiIH0pO1xuICAgICAgICBvcmFjbGUuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiT1JBQ0xFIFBSRURJQ1RJT05cIiB9KTtcbiAgICAgICAgY29uc3Qgc3Vydml2YWwgPSBNYXRoLmZsb29yKHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIC8gKHRoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nICogKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCAwID8gMiA6IDEpKSk7XG4gICAgICAgIFxuICAgICAgICBsZXQgc3VydlRleHQgPSBgU3Vydml2YWw6ICR7c3Vydml2YWx9IGRheXNgO1xuICAgICAgICBjb25zdCBpc0NyaXNpcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgfHwgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBHbGl0Y2ggTG9naWNcbiAgICAgICAgaWYgKGlzQ3Jpc2lzICYmIE1hdGgucmFuZG9tKCkgPCAwLjMpIHtcbiAgICAgICAgICAgIGNvbnN0IGdsaXRjaGVzID0gW1wiW0NPUlJVUFRFRF1cIiwgXCI/Pz8gREFZUyBMRUZUXCIsIFwiTk8gRlVUVVJFXCIsIFwiUlVOXCJdO1xuICAgICAgICAgICAgc3VydlRleHQgPSBnbGl0Y2hlc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBnbGl0Y2hlcy5sZW5ndGgpXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1cnZFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyB0ZXh0OiBzdXJ2VGV4dCB9KTtcbiAgICAgICAgaWYgKHN1cnZpdmFsIDwgMiB8fCBzdXJ2VGV4dC5pbmNsdWRlcyhcIj8/P1wiKSB8fCBzdXJ2VGV4dC5pbmNsdWRlcyhcIkNPUlJVUFRFRFwiKSkge1xuICAgICAgICAgICAgIHN1cnZFbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImNvbG9yOiNmZjU1NTU7IGZvbnQtd2VpZ2h0OmJvbGQ7IGxldHRlci1zcGFjaW5nOiAxcHg7XCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsaWdodHMgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdHVzLWxpZ2h0c1wiIH0pO1xuICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDApIGxpZ2h0cy5jcmVhdGVEaXYoeyB0ZXh0OiBcIkRFQlQ6IFlFU1wiLCBjbHM6IFwic2lzeS1saWdodC1hY3RpdmVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERMQyAxOiBTY2FycyBkaXNwbGF5XG4gICAgICAgIGNvbnN0IHNjYXJDb3VudCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmxlZ2FjeT8uZGVhdGhDb3VudCB8fCAwO1xuICAgICAgICBpZiAoc2NhckNvdW50ID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2NhckVsID0gb3JhY2xlLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNjYXItZGlzcGxheVwiIH0pO1xuICAgICAgICAgICAgc2NhckVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBTY2FyczogJHtzY2FyQ291bnR9YCB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBlbmFsdHkgPSBNYXRoLnBvdygwLjksIHNjYXJDb3VudCk7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50TG9zdCA9IE1hdGguZmxvb3IoKDEgLSBwZW5hbHR5KSAqIDEwMCk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IGAoLSR7cGVyY2VudExvc3R9JSBzdGFydGluZyBnb2xkKWAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERMQyAxOiBOZXh0IG1pbGVzdG9uZVxuICAgICAgICBjb25zdCBsZXZlbE1pbGVzdG9uZXMgPSBbMTAsIDIwLCAzMCwgNTBdO1xuICAgICAgICBjb25zdCBuZXh0TWlsZXN0b25lID0gbGV2ZWxNaWxlc3RvbmVzLmZpbmQobSA9PiBtID4gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSkge1xuICAgICAgICAgICAgY29uc3QgbWlsZXN0b25lRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlsZXN0b25lXCIgfSk7XG4gICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgTmV4dCBNaWxlc3RvbmU6IExldmVsICR7bmV4dE1pbGVzdG9uZX1gIH0pO1xuICAgICAgICAgICAgaWYgKG5leHRNaWxlc3RvbmUgPT09IDEwIHx8IG5leHRNaWxlc3RvbmUgPT09IDIwIHx8IG5leHRNaWxlc3RvbmUgPT09IDMwIHx8IG5leHRNaWxlc3RvbmUgPT09IDUwKSB7XG4gICAgICAgICAgICAgICAgbWlsZXN0b25lRWwuY3JlYXRlRWwoXCJzbWFsbFwiLCB7IHRleHQ6IFwiKEJvc3MgVW5sb2NrKVwiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDQuIERBSUxZIE1JU1NJT05TIChETEMgMSkgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlRPREFZUyBPQkpFQ1RJVkVTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJEYWlseU1pc3Npb25zKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIDUuIENPTlRST0xTIC0tLVxuICAgICAgICBjb25zdCBjdHJscyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jb250cm9sc1wiIH0pO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVQTE9ZXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSkub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiU0hPUFwiLCBjbHM6IFwic2lzeS1idG5cIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFNob3BNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcbiAgICAgICAgY3RybHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkZPQ1VTXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5hdWRpby50b2dnbGVCcm93bk5vaXNlKCk7XG5cbiAgICAgICAgLy8gLS0tIDYuIEFDVElWRSBUSFJFQVRTIC0tLVxuICAgICAgICAvLyAtLS0gRExDIDU6IENPTlRFWFQgRklMVEVSUyAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiRklMVEVSIENPTlRST0xTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJGaWx0ZXJCYXIoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDQ6IFFVRVNUIENIQUlOUyAtLS1cbiAgICAgICAgY29uc3QgYWN0aXZlQ2hhaW4gPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKGFjdGl2ZUNoYWluKSB7XG4gICAgICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBQ1RJVkUgQ0hBSU5cIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJDaGFpblNlY3Rpb24oc2Nyb2xsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSBETEMgMjogUkVTRUFSQ0ggTElCUkFSWSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiUkVTRUFSQ0ggTElCUkFSWVwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyUmVzZWFyY2hTZWN0aW9uKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIERMQyA2OiBBTkFMWVRJQ1MgJiBFTkRHQU1FIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBTkFMWVRJQ1MgJiBQUk9HUkVTU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIHRoaXMucmVuZGVyQW5hbHl0aWNzKHNjcm9sbCk7XG5cbiAgICAgICAgLy8gLS0tIEFDVElWRSBUSFJFQVRTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJBQ1RJVkUgVEhSRUFUU1wiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyUXVlc3RzKHNjcm9sbCk7XG5cbiAgICAgICAgICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJORVVSQUwgSFVCXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKChzOiBTa2lsbCwgaWR4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1yb3dcIiB9KTtcbiAgICAgICAgICAgIHJvdy5vbmNsaWNrID0gKCkgPT4gbmV3IFNraWxsRGV0YWlsTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBpZHgpLm9wZW4oKTtcbiAgICAgICAgICAgIGNvbnN0IG1ldGEgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2tpbGwtbWV0YVwiIH0pO1xuICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogcy5uYW1lIH0pO1xuICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogYEx2bCAke3MubGV2ZWx9YCB9KTtcbiAgICAgICAgICAgIGlmIChzLnJ1c3QgPiAwKSB7XG4gICAgICAgICAgICAgICAgbWV0YS5jcmVhdGVTcGFuKHsgdGV4dDogYFJVU1QgJHtzLnJ1c3R9YCwgY2xzOiBcInNpc3ktcnVzdC1iYWRnZVwiIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYmFyID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7KHMueHAvcy54cFJlcSkqMTAwfSU7IGJhY2tncm91bmQ6ICR7cy5ydXN0ID4gMCA/ICcjZDM1NDAwJyA6ICcjMDBiMGZmJ31gKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhZGRCdG4gPSBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCIrIEFkZCBOZXVyYWwgTm9kZVwiLCBjbHM6IFwic2lzeS1hZGQtc2tpbGxcIiB9KTtcbiAgICAgICAgYWRkQnRuLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxNYW5hZ2VyTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG5cbiAgICAgICAgLy8gLS0tIDguIFFVSUNLIENBUFRVUkUgLS0tXG4gICAgICAgIGNvbnN0IGZvb3RlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1xdWljay1jYXB0dXJlXCIgfSk7XG4gICAgICAgIGNvbnN0IGlucHV0ID0gZm9vdGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic2lzeS1xdWljay1pbnB1dFwiLCBwbGFjZWhvbGRlcjogXCJNaXNzaW9uIC8xLi4uNVwiIH0pO1xuICAgICAgICBpbnB1dC5vbmtleWRvd24gPSBhc3luYyAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRW50ZXInICYmIGlucHV0LnZhbHVlLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5wYXJzZVF1aWNrSW5wdXQoaW5wdXQudmFsdWUudHJpbSgpKTtcbiAgICAgICAgICAgICAgICBpbnB1dC52YWx1ZSA9IFwiXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRExDIDE6IFJlbmRlciBEYWlseSBNaXNzaW9uc1xuICAgIHJlbmRlckRhaWx5TWlzc2lvbnMocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBtaXNzaW9ucyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMgfHwgW107XG4gICAgICAgIFxuICAgICAgICBpZiAobWlzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBlbXB0eSA9IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIG1pc3Npb25zIHRvZGF5LiBDaGVjayBiYWNrIHRvbW9ycm93LlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWlzc2lvbnNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktZGFpbHktbWlzc2lvbnNcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIG1pc3Npb25zLmZvckVhY2goKG1pc3Npb246IERhaWx5TWlzc2lvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2FyZCA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tY2FyZFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSBjYXJkLmFkZENsYXNzKFwic2lzeS1taXNzaW9uLWNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLWhlYWRlclwiIH0pO1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSWNvbiA9IG1pc3Npb24uY29tcGxldGVkID8gXCJZRVNcIiA6IFwiLi5cIjtcbiAgICAgICAgICAgIGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBzdGF0dXNJY29uLCBjbHM6IFwic2lzeS1taXNzaW9uLXN0YXR1c1wiIH0pO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IG1pc3Npb24ubmFtZSwgY2xzOiBcInNpc3ktbWlzc2lvbi1uYW1lXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBjYXJkLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IG1pc3Npb24uZGVzYywgY2xzOiBcInNpc3ktbWlzc2lvbi1kZXNjXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHByb2dyZXNzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taXNzaW9uLXByb2dyZXNzXCIgfSk7XG4gICAgICAgICAgICBwcm9ncmVzcy5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgJHttaXNzaW9uLnByb2dyZXNzfS8ke21pc3Npb24udGFyZ2V0fWAsIGNsczogXCJzaXN5LW1pc3Npb24tY291bnRlclwiIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXIgPSBwcm9ncmVzcy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItYmdcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWZpbGxcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnQgPSAobWlzc2lvbi5wcm9ncmVzcyAvIG1pc3Npb24udGFyZ2V0KSAqIDEwMDtcbiAgICAgICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke01hdGgubWluKHBlcmNlbnQsIDEwMCl9JWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByZXdhcmQgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcmV3YXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5yZXdhcmQueHAgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC54cH0gWFBgLCBjbHM6IFwic2lzeS1yZXdhcmQteHBcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC5nb2xkID4gMCkgcmV3YXJkLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgKyR7bWlzc2lvbi5yZXdhcmQuZ29sZH1nYCwgY2xzOiBcInNpc3ktcmV3YXJkLWdvbGRcIiB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYWxsQ29tcGxldGVkID0gbWlzc2lvbnMuZXZlcnkobSA9PiBtLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChhbGxDb21wbGV0ZWQgJiYgbWlzc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgYm9udXMgPSBtaXNzaW9uc0Rpdi5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFsbCBNaXNzaW9ucyBDb21wbGV0ZSEgKzUwIEJvbnVzIEdvbGRcIiwgY2xzOiBcInNpc3ktbWlzc2lvbi1ib251c1wiIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxuICAgIC8vIERMQyAyOiBSZW5kZXIgUmVzZWFyY2ggUXVlc3RzIFNlY3Rpb25cbiAgICByZW5kZXJSZXNlYXJjaFNlY3Rpb24ocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCByZXNlYXJjaFF1ZXN0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzIHx8IFtdO1xuICAgICAgICBjb25zdCBhY3RpdmVSZXNlYXJjaCA9IHJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZFJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gcS5jb21wbGV0ZWQpO1xuXG4gICAgICAgIC8vIFN0YXRzIGJhclxuICAgICAgICBjb25zdCBzdGF0cyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRSZXNlYXJjaFJhdGlvKCk7XG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLXN0YXRzXCIgfSk7XG4gICAgICAgIHN0YXRzRGl2LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgIzY2NjsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMDUpO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJhdGlvVGV4dCA9IHN0YXRzRGl2LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSZXNlYXJjaCBSYXRpbzogJHtzdGF0cy5jb21iYXR9OiR7c3RhdHMucmVzZWFyY2h9ICgke3N0YXRzLnJhdGlvfToxKWAgfSk7XG4gICAgICAgIHJhdGlvVGV4dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5lbmdpbmUuY2FuQ3JlYXRlUmVzZWFyY2hRdWVzdCgpKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJCTE9DS0VEOiBOZWVkIDIgY29tYmF0IHBlciAxIHJlc2VhcmNoXCIgfSk7XG4gICAgICAgICAgICB3YXJuaW5nLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6IG9yYW5nZTsgZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbjogNXB4IDA7XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWN0aXZlIFJlc2VhcmNoXG4gICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBSRVNFQVJDSFwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoYWN0aXZlUmVzZWFyY2gubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBhY3RpdmUgcmVzZWFyY2guXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhY3RpdmVSZXNlYXJjaC5mb3JFYWNoKChxdWVzdDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FyZCA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1jYXJkXCIgfSk7XG4gICAgICAgICAgICAgICAgY2FyZC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNhYTY0ZmY7IHBhZGRpbmc6IDEwcHg7IG1hcmdpbi1ib3R0b206IDhweDsgYm9yZGVyLXJhZGl1czogNHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMDUpO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgaGVhZGVyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBtYXJnaW4tYm90dG9tOiA2cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdGl0bGUgPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcXVlc3QudGl0bGUgfSk7XG4gICAgICAgICAgICAgICAgdGl0bGUuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDsgZmxleDogMTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlTGFiZWwgPSBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogcXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU1VSVkVZXCIgOiBcIkRFRVAgRElWRVwiIH0pO1xuICAgICAgICAgICAgICAgIHR5cGVMYWJlbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC43NWVtOyBwYWRkaW5nOiAycHggNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMyk7IGJvcmRlci1yYWRpdXM6IDJweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjYXJkLmNyZWF0ZUVsKFwiZGl2XCIsIHsgdGV4dDogYElEOiAke3F1ZXN0LmlkfWAgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LWZhbWlseTptb25vc3BhY2U7IGZvbnQtc2l6ZTowLjhlbTsgY29sb3I6I2FhNjRmZjsgb3BhY2l0eTowLjg7IG1hcmdpbi1ib3R0b206NHB4O1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB3b3JkQ291bnQgPSBjYXJkLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBXb3JkczogJHtxdWVzdC53b3JkQ291bnR9LyR7cXVlc3Qud29yZExpbWl0fWAgfSk7XG4gICAgICAgICAgICAgICAgd29yZENvdW50LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYmFyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBiYXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJoZWlnaHQ6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwwLjEpOyBib3JkZXItcmFkaXVzOiAzcHg7IG92ZXJmbG93OiBoaWRkZW47IG1hcmdpbjogNnB4IDA7XCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IE1hdGgubWluKDEwMCwgKHF1ZXN0LndvcmRDb3VudCAvIHF1ZXN0LndvcmRMaW1pdCkgKiAxMDApO1xuICAgICAgICAgICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke3BlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjYWE2NGZmOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNhcmQuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICAgICAgYWN0aW9ucy5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGZsZXg7IGdhcDogNXB4OyBtYXJnaW4tdG9wOiA4cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgdmlld0J0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgdmlld0J0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSg4NSwgMjU1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgIzU1ZmY1NTsgY29sb3I6ICM1NWZmNTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgICAgICAgICAgdmlld0J0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY29tcGxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0LmlkLCBxdWVzdC53b3JkQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlQnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiREVMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlQnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgODUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21wbGV0ZWQgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQ09NUExFVEVEIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjb21wbGV0ZWRSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGNvbXBsZXRlZCByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlZFJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gcGFyZW50LmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGArICR7cXVlc3QudGl0bGV9ICgke3F1ZXN0LnR5cGUgPT09IFwic3VydmV5XCIgPyBcIlN1cnZleVwiIDogXCJEZWVwIERpdmVcIn0pYCB9KTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtOyBtYXJnaW46IDNweCAwO1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG5hc3luYyByZW5kZXJRdWVzdHMocGFyZW50OiBIVE1MRWxlbWVudCkge1xuICAgICAgICBjb25zdCBmb2xkZXIgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoXCJBY3RpdmVfUnVuL1F1ZXN0c1wiKTtcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgIC8vIFtGSVhdIEFwcGx5IGZpbHRlcnMgdXNpbmcgdGhlIGZpbHRlciBlbmdpbmVcbiAgICAgICAgICAgIGxldCBmaWxlcyA9IGZvbGRlci5jaGlsZHJlbi5maWx0ZXIoZiA9PiBmIGluc3RhbmNlb2YgVEZpbGUpIGFzIFRGaWxlW107XG4gICAgICAgICAgICBmaWxlcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5maWx0ZXJzRW5naW5lLmZpbHRlclF1ZXN0cyhmaWxlcykgYXMgVEZpbGVbXTsgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvcnQgYnkgZGVhZGxpbmVcbiAgICAgICAgICAgIGZpbGVzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbUEgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShhKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZm1CID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoYik/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGVBID0gZm1BPy5kZWFkbGluZSA/IG1vbWVudChmbUEuZGVhZGxpbmUpLnZhbHVlT2YoKSA6IDk5OTk5OTk5OTk5OTk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZUIgPSBmbUI/LmRlYWRsaW5lID8gbW9tZW50KGZtQi5kZWFkbGluZSkudmFsdWVPZigpIDogOTk5OTk5OTk5OTk5OTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZUEgLSBkYXRlQjsgXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LWNhcmQtYm9zc1wiKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkID0gU3RyaW5nKGZtPy5kaWZmaWN1bHR5IHx8IFwiXCIpLm1hdGNoKC9cXGQvKTtcbiAgICAgICAgICAgICAgICBpZiAoZCkgY2FyZC5hZGRDbGFzcyhgc2lzeS1jYXJkLSR7ZFswXX1gKTtcblxuICAgICAgICAgICAgICAgIC8vIFRvcCBzZWN0aW9uIHdpdGggdGl0bGUgYW5kIHRpbWVyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9wID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1jYXJkLXRvcFwiIH0pO1xuICAgICAgICAgICAgICAgIHRvcC5jcmVhdGVEaXYoeyB0ZXh0OiBmaWxlLmJhc2VuYW1lLCBjbHM6IFwic2lzeS1jYXJkLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVGltZXJcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBtb21lbnQoZm0uZGVhZGxpbmUpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaW5zID0gZGlmZiAlIDYwO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lclRleHQgPSBkaWZmIDwgMCA/IFwiRVhQSVJFRFwiIDogYCR7aG91cnN9aCAke21pbnN9bWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gdG9wLmNyZWF0ZURpdih7IHRleHQ6IHRpbWVyVGV4dCwgY2xzOiBcInNpc3ktdGltZXJcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpZmYgPCA2MCkgdGltZXIuYWRkQ2xhc3MoXCJzaXN5LXRpbWVyLWxhdGVcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gW0ZJWF0gRGVsZXRpb24gV2FybmluZyBMb2dpY1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoID0gdG9wLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXRyYXNoXCIsIHRleHQ6IFwiW1hdXCIgfSk7XG4gICAgICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVvdGEgPSB0aGlzLnBsdWdpbi5lbmdpbmUubWVkaXRhdGlvbkVuZ2luZS5nZXREZWxldGlvblF1b3RhKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocXVvdGEuZnJlZSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IENvbmZpcm1Nb2RhbChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJQYWlkIERlbGV0aW9uIFdhcm5pbmdcIiwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYFlvdSBoYXZlIDAgZnJlZSBkZWxldGlvbnMgbGVmdC4gVGhpcyB3aWxsIGNvc3QgMTBnLiBDb250aW51ZT9gLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEp1c3QgZGVsZXRlOyBlbmdpbmUgaGFuZGxlcyBjb3N0IGxvZ2ljIGlmIGludGVncmF0ZWQsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvciBzaW1wbHkgYWxsb3cgZGVsZXRpb24gYXMgYmVmb3JlIGJ1dCB3aXRoIHdhcm5pbmcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kZWxldGVRdWVzdChmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKS5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUXVlc3QoZmlsZSk7IFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuLy8gW01PRElGSUVEXSBCb3NzIEhQIEJhclxuICAgICAgICAgICAgICAgIGlmIChmbT8uaXNfYm9zcyAmJiBmbT8uYm9zc19tYXhfaHApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaHBCYXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgICAgICBocEJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogOHB4OyBiYWNrZ3JvdW5kOiAjMzMzOyBtYXJnaW46IDhweCAwOyBib3JkZXItcmFkaXVzOiA0cHg7IG92ZXJmbG93OiBoaWRkZW47IGJvcmRlcjogMXB4IHNvbGlkICM1NTU7XCIpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaHBQZXJjZW50ID0gKGZtLmJvc3NfaHAgLyBmbS5ib3NzX21heF9ocCkgKiAxMDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhwRmlsbCA9IGhwQmFyLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgICAgICBocEZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke2hwUGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNmZjU1NTU7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBbRklYRUQgTElORSBCRUxPV10gc3R5bGUgaXMgbm93IGluc2lkZSBhdHRyXG4gICAgICAgICAgICAgICAgICAgIGNhcmQuY3JlYXRlRGl2KHsgXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBgJHtmbS5ib3NzX2hwfS8ke2ZtLmJvc3NfbWF4X2hwfSBIUGAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgYXR0cjogeyBzdHlsZTogXCJmb250LXNpemU6IDAuOGVtOyB0ZXh0LWFsaWduOiBjZW50ZXI7IGNvbG9yOiAjZmY1NTU1OyBtYXJnaW4tYm90dG9tOiA1cHg7XCIgfSBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHMgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFjdGlvbnNcIiB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJZiBpdCdzIGEgYm9zcywgc2hvdyBBVFRBQ0sgYnV0dG9uIGluc3RlYWQgb2YgT0tcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmlzX2Jvc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYkF0dGFjayA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIuKalO+4jyBBVFRBQ0tcIiwgY2xzOiBcInNpc3ktYWN0aW9uLWJ0blwiIH0pO1xuICAgICAgICAgICAgICAgICAgICBiQXR0YWNrLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyLWNvbG9yOiAjZmY1NTU1OyBjb2xvcjogI2ZmNTU1NTsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4xKTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xuICAgICAgICAgICAgICAgICAgICBiQXR0YWNrLm9uY2xpY2sgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5kYW1hZ2VCb3NzKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0YW5kYXJkIFF1ZXN0IEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiRCA9IGFjdHMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIk9LXCIsIGNsczogXCJzaXN5LWFjdGlvbi1idG4gbW9kLWRvbmVcIiB9KTtcbiAgICAgICAgICAgICAgICAgICAgYkQub25jbGljayA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNvbXBsZXRlUXVlc3QoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgYkYgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJYWFwiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1mYWlsXCIgfSk7XG4gICAgICAgICAgICAgICAgYkYub25jbGljayA9IChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5mYWlsUXVlc3QoZmlsZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGlkbGUgPSBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJTeXN0ZW0gSWRsZS5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGN0YUJ0biA9IGlkbGUuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIltERVBMT1kgUVVFU1RdXCIsIGNsczogXCJzaXN5LWJ0biBtb2QtY3RhXCIgfSk7XG4gICAgICAgICAgICBjdGFCdG4uc3R5bGUubWFyZ2luVG9wID0gXCIxMHB4XCI7XG4gICAgICAgICAgICBjdGFCdG4ub25jbGljayA9ICgpID0+IG5ldyBRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICB9XG4gICAgfSAgICBcblxuICAgIHJlbmRlckNoYWluU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBhY3RpdmUgY2hhaW4uXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYWluLWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjaGFpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM0Y2FmNTA7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSg3NiwgMTc1LCA4MCwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaGVhZGVyID0gY2hhaW5EaXYuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGNoYWluLm5hbWUgfSk7XG4gICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMCAwIDEwcHggMDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBwcm9ncmVzc1RleHQgPSBjaGFpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHJvZ3Jlc3M6ICR7cHJvZ3Jlc3MuY29tcGxldGVkfS8ke3Byb2dyZXNzLnRvdGFsfWAgfSk7XG4gICAgICAgIHByb2dyZXNzVGV4dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmFyID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgbWFyZ2luOiA4cHggMDsgb3ZlcmZsb3c6IGhpZGRlbjtcIik7XG4gICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke3Byb2dyZXNzLnBlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjNGNhZjUwOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RMaXN0ID0gY2hhaW5EaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tcXVlc3RzXCIgfSk7XG4gICAgICAgIHF1ZXN0TGlzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTBweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjaGFpbi5xdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHF1ZXN0TGlzdC5jcmVhdGVFbChcInBcIik7XG4gICAgICAgICAgICBjb25zdCBpY29uID0gaWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJPS1wiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIj4+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkRPTkVcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJBQ1RJVkVcIiA6IFwiTE9DS0VEXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGl0ZW0uc2V0VGV4dChgWyR7aWNvbn1dICR7cXVlc3R9ICgke3N0YXR1c30pYCk7XG4gICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDNweCAwOyBwYWRkaW5nOiAzcHg7IFxuICAgICAgICAgICAgICAgICR7aWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJvcGFjaXR5OiAwLjY7XCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiIDogXCJvcGFjaXR5OiAwLjQ7XCJ9YCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNoYWluRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnJlYWtCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCUkVBSyBDSEFJTlwiIH0pO1xuICAgICAgICBicmVha0J0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuOGVtO1wiKTtcbiAgICAgICAgYnJlYWtCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5icmVha0NoYWluKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckZpbHRlckJhcihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpbHRlckRpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1maWx0ZXItYmFyXCIgfSk7XG4gICAgICAgIGZpbHRlckRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICMwMDg4ZmY7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5lcmd5IGZpbHRlclxuICAgICAgICBjb25zdCBlbmVyZ3lEaXYgPSBmaWx0ZXJEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGVuZXJneURpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGVuZXJneURpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkVuZXJneTogXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBlbmVyZ3lPcHRpb25zID0gW1wiYW55XCIsIFwiaGlnaFwiLCBcIm1lZGl1bVwiLCBcImxvd1wiXTtcbiAgICAgICAgZW5lcmd5T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBlbmVyZ3lEaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVFbmVyZ3kgPT09IG9wdCA/IFwiYmFja2dyb3VuZDogIzAwODhmZjsgY29sb3I6IHdoaXRlO1wiIDogXCJiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjIpO1wifWApO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnNldEZpbHRlclN0YXRlKG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlQ29udGV4dCwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgY29uc3QgY29udGV4dERpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29udGV4dERpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGNvbnRleHREaXYuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJDb250ZXh0OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRleHRPcHRpb25zID0gW1wiYW55XCIsIFwiaG9tZVwiLCBcIm9mZmljZVwiLCBcImFueXdoZXJlXCJdO1xuICAgICAgICBjb250ZXh0T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBjb250ZXh0RGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogb3B0LnRvVXBwZXJDYXNlKCkgfSk7XG4gICAgICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogMCAzcHg7IHBhZGRpbmc6IDRweCA4cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBcbiAgICAgICAgICAgICAgICAke2ZpbHRlcnMuYWN0aXZlQ29udGV4dCA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoZmlsdGVycy5hY3RpdmVFbmVyZ3ksIG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlVGFncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGJ1dHRvblxuICAgICAgICBjb25zdCBjbGVhckJ0biA9IGZpbHRlckRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ0xFQVIgRklMVEVSU1wiIH0pO1xuICAgICAgICBjbGVhckJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA2cHg7IG1hcmdpbi10b3A6IDhweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIGNsZWFyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY2xlYXJGaWx0ZXJzKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckFuYWx5dGljcyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYW5hbHl0aWNzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFuYWx5dGljc1wiIH0pO1xuICAgICAgICBhbmFseXRpY3NEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjZmZjMTA3OyBwYWRkaW5nOiAxMnB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMDUpOyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBTkFMWVRJQ1MgJiBQUk9HUkVTU1wiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0cyBncmlkXG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBzdGF0c0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXRzX2l0ZW1zID0gW1xuICAgICAgICAgICAgeyBsYWJlbDogXCJMZXZlbFwiLCB2YWx1ZTogc3RhdHMubGV2ZWwgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiQ3VycmVudCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmN1cnJlbnRTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiTG9uZ2VzdCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmxvbmdlc3RTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiVG90YWwgUXVlc3RzXCIsIHZhbHVlOiBzdGF0cy50b3RhbFF1ZXN0cyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBzdGF0c19pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhdEJveCA9IHN0YXRzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgc3RhdEJveC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMTkzLCA3LCAwLjEpO1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogaXRlbS5sYWJlbCB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43O1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW0udmFsdWUpIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMCAwIDA7IGZvbnQtc2l6ZTogMS4yZW07IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gW05FV10gQWNoaWV2ZW1lbnRzIFNlY3Rpb25cbiAgICAgICAgYW5hbHl0aWNzRGl2LmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIkFjaGlldmVtZW50c1wiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAxMnB4IDAgOHB4IDA7IGNvbG9yOiAjZmZjMTA3O1wiKTtcbiAgICAgICAgY29uc3QgYWNoTGlzdCA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hY2hpZXZlbWVudC1saXN0XCIgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBhY2hpZXZlbWVudHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY2hpZXZlbWVudHMgfHwgW107XG4gICAgICAgIGlmIChhY2hpZXZlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBGb3JjZSBpbml0IGlmIGVtcHR5XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuYW5hbHl0aWNzRW5naW5lLmluaXRpYWxpemVBY2hpZXZlbWVudHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFjaGlldmVtZW50cy5mb3JFYWNoKGFjaCA9PiB7XG4gICAgICAgICAgICBjb25zdCBiYWRnZSA9IGFjaExpc3QuY3JlYXRlU3Bhbih7IGNsczogYHNpc3ktYWNoaWV2ZW1lbnQgc2lzeS1hY2hpZXZlbWVudC0ke2FjaC5yYXJpdHl9YCB9KTtcbiAgICAgICAgICAgIGlmICghYWNoLnVubG9ja2VkKSBiYWRnZS5hZGRDbGFzcyhcInNpc3ktYWNoaWV2ZW1lbnQtbG9ja2VkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBiYWRnZS5zZXRUZXh0KGFjaC51bmxvY2tlZCA/IGFjaC5uYW1lIDogXCI/Pz9cIik7XG4gICAgICAgICAgICBiYWRnZS5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBhY2gudW5sb2NrZWQgPyBhY2guZGVzY3JpcHRpb24gOiBcIkxvY2tlZCBBY2hpZXZlbWVudFwiKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQm9zcyBwcm9ncmVzc1xuICAgICAgICBhbmFseXRpY3NEaXYuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiQm9zcyBNaWxlc3RvbmVzXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDEycHggMCA4cHggMDsgY29sb3I6ICNmZmMxMDc7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9zc2VzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYm9zc01pbGVzdG9uZXM7XG4gICAgICAgIGlmIChib3NzZXMgJiYgYm9zc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGJvc3Nlcy5mb3JFYWNoKChib3NzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3NzSXRlbSA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBib3NzSXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNnB4IDA7IHBhZGRpbmc6IDhweDsgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjIpOyBib3JkZXItcmFkaXVzOiAzcHg7XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGljb24gPSBib3NzLmRlZmVhdGVkID8gXCJPS1wiIDogYm9zcy51bmxvY2tlZCA/IFwiPj5cIiA6IFwiTE9DS1wiO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBib3NzSXRlbS5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgWyR7aWNvbn1dIExldmVsICR7Ym9zcy5sZXZlbH06ICR7Ym9zcy5uYW1lfWAgfSk7XG4gICAgICAgICAgICAgICAgbmFtZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBib3NzLmRlZmVhdGVkID8gXCJjb2xvcjogIzRjYWY1MDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIgOiBib3NzLnVubG9ja2VkID8gXCJjb2xvcjogI2ZmYzEwNztcIiA6IFwib3BhY2l0eTogMC41O1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBXaW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChzdGF0cy5nYW1lV29uKSB7XG4gICAgICAgICAgICBjb25zdCB3aW5EaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3aW5EaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMnB4OyBwYWRkaW5nOiAxMnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjIpOyBib3JkZXI6IDJweCBzb2xpZCAjNGNhZjUwOyBib3JkZXItcmFkaXVzOiA0cHg7IHRleHQtYWxpZ246IGNlbnRlcjtcIik7XG4gICAgICAgICAgICB3aW5EaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJHQU1FIFdPTiFcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXQocDogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbDogc3RyaW5nLCBjbHM6IHN0cmluZyA9IFwiXCIpIHtcbiAgICAgICAgY29uc3QgYiA9IHAuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc3RhdC1ib3hcIiB9KTsgXG4gICAgICAgIGlmIChjbHMpIGIuYWRkQ2xhc3MoY2xzKTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNpc3ktc3RhdC1sYWJlbFwiIH0pO1xuICAgICAgICBiLmNyZWF0ZURpdih7IHRleHQ6IHZhbCwgY2xzOiBcInNpc3ktc3RhdC12YWxcIiB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub2ZmKCd1cGRhdGUnLCB0aGlzLnJlZnJlc2guYmluZCh0aGlzKSk7XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgTm90aWNlLCBQbHVnaW4sIFRGaWxlLCBXb3Jrc3BhY2VMZWFmLCBkZWJvdW5jZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNpc3lwaHVzRW5naW5lLCBERUZBVUxUX01PRElGSUVSIH0gZnJvbSAnLi9lbmdpbmUnO1xuaW1wb3J0IHsgQXVkaW9Db250cm9sbGVyIH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQgeyBQYW5vcHRpY29uVmlldywgVklFV19UWVBFX1BBTk9QVElDT04gfSBmcm9tIFwiLi91aS92aWV3XCI7XG5pbXBvcnQgeyBSZXNlYXJjaFF1ZXN0TW9kYWwsIENoYWluQnVpbGRlck1vZGFsLCBSZXNlYXJjaExpc3RNb2RhbCwgUXVpY2tDYXB0dXJlTW9kYWwsIFF1ZXN0VGVtcGxhdGVNb2RhbCB9IGZyb20gXCIuL3VpL21vZGFsc1wiO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTaXN5cGh1c1NldHRpbmdzID0ge1xuICAgIGhwOiAxMDAsIG1heEhwOiAxMDAsIHhwOiAwLCBnb2xkOiAwLCB4cFJlcTogMTAwLCBsZXZlbDogMSwgcml2YWxEbWc6IDEwLFxuICAgIGxhc3RMb2dpbjogXCJcIiwgc2hpZWxkZWRVbnRpbDogXCJcIiwgcmVzdERheVVudGlsOiBcIlwiLCBza2lsbHM6IFtdLFxuICAgIGRhaWx5TW9kaWZpZXI6IERFRkFVTFRfTU9ESUZJRVIsIFxuICAgIGxlZ2FjeTogeyBzb3VsczogMCwgcGVya3M6IHsgc3RhcnRHb2xkOiAwLCBzdGFydFNraWxsUG9pbnRzOiAwLCByaXZhbERlbGF5OiAwIH0sIHJlbGljczogW10sIGRlYXRoQ291bnQ6IDAgfSwgXG4gICAgbXV0ZWQ6IGZhbHNlLCBoaXN0b3J5OiBbXSwgcnVuQ291bnQ6IDEsIGxvY2tkb3duVW50aWw6IFwiXCIsIGRhbWFnZVRha2VuVG9kYXk6IDAsXG4gICAgZGFpbHlNaXNzaW9uczogW10sIFxuICAgIGRhaWx5TWlzc2lvbkRhdGU6IFwiXCIsIFxuICAgIHF1ZXN0c0NvbXBsZXRlZFRvZGF5OiAwLCBcbiAgICBza2lsbFVzZXNUb2RheToge30sXG4gICAgcmVzZWFyY2hRdWVzdHM6IFtdLFxuICAgIHJlc2VhcmNoU3RhdHM6IHsgdG90YWxSZXNlYXJjaDogMCwgdG90YWxDb21iYXQ6IDAsIHJlc2VhcmNoQ29tcGxldGVkOiAwLCBjb21iYXRDb21wbGV0ZWQ6IDAgfSxcbiAgICBsYXN0UmVzZWFyY2hRdWVzdElkOiAwLFxuICAgIG1lZGl0YXRpb25DeWNsZXNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3REZWxldGlvbnNUb2RheTogMCxcbiAgICBsYXN0RGVsZXRpb25SZXNldDogXCJcIixcbiAgICBpc01lZGl0YXRpbmc6IGZhbHNlLFxuICAgIG1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd246IDAsXG4gICAgYWN0aXZlQ2hhaW5zOiBbXSxcbiAgICBjaGFpbkhpc3Rvcnk6IFtdLFxuICAgIGN1cnJlbnRDaGFpbklkOiBcIlwiLFxuICAgIGNoYWluUXVlc3RzQ29tcGxldGVkOiAwLFxuICAgIHF1ZXN0RmlsdGVyczoge30sXG4gICAgZmlsdGVyU3RhdGU6IHsgYWN0aXZlRW5lcmd5OiBcImFueVwiLCBhY3RpdmVDb250ZXh0OiBcImFueVwiLCBhY3RpdmVUYWdzOiBbXSB9LFxuICAgIGRheU1ldHJpY3M6IFtdLFxuICAgIHdlZWtseVJlcG9ydHM6IFtdLFxuICAgIGJvc3NNaWxlc3RvbmVzOiBbXSxcbiAgICBzdHJlYWs6IHsgY3VycmVudDogMCwgbG9uZ2VzdDogMCwgbGFzdERhdGU6IFwiXCIgfSxcbiAgICBhY2hpZXZlbWVudHM6IFtdLFxuICAgIGdhbWVXb246IGZhbHNlXG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNpc3lwaHVzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcbiAgICBzdGF0dXNCYXJJdGVtOiBIVE1MRWxlbWVudDtcbiAgICBlbmdpbmU6IFNpc3lwaHVzRW5naW5lO1xuICAgIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXI7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdxdWVzdC10ZW1wbGF0ZXMnLFxuICAgICAgICAgICAgbmFtZTogJ0RlcGxveSBRdWVzdCBmcm9tIFRlbXBsYXRlJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiBuZXcgUXVlc3RUZW1wbGF0ZU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZGVwbG95LXF1ZXN0LWhvdGtleScsXG4gICAgICAgICAgICBuYW1lOiAnRGVwbG95IFF1ZXN0JyxcbiAgICAgICAgICAgIGhvdGtleXM6IFt7IG1vZGlmaWVyczogW1wiTW9kXCJdLCBrZXk6IFwiZFwiIH1dLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSAvLyBBc3N1bWluZyBkZWZhdWx0IGlzIFJlc2VhcmNoIG9yIFF1ZXN0IE1vZGFsP1xuICAgICAgICAgICAgLy8gQWN0dWFsbHksIHdlIHNob3VsZCBtYXAgdGhpcyB0byBRdWVzdE1vZGFsLCBidXQgeW91IGRpZG4ndCBleHBvcnQgUXVlc3RNb2RhbCBpbiBtb2RhbHMudHMgcHJvcGVybHkgaW4gdGhlIHNuaXBwZXQuIFxuICAgICAgICAgICAgLy8gQXNzdW1pbmcgUXVlc3RNb2RhbCBpcyBhdmFpbGFibGUgb3Igd2UgdXNlIFJlc2VhcmNoUXVlc3RNb2RhbC4gXG4gICAgICAgICAgICAvLyBSZXZlcnRpbmcgdG8gUmVzZWFyY2hRdWVzdE1vZGFsIGFzIHBlciB5b3VyIGltcG9ydCBsaXN0LCBcbiAgICAgICAgICAgIC8vIE9SIGlmIHlvdSBoYXZlIFF1ZXN0TW9kYWwgaW1wb3J0ZWQsIHVzZSB0aGF0LlxuICAgICAgICAgICAgLy8gTGV0J3MgYXNzdW1lIHlvdSB3YW50IHRoZSBzdGFuZGFyZCBRdWVzdCBjcmVhdGlvbjpcbiAgICAgICAgICAgIC8vIGNhbGxiYWNrOiAoKSA9PiBuZXcgUXVlc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3VuZG8tcXVlc3QtZGVsZXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdVbmRvIExhc3QgUXVlc3QgRGVsZXRpb24nLFxuICAgICAgICAgICAgaG90a2V5czogW3sgbW9kaWZpZXJzOiBbXCJNb2RcIiwgXCJTaGlmdFwiXSwga2V5OiBcInpcIiB9XSxcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS51bmRvTGFzdERlbGV0aW9uKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIGlkOiAnZXhwb3J0LXN0YXRzJyxcbiAgICAgICAgICAgIG5hbWU6ICdBbmFseXRpY3M6IEV4cG9ydCBTdGF0cyBKU09OJyxcbiAgICAgICAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSB0aGlzLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYFNpc3lwaHVzX1N0YXRzXyR7RGF0ZS5ub3coKX0uanNvbmA7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKHBhdGgsIEpTT04uc3RyaW5naWZ5KHN0YXRzLCBudWxsLCAyKSk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgU3RhdHMgZXhwb3J0ZWQgdG8gJHtwYXRofWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxuICAgICAgICAgICAgaWQ6ICdhY2NlcHQtZGVhdGgnLCBcbiAgICAgICAgICAgIG5hbWU6ICdBQ0NFUFQgREVBVEggKFJlc2V0IFJ1biknLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS50cmlnZ2VyRGVhdGgoKSBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ3Jlcm9sbC1jaGFvcycsIFxuICAgICAgICAgICAgbmFtZTogJ1Jlcm9sbCBDaGFvcycsIFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnJvbGxDaGFvcyh0cnVlKSBcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3F1aWNrLWNhcHR1cmUnLFxuICAgICAgICAgICAgbmFtZTogJ1F1aWNrIENhcHR1cmUgKFNjcmFwKScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFF1aWNrQ2FwdHVyZU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnZW5lcmF0ZS1za2lsbC1ncmFwaCcsXG4gICAgICAgICAgICBuYW1lOiAnTmV1cmFsIEh1YjogR2VuZXJhdGUgU2tpbGwgR3JhcGgnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmdlbmVyYXRlU2tpbGxHcmFwaCgpXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sb2FkU3R5bGVzKCk7XG4gICAgICAgIHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKHRoaXMuc2V0dGluZ3MubXV0ZWQpO1xuICAgICAgICB0aGlzLmVuZ2luZSA9IG5ldyBTaXN5cGh1c0VuZ2luZSh0aGlzLmFwcCwgdGhpcywgdGhpcy5hdWRpbyk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX1BBTk9QVElDT04sIChsZWFmKSA9PiBuZXcgUGFub3B0aWNvblZpZXcobGVhZiwgdGhpcykpO1xuXG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xuICAgICAgICAod2luZG93IGFzIGFueSkuc2lzeXBodXNFbmdpbmUgPSB0aGlzLmVuZ2luZTtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLmNoZWNrRGFpbHlMb2dpbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xuXG4gICAgICAgIC8vIC0tLSBDT01NQU5EUyAtLS1cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLXBhbm9wdGljb24nLCBuYW1lOiAnT3BlbiBQYW5vcHRpY29uJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndG9nZ2xlLWZvY3VzJywgbmFtZTogJ1RvZ2dsZSBGb2N1cyBBdWRpbycsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IENyZWF0ZSBRdWVzdCcsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1yZXNlYXJjaCcsIG5hbWU6ICdSZXNlYXJjaDogVmlldyBMaWJyYXJ5JywgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaExpc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ21lZGl0YXRlJywgbmFtZTogJ01lZGl0YXRpb246IFN0YXJ0JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NyZWF0ZS1jaGFpbicsIG5hbWU6ICdDaGFpbnM6IENyZWF0ZScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgQ2hhaW5CdWlsZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICd2aWV3LWNoYWlucycsIG5hbWU6ICdDaGFpbnM6IFZpZXcgQWN0aXZlJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgYyA9IHRoaXMuZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IG5ldyBOb3RpY2UoYyA/IGBBY3RpdmU6ICR7Yy5uYW1lfWAgOiBcIk5vIGFjdGl2ZSBjaGFpblwiKTsgfSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdmaWx0ZXItaGlnaCcsIG5hbWU6ICdGaWx0ZXJzOiBIaWdoIEVuZXJneScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImhpZ2hcIiwgXCJhbnlcIiwgW10pIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NsZWFyLWZpbHRlcnMnLCBuYW1lOiAnRmlsdGVyczogQ2xlYXInLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2xlYXJGaWx0ZXJzKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZ2FtZS1zdGF0cycsIG5hbWU6ICdBbmFseXRpY3M6IFN0YXRzJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgcyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpOyBuZXcgTm90aWNlKGBMdmwgJHtzLmxldmVsfSB8IFN0cmVhayAke3MuY3VycmVudFN0cmVha31gKTsgfSB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkUmliYm9uSWNvbignc2t1bGwnLCAnU2lzeXBodXMgU2lkZWJhcicsICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgICAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHRoaXMuZW5naW5lLmNoZWNrRGVhZGxpbmVzKCksIDYwMDAwKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYXSBEZWJvdW5jZWQgV29yZCBDb3VudGVyIChUeXBld3JpdGVyIEZpeClcbiAgICAgICAgY29uc3QgZGVib3VuY2VkVXBkYXRlID0gZGVib3VuY2UoKGZpbGU6IFRGaWxlLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgICAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRzID0gY29udGVudC50cmltKCkuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoY2FjaGUuZnJvbnRtYXR0ZXIucmVzZWFyY2hfaWQsIHdvcmRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMCwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignZWRpdG9yLWNoYW5nZScsIChlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgICAgIGlmICghaW5mbyB8fCAhaW5mby5maWxlKSByZXR1cm47XG4gICAgICAgICAgICBkZWJvdW5jZWRVcGRhdGUoaW5mby5maWxlLCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3NzRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm1hbmlmZXN0LmRpciArIFwiL3N0eWxlcy5jc3NcIik7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIGVsc2UgeyBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7IGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTsgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGNvbnN0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBjb25zdCBtQ291bnQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtLnNldFRleHQoYCR7dGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmljb259ICR7c2hpZWxkfSBIUCR7dGhpcy5zZXR0aW5ncy5ocH0gRyR7dGhpcy5zZXR0aW5ncy5nb2xkfSBNJHttQ291bnR9LzNgKTtcbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gdGhpcy5zZXR0aW5ncy5ocCA8IDMwID8gXCJyZWRcIiA6IHRoaXMuc2V0dGluZ3MuZ29sZCA8IDAgPyBcIm9yYW5nZVwiIDogXCJcIjtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkgeyB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTsgfVxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHsgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTsgfVxufVxuIl0sIm5hbWVzIjpbIk5vdGljZSIsIk1vZGFsIiwibW9tZW50IiwiU2V0dGluZyIsIlRGb2xkZXIiLCJURmlsZSIsIkl0ZW1WaWV3IiwiUGx1Z2luIiwiZGVib3VuY2UiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDdEcsUUFBUSxTQUFTLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDdEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUUsS0FBSyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBNk1EO0FBQ3VCLE9BQU8sZUFBZSxLQUFLLFVBQVUsR0FBRyxlQUFlLEdBQUcsVUFBVSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRTtBQUN2SCxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLElBQUksT0FBTyxDQUFDLENBQUMsSUFBSSxHQUFHLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxVQUFVLEdBQUcsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUNyRjs7QUN6VUE7TUFDYSxXQUFXLENBQUE7QUFBeEIsSUFBQSxXQUFBLEdBQUE7UUFDWSxJQUFTLENBQUEsU0FBQSxHQUFrQyxFQUFFLENBQUM7S0FjekQ7SUFaRyxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQVksRUFBQTtRQUMxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ2xFO0lBRUQsR0FBRyxDQUFDLEtBQWEsRUFBRSxFQUFZLEVBQUE7QUFDM0IsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztLQUN2RTtJQUVELE9BQU8sQ0FBQyxLQUFhLEVBQUUsSUFBVSxFQUFBO1FBQzdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUN6RDtBQUNKLENBQUE7TUFFWSxlQUFlLENBQUE7QUFLeEIsSUFBQSxXQUFBLENBQVksS0FBYyxFQUFBO1FBSjFCLElBQVEsQ0FBQSxRQUFBLEdBQXdCLElBQUksQ0FBQztRQUNyQyxJQUFjLENBQUEsY0FBQSxHQUErQixJQUFJLENBQUM7UUFDbEQsSUFBSyxDQUFBLEtBQUEsR0FBWSxLQUFLLENBQUM7QUFFTyxRQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0tBQUU7SUFFbkQsUUFBUSxDQUFDLEtBQWMsRUFBQSxFQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEVBQUU7QUFFaEQsSUFBQSxTQUFTLEdBQUssRUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7QUFBRSxRQUFBLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxNQUFNLENBQUMsWUFBWSxJQUFLLE1BQWMsQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLEVBQUU7SUFFdEgsUUFBUSxDQUFDLElBQVksRUFBRSxJQUFvQixFQUFFLFFBQWdCLEVBQUUsTUFBYyxHQUFHLEVBQUE7UUFDNUUsSUFBSSxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU87UUFDdkIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ3pDLFFBQUEsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDaEIsUUFBQSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDM0IsUUFBQSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDWixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzFELFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLENBQUM7UUFDdkYsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQztLQUNuRDtBQUVELElBQUEsU0FBUyxDQUFDLElBQTZELEVBQUE7QUFDbkUsUUFBQSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFBQyxZQUFBLFVBQVUsQ0FBQyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUFFO0FBQy9HLGFBQUEsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQUMsWUFBQSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FBRTtBQUN6SCxhQUFBLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUFFO0FBQzNELGFBQUEsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFO1lBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQUU7QUFDM0QsYUFBQSxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQUMsWUFBQSxVQUFVLENBQUMsTUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQUU7QUFDNUgsYUFBQSxJQUFJLElBQUksS0FBSyxVQUFVLEVBQUU7WUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQUU7S0FDM0U7SUFFRCxnQkFBZ0IsR0FBQTtRQUNaLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNqQixRQUFBLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtBQUNyQixZQUFBLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDakMsWUFBQSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztBQUMzQixZQUFBLElBQUlBLGVBQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDSCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDeEIsWUFBQSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxRQUFTLENBQUMscUJBQXFCLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3RSxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFDaEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLEtBQUk7Z0JBQ3ZDLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hELGdCQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUU7b0JBQ2pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLG9CQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDO0FBQzlDLG9CQUFBLE9BQU8sR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsb0JBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztpQkFDcEI7QUFDTCxhQUFDLENBQUM7WUFDRixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELFlBQUEsSUFBSUEsZUFBTSxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDL0M7S0FDSjtBQUNKOztBQzFFSyxNQUFPLFVBQVcsU0FBUUMsY0FBSyxDQUFBO0FBRWpDLElBQUEsV0FBQSxDQUFZLEdBQVEsRUFBRSxDQUFXLEVBQUksRUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ25FLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUN6QixRQUFBLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDbEQsUUFBQSxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQzFELFFBQUEsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzNELFFBQUEsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUM5RCxRQUFBLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUMxRCxRQUFBLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDOUMsUUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUM7QUFDdEQsUUFBQSxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzVDLFFBQUEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBQyxJQUFJLEVBQUMsYUFBYSxFQUFDLENBQUMsQ0FBQztBQUNyRCxRQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEIsUUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBQyxPQUFPLENBQUM7QUFDeEIsUUFBQSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBQyxXQUFXLENBQUM7UUFDM0IsQ0FBQyxDQUFDLE9BQU8sR0FBQyxNQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUM5QjtJQUNELE9BQU8sR0FBQSxFQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRTtBQUN4QyxDQUFBO0FBRUssTUFBTyxTQUFVLFNBQVFBLGNBQUssQ0FBQTtBQUVoQyxJQUFBLFdBQUEsQ0FBWSxHQUFRLEVBQUUsTUFBc0IsRUFBSSxFQUFBLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEVBQUU7SUFDbkYsTUFBTSxHQUFBO0FBQ0YsUUFBQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQztBQUN0RCxRQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUEsVUFBQSxFQUFhLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRSxDQUFBLEVBQUUsQ0FBQyxDQUFDO0FBRTVFLFFBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxFQUFFLEVBQUUsTUFBVyxTQUFBLENBQUEsSUFBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLEtBQUEsQ0FBQSxFQUFBLGFBQUE7QUFDN0QsWUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ2hHLENBQUEsQ0FBQyxDQUFDO0FBQ0gsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtZQUNoRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ2xGLENBQUEsQ0FBQyxDQUFDO0FBQ0gsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO0FBQ2pFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxHQUFHQyxlQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1NBQ2hGLENBQUEsQ0FBQyxDQUFDO0FBQ0gsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRSxNQUFXLFNBQUEsQ0FBQSxJQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsS0FBQSxDQUFBLEVBQUEsYUFBQTtBQUNoRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksR0FBR0EsZUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUMvRSxDQUFBLENBQUMsQ0FBQztLQUNOO0lBQ0QsSUFBSSxDQUFDLEVBQWUsRUFBRSxJQUFZLEVBQUUsSUFBWSxFQUFFLElBQVksRUFBRSxNQUEyQixFQUFBO0FBQ3ZGLFFBQUEsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCLFFBQUEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsNEZBQTRGLENBQUMsQ0FBQztBQUN0SCxRQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFDbEMsUUFBQSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFHLEVBQUEsSUFBSSxDQUFJLEVBQUEsQ0FBQSxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLEVBQUU7QUFDakMsWUFBQSxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBQyxNQUFNLENBQUMsQ0FBQztBQUFDLFlBQUEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsS0FBSyxDQUFDO1NBQzVEO2FBQU07QUFDSCxZQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDdEIsWUFBQSxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQVcsU0FBQSxDQUFBLElBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxLQUFBLENBQUEsRUFBQSxhQUFBO2dCQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO2dCQUNsQyxNQUFNLE1BQU0sRUFBRSxDQUFDO2dCQUNmLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDaEMsZ0JBQUEsSUFBSUYsZUFBTSxDQUFDLENBQUEsT0FBQSxFQUFVLElBQUksQ0FBQSxDQUFFLENBQUMsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2IsZ0JBQUEsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDL0MsYUFBQyxDQUFBLENBQUE7U0FDSjtLQUNKO0lBQ0QsT0FBTyxHQUFBLEVBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLENBQUE7QUFFSyxNQUFPLFVBQVcsU0FBUUMsY0FBSyxDQUFBO0lBR2pDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBc0IsRUFBQTtRQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUQ3QyxJQUFVLENBQUEsVUFBQSxHQUFXLENBQUMsQ0FBQztRQUFDLElBQUssQ0FBQSxLQUFBLEdBQVcsTUFBTSxDQUFDO1FBQUMsSUFBUSxDQUFBLFFBQUEsR0FBVyxNQUFNLENBQUM7UUFBQyxJQUFRLENBQUEsUUFBQSxHQUFXLEVBQUUsQ0FBQztRQUFDLElBQVUsQ0FBQSxVQUFBLEdBQVksS0FBSyxDQUFDO1FBQUMsSUFBTSxDQUFBLE1BQUEsR0FBWSxLQUFLLENBQUM7QUFDekcsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUFFO0lBQ25GLE1BQU0sR0FBQTtBQUNGLFFBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO0FBRXBELFFBQUEsSUFBSUUsZ0JBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBRztBQUNwRCxZQUFBLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDL0IsWUFBQSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLFNBQUMsQ0FBQyxDQUFDO0FBRUgsUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLFVBQVUsR0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTlPLFFBQUEsTUFBTSxNQUFNLEdBQTJCLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQzFELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2xFLFFBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQztRQUUxQixJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBRztBQUM5RixZQUFBLElBQUcsQ0FBQyxLQUFHLE9BQU8sRUFBQztnQkFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFBQyxnQkFBQSxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQUU7O0FBQU0sZ0JBQUEsSUFBSSxDQUFDLEtBQUssR0FBQyxDQUFDLENBQUM7U0FDMUcsQ0FBQyxDQUFDLENBQUM7QUFFSixRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEksUUFBQSxJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNwSSxRQUFBLElBQUlBLGdCQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxVQUFVLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVwSixJQUFJQSxnQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBSztBQUNsRixZQUFBLElBQUcsSUFBSSxDQUFDLElBQUksRUFBQztBQUNULGdCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxVQUFVLEVBQUMsSUFBSSxDQUFD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Q0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQzs7QUFHdkQsUUFBQSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHekUsUUFBQSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBRzFELFFBQUEsSUFBSSxDQUFDLENBQUMsYUFBYSxDQUFDLGlCQUFpQixJQUFJLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7O0FBR3RFLFFBQUEsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUc7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBR3ZDLFFBQUEsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQzs7QUFHdkUsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtBQUFFLFlBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7QUFHM0MsUUFBQSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUM7QUFBRSxZQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDM0U7QUFFRCxJQUFBLE1BQU0sQ0FBQyxFQUFVLEVBQUE7UUFDYixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FB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
