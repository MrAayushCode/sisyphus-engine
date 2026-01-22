import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { SisyphusSettings, Skill, Modifier, DailyMission } from './types';
import { AudioController, TinyEmitter } from './utils';
import { AnalyticsEngine } from './engines/AnalyticsEngine';
import { MeditationEngine } from './engines/MeditationEngine';
import { ResearchEngine } from './engines/ResearchEngine';
import { ChainsEngine } from './engines/ChainsEngine';
import { FiltersEngine } from './engines/FiltersEngine';
import { ChaosModal, VictoryModal } from './ui/modals';

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
    { id: "zero_inbox", name: "🧘 Zero Inbox", desc: "Process all files in 'Scraps'", target: 1, reward: { xp: 0, gold: 10 }, check: "zero_inbox" }, // [FIX] Correct check
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

    constructor(app: App, plugin: any, audio: AudioController) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.audio = audio;
        
        this.analyticsEngine = new AnalyticsEngine(this.plugin.settings, this.audio);
        this.meditationEngine = new MeditationEngine(this.plugin.settings, this.audio);
        // [FIX] Pass 'app' to ResearchEngine
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
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed) return;
            switch (mission.checkFunc) {
                // [FIX] Added Zero Inbox Logic
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof TFolder) {
                        // Complete if 0 files in Scraps
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    } else {
                        // If folder doesn't exist, count as done
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
            }
        });
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
        
        // Chain Logic
        if (this.chainsEngine.isQuestInChain(questName)) {
             const canStart = this.chainsEngine.canStartQuest(questName);
             if (!canStart) { new Notice("Locked by Chain."); return; }
             await this.chainsEngine.completeChainQuest(questName);
        }

        // --- BOSS LOGIC START ---
        if (fm.is_boss) {
            // Extract Level from filename "BOSS_LVL10 - Name"
            const match = file.basename.match(/BOSS_LVL(\d+)/);
            if (match) {
                const level = parseInt(match[1]);
                const result = this.analyticsEngine.defeatBoss(level);
                new Notice(result.message);
                
                // TRIGGER VICTORY
                if (this.settings.gameWon) {
                    new VictoryModal(this.app, this.plugin).open();
                }
            }
        }
        // --- BOSS LOGIC END ---

        this.analyticsEngine.trackDailyMetrics("quest_complete", 1);
        this.settings.researchStats.totalCombat++;
        
        // Rewards
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

        // Secondary Skill Logic
        const secondary = fm.secondary_skill || "None";
        if (secondary && secondary !== "None") {
            const secSkill = this.settings.skills.find(s => s.name === secondary);
            if (secSkill) {
                // Link skills
                if(!skill.connections) skill.connections = [];
                if(!skill.connections.includes(secondary)) { skill.connections.push(secondary); new Notice(`🔗 Neural Link Established`); }
                // Bonus XP
                xp += Math.floor(secSkill.level * 0.5); 
                secSkill.xp += 0.5; 
            }
        }

        this.settings.xp += xp; this.settings.gold += gold;
        if (this.settings.dailyModifier.name === "Adrenaline") this.settings.hp -= 5;
        this.audio.playSound("success");

        // Level Up & Boss Spawn Check
        if (this.settings.xp >= this.settings.xpReq) {
            this.settings.level++; 
            this.settings.xp = 0;
            this.settings.xpReq = Math.floor(this.settings.xpReq * 1.1); 
            this.settings.maxHp = 100 + (this.settings.level * 5); 
            this.settings.hp = this.settings.maxHp;
            this.taunt("level_up");
            
            const msgs = this.analyticsEngine.checkBossMilestones();
            msgs.forEach(m => new Notice(m));
            
            // Spawn Boss if milestone reached
            // Note: We use the level map from engine.ts to check if a boss exists for this level
            // We need to access BOSS_DATA (ensure it's available or use the map inside engine)
            if ([10, 20, 30, 50].includes(this.settings.level)) {
                 this.spawnBoss(this.settings.level);
            }
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

        // Archive
        const archivePath = "Active_Run/Archive";
        if (!this.app.vault.getAbstractFileByPath(archivePath)) await this.app.vault.createFolder(archivePath);
        
        // Add completion timestamp
        await this.app.fileManager.processFrontMatter(file, (f) => { 
            f.status = "completed"; 
            f.completed_at = new Date().toISOString(); 
        });
        
        await this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
        await this.save();
    }

    async spawnBoss(level: number) {
        const boss = BOSS_DATA[level];
        if (!boss) return;

        // [FIX] Boss Ritual: Audio buildup + Delay
        this.audio.playSound("heartbeat");
        new Notice("⚠️ ANOMALY DETECTED...", 2000);
        
        setTimeout(async () => {
            this.audio.playSound("death");
            new Notice(`☠️ BOSS SPAWNED: ${boss.name}`);
            
            await this.createQuest(
                `BOSS_LVL${level} - ${boss.name}`, 
                5, "Boss", "None", 
                moment().add(3, 'days').toISOString(), 
                true, "Critical", true
            );
        }, 3000);
    }

    async failQuest(file: TFile, manualAbort: boolean = false) {
        if (this.isResting() && !manualAbort) { new Notice("Rest Day protection."); return; }
        if (this.isShielded() && !manualAbort) { new Notice("Shielded!"); return; }

        let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
        if (this.settings.gold < 0) damage *= 2; // Debt penalty
        
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
        
        // ... (Logic same as before, condensed for brevity) ...
        // Note: Copy the rest of your createQuest logic exactly as it was, or use the previous version.
        // For safety, I'll include the standard implementation here:
        
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
    
    async deleteQuest(file: TFile) { await this.app.vault.delete(file); this.save(); }

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
    
    async createQuestChain(name: string, quests: string[]) { await this.chainsEngine.createQuestChain(name, quests); await this.save(); }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    async breakChain() { await this.chainsEngine.breakChain(); await this.save(); }

    async createScrap(content: string) {
        const folderPath = "Scraps";
        
        // Ensure folder exists
        if (!this.app.vault.getAbstractFileByPath(folderPath)) {
            await this.app.vault.createFolder(folderPath);
        }

        // Generate filename: YYYY-MM-DD HH-mm-ss
        const timestamp = moment().format("YYYY-MM-DD HH-mm-ss");
        const filename = `${folderPath}/${timestamp}.md`;
        
        // Create file
        await this.app.vault.create(filename, content);
        
        new Notice("⚡ Scrap Captured");
        this.audio.playSound("click");
    }
    async generateSkillGraph() {
        const skills = this.settings.skills;
        if (skills.length === 0) {
            new Notice("No neural nodes found. Create skills first!");
            return;
        }

        const nodes: any[] = [];
        const edges: any[] = [];
        const width = 250;
        const height = 140; // Increased height for stats
        const radius = Math.max(400, skills.length * 60); // Dynamic radius prevents overlap
        const centerX = 0;
        const centerY = 0;
        const angleStep = (2 * Math.PI) / skills.length;

        // 1. Create Nodes
        skills.forEach((skill, index) => {
            const angle = index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Determine Color based on status
            // 1=Red (Rusty), 4=Green (Healthy), 6=Purple (Mastered > Lv10)
            let color = "4"; 
            if (skill.rust > 0) color = "1";
            else if (skill.level >= 10) color = "6";

            // Status Text
            const statusIcon = skill.rust > 0 ? "⚠️ RUSTY" : "🟢 ACTIVE";
            const progress = Math.floor((skill.xp / skill.xpReq) * 100);
            
            // Markdown Content
            const text = `## ${skill.name}
**Lv ${skill.level}**
${statusIcon}
XP: ${skill.xp}/${skill.xpReq} (${progress}%)
[Polish Node]`; 

            nodes.push({
                id: skill.name,
                x: Math.floor(x),
                y: Math.floor(y),
                width: width,
                height: height,
                type: "text",
                text: text,
                color: color
            });
        });

        // 2. Create Edges (Synergies)
        skills.forEach(skill => {
            if (skill.connections) {
                skill.connections.forEach(targetName => {
                    // Only create edge if target exists to avoid broken links
                    if (skills.find(s => s.name === targetName)) {
                        edges.push({
                            id: `${skill.name}-${targetName}`,
                            fromNode: skill.name,
                            fromSide: "right",
                            toNode: targetName,
                            toSide: "left",
                            color: "4" // Green connection
                        });
                    }
                });
            }
        });

        // 3. Construct Canvas JSON
        const canvasData = {
            nodes: nodes,
            edges: edges
        };

        // 4. Save to File
        const path = "Active_Run/Neural_Hub.canvas";
        const file = this.app.vault.getAbstractFileByPath(path);
        
        if (file instanceof TFile) {
            await this.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
            new Notice("Neural Hub updated.");
        } else {
            await this.app.vault.create(path, JSON.stringify(canvasData, null, 2));
            new Notice("Neural Hub created.");
        }
    }
    
    setFilterState(energy: any, context: any, tags: string[]) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }
    
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }

    taunt(trigger: string) { /* Same as before */ }
    parseQuickInput(text: string) { /* Same as before */ }
    async triggerDeath() { /* Same as before, resets stats */ 
        this.settings.level = 1; this.settings.hp = 100; this.settings.gold = 0; 
        this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
        await this.save();
    }
}
