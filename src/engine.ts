import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { AudioController, TinyEmitter } from './utils';
import { ChaosModal } from './ui/modals';
import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';

// DEFAULT CONSTANTS
export const DEFAULT_MODIFIER: Modifier = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
export const CHAOS_TABLE: Modifier[] = [
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

export class SisyphusEngine extends TinyEmitter {
    app: App;
    plugin: any;
    audio: AudioController;
    
    // Sub-Engines
    analyticsEngine: AnalyticsEngine;
    meditationEngine: MeditationEngine;
    researchEngine: ResearchEngine;
    chainsEngine: ChainsEngine;
    filtersEngine: FiltersEngine;

    constructor(app: App, plugin: any, audio: AudioController) {
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

    get settings(): SisyphusSettings { return this.plugin.settings; }
    set settings(val: SisyphusSettings) { this.plugin.settings = val; }

    async save() { 
        await this.plugin.saveSettings(); 
        // EVENT BUS TRIGGER: Notify UI to update
        this.trigger("update");
    }

    // GAME LOOP
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected: DailyMission[] = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0) break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push({ ...mission, checkFunc: mission.check, progress: 0, completed: false });
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }

    checkDailyMissions(context: { type?: string; difficulty?: number; skill?: string; secondarySkill?: string; highStakes?: boolean; questCreated?: number }) {
        const now = moment();
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed) return;
            switch (mission.checkFunc) {
                case "morning_trivial": if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10) mission.progress++; break;
                case "quest_count": if (context.type === "complete") mission.progress = this.settings.questsCompletedToday; break;
                case "high_stakes": if (context.type === "complete" && context.highStakes) mission.progress++; break;
                case "fast_complete": if (context.type === "complete" && context.questCreated) { if (moment().diff(moment(context.questCreated), 'hours') <= 2) mission.progress++; } break;
                case "synergy": if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None") mission.progress++; break;
                case "no_damage": if (context.type === "damage") mission.progress = 0; break;
                case "hard_quest": if (context.type === "complete" && context.difficulty && context.difficulty >= 4) mission.progress++; break;
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
                new Notice(`✅ Daily Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }

    getDifficultyNumber(diffLabel: string): number {
        if (diffLabel === "Trivial") return 1;
        if (diffLabel === "Easy") return 2;
        if (diffLabel === "Medium") return 3;
        if (diffLabel === "Hard") return 4;
        if (diffLabel === "SUICIDE") return 5;
        return 3;
    }

    async checkDailyLogin() {
        const today = moment().format("YYYY-MM-DD");
        if (this.settings.lastLogin) {
            const daysDiff = moment().diff(moment(this.settings.lastLogin), 'days');
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
            
            const todayMoment = moment();
            this.settings.skills.forEach(s => {
                if (s.lastUsed) {
                    if (todayMoment.diff(moment(s.lastUsed), 'days') > 3 && !this.isResting()) { 
                        s.rust = Math.min(10, (s.rust || 0) + 1);
                        s.xpReq = Math.floor(s.xpReq * 1.1); 
                    }
                }
            });

            this.settings.lastLogin = today;
            this.settings.history.push({ date: today, status: "success", xpEarned: 0 });
            if(this.settings.history.length > 14) this.settings.history.shift();

            if (this.settings.dailyMissionDate !== today) this.rollDailyMissions();
            await this.rollChaos(true);
            await this.save();
        }
    }

    async completeQuest(file: TFile) {
        this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
        this.settings.researchStats.totalCombat++;
        
        if (this.meditationEngine.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }
        
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) return;
        
        const questName = file.basename;
        if (this.chainsEngine.isQuestInChain(questName) && !this.chainsEngine.canStartQuest(questName)) {
            new Notice("Quest locked in chain. Complete the active quest first.");
            return;
        }

        if (this.chainsEngine.isQuestInChain(questName)) {
             const chainResult = await this.chainsEngine.completeChainQuest(questName);
             if (chainResult.success && chainResult.message) new Notice(chainResult.message);
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
                new Notice(`✨ ${skill.name}: Rust Cleared!`);
            }
            skill.lastUsed = new Date().toISOString();
            skill.xp += 1;
            if (skill.xp >= skill.xpReq) { skill.level++; skill.xp = 0; new Notice(`🧠 ${skill.name} Up!`); }
            
            if (secondary && secondary !== "None") {
                const secSkill = this.settings.skills.find(s => s.name === secondary);
                if (secSkill) {
                    if(!skill.connections) skill.connections = [];
                    if(!skill.connections.includes(secondary)) { skill.connections.push(secondary); new Notice(`🔗 Neural Link Established`); }
                    xp += Math.floor(secSkill.level * 0.5); secSkill.xp += 0.5; 
                }
            }
        }

        if (this.settings.dailyModifier.name === "Adrenaline") this.settings.hp -= 5;
        this.settings.xp += xp; this.settings.gold += gold;

        if (this.settings.xp >= this.settings.xpReq) {
            this.settings.level++; 
            this.settings.rivalDmg += 5; 
            this.settings.xp = 0;
            this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1); 
            this.settings.maxHp = 100 + (this.settings.level * 5); 
            this.settings.hp = this.settings.maxHp;
            this.taunt("level_up");
            
            const bossMsgs = this.analyticsEngine.checkBossMilestones();
            bossMsgs.forEach(msg => new Notice(msg));
        }

        this.settings.questsCompletedToday++;
        const questCreated = fm.created ? new Date(fm.created).getTime() : Date.now();
        const difficulty = this.getDifficultyNumber(fm.difficulty);
        this.checkDailyMissions({ type: "complete", difficulty, skill: skillName, secondarySkill: secondary, highStakes: fm.high_stakes, questCreated });

        const archivePath = "Active_Run/Archive";
        if (!this.app.vault.getAbstractFileByPath(archivePath)) await this.app.vault.createFolder(archivePath);
        await this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
        await this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
        await this.save();
    }

    async failQuest(file: TFile, manualAbort: boolean = false) {
        if (this.isResting() && !manualAbort) { new Notice("😴 Rest Day active. No damage."); return; }

        if (this.isShielded() && !manualAbort) {
            new Notice(`🛡️ SHIELDED!`);
        } else {
            let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
            if (this.settings.gold < -100) damage *= 2;
            
            this.settings.hp -= damage;
            this.settings.damageTakenToday += damage;
            if (!manualAbort) this.settings.rivalDmg += 1; 
            
            this.audio.playSound("fail");
            this.taunt("fail");
            this.checkDailyMissions({ type: "damage" });
            
            if (this.settings.damageTakenToday > 50) {
                this.meditationEngine.triggerLockdown();
                this.taunt("lockdown");
                this.audio.playSound("death");
                this.trigger("lockdown"); // EVENT TRIGGER
            }
            if (this.settings.hp <= 30) { this.audio.playSound("heartbeat"); this.taunt("low_hp"); }
        }
        const gravePath = "Graveyard/Failures";
        if (!this.app.vault.getAbstractFileByPath(gravePath)) await this.app.vault.createFolder(gravePath);
        await this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
        await this.save();
        if (this.settings.hp <= 0) this.triggerDeath();
    }
    
    async createQuest(name: string, diff: number, skill: string, secSkill: string, deadlineIso: string, highStakes: boolean, priority: string, isBoss: boolean) {
        if (this.meditationEngine.isLockedDown()) { new Notice("⛔ LOCKDOWN ACTIVE"); return; }
        if (this.isResting() && highStakes) { new Notice("Cannot deploy High Stakes on Rest Day."); return; } 

        let xpReward = 0; let goldReward = 0; let diffLabel = "";
        if (isBoss) { xpReward = 1000; goldReward = 1000; diffLabel = "☠️ BOSS"; } 
        else {
            switch(diff) {
                case 1: xpReward = Math.floor(this.settings.xpReq * 0.05); goldReward = 10; diffLabel = "Trivial"; break;
                case 2: xpReward = Math.floor(this.settings.xpReq * 0.10); goldReward = 20; diffLabel = "Easy"; break;
                case 3: xpReward = Math.floor(this.settings.xpReq * 0.20); goldReward = 40; diffLabel = "Medium"; break;
                case 4: xpReward = Math.floor(this.settings.xpReq * 0.40); goldReward = 80; diffLabel = "Hard"; break;
                case 5: xpReward = Math.floor(this.settings.xpReq * 0.60); goldReward = 150; diffLabel = "SUICIDE"; break;
            }
        }
        if (highStakes && !isBoss) { goldReward = Math.floor(goldReward * 1.5); }
        let deadlineStr = "None"; let deadlineFrontmatter = "";
        if (deadlineIso) { deadlineStr = moment(deadlineIso).format("YYYY-MM-DD HH:mm"); deadlineFrontmatter = `deadline: ${deadlineIso}`; }

        const rootPath = "Active_Run"; const questsPath = "Active_Run/Quests";
        if (!this.app.vault.getAbstractFileByPath(rootPath)) await this.app.vault.createFolder(rootPath);
        if (!this.app.vault.getAbstractFileByPath(questsPath)) await this.app.vault.createFolder(questsPath);
        
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
        if (this.app.vault.getAbstractFileByPath(filename)) { new Notice("Exists!"); return; }
        await this.app.vault.create(filename, content);
        this.audio.playSound("click"); 
        this.save(); // Will trigger update
    }
    
    async deleteQuest(file: TFile) { await this.app.vault.delete(file); new Notice("Deployment Aborted (Deleted)"); this.save(); }

    async checkDeadlines() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (!(folder instanceof TFolder)) return;
        for (const file of folder.children) {
            if (file instanceof TFile) {
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (fm?.deadline && moment().isAfter(moment(fm.deadline))) await this.failQuest(file);
            }
        }
        this.save();
    }

    async triggerDeath() {
        this.audio.playSound("death");
        const earnedSouls = Math.floor(this.settings.level * 10 + this.settings.gold / 10);
        this.settings.legacy.souls += earnedSouls;
        this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
        new Notice(`💀 RUN ENDED.`);
        this.settings.hp = 100; this.settings.maxHp = 100; this.settings.xp = 0; this.settings.gold = 0;
        this.settings.xpReq = 100; this.settings.level = 1; this.settings.rivalDmg = 10;
        this.settings.skills = []; this.settings.history = []; this.settings.damageTakenToday = 0;
        this.settings.lockdownUntil = ""; this.settings.shieldedUntil = ""; this.settings.restDayUntil = "";
        this.settings.dailyMissions = []; this.settings.dailyMissionDate = "";
        this.settings.questsCompletedToday = 0; this.settings.skillUsesToday = {};
        const baseStartGold = this.settings.legacy.perks.startGold || 0;
        const scarPenalty = Math.pow(0.9, this.settings.legacy.deathCount);
        this.settings.gold = Math.floor(baseStartGold * scarPenalty);
        this.settings.runCount++;
        await this.save();
    }

    async rollChaos(showModal: boolean = false) {
        const roll = Math.random();
        if (roll < 0.4) this.settings.dailyModifier = DEFAULT_MODIFIER;
        else {
            const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
            this.settings.dailyModifier = CHAOS_TABLE[idx];
            if (this.settings.dailyModifier.name === "Rival Sabotage" && this.settings.gold > 10) this.settings.gold = Math.floor(this.settings.gold * 0.9);
        }
        await this.save();
        if (showModal) new ChaosModal(this.app, this.settings.dailyModifier).open();
    }

    async attemptRecovery() {
        if (!this.meditationEngine.isLockedDown()) { new Notice("Not in Lockdown."); return; }
        const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
        new Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
        this.save();
    }

    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && moment().isBefore(moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && moment().isBefore(moment(this.settings.shieldedUntil)); }

    taunt(trigger: "fail"|"shield"|"low_hp"|"level_up"|"lockdown") {
        if (Math.random() < 0.2) return; 
        const insults = {
            "fail": ["Focus.", "Again.", "Stay sharp."],
            "shield": ["Smart move.", "Bought some time."],
            "low_hp": ["Critical condition.", "Survive."],
            "level_up": ["Stronger.", "Scaling up."],
            "lockdown": ["Overheated. Cooling down.", "Forced rest."]
        };
        const msg = insults[trigger][Math.floor(Math.random() * insults[trigger].length)];
        new Notice(`SYSTEM: "${msg}"`, 6000);
    }
    
    parseQuickInput(text: string) {
        if (this.meditationEngine.isLockedDown()) { new Notice("⛔ LOCKDOWN ACTIVE"); return; }
        let diff = 3; let cleanText = text;
        if (text.match(/\/1/)) { diff = 1; cleanText = text.replace(/\/1/, "").trim(); }
        else if (text.match(/\/2/)) { diff = 2; cleanText = text.replace(/\/2/, "").trim(); }
        else if (text.match(/\/3/)) { diff = 3; cleanText = text.replace(/\/3/, "").trim(); }
        else if (text.match(/\/4/)) { diff = 4; cleanText = text.replace(/\/4/, "").trim(); }
        else if (text.match(/\/5/)) { diff = 5; cleanText = text.replace(/\/5/, "").trim(); }
        const deadline = moment().add(24, 'hours').toISOString();
        this.createQuest(cleanText, diff, "None", "None", deadline, false, "Normal", false);
    }

    // DELEGATED METHODS
    async createResearchQuest(title: string, type: "survey" | "deep_dive", linkedSkill: string, linkedCombatQuest: string) {
        const result = await this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
        if (!result.success) { new Notice(result.message); return; }
        new Notice(result.message);
        await this.save();
    }

    async completeResearchQuest(questId: string, finalWordCount: number) {
        const result = this.researchEngine.completeResearchQuest(questId, finalWordCount);
        if (!result.success) { new Notice(result.message); return; }
        new Notice(result.message);
        await this.save();
    }

    deleteResearchQuest(questId: string) {
        const result = this.researchEngine.deleteResearchQuest(questId);
        new Notice(result.message);
        this.save();
    }

    updateResearchWordCount(questId: string, newWordCount: number) { this.researchEngine.updateResearchWordCount(questId, newWordCount); this.save(); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }

    async startMeditation() {
        const result = this.meditationEngine.meditate();
        if (!result.success && result.message) { new Notice(result.message); return; }
        new Notice(result.message);
        await this.save();
    }
    
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    canDeleteQuest() { return this.meditationEngine.canDeleteQuestFree(); }
    async deleteQuestWithCost(file: TFile) {
        const result = this.meditationEngine.applyDeletionCost();
        new Notice(result.message);
        await this.app.vault.delete(file);
        await this.save();
    }

    async createQuestChain(name: string, questNames: string[]) {
        const result = await this.chainsEngine.createQuestChain(name, questNames);
        if (result.success) { new Notice(result.message); await this.save(); return true; }
        else { new Notice(result.message); return false; }
    }
    
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    async breakChain() {
        const result = await this.chainsEngine.breakChain();
        new Notice(result.message);
        await this.save();
    }

    setQuestFilter(questFile: TFile, energy: any, context: any, tags: string[]) {
        this.filtersEngine.setQuestFilter(questFile.basename, energy, context, tags);
        new Notice(`Quest tagged: ${energy} energy, ${context} context`);
        this.save();
    }
    setFilterState(energy: any, context: any, tags: string[]) {
        this.filtersEngine.setFilterState(energy, context, tags);
        new Notice(`Filters set: ${energy} energy, ${context} context`);
        this.save();
    }
    clearFilters() { this.filtersEngine.clearFilters(); new Notice("All filters cleared"); this.save(); }
    getFilteredQuests(quests: any[]) { return this.filtersEngine.filterQuests(quests); }

    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { 
        const msgs = this.analyticsEngine.checkBossMilestones();
        msgs.forEach(m => new Notice(m));
        this.save();
    }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
}
