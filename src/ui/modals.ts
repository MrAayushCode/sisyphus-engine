import { App, Modal, Setting, Notice, moment, TFile, TFolder } from 'obsidian';
import SisyphusPlugin from '../main'; // Fix: Default Import
import { Modifier } from '../types';

export class ChaosModal extends Modal { 
    modifier: Modifier; 
    constructor(app: App, m: Modifier) { super(app); this.modifier=m; } 
    onOpen() { 
        const c = this.contentEl; 
        const h1 = c.createEl("h1", { text: "THE OMEN" }); 
        h1.setAttribute("style","text-align:center; color:#f55;"); 
        const ic = c.createEl("div", { text: this.modifier.icon }); 
        ic.setAttribute("style","font-size:80px; text-align:center;"); 
        const h2 = c.createEl("h2", { text: this.modifier.name }); 
        h2.setAttribute("style","text-align:center;"); 
        const p = c.createEl("p", {text: this.modifier.desc}); 
        p.setAttribute("style","text-align:center"); 
        const b = c.createEl("button", {text:"Acknowledge"}); 
        b.addClass("mod-cta"); 
        b.style.display="block"; 
        b.style.margin="20px auto"; 
        b.onclick=()=>this.close(); 
    } 
    onClose() { this.contentEl.empty(); } 
}

export class ShopModal extends Modal { 
    plugin: SisyphusPlugin; 
    constructor(app: App, plugin: SisyphusPlugin) { super(app); this.plugin = plugin; } 
    onOpen() { 
        const { contentEl } = this; 
        contentEl.createEl("h2", { text: "🛒 BLACK MARKET" }); 
        contentEl.createEl("p", { text: `Purse: 🪙 ${this.plugin.settings.gold}` }); 
        
        this.item(contentEl, "💉 Stimpack", "Heal 20 HP", 50, async () => { 
            this.plugin.settings.hp = Math.min(this.plugin.settings.maxHp, this.plugin.settings.hp + 20); 
        }); 
        this.item(contentEl, "💣 Sabotage", "-5 Rival Dmg", 200, async () => { 
            this.plugin.settings.rivalDmg = Math.max(5, this.plugin.settings.rivalDmg - 5); 
        }); 
        this.item(contentEl, "🛡️ Shield", "24h Protection", 150, async () => { 
            this.plugin.settings.shieldedUntil = moment().add(24, 'hours').toISOString(); 
        }); 
        this.item(contentEl, "😴 Rest Day", "Safe for 24h", 100, async () => { 
            this.plugin.settings.restDayUntil = moment().add(24, 'hours').toISOString(); 
        }); 
    } 
    item(el: HTMLElement, name: string, desc: string, cost: number, effect: () => Promise<void>) { 
        const c = el.createDiv(); 
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;"); 
        const i = c.createDiv(); 
        i.createEl("b", { text: name }); 
        i.createEl("div", { text: desc }); 
        const b = c.createEl("button", { text: `${cost} G` }); 
        if(this.plugin.settings.gold < cost) { 
            b.setAttribute("disabled","true"); b.style.opacity="0.5"; 
        } else { 
            b.addClass("mod-cta"); 
            b.onclick = async () => { 
                this.plugin.settings.gold -= cost; 
                await effect(); 
                await this.plugin.engine.save(); 
                new Notice(`Bought ${name}`); 
                this.close(); 
                new ShopModal(this.app,this.plugin).open(); 
            }
        } 
    } 
    onClose() { this.contentEl.empty(); } 
}

export class QuestModal extends Modal { 
    plugin: SisyphusPlugin; 
    name: string; difficulty: number = 3; skill: string = "None"; secSkill: string = "None"; deadline: string = ""; highStakes: boolean = false; isBoss: boolean = false; 
    constructor(app: App, plugin: SisyphusPlugin) { super(app); this.plugin = plugin; } 
    onOpen() { 
        const { contentEl } = this; 
        contentEl.createEl("h2", { text: "⚔️ DEPLOYMENT" }); 
        
        new Setting(contentEl).setName("Objective").addText(t => { 
            t.onChange(v => this.name = v); 
            setTimeout(() => t.inputEl.focus(), 50); 
        });

        new Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1","Trivial").addOption("2","Easy").addOption("3","Medium").addOption("4","Hard").addOption("5","SUICIDE").setValue("3").onChange(v=>this.difficulty=parseInt(v))); 
        
        const skills: Record<string, string> = { "None": "None" }; 
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name); 
        skills["+ New"] = "+ New"; 
        
        new Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => { 
            if(v==="+ New"){ this.close(); new SkillManagerModal(this.app,this.plugin).open(); } else this.skill=v; 
        })); 
        
        new Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t=>t.setValue(false).onChange(v=>this.highStakes=v)); 
        
        new Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => { 
            if(this.name){
                this.plugin.engine.createQuest(this.name,this.difficulty,this.skill,this.secSkill,this.deadline,this.highStakes, "Normal", this.isBoss);
                this.close();
            } 
        })); 
    } 
    onClose() { this.contentEl.empty(); } 
}

export class SkillManagerModal extends Modal { 
    plugin: SisyphusPlugin; 
    constructor(app: App, plugin: SisyphusPlugin) { super(app); this.plugin = plugin; } 
    onOpen() { 
        const { contentEl } = this; 
        contentEl.createEl("h2", { text: "Add New Node" }); 
        let n=""; 
        new Setting(contentEl).setName("Node Name").addText(t=>t.onChange(v=>n=v)).addButton(b=>b.setButtonText("Create").setCta().onClick(async()=>{
            if(n){
                this.plugin.settings.skills.push({name:n,level:1,xp:0,xpReq:5,lastUsed:new Date().toISOString(),rust:0,connections:[]});
                await this.plugin.engine.save();
                this.close();
            }
        })); 
    } 
    onClose() { this.contentEl.empty(); } 
}

export class SkillDetailModal extends Modal {
    plugin: SisyphusPlugin; index: number;
    constructor(app: App, plugin: SisyphusPlugin, index: number) { super(app); this.plugin=plugin; this.index=index; }
    onOpen() {
        const { contentEl } = this; const s = this.plugin.settings.skills[this.index];
        contentEl.createEl("h2", { text: `Node: ${s.name}` });
        new Setting(contentEl).setName("Name").addText(t=>t.setValue(s.name).onChange(v=>s.name=v));
        new Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b=>b.setButtonText("Manual Polish").onClick(async()=>{ 
            s.rust=0; s.xpReq=Math.floor(s.xpReq/1.1); 
            await this.plugin.engine.save(); 
            this.close(); 
            new Notice("Rust polished."); 
        }));
        
        const div = contentEl.createDiv(); 
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        
        const bSave = div.createEl("button", {text:"Save"}); 
        bSave.addClass("mod-cta"); 
        bSave.onclick=async()=>{ await this.plugin.engine.save(); this.close(); };
        
        const bDel = div.createEl("button", {text:"Delete Node"}); 
        bDel.setAttribute("style","color:red;"); 
        bDel.onclick=async()=>{ 
            this.plugin.settings.skills.splice(this.index, 1); 
            await this.plugin.engine.save(); 
            this.close(); 
        };
    }
    onClose() { this.contentEl.empty(); }
}



export class ResearchQuestModal extends Modal {
    plugin: SisyphusPlugin;
    title: string = "";
    type: "survey" | "deep_dive" = "survey";
    linkedSkill: string = "None";
    linkedCombatQuest: string = "None";

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH DEPLOYMENT" });

        new Setting(contentEl)
            .setName("Research Title")
            .addText(t => {
                t.onChange(v => this.title = v);
                setTimeout(() => t.inputEl.focus(), 50);
            });

        new Setting(contentEl)
            .setName("Research Type")
            .addDropdown(d => d
                .addOption("survey", "Survey (100-200 words)")
                .addOption("deep_dive", "Deep Dive (200-400 words)")
                .setValue("survey")
                .onChange(v => this.type = v as "survey" | "deep_dive")
            );

        const skills: Record<string, string> = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);

        new Setting(contentEl)
            .setName("Linked Skill")
            .addDropdown(d => d
                .addOptions(skills)
                .setValue("None")
                .onChange(v => this.linkedSkill = v)
            );

        const combatQuests: Record<string, string> = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof TFile && f.extension === "md") {
                    combatQuests[f.basename] = f.basename;
                }
            });
        }

        new Setting(contentEl)
            .setName("Link Combat Quest")
            .addDropdown(d => d
                .addOptions(combatQuests)
                .setValue("None")
                .onChange(v => this.linkedCombatQuest = v)
            );

        new Setting(contentEl)
            .addButton(b => b
                .setButtonText("CREATE RESEARCH")
                .setCta()
                .onClick(() => {
                    if (this.title) {
                        this.plugin.engine.createResearchQuest(
                            this.title,
                            this.type,
                            this.linkedSkill,
                            this.linkedCombatQuest
                        );
                        this.close();
                    }
                })
            );
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class ResearchListModal extends Modal {
    plugin: SisyphusPlugin;

    constructor(app: App, plugin: SisyphusPlugin) {
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
        } else {
            quests.forEach((q: any) => {
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
        } else {
            completed.forEach((q: any) => {
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


export class ChainBuilderModal extends Modal {
    plugin: SisyphusPlugin;
    chainName: string = "";
    selectedQuests: string[] = [];

    constructor(app: App, plugin: SisyphusPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "CHAIN BUILDER" });

        new Setting(contentEl)
            .setName("Chain Name")
            .addText(t => {
                t.onChange(v => this.chainName = v);
                setTimeout(() => t.inputEl.focus(), 50);
            });

        contentEl.createEl("h3", { text: "Select Quests" });
        
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests: string[] = [];
        
        if (questFolder instanceof TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof TFile && f.extension === "md") {
                    quests.push(f.basename);
                }
            });
        }

        quests.forEach((quest, idx) => {
            new Setting(contentEl)
                .setName(quest)
                .addToggle(t => t.onChange(v => {
                    if (v) {
                        this.selectedQuests.push(quest);
                    } else {
                        this.selectedQuests = this.selectedQuests.filter(q => q !== quest);
                    }
                }));
        });

        new Setting(contentEl)
            .addButton(b => b
                .setButtonText("CREATE CHAIN")
                .setCta()
                .onClick(async () => {
                    if (this.chainName && this.selectedQuests.length >= 2) {
                        await this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
                        this.close();
                    } else {
                        new Notice("Chain needs a name and at least 2 quests");
                    }
                })
            );
    }

    onClose() {
        this.contentEl.empty();
    }
}

export class VictoryModal extends Modal {
    plugin: SisyphusPlugin;
    
    constructor(app: App, plugin: SisyphusPlugin) {
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
        const msg = contentEl.createEl("p", { 
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

    statLine(el: HTMLElement, label: string, val: string) {
        const line = el.createDiv({ cls: "sisy-victory-stat" });
        line.innerHTML = `${label}: <span class="sisy-victory-highlight">${val}</span>`;
    }

    onClose() {
        this.contentEl.empty();
    }
}



// [APPEND TO src/ui/modals.ts]

export class QuickCaptureModal extends Modal {
    plugin: SisyphusPlugin;
    
    constructor(app: App, plugin: SisyphusPlugin) {
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
        input.addEventListener("keypress", async (e) => {
            if (e.key === "Enter" && input.value.trim().length > 0) {
                await this.plugin.engine.createScrap(input.value);
                this.close();
            }
        });

        const btn = contentEl.createEl("button", { text: "Capture to Scraps" });
        btn.addClass("mod-cta");
        btn.setAttribute("style", "margin-top: 15px; width: 100%;");
        btn.onclick = async () => {
            if (input.value.trim().length > 0) {
                await this.plugin.engine.createScrap(input.value);
                this.close();
            }
        };
    }

    onClose() {
        this.contentEl.empty();
    }
}
