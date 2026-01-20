import { SisyphusSettings, QuestChain, QuestChainRecord } from './types';

/**
 * DLC 4: Quest Chains Engine
 * Handles multi-quest sequences with ordering, locking, and completion tracking
 * 
 * ISOLATED: Only reads/writes to activeChains, chainHistory, currentChainId, chainQuestsCompleted
 * DEPENDENCIES: SisyphusSettings types
 * INTEGRATION POINTS: Needs to hook into completeQuest() in main engine for chain progression
 */
export class ChainsEngine {
    settings: SisyphusSettings;
    audioController?: any;

    constructor(settings: SisyphusSettings, audioController?: any) {
        this.settings = settings;
        this.audioController = audioController;
    }

    /**
     * Create a new quest chain
     */
    async createQuestChain(name: string, questNames: string[]): Promise<{ success: boolean; message: string; chainId?: string }> {
        if (questNames.length < 2) {
            return {
                success: false,
                message: "Chain must have at least 2 quests"
            };
        }
        
        const chainId = `chain_${Date.now()}`;
        const chain: QuestChain = {
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
    }

    /**
     * Get the current active chain
     */
    getActiveChain(): QuestChain | null {
        if (!this.settings.currentChainId) return null;
        
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        return (chain && !chain.completed) ? chain : null;
    }

    /**
     * Get the next quest that should be completed in the active chain
     */
    getNextQuestInChain(): string | null {
        const chain = this.getActiveChain();
        if (!chain) return null;
        
        return chain.quests[chain.currentIndex] || null;
    }

    /**
     * Check if a quest is part of an active (incomplete) chain
     */
    isQuestInChain(questName: string): boolean {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain) return false;
        return chain.quests.includes(questName);
    }

    /**
     * Check if a quest can be started (is it the next quest in the chain?)
     */
    canStartQuest(questName: string): boolean {
        const chain = this.getActiveChain();
        if (!chain) return true; // Not in a chain, can start any quest
        
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }

    /**
     * Mark a quest as completed in the chain
     * Advances chain if successful, awards bonus XP if chain completes
     */
    async completeChainQuest(questName: string): Promise<{ success: boolean; message: string; chainComplete: boolean; bonusXp: number }> {
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
    }

    /**
     * Complete the entire chain
     */
    private async completeChain(chain: QuestChain): Promise<{ success: boolean; message: string; chainComplete: boolean; bonusXp: number }> {
        chain.completed = true;
        chain.completedAt = new Date().toISOString();
        
        const bonusXp = 100;
        this.settings.xp += bonusXp;
        
        const record: QuestChainRecord = {
            chainId: chain.id,
            chainName: chain.name,
            totalQuests: chain.quests.length,
            completedAt: chain.completedAt,
            xpEarned: bonusXp
        };
        
        this.settings.chainHistory.push(record);
        
        if (this.audioController?.playSound) {
            this.audioController.playSound("success");
        }
        
        return {
            success: true,
            message: `Chain complete: ${chain.name}! +${bonusXp} XP Bonus`,
            chainComplete: true,
            bonusXp: bonusXp
        };
    }

    /**
     * Break an active chain
     * Keeps earned XP from completed quests
     */
    async breakChain(): Promise<{ success: boolean; message: string; xpKept: number }> {
        const chain = this.getActiveChain();
        if (!chain) {
            return { success: false, message: "No active chain to break", xpKept: 0 };
        }
        
        const completed = chain.currentIndex;
        const xpKept = completed * 10; // Approximate XP from each quest
        
        // Save to history as broken
        const record: QuestChainRecord = {
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
    }

    /**
     * Get progress of active chain
     */
    getChainProgress(): { completed: number; total: number; percent: number } {
        const chain = this.getActiveChain();
        if (!chain) return { completed: 0, total: 0, percent: 0 };
        
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }

    /**
     * Get all completed chain records (history)
     */
    getChainHistory(): QuestChainRecord[] {
        return this.settings.chainHistory;
    }

    /**
     * Get all active chains (not completed)
     */
    getActiveChains(): QuestChain[] {
        return this.settings.activeChains.filter(c => !c.completed);
    }

    /**
     * Get detailed state of active chain (for UI rendering)
     */
    getChainDetails(): {
        chain: QuestChain | null;
        progress: { completed: number; total: number; percent: number };
        questStates: Array<{ quest: string; status: 'completed' | 'active' | 'locked' }>;
    } {
        const chain = this.getActiveChain();
        if (!chain) {
            return { chain: null, progress: { completed: 0, total: 0, percent: 0 }, questStates: [] };
        }
        
        const progress = this.getChainProgress();
        const questStates = chain.quests.map((quest, idx) => {
            if (idx < chain.currentIndex) {
                return { quest, status: 'completed' as const };
            } else if (idx === chain.currentIndex) {
                return { quest, status: 'active' as const };
            } else {
                return { quest, status: 'locked' as const };
            }
        });
        
        return { chain, progress, questStates };
    }
}
