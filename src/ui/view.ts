import { ItemView, WorkspaceLeaf, TFile, TFolder, moment } from 'obsidian';
import SisyphusPlugin from '../main';
import { QuestModal, ShopModal, SkillDetailModal, SkillManagerModal, ConfirmModal } from './modals';
import { Skill, DailyMission } from '../types';

export const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";

export class PanopticonView extends ItemView {
    plugin: SisyphusPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: SisyphusPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }

    async onOpen() { 
        this.refresh(); 
        this.plugin.engine.on('update', this.refresh.bind(this)); 
    }

    async refresh() {
        const c = this.contentEl; c.empty();
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
        soundBtn.onclick = async () => {
             this.plugin.settings.muted = !this.plugin.settings.muted;
             this.plugin.audio.setMuted(this.plugin.settings.muted);
             await this.plugin.saveSettings();
             this.refresh();
        };

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

        if(this.plugin.engine.isLockedDown()) {
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
        if(this.plugin.engine.isResting()) {
             const r = scroll.createDiv({ cls: "sisy-alert sisy-alert-rest" });
             r.createEl("h3", { text: "REST DAY ACTIVE" });
             const timeRemaining = moment(this.plugin.settings.restDayUntil).diff(moment(), 'minutes');
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
        if (this.plugin.settings.gold < 0) lights.createDiv({ text: "DEBT: YES", cls: "sisy-light-active" });
        
        // DLC 1: Scars display
        const scarCount = this.plugin.settings.legacy?.deathCount || 0;
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
        await this.renderQuests(scroll);

                scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
        
        this.plugin.settings.skills.forEach((s: Skill, idx: number) => {
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
            fill.setAttribute("style", `width: ${(s.xp/s.xpReq)*100}%; background: ${s.rust > 0 ? '#d35400' : '#00b0ff'}`);
        });
        
        const addBtn = scroll.createDiv({ text: "+ Add Neural Node", cls: "sisy-add-skill" });
        addBtn.onclick = () => new SkillManagerModal(this.app, this.plugin).open();

        // --- 8. QUICK CAPTURE ---
        const footer = container.createDiv({ cls: "sisy-quick-capture" });
        const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
        input.onkeydown = async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                this.plugin.engine.parseQuickInput(input.value.trim());
                input.value = "";
            }
        };
    }

    // DLC 1: Render Daily Missions
    renderDailyMissions(parent: HTMLElement) {
        const missions = this.plugin.settings.dailyMissions || [];
        
        if (missions.length === 0) {
            const empty = parent.createDiv({ text: "No missions today. Check back tomorrow.", cls: "sisy-empty-state" });
            return;
        }

        const missionsDiv = parent.createDiv({ cls: "sisy-daily-missions" });
        
        missions.forEach((mission: DailyMission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (mission.completed) card.addClass("sisy-mission-completed");
            
            const header = card.createDiv({ cls: "sisy-mission-header" });
            const statusIcon = mission.completed ? "YES" : "..";
            header.createEl("span", { text: statusIcon, cls: "sisy-mission-status" });
            header.createEl("span", { text: mission.name, cls: "sisy-mission-name" });
            
            const desc = card.createEl("p", { text: mission.desc, cls: "sisy-mission-desc" });
            
            const progress = card.createDiv({ cls: "sisy-mission-progress" });
            progress.createEl("span", { text: `${mission.progress}/${mission.target}`, cls: "sisy-mission-counter" });
            
            const bar = progress.createDiv({ cls: "sisy-bar-bg" });
            const fill = bar.createDiv({ cls: "sisy-bar-fill" });
            const percent = (mission.progress / mission.target) * 100;
            fill.setAttribute("style", `width: ${Math.min(percent, 100)}%`);
            
            const reward = card.createDiv({ cls: "sisy-mission-reward" });
            if (mission.reward.xp > 0) reward.createSpan({ text: `+${mission.reward.xp} XP`, cls: "sisy-reward-xp" });
            if (mission.reward.gold > 0) reward.createSpan({ text: `+${mission.reward.gold}g`, cls: "sisy-reward-gold" });
        });

        const allCompleted = missions.every(m => m.completed);
        if (allCompleted && missions.length > 0) {
            const bonus = missionsDiv.createDiv({ text: "All Missions Complete! +50 Bonus Gold", cls: "sisy-mission-bonus" });
        }
    }



    // DLC 2: Render Research Quests Section
    renderResearchSection(parent: HTMLElement) {
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
        } else {
            activeResearch.forEach((quest: any) => {
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
        } else {
            completedResearch.forEach((quest: any) => {
                const item = parent.createEl("p", { text: `+ ${quest.title} (${quest.type === "survey" ? "Survey" : "Deep Dive"})` });
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em; margin: 3px 0;");
            });
        }
    }

async renderQuests(parent: HTMLElement) {
        const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        let count = 0;
        if (folder instanceof TFolder) {
            // [FIX] Apply filters using the filter engine
            let files = folder.children.filter(f => f instanceof TFile) as TFile[];
            files = this.plugin.engine.filtersEngine.filterQuests(files) as TFile[]; 
            
            // Sort by deadline
            files.sort((a, b) => {
                const fmA = this.app.metadataCache.getFileCache(a)?.frontmatter;
                const fmB = this.app.metadataCache.getFileCache(b)?.frontmatter;
                const dateA = fmA?.deadline ? moment(fmA.deadline).valueOf() : 9999999999999;
                const dateB = fmB?.deadline ? moment(fmB.deadline).valueOf() : 9999999999999;
                return dateA - dateB; 
            });

            for (const file of files) {
                count++;
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
                const card = parent.createDiv({ cls: "sisy-card" });
                if (fm?.is_boss) card.addClass("sisy-card-boss");
                const d = String(fm?.difficulty || "").match(/\d/);
                if (d) card.addClass(`sisy-card-${d[0]}`);

                // Top section with title and timer
                const top = card.createDiv({ cls: "sisy-card-top" });
                top.createDiv({ text: file.basename, cls: "sisy-card-title" });
                
                // Timer
                if (fm?.deadline) {
                    const diff = moment(fm.deadline).diff(moment(), 'minutes');
                    const hours = Math.floor(diff / 60);
                    const mins = diff % 60;
                    const timerText = diff < 0 ? "EXPIRED" : `${hours}h ${mins}m`;
                    const timer = top.createDiv({ text: timerText, cls: "sisy-timer" });
                    if (diff < 60) timer.addClass("sisy-timer-late");
                }

                // [FIX] Deletion Warning Logic
                const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                trash.onclick = (e) => { 
                    e.stopPropagation(); 
                    const quota = this.plugin.engine.meditationEngine.getDeletionQuota();
                    
                    if (quota.free === 0) {
                        new ConfirmModal(
                            this.app, 
                            "Paid Deletion Warning", 
                            `You have 0 free deletions left. This will cost 10g. Continue?`, 
                            () => {
                                // Just delete; engine handles cost logic if integrated, 
                                // or simply allow deletion as before but with warning.
                                this.plugin.engine.deleteQuest(file);
                                this.refresh();
                            }
                        ).open();
                    } else {
                        this.plugin.engine.deleteQuest(file); 
                        this.refresh();
                    }
                };
// [MODIFIED] Boss HP Bar
                if (fm?.is_boss && fm?.boss_max_hp) {
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
                if (fm?.is_boss) {
                    const bAttack = acts.createEl("button", { text: "⚔️ ATTACK", cls: "sisy-action-btn" });
                    bAttack.setAttribute("style", "border-color: #ff5555; color: #ff5555; background: rgba(255, 85, 85, 0.1); font-weight: bold;");
                    bAttack.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.damageBoss(file);
                    };
                } else {
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
    }    

    renderChainSection(parent: HTMLElement) {
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
        breakBtn.onclick = async () => {
            await this.plugin.engine.breakChain();
            this.refresh();
        };
    }


    renderFilterBar(parent: HTMLElement) {
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
                this.plugin.engine.setFilterState(opt as any, filters.activeContext, filters.activeTags);
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
                this.plugin.engine.setFilterState(filters.activeEnergy, opt as any, filters.activeTags);
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


    renderAnalytics(parent: HTMLElement) {
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
            if (!ach.unlocked) badge.addClass("sisy-achievement-locked");
            
            badge.setText(ach.unlocked ? ach.name : "???");
            badge.setAttribute("title", ach.unlocked ? ach.description : "Locked Achievement");
        });

        // Boss progress
        analyticsDiv.createEl("h4", { text: "Boss Milestones" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        
        const bosses = this.plugin.settings.bossMilestones;
        if (bosses && bosses.length > 0) {
            bosses.forEach((boss: any) => {
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

    stat(p: HTMLElement, label: string, val: string, cls: string = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" }); 
        if (cls) b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }

    async onClose() {
        this.plugin.engine.off('update', this.refresh.bind(this));
    }
}
