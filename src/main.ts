import { Notice, Plugin, TFile, WorkspaceLeaf, debounce } from 'obsidian';
import { SisyphusSettings } from './types';
import { SisyphusEngine, DEFAULT_MODIFIER } from './engine';
import { AudioController } from './utils';
import { PanopticonView, VIEW_TYPE_PANOPTICON } from "./ui/view";
import { ResearchQuestModal, ChainBuilderModal, ResearchListModal, QuickCaptureModal, QuestTemplateModal } from "./ui/modals";

const DEFAULT_SETTINGS: SisyphusSettings = {
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
}

export default class SisyphusPlugin extends Plugin {
    settings: SisyphusSettings;
    statusBarItem: HTMLElement;
    engine: SisyphusEngine;
    audio: AudioController;

    async onload() {

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
            callback: async () => {
                const stats = this.engine.getGameStats();
                const path = `Sisyphus_Stats_${Date.now()}.json`;
                await this.app.vault.create(path, JSON.stringify(stats, null, 2));
                new Notice(`Stats exported to ${path}`);
            }
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
        await this.loadSettings();
        
        this.loadStyles();
        this.audio = new AudioController(this.settings.muted);
        this.engine = new SisyphusEngine(this.app, this, this.audio);

        this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));

        this.statusBarItem = this.addStatusBarItem();
        (window as any).sisyphusEngine = this.engine;
        
        await this.engine.checkDailyLogin();
        this.updateStatusBar();

        // --- COMMANDS ---
        this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon', callback: () => this.activateView() });
        this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Audio', callback: () => this.audio.toggleBrownNoise() });
        this.addCommand({ id: 'create-research', name: 'Research: Create Quest', callback: () => new ResearchQuestModal(this.app, this).open() });
        this.addCommand({ id: 'view-research', name: 'Research: View Library', callback: () => new ResearchListModal(this.app, this).open() });
        this.addCommand({ id: 'meditate', name: 'Meditation: Start', callback: () => this.engine.startMeditation() });
        this.addCommand({ id: 'create-chain', name: 'Chains: Create', callback: () => new ChainBuilderModal(this.app, this).open() });
        this.addCommand({ id: 'view-chains', name: 'Chains: View Active', callback: () => { const c = this.engine.getActiveChain(); new Notice(c ? `Active: ${c.name}` : "No active chain"); } });
        this.addCommand({ id: 'filter-high', name: 'Filters: High Energy', callback: () => this.engine.setFilterState("high", "any", []) });
        this.addCommand({ id: 'clear-filters', name: 'Filters: Clear', callback: () => this.engine.clearFilters() });
        this.addCommand({ id: 'game-stats', name: 'Analytics: Stats', callback: () => { const s = this.engine.getGameStats(); new Notice(`Lvl ${s.level} | Streak ${s.currentStreak}`); } });
        
        this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
        this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
        
        // [FIX] Debounced Word Counter (Typewriter Fix)
        const debouncedUpdate = debounce((file: TFile, content: string) => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.research_id) {
                const words = content.trim().split(/\s+/).length;
                this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
            }
        }, 1000, true);

        this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
            if (!info || !info.file) return;
            debouncedUpdate(info.file, editor.getValue());
        }));
    }

    async loadStyles() {
        try {
            const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
            if (cssFile instanceof TFile) {
                const css = await this.app.vault.read(cssFile);
                const style = document.createElement("style");
                style.id = "sisyphus-styles";
                style.innerHTML = css;
                document.head.appendChild(style);
            }
        } catch (e) { console.error("Could not load styles.css", e); }
    }

    async onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
        if(this.audio.audioCtx) this.audio.audioCtx.close();
        const style = document.getElementById("sisyphus-styles");
        if (style) style.remove();
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
        if (leaves.length > 0) leaf = leaves[0];
        else { leaf = workspace.getRightLeaf(false); await leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true }); }
        workspace.revealLeaf(leaf);
    }

    updateStatusBar() {
        const shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const mCount = this.settings.dailyMissions.filter(m => m.completed).length;
        this.statusBarItem.setText(`${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp} G${this.settings.gold} M${mCount}/3`);
        this.statusBarItem.style.color = this.settings.hp < 30 ? "red" : this.settings.gold < 0 ? "orange" : "";
    }
    
    async loadSettings() { this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()); }
    async saveSettings() { await this.saveData(this.settings); }
}
