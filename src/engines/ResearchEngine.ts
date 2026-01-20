import { SisyphusSettings, ResearchQuest } from './types';

/**
 * DLC 2: Research Quest System Engine
 * Handles research quest creation, completion, word count validation, and combat:research ratio
 * 
 * ISOLATED: Only reads/writes to researchQuests, researchStats
 * DEPENDENCIES: SisyphusSettings types
 * REQUIREMENTS: Audio callbacks from parent for notifications
 */
export class ResearchEngine {
    settings: SisyphusSettings;
    audioController?: any;

    constructor(settings: SisyphusSettings, audioController?: any) {
        this.settings = settings;
        this.audioController = audioController;
    }

    /**
     * Create a new research quest
     * Checks 2:1 combat:research ratio before allowing creation
     */
    async createResearchQuest(title: string, type: "survey" | "deep_dive", linkedSkill: string, linkedCombatQuest: string): Promise<{ success: boolean; message: string; questId?: string }> {
        // Check 2:1 combat:research ratio
        if (!this.canCreateResearchQuest()) {
            return {
                success: false,
                message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
            };
        }
        
        const wordLimit = type === "survey" ? 200 : 400;
        const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
        
        const researchQuest: ResearchQuest = {
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
    }

    /**
     * Complete a research quest
     * Validates word count (80-125%), applies penalties for overage, awards XP
     */
    completeResearchQuest(questId: string, finalWordCount: number): { success: boolean; message: string; xpReward: number; goldPenalty: number } {
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
        
        if (this.audioController?.playSound) {
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
    deleteResearchQuest(questId: string): { success: boolean; message: string } {
        const index = this.settings.researchQuests.findIndex(q => q.id === questId);
        if (index !== -1) {
            const quest = this.settings.researchQuests[index];
            this.settings.researchQuests.splice(index, 1);
            
            // Decrement stats appropriately
            if (!quest.completed) {
                this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
            } else {
                this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
            }
            
            return { success: true, message: "Research quest deleted" };
        }
        
        return { success: false, message: "Research quest not found" };
    }

    /**
     * Update word count for a research quest (as user writes)
     */
    updateResearchWordCount(questId: string, newWordCount: number): boolean {
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
    getResearchRatio(): { combat: number; research: number; ratio: string } {
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
    canCreateResearchQuest(): boolean {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }

    /**
     * Get active (not completed) research quests
     */
    getActiveResearchQuests(): ResearchQuest[] {
        return this.settings.researchQuests.filter(q => !q.completed);
    }

    /**
     * Get completed research quests
     */
    getCompletedResearchQuests(): ResearchQuest[] {
        return this.settings.researchQuests.filter(q => q.completed);
    }

    /**
     * Validate word count status for a quest
     * Returns: { status: 'too_short' | 'perfect' | 'overage' | 'locked', percent: number }
     */
    validateWordCount(questId: string, wordCount: number): { status: 'too_short' | 'perfect' | 'overage' | 'locked'; percent: number; message: string } {
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
