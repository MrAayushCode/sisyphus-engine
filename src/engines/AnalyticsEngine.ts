import { moment } from 'obsidian';
import { SisyphusSettings, DayMetrics, WeeklyReport, BossMilestone, Streak, Achievement } from '../types';
import { ACHIEVEMENT_DEFINITIONS } from '../achievements';

export class AnalyticsEngine {
    settings: SisyphusSettings;
    audioController?: any;

    constructor(settings: SisyphusSettings, audioController?: any) {
        this.settings = settings;
        this.audioController = audioController;
    }

    /**
     * Ensure all achievements exist in settings
     */
    initializeAchievements() {
        // If achievements array is empty or missing definitions, sync it
        if (!this.settings.achievements) this.settings.achievements = [];

        ACHIEVEMENT_DEFINITIONS.forEach(def => {
            const exists = this.settings.achievements.find(a => a.id === def.id);
            if (!exists) {
                this.settings.achievements.push({
                    ...def,
                    unlocked: false
                });
            }
        });
    }

    trackDailyMetrics(type: 'quest_complete' | 'quest_fail' | 'xp' | 'gold' | 'damage' | 'skill_level' | 'chain_complete', amount: number = 1) {
        const today = moment().format("YYYY-MM-DD");
        
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = { date: today, questsCompleted: 0, questsFailed: 0, xpEarned: 0, goldEarned: 0, damagesTaken: 0, skillsLeveled: [], chainsCompleted: 0 };
            this.settings.dayMetrics.push(metric);
        }
        
        switch (type) {
            case "quest_complete": metric.questsCompleted += amount; break;
            case "quest_fail": metric.questsFailed += amount; break;
            case "xp": metric.xpEarned += amount; break;
            case "gold": metric.goldEarned += amount; break;
            case "damage": metric.damagesTaken += amount; break;
            case "skill_level": metric.skillsLeveled.push("Skill leveled"); break;
            case "chain_complete": metric.chainsCompleted += amount; break;
        }

        // Trigger Achievement Check after every metric update
        this.checkAchievements();
    }

    updateStreak() {
        const today = moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        
        if (lastDate !== today) {
            const yesterday = moment().subtract(1, 'day').format("YYYY-MM-DD");
            if (lastDate === yesterday) {
                this.settings.streak.current++;
                if (this.settings.streak.current > this.settings.streak.longest) this.settings.streak.longest = this.settings.streak.current;
            } else {
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
        if (totalQuests >= 1) this.unlock("first_blood");

        // 2. Warm Up
        if (totalQuests >= 10) this.unlock("warm_up");

        // 3. Week Warrior
        if (s.streak.current >= 7) this.unlock("week_warrior");

        // 4. Skill Adept
        if (s.skills.some(skill => skill.level >= 5)) this.unlock("skill_adept");

        // 5. Chain Gang
        if (s.chainHistory.length >= 1) this.unlock("chain_gang");

        // 6. Researcher
        if (s.researchStats.researchCompleted >= 5) this.unlock("researcher");

        // 7. Capitalist
        if (s.gold >= 500) this.unlock("rich");

        // 8. Giant Slayer
        if (s.bossMilestones.some(b => b.defeated)) this.unlock("boss_slayer");

        // 9. Ascended
        if (s.level >= 50) this.unlock("ascended");

        // 10. Immortal
        if (s.level >= 20 && s.legacy.deathCount === 0) this.unlock("immortal");
    }

    unlock(id: string) {
        const ach = this.settings.achievements.find(a => a.id === id);
        if (ach && !ach.unlocked) {
            ach.unlocked = true;
            ach.unlockedAt = new Date().toISOString();
            if (this.audioController) this.audioController.playSound("success");
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

    checkBossMilestones(): string[] {
        const messages: string[] = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) this.initializeBossMilestones();
        
        this.settings.bossMilestones.forEach((boss: BossMilestone) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if (this.audioController) this.audioController.playSound("success");
            }
        });
        return messages;
    }

    defeatBoss(level: number): { success: boolean; message: string; xpReward: number } {
        const boss = this.settings.bossMilestones.find((b: BossMilestone) => b.level === level);
        if (!boss) return { success: false, message: "Boss not found", xpReward: 0 };
        if (boss.defeated) return { success: false, message: "Boss already defeated", xpReward: 0 };
        
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if (this.audioController) this.audioController.playSound("success");
        if (level === 50) this.winGame();
        
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }

    private winGame() {
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if (this.audioController) this.audioController.playSound("success");
    }

    generateWeeklyReport(): WeeklyReport {
        const week = moment().week();
        const startDate = moment().startOf('week').format("YYYY-MM-DD");
        const endDate = moment().endOf('week').format("YYYY-MM-DD");
        
        const weekMetrics = this.settings.dayMetrics.filter((m: DayMetrics) => 
            moment(m.date).isBetween(moment(startDate), moment(endDate), null, '[]')
        );
        
        const totalQuests = weekMetrics.reduce((sum: number, m: DayMetrics) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum: number, m: DayMetrics) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum: number, m: DayMetrics) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum: number, m: DayMetrics) => sum + m.goldEarned, 0);
        
        const topSkills = this.settings.skills.sort((a: any, b: any) => (b.level - a.level)).slice(0, 3).map((s: any) => s.name);
        const bestDay = weekMetrics.length > 0 ? weekMetrics.reduce((max: DayMetrics, m: DayMetrics) => m.questsCompleted > max.questsCompleted ? m : max).date : startDate;
        const worstDay = weekMetrics.length > 0 ? weekMetrics.reduce((min: DayMetrics, m: DayMetrics) => m.questsFailed > min.questsFailed ? m : min).date : startDate;
        
        const report: WeeklyReport = { week, startDate, endDate, totalQuests, successRate, totalXp, totalGold, topSkills, bestDay, worstDay };
        this.settings.weeklyReports.push(report);
        return report;
    }

    unlockAchievement(achievementId: string): boolean {
        // This is a manual override if needed, logic is mostly in checkAchievements now
        this.checkAchievements();
        return true; 
    }

    getGameStats() {
        return {
            level: this.settings.level,
            currentStreak: this.settings.streak.current,
            longestStreak: this.settings.streak.longest,
            totalQuests: this.settings.dayMetrics.reduce((sum: number, m: DayMetrics) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum: number, m: DayMetrics) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesDefeated: this.settings.bossMilestones.filter((b: BossMilestone) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
}
