import { moment } from 'obsidian';
import { SisyphusSettings, DayMetrics, WeeklyReport, BossMilestone, Streak, Achievement } from './types';

/**
 * DLC 6: Analytics & Endgame Engine
 * Handles all metrics tracking, boss milestones, achievements, and win condition
 * 
 * ISOLATED: Only reads/writes to settings.dayMetrics, weeklyReports, bossMilestones, streak, achievements
 * DEPENDENCIES: moment, SisyphusSettings types
 */
export class AnalyticsEngine {
    settings: SisyphusSettings;
    audioController?: any; // Optional audio callback for notifications

    constructor(settings: SisyphusSettings, audioController?: any) {
        this.settings = settings;
        this.audioController = audioController;
    }

    /**
     * Track daily metrics - called whenever a quest is completed/failed/etc
     */
    trackDailyMetrics(type: 'quest_complete' | 'quest_fail' | 'xp' | 'gold' | 'damage' | 'skill_level' | 'chain_complete', amount: number = 1) {
        const today = moment().format("YYYY-MM-DD");
        
        let metric = this.settings.dayMetrics.find(m => m.date === today);
        if (!metric) {
            metric = {
                date: today,
                questsCompleted: 0,
                questsFailed: 0,
                xpEarned: 0,
                goldEarned: 0,
                damagesTaken: 0,
                skillsLeveled: [],
                chainsCompleted: 0
            };
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
    }

    /**
     * Update daily streak - called once per day at login
     */
    updateStreak() {
        const today = moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        
        if (lastDate === today) {
            return; // Already counted today
        }
        
        const yesterday = moment().subtract(1, 'day').format("YYYY-MM-DD");
        
        if (lastDate === yesterday) {
            // Consecutive day
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        } else {
            // Streak broken, start new one
            this.settings.streak.current = 1;
        }
        
        this.settings.streak.lastDate = today;
    }

    /**
     * Initialize boss milestones on first run
     */
    initializeBossMilestones() {
        if (this.settings.bossMilestones.length === 0) {
            const milestones = [
                { level: 10, name: "The First Trial", unlocked: false, defeated: false, xpReward: 500 },
                { level: 20, name: "The Nemesis Returns", unlocked: false, defeated: false, xpReward: 1000 },
                { level: 30, name: "The Reaper Awakens", unlocked: false, defeated: false, xpReward: 1500 },
                { level: 50, name: "The Final Ascension", unlocked: false, defeated: false, xpReward: 5000 }
            ];
            
            this.settings.bossMilestones = milestones as any;
        }
    }

    /**
     * Check if any bosses should be unlocked based on current level
     */
    checkBossMilestones(): string[] {
        const messages: string[] = [];
        
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        
        this.settings.bossMilestones.forEach((boss: BossMilestone) => {
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if (this.audioController?.playSound) {
                    this.audioController.playSound("success");
                }
            }
        });
        
        return messages;
    }

    /**
     * Mark boss as defeated and award XP
     */
    defeatBoss(level: number): { success: boolean; message: string; xpReward: number } {
        const boss = this.settings.bossMilestones.find((b: BossMilestone) => b.level === level);
        if (!boss) {
            return { success: false, message: "Boss not found", xpReward: 0 };
        }
        
        if (boss.defeated) {
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        }
        
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        
        this.settings.xp += boss.xpReward;
        
        if (this.audioController?.playSound) {
            this.audioController.playSound("success");
        }
        
        // Check win condition
        if (level === 50) {
            this.winGame();
            return { success: true, message: `Boss Defeated: ${boss.name}! VICTORY!`, xpReward: boss.xpReward };
        }
        
        return { success: true, message: `Boss Defeated: ${boss.name}! +${boss.xpReward} XP`, xpReward: boss.xpReward };
    }

    /**
     * Trigger win condition
     */
    private winGame() {
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        
        if (this.audioController?.playSound) {
            this.audioController.playSound("success");
        }
    }

    /**
     * Generate weekly report
     */
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
        
        const topSkills = this.settings.skills
            .sort((a: any, b: any) => (b.level - a.level))
            .slice(0, 3)
            .map((s: any) => s.name);
        
        const bestDay = weekMetrics.length > 0 
            ? weekMetrics.reduce((max: DayMetrics, m: DayMetrics) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min: DayMetrics, m: DayMetrics) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        
        const report: WeeklyReport = {
            week: week,
            startDate: startDate,
            endDate: endDate,
            totalQuests: totalQuests,
            successRate: successRate,
            totalXp: totalXp,
            totalGold: totalGold,
            topSkills: topSkills,
            bestDay: bestDay,
            worstDay: worstDay
        };
        
        this.settings.weeklyReports.push(report);
        return report;
    }

    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId: string): boolean {
        const achievement = this.settings.achievements.find((a: Achievement) => a.id === achievementId);
        if (!achievement || achievement.unlocked) return false;
        
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        
        if (this.audioController?.playSound) {
            this.audioController.playSound("success");
        }
        
        return true;
    }

    /**
     * Get current game stats snapshot
     */
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

    /**
     * Get survival estimate (rough calculation)
     */
    getSurvivalEstimate(): number {
        const damagePerFailure = 10 + Math.floor(this.settings.rivalDmg / 2);
        const actualDamage = this.settings.gold < 0 ? damagePerFailure * 2 : damagePerFailure;
        return Math.floor(this.settings.hp / Math.max(1, actualDamage));
    }
}
