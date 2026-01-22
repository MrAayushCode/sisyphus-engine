import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { AudioController, TinyEmitter } from './utils';
import { ChaosModal, VictoryModal } from './ui/modals';
import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';

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

const BOSS_DATA: Record<number, { name: string, desc: string, hp_pen: number }> = {
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

export class SisyphusEngine extends TinyEmitter {
    app: App;
    plugin: any;
    audio: AudioController;
    analyticsEngine: AnalyticsEngine;
    meditationEngine: MeditationEngine;
    researchEngine: ResearchEngine;
    chainsEngine: ChainsEngine;
    filtersEngine: FiltersEngine;

    // [FEATURE] Undo Buffer
    private deletedQuestBuffer: Array<{ name: string; content: string; path: string; deletedAt: number }> = [];

    constructor(app: App, plugin: any, audio: AudioController) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        this.researchEngine = new ResearchEngine(this.plugin.settings, this.app, this.audio);
        this.chainsEngine = new ChainsEngine(this.plugin.settings, this.audio);
        this.filtersEngine = new FiltersEngine(this.plugin.settings);
    }

    get settings(): SisyphusSettings { return this.plugin.settings; }
    set settings(val: SisyphusSettings) { this.plugin.settings = val; }

    async save() { await this.plugin.saveSettings(); this.trigger("update"); }

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
        let justFinishedAll = false;

        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed) return;
            switch (mission.checkFunc) {
                // [FIX] Zero Inbox Logic
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof TFolder) {
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    } else {
                        mission.progress = 1;
                    }
                    break;
                case "morning_trivial": if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10) mission.progress++; break;
                case "quest_count": if (context.type === "complete") mission.progress = this.settings.questsCompletedToday; break;
                case "high_stakes": if (context.type === "complete" && context.highStakes) mission.progress++; break;
                case "fast_complete": if (context.type === "complete" && context.questCreated && moment().diff(moment(context.questCreated), 'hours') <= 2) mission.progress++; break;
                case "synergy": if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None") mission.progress++; break;
                case "no_damage": if (context.type === "damage") mission.progress = 0; break;
                case "hard_quest": if (context.type === "complete" && context.difficulty && context.difficulty >= 4) mission.progress++; break;
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
                new Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");

                // Check if this was the last one
                if (this.settings.dailyMissions.every(m => m.completed)) justFinishedAll = true;
            }
        });

        // [FIX] Award Bonus Gold
        if (justFinishedAll) {
            this.settings.gold += 50;
            new Notice("🎉 All Missions Complete! +50 Bonus Gold");
            this.audio.playSound("success");
        }

        this.save();
    }

    getDifficultyNumber(diffLabel: string): number {
        const map: any = { "Trivial": 1, "Easy": 2, "Medium": 3, "Hard": 4, "SUICIDE": 5 };
        return map[diffLabel] || 3;
    }

    async checkDailyLogin() {
        const today = moment().format("YYYY-MM-DD");
        if (this.settings.lastLogin) {
            const daysDiff = moment().diff(moment(this.settings.lastLogin), 'days');
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
            const todayMoment = moment();
            this.settings.skills.forEach(s => {
                if (s.lastUsed) {
                    if (todayMoment.diff(moment(s.lastUsed), 'days') > 3 && !this.isResting()) { 
                        s.rust = Math.min(10, (s.rust || 0) + 1);
                        s.xpReq = Math.floor(s.xpReq * 1.1); 
                    }
                }
            });

            if (this.settings.dailyMissionDate !== today) this.rollDailyMissions();
            await this.rollChaos(true);
            await this.save();
        }
    }

    async completeQuest(file: TFile) {
        if (this.meditationEngine.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!fm) return;
        const questName = file.basename;
        
        if (this.chainsEngine.isQuestInChain(questName)) {
             const canStart = this.chainsEngine.canStartQuest(questName);
             if (!canStart) { new Notice("Locked by Chain."); return; }
             await this.chainsEngine.completeChainQuest(questName);
        }

        if (fm.is_boss) {
            const match = file.basename.match(/BOSS_LVL(\d+)/);
            if (match) {
                const level = parseInt(match[1]);
                const result = this.analyticsEngine.defeatBoss(level);
                new Notice(result.message);
                if (this.settings.gameWon) new VictoryModal(this.app, this.plugin).open();
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
            if (skill.xp >= skill.xpReq) { skill.level++; skill.xp = 0; new Notice(`🧠 ${skill.name} Leveled Up!`); }
        }

        const secondary = fm.secondary_skill || "None";
        if (secondary && secondary !== "None") {
            const secSkill = this.settings.skills.find(s => s.name === secondary);
            if (secSkill) {
                if(!skill.connections) skill.connections = [];
                if(!skill.connections.includes(secondary)) { skill.connections.push(secondary); new Notice(`🔗 Neural Link Established`); }
                xp += Math.floor(secSkill.level * 0.5); 
                secSkill.xp += 0.5; 
            }
        }

        this.settings.xp += xp; this.settings.gold += gold;
        
        // [FIX] Adrenaline self-damage counting toward lockdown
        if (this.settings.dailyModifier.name === "Adrenaline") {
            this.settings.hp -= 5;
            this.settings.damageTakenToday += 5;
            if (this.settings.damageTakenToday > 50 && !this.meditationEngine.isLockedDown()) {
                this.meditationEngine.triggerLockdown();
                this.trigger("lockdown");
                new Notice("Overexertion! LOCKDOWN INITIATED.");
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
            msgs.forEach(m => new Notice(m));
            
            if ([10, 20, 30, 50].includes(this.settings.level)) this.spawnBoss(this.settings.level);
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
        if (!this.app.vault.getAbstractFileByPath(archivePath)) await this.app.vault.createFolder(archivePath);
        await this.app.fileManager.processFrontMatter(file, (f) => { f.status = "completed"; f.completed_at = new Date().toISOString(); });
        await this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
        await this.save();
    }

    async spawnBoss(level: number) {
        const boss = BOSS_DATA[level];
        if (!boss) return;
        this.audio.playSound("heartbeat");
        new Notice("⚠️ ANOMALY DETECTED...", 2000);
        setTimeout(async () => {
            this.audio.playSound("death");
            new Notice(`☠️ BOSS SPAWNED: ${boss.name}`);
            await this.createQuest(
                `BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None", 
                moment().add(3, 'days').toISOString(), true, "Critical", true
            );
        }, 3000);
    }

    async failQuest(file: TFile, manualAbort: boolean = false) {
        if (this.isResting() && !manualAbort) { new Notice("Rest Day protection."); return; }
        if (this.isShielded() && !manualAbort) { new Notice("Shielded!"); return; }

        let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
        
        // [FIX] Apply Boss Penalty
        const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (fm?.is_boss) {
            const match = file.basename.match(/BOSS_LVL(\d+)/);
            if (match) {
                const level = parseInt(match[1]);
                if (BOSS_DATA[level]) {
                    damage += BOSS_DATA[level].hp_pen;
                    new Notice(`☠️ Boss Crush: +${BOSS_DATA[level].hp_pen} Damage`);
                }
            }
        }

        if (this.settings.gold < 0) damage *= 2;
        
        this.settings.hp -= damage;
        this.settings.damageTakenToday += damage;
        if (!manualAbort) this.settings.rivalDmg += 1;
        
        this.audio.playSound("fail");
        this.checkDailyMissions({ type: "damage" });
        
        if (this.settings.damageTakenToday > 50) {
            this.meditationEngine.triggerLockdown();
            this.trigger("lockdown");
        }
        
        const gravePath = "Graveyard/Failures";
        if (!this.app.vault.getAbstractFileByPath(gravePath)) await this.app.vault.createFolder(gravePath);
        await this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
        await this.save();
    }
    
    async createQuest(name: string, diff: number, skill: string, secSkill: string, deadlineIso: string, highStakes: boolean, priority: string, isBoss: boolean) {
        if (this.meditationEngine.isLockedDown()) { new Notice("LOCKDOWN ACTIVE"); return; }
        
        let xpReward = 0; let goldReward = 0; let diffLabel = "";
        switch(diff) {
            case 1: xpReward = Math.floor(this.settings.xpReq * 0.05); goldReward = 10; diffLabel = "Trivial"; break;
            case 2: xpReward = Math.floor(this.settings.xpReq * 0.10); goldReward = 20; diffLabel = "Easy"; break;
            case 3: xpReward = Math.floor(this.settings.xpReq * 0.20); goldReward = 40; diffLabel = "Medium"; break;
            case 4: xpReward = Math.floor(this.settings.xpReq * 0.40); goldReward = 80; diffLabel = "Hard"; break;
            case 5: xpReward = Math.floor(this.settings.xpReq * 0.60); goldReward = 150; diffLabel = "SUICIDE"; break;
        }
        if (isBoss) { xpReward=1000; goldReward=1000; diffLabel="☠️ BOSS"; }
        if (highStakes && !isBoss) goldReward = Math.floor(goldReward * 1.5);
        
        const rootPath = "Active_Run/Quests";
        if (!this.app.vault.getAbstractFileByPath(rootPath)) await this.app.vault.createFolder(rootPath);
        
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
        
        await this.app.vault.create(`${rootPath}/${safeName}.md`, content);
        this.audio.playSound("click");
        this.save();
    }
    
    // [FEATURE] Undo Deletion System
    async deleteQuest(file: TFile) { 
        // Read and buffer for undo
        try {
            const content = await this.app.vault.read(file);
            this.deletedQuestBuffer.push({
                name: file.name,
                content: content,
                path: file.path,
                deletedAt: Date.now()
            });
            // Keep buffer small (max 5 items)
            if (this.deletedQuestBuffer.length > 5) this.deletedQuestBuffer.shift();
        } catch(e) { console.error("Buffer fail", e); }

        await this.app.vault.delete(file); 
        this.save(); 
    }

    async undoLastDeletion() {
        const last = this.deletedQuestBuffer.pop();
        if (!last) { new Notice("Nothing to undo."); return; }
        
        // Prevent undoing if > 60 seconds (optional, but good for anti-cheese)
        if (Date.now() - last.deletedAt > 60000) { new Notice("Too late to undo."); return; }

        try {
            await this.app.vault.create(last.path, last.content);
            new Notice(`Restored: ${last.name}`);
        } catch (e) {
            new Notice("Could not restore file (path may be taken).");
        }
    }

    async checkDeadlines() {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (!(folder instanceof TFolder)) return;
        
        // [FIX] Constant Zero Inbox Check
        const zeroInbox = this.settings.dailyMissions.find(m => m.checkFunc === "zero_inbox" && !m.completed);
        if (zeroInbox) {
            const scraps = this.app.vault.getAbstractFileByPath("Scraps");
            if (scraps instanceof TFolder && scraps.children.length === 0) {
                // Complete mission via standard check to trigger rewards
                this.checkDailyMissions({ type: "check" });
            }
        }

        for (const file of folder.children) {
            if (file instanceof TFile) {
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (fm?.deadline && moment().isAfter(moment(fm.deadline))) await this.failQuest(file);
            }
        }
        this.save();
    }

    async rollChaos(showModal: boolean = false) {
        const roll = Math.random();
        if (roll < 0.4) this.settings.dailyModifier = DEFAULT_MODIFIER;
        else {
            const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
            this.settings.dailyModifier = CHAOS_TABLE[idx];
        }
        await this.save();
        if (showModal) new ChaosModal(this.app, this.settings.dailyModifier).open();
    }

    async attemptRecovery() {
        if (!this.meditationEngine.isLockedDown()) { new Notice("Not in Lockdown."); return; }
        const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
        new Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
    }

    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && moment().isBefore(moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && moment().isBefore(moment(this.settings.shieldedUntil)); }

    async createResearchQuest(title: string, type: any, linkedSkill: string, linkedCombatQuest: string) {
        const res = await this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
        if(res.success) new Notice(res.message); else new Notice(res.message);
        await this.save();
    }
    
    completeResearchQuest(id: string, words: number) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    deleteResearchQuest(id: string) { this.researchEngine.deleteResearchQuest(id); this.save(); }
    updateResearchWordCount(id: string, words: number) { this.researchEngine.updateResearchWordCount(id, words); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    
    async startMeditation() { const r = this.meditationEngine.meditate(); new Notice(r.message); await this.save(); }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    async createScrap(content: string) {
        const folderPath = "Scraps";
        if (!this.app.vault.getAbstractFileByPath(folderPath)) await this.app.vault.createFolder(folderPath);
        const timestamp = moment().format("YYYY-MM-DD HH-mm-ss");
        await this.app.vault.create(`${folderPath}/${timestamp}.md`, content);
        new Notice("⚡ Scrap Captured"); this.audio.playSound("click");
    }
    
    async generateSkillGraph() { /* Existing Canvas Logic */ 
        const skills = this.settings.skills;
        if (skills.length === 0) { new Notice("No neural nodes found."); return; }
        const nodes: any[] = []; const edges: any[] = [];
        const width = 250; const height = 140; 
        const radius = Math.max(400, skills.length * 60);
        const centerX = 0; const centerY = 0; const angleStep = (2 * Math.PI) / skills.length;

        skills.forEach((skill, index) => {
            const angle = index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            let color = "4"; 
            if (skill.rust > 0) color = "1"; else if (skill.level >= 10) color = "6";
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
        if (file instanceof TFile) { await this.app.vault.modify(file, JSON.stringify(canvasData, null, 2)); new Notice("Neural Hub updated."); } 
        else { await this.app.vault.create(path, JSON.stringify(canvasData, null, 2)); new Notice("Neural Hub created."); }
    }

    async createQuestChain(name: string, quests: string[]) { await this.chainsEngine.createQuestChain(name, quests); await this.save(); }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    async breakChain() { await this.chainsEngine.breakChain(); await this.save(); }
    
    setFilterState(energy: any, context: any, tags: string[]) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }
    
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }

    taunt(trigger: string) {
        const msgs: any = { 
            "fail": ["Pathetic.", "Try again.", "Is that all?"], 
            "level_up": ["Power overwhelming.", "Ascending."],
            "low_hp": ["Bleeding out...", "Hold on."] 
        };
        const msg = msgs[trigger] ? msgs[trigger][Math.floor(Math.random() * msgs[trigger].length)] : "Observe.";
        new Notice(`SYSTEM: ${msg}`);
    }
    
    parseQuickInput(text: string) {
        const match = text.match(/(.+?)\s*\/(\d)/);
        if (match) {
            this.createQuest(match[1], parseInt(match[2]), "None", "None", moment().add(24, 'hours').toISOString(), false, "Normal", false);
        } else {
            this.createQuest(text, 3, "None", "None", moment().add(24, 'hours').toISOString(), false, "Normal", false);
        }
    }

    async triggerDeath() { 
        // [FIX] Archive active files to Graveyard
        const activeFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const graveFolder = "Graveyard/Deaths/" + moment().format("YYYY-MM-DD-HHmm");
        if (!this.app.vault.getAbstractFileByPath(graveFolder)) await this.app.vault.createFolder(graveFolder);

        if (activeFolder instanceof TFolder) {
            for (const file of activeFolder.children) {
                if (file instanceof TFile) {
                    await this.app.fileManager.renameFile(file, `${graveFolder}/${file.name}`);
                }
            }
        }

        this.settings.level = 1; this.settings.hp = 100; this.settings.gold = 0; 
        this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
        await this.save();
    }
}
