'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

// EVENT BUS SYSTEM
class TinyEmitter {
    constructor() {
        this.listeners = {};
    }
    on(event, fn) {
        (this.listeners[event] = this.listeners[event] || []).push(fn);
    }
    off(event, fn) {
        if (!this.listeners[event])
            return;
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }
    trigger(event, data) {
        (this.listeners[event] || []).forEach(fn => fn(data));
    }
}
class AudioController {
    constructor(muted) {
        this.audioCtx = null;
        this.brownNoiseNode = null;
        this.muted = false;
        this.muted = muted;
    }
    setMuted(muted) { this.muted = muted; }
    initAudio() { if (!this.audioCtx)
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted)
            return;
        this.initAudio();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + duration);
        osc.stop(this.audioCtx.currentTime + duration);
    }
    playSound(type) {
        if (type === "success") {
            this.playTone(600, "sine", 0.1);
            setTimeout(() => this.playTone(800, "sine", 0.2), 100);
        }
        else if (type === "fail") {
            this.playTone(150, "sawtooth", 0.4);
            setTimeout(() => this.playTone(100, "sawtooth", 0.4), 150);
        }
        else if (type === "death") {
            this.playTone(50, "square", 1.0);
        }
        else if (type === "click") {
            this.playTone(800, "sine", 0.05);
        }
        else if (type === "heartbeat") {
            this.playTone(60, "sine", 0.1, 0.5);
            setTimeout(() => this.playTone(50, "sine", 0.1, 0.4), 150);
        }
        else if (type === "meditate") {
            this.playTone(432, "sine", 2.0, 0.05);
        }
    }
    toggleBrownNoise() {
        this.initAudio();
        if (this.brownNoiseNode) {
            this.brownNoiseNode.disconnect();
            this.brownNoiseNode = null;
            new obsidian.Notice("Focus Audio: OFF");
        }
        else {
            const bufferSize = 4096;
            this.brownNoiseNode = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
            let lastOut = 0;
            this.brownNoiseNode.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    const white = Math.random() * 2 - 1;
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 0.1;
                }
            };
            this.brownNoiseNode.connect(this.audioCtx.destination);
            new obsidian.Notice("Focus Audio: ON (Brown Noise)");
        }
    }
}

/**
 * DLC 6: Analytics & Endgame Engine
 * Handles all metrics tracking, boss milestones, achievements, and win condition
 *
 * ISOLATED: Only reads/writes to settings.dayMetrics, weeklyReports, bossMilestones, streak, achievements
 * DEPENDENCIES: moment, SisyphusSettings types
 */
class AnalyticsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Track daily metrics - called whenever a quest is completed/failed/etc
     */
    trackDailyMetrics(type, amount = 1) {
        const today = obsidian.moment().format("YYYY-MM-DD");
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
        const today = obsidian.moment().format("YYYY-MM-DD");
        const lastDate = this.settings.streak.lastDate;
        if (lastDate === today) {
            return; // Already counted today
        }
        const yesterday = obsidian.moment().subtract(1, 'day').format("YYYY-MM-DD");
        if (lastDate === yesterday) {
            // Consecutive day
            this.settings.streak.current++;
            if (this.settings.streak.current > this.settings.streak.longest) {
                this.settings.streak.longest = this.settings.streak.current;
            }
        }
        else {
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
            this.settings.bossMilestones = milestones;
        }
    }
    /**
     * Check if any bosses should be unlocked based on current level
     */
    checkBossMilestones() {
        const messages = [];
        if (!this.settings.bossMilestones || this.settings.bossMilestones.length === 0) {
            this.initializeBossMilestones();
        }
        this.settings.bossMilestones.forEach((boss) => {
            var _a;
            if (this.settings.level >= boss.level && !boss.unlocked) {
                boss.unlocked = true;
                messages.push(`Boss Unlocked: ${boss.name} (Level ${boss.level})`);
                if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                    this.audioController.playSound("success");
                }
            }
        });
        return messages;
    }
    /**
     * Mark boss as defeated and award XP
     */
    defeatBoss(level) {
        var _a;
        const boss = this.settings.bossMilestones.find((b) => b.level === level);
        if (!boss) {
            return { success: false, message: "Boss not found", xpReward: 0 };
        }
        if (boss.defeated) {
            return { success: false, message: "Boss already defeated", xpReward: 0 };
        }
        boss.defeated = true;
        boss.defeatedAt = new Date().toISOString();
        this.settings.xp += boss.xpReward;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
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
    winGame() {
        var _a;
        this.settings.gameWon = true;
        this.settings.endGameDate = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
            this.audioController.playSound("success");
        }
    }
    /**
     * Generate weekly report
     */
    generateWeeklyReport() {
        const week = obsidian.moment().week();
        const startDate = obsidian.moment().startOf('week').format("YYYY-MM-DD");
        const endDate = obsidian.moment().endOf('week').format("YYYY-MM-DD");
        const weekMetrics = this.settings.dayMetrics.filter((m) => obsidian.moment(m.date).isBetween(obsidian.moment(startDate), obsidian.moment(endDate), null, '[]'));
        const totalQuests = weekMetrics.reduce((sum, m) => sum + m.questsCompleted, 0);
        const totalFailed = weekMetrics.reduce((sum, m) => sum + m.questsFailed, 0);
        const successRate = totalQuests + totalFailed > 0 ? Math.round((totalQuests / (totalQuests + totalFailed)) * 100) : 0;
        const totalXp = weekMetrics.reduce((sum, m) => sum + m.xpEarned, 0);
        const totalGold = weekMetrics.reduce((sum, m) => sum + m.goldEarned, 0);
        const topSkills = this.settings.skills
            .sort((a, b) => (b.level - a.level))
            .slice(0, 3)
            .map((s) => s.name);
        const bestDay = weekMetrics.length > 0
            ? weekMetrics.reduce((max, m) => m.questsCompleted > max.questsCompleted ? m : max).date
            : startDate;
        const worstDay = weekMetrics.length > 0
            ? weekMetrics.reduce((min, m) => m.questsFailed > min.questsFailed ? m : min).date
            : startDate;
        const report = {
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
    unlockAchievement(achievementId) {
        var _a;
        const achievement = this.settings.achievements.find((a) => a.id === achievementId);
        if (!achievement || achievement.unlocked)
            return false;
        achievement.unlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
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
            totalQuests: this.settings.dayMetrics.reduce((sum, m) => sum + m.questsCompleted, 0),
            totalXp: this.settings.xp + this.settings.dayMetrics.reduce((sum, m) => sum + m.xpEarned, 0),
            gameWon: this.settings.gameWon,
            bossesDefeated: this.settings.bossMilestones.filter((b) => b.defeated).length,
            totalBosses: this.settings.bossMilestones.length
        };
    }
    /**
     * Get survival estimate (rough calculation)
     */
    getSurvivalEstimate() {
        const damagePerFailure = 10 + Math.floor(this.settings.rivalDmg / 2);
        const actualDamage = this.settings.gold < 0 ? damagePerFailure * 2 : damagePerFailure;
        return Math.floor(this.settings.hp / Math.max(1, actualDamage));
    }
}

/**
 * DLC 3: Meditation & Recovery Engine
 * Handles lockdown state, meditation healing, and quest deletion quota
 *
 * ISOLATED: Only reads/writes to lockdownUntil, isMeditating, meditationClicksThisLockdown,
 *           questDeletionsToday, lastDeletionReset
 * DEPENDENCIES: moment, SisyphusSettings
 * SIDE EFFECTS: Plays audio (432 Hz tone)
 */
class MeditationEngine {
    constructor(settings, audioController) {
        this.meditationCooldownMs = 30000; // 30 seconds
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Check if currently locked down
     */
    isLockedDown() {
        if (!this.settings.lockdownUntil)
            return false;
        return obsidian.moment().isBefore(obsidian.moment(this.settings.lockdownUntil));
    }
    /**
     * Get lockdown time remaining in minutes
     */
    getLockdownTimeRemaining() {
        if (!this.isLockedDown()) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }
        const totalMinutes = obsidian.moment(this.settings.lockdownUntil).diff(obsidian.moment(), 'minutes');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return { hours, minutes, totalMinutes };
    }
    /**
     * Trigger lockdown after taking 50+ damage
     */
    triggerLockdown() {
        this.settings.lockdownUntil = obsidian.moment().add(6, 'hours').toISOString();
        this.settings.meditationClicksThisLockdown = 0;
    }
    /**
     * Perform one meditation cycle (click)
     * Returns: { success, cyclesDone, cyclesRemaining, message }
     */
    meditate() {
        var _a;
        if (!this.isLockedDown()) {
            return {
                success: false,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Not in lockdown. No need to meditate.",
                lockdownReduced: false
            };
        }
        if (this.settings.isMeditating) {
            return {
                success: false,
                cyclesDone: this.settings.meditationClicksThisLockdown,
                cyclesRemaining: Math.max(0, 10 - this.settings.meditationClicksThisLockdown),
                message: "Already meditating. Wait 30 seconds.",
                lockdownReduced: false
            };
        }
        this.settings.isMeditating = true;
        this.settings.meditationClicksThisLockdown++;
        // Play healing frequency
        this.playMeditationSound();
        const remaining = 10 - this.settings.meditationClicksThisLockdown;
        // Check if 10 cycles complete
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = obsidian.moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            // Auto-reset meditation flag after cooldown
            setTimeout(() => {
                this.settings.isMeditating = false;
            }, this.meditationCooldownMs);
            return {
                success: true,
                cyclesDone: 0,
                cyclesRemaining: 0,
                message: "Meditation complete. Lockdown reduced by 5 hours.",
                lockdownReduced: true
            };
        }
        // Auto-reset meditation flag after cooldown
        setTimeout(() => {
            this.settings.isMeditating = false;
        }, this.meditationCooldownMs);
        return {
            success: true,
            cyclesDone: this.settings.meditationClicksThisLockdown,
            cyclesRemaining: remaining,
            message: `Meditation (${this.settings.meditationClicksThisLockdown}/10) - ${remaining} cycles left`,
            lockdownReduced: false
        };
    }
    /**
     * Play 432 Hz healing frequency for 1 second
     */
    playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.frequency.value = 432;
            oscillator.type = "sine";
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        }
        catch (e) {
            console.log("Audio not available for meditation");
        }
    }
    /**
     * Get meditation status for current lockdown
     */
    getMeditationStatus() {
        const cyclesDone = this.settings.meditationClicksThisLockdown;
        const cyclesRemaining = Math.max(0, 10 - cyclesDone);
        const timeReduced = (10 - cyclesRemaining) * 30; // 30 min per cycle
        return {
            cyclesDone,
            cyclesRemaining,
            timeReduced
        };
    }
    /**
     * Reset deletion quota if new day
     */
    ensureDeletionQuotaReset() {
        const today = obsidian.moment().format("YYYY-MM-DD");
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
    }
    /**
     * Check if user has free deletions left today
     */
    canDeleteQuestFree() {
        this.ensureDeletionQuotaReset();
        return this.settings.questDeletionsToday < 3;
    }
    /**
     * Get deletion quota status
     */
    getDeletionQuota() {
        this.ensureDeletionQuotaReset();
        const remaining = Math.max(0, 3 - this.settings.questDeletionsToday);
        const paid = Math.max(0, this.settings.questDeletionsToday - 3);
        return {
            free: remaining,
            paid: paid,
            remaining: remaining
        };
    }
    /**
     * Delete a quest and charge gold if necessary
     * Returns: { cost, message }
     */
    applyDeletionCost() {
        this.ensureDeletionQuotaReset();
        let cost = 0;
        let message = "";
        if (this.settings.questDeletionsToday >= 3) {
            // Paid deletion
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        }
        else {
            // Free deletion
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        return { cost, message };
    }
}

class ResearchEngine {
    constructor(settings, app, audioController) {
        this.settings = settings;
        this.app = app;
        this.audioController = audioController;
    }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            // [FIX] Allow first research quest for free (Cold Start), otherwise enforce 2:1
            if (this.settings.researchStats.totalResearch > 0 && !this.canCreateResearchQuest()) {
                return {
                    success: false,
                    message: "RESEARCH BLOCKED: Complete 2 combat quests per research quest"
                };
            }
            const wordLimit = type === "survey" ? 200 : 400;
            const questId = `research_${(this.settings.lastResearchQuestId || 0) + 1}`;
            const researchQuest = {
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
            // [FIX] Create actual Markdown file
            const folderPath = "Active_Run/Research";
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                yield this.app.vault.createFolder(folderPath);
            }
            const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${folderPath}/${safeTitle}.md`;
            const content = `---
type: research
research_id: ${questId}
status: active
linked_skill: ${linkedSkill}
word_limit: ${wordLimit}
created: ${new Date().toISOString()}
---
# 📚 ${title}
> [!INFO] Research Guidelines
> **Type:** ${type} | **Target:** ${wordLimit} words
> **Linked Skill:** ${linkedSkill}

Write your research here...
`;
            try {
                yield this.app.vault.create(filename, content);
            }
            catch (e) {
                new obsidian.Notice("Error creating research file. Check console.");
                console.error(e);
            }
            this.settings.researchQuests.push(researchQuest);
            this.settings.lastResearchQuestId = parseInt(questId.split('_')[1]);
            this.settings.researchStats.totalResearch++;
            return {
                success: true,
                message: `Research Quest Created: ${type === "survey" ? "Survey" : "Deep Dive"}`,
                questId: questId
            };
        });
    }
    completeResearchQuest(questId, finalWordCount) {
        var _a;
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (!researchQuest)
            return { success: false, message: "Research quest not found", xpReward: 0, goldPenalty: 0 };
        if (researchQuest.completed)
            return { success: false, message: "Quest already completed", xpReward: 0, goldPenalty: 0 };
        const minWords = Math.ceil(researchQuest.wordLimit * 0.8);
        if (finalWordCount < minWords) {
            return { success: false, message: `Too short! Need ${minWords} words.`, xpReward: 0, goldPenalty: 0 };
        }
        if (finalWordCount > researchQuest.wordLimit * 1.25) {
            return { success: false, message: `Too long! Max ${Math.ceil(researchQuest.wordLimit * 1.25)} words.`, xpReward: 0, goldPenalty: 0 };
        }
        let xpReward = researchQuest.type === "survey" ? 5 : 20;
        let goldPenalty = 0;
        if (finalWordCount > researchQuest.wordLimit) {
            const overagePercent = ((finalWordCount - researchQuest.wordLimit) / researchQuest.wordLimit) * 100;
            goldPenalty = Math.floor(20 * (overagePercent / 100));
        }
        const skill = this.settings.skills.find(s => s.name === researchQuest.linkedSkill);
        if (skill) {
            skill.xp += xpReward;
            if (skill.xp >= skill.xpReq) {
                skill.level++;
                skill.xp = 0;
            }
        }
        this.settings.gold -= goldPenalty;
        researchQuest.completed = true;
        researchQuest.completedAt = new Date().toISOString();
        this.settings.researchStats.researchCompleted++;
        if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound)
            this.audioController.playSound("success");
        let message = `Research Complete! +${xpReward} XP`;
        if (goldPenalty > 0)
            message += ` (-${goldPenalty}g tax)`;
        return { success: true, message, xpReward, goldPenalty };
    }
    deleteResearchQuest(questId) {
        return __awaiter(this, void 0, void 0, function* () {
            const index = this.settings.researchQuests.findIndex(q => q.id === questId);
            if (index !== -1) {
                const quest = this.settings.researchQuests[index];
                // [FIX] Try to find and delete the file
                const files = this.app.vault.getMarkdownFiles();
                const file = files.find(f => {
                    var _a;
                    const cache = this.app.metadataCache.getFileCache(f);
                    return ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) === questId;
                });
                if (file) {
                    yield this.app.vault.delete(file);
                }
                this.settings.researchQuests.splice(index, 1);
                if (!quest.completed)
                    this.settings.researchStats.totalResearch = Math.max(0, this.settings.researchStats.totalResearch - 1);
                else
                    this.settings.researchStats.researchCompleted = Math.max(0, this.settings.researchStats.researchCompleted - 1);
                return { success: true, message: "Research deleted" };
            }
            return { success: false, message: "Not found" };
        });
    }
    updateResearchWordCount(questId, newWordCount) {
        const researchQuest = this.settings.researchQuests.find(q => q.id === questId);
        if (researchQuest) {
            researchQuest.wordCount = newWordCount;
            return true;
        }
        return false;
    }
    getResearchRatio() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return { combat: stats.totalCombat, research: stats.totalResearch, ratio: ratio.toFixed(2) };
    }
    canCreateResearchQuest() {
        const stats = this.settings.researchStats;
        const ratio = stats.totalCombat / Math.max(1, stats.totalResearch);
        return ratio >= 2;
    }
}

/**
 * DLC 4: Quest Chains Engine
 * Handles multi-quest sequences with ordering, locking, and completion tracking
 *
 * ISOLATED: Only reads/writes to activeChains, chainHistory, currentChainId, chainQuestsCompleted
 * DEPENDENCIES: SisyphusSettings types
 * INTEGRATION POINTS: Needs to hook into completeQuest() in main engine for chain progression
 */
class ChainsEngine {
    constructor(settings, audioController) {
        this.settings = settings;
        this.audioController = audioController;
    }
    /**
     * Create a new quest chain
     */
    createQuestChain(name, questNames) {
        return __awaiter(this, void 0, void 0, function* () {
            if (questNames.length < 2) {
                return {
                    success: false,
                    message: "Chain must have at least 2 quests"
                };
            }
            const chainId = `chain_${Date.now()}`;
            const chain = {
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
        });
    }
    /**
     * Get the current active chain
     */
    getActiveChain() {
        if (!this.settings.currentChainId)
            return null;
        const chain = this.settings.activeChains.find(c => c.id === this.settings.currentChainId);
        return (chain && !chain.completed) ? chain : null;
    }
    /**
     * Get the next quest that should be completed in the active chain
     */
    getNextQuestInChain() {
        const chain = this.getActiveChain();
        if (!chain)
            return null;
        return chain.quests[chain.currentIndex] || null;
    }
    /**
     * Check if a quest is part of an active (incomplete) chain
     */
    isQuestInChain(questName) {
        const chain = this.settings.activeChains.find(c => !c.completed);
        if (!chain)
            return false;
        return chain.quests.includes(questName);
    }
    /**
     * Check if a quest can be started (is it the next quest in the chain?)
     */
    canStartQuest(questName) {
        const chain = this.getActiveChain();
        if (!chain)
            return true; // Not in a chain, can start any quest
        const nextQuest = this.getNextQuestInChain();
        return nextQuest === questName;
    }
    /**
     * Mark a quest as completed in the chain
     * Advances chain if successful, awards bonus XP if chain completes
     */
    completeChainQuest(questName) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    /**
     * Complete the entire chain
     */
    completeChain(chain) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            chain.completed = true;
            chain.completedAt = new Date().toISOString();
            const bonusXp = 100;
            this.settings.xp += bonusXp;
            const record = {
                chainId: chain.id,
                chainName: chain.name,
                totalQuests: chain.quests.length,
                completedAt: chain.completedAt,
                xpEarned: bonusXp
            };
            this.settings.chainHistory.push(record);
            if ((_a = this.audioController) === null || _a === void 0 ? void 0 : _a.playSound) {
                this.audioController.playSound("success");
            }
            return {
                success: true,
                message: `Chain complete: ${chain.name}! +${bonusXp} XP Bonus`,
                chainComplete: true,
                bonusXp: bonusXp
            };
        });
    }
    /**
     * Break an active chain
     * Keeps earned XP from completed quests
     */
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () {
            const chain = this.getActiveChain();
            if (!chain) {
                return { success: false, message: "No active chain to break", xpKept: 0 };
            }
            const completed = chain.currentIndex;
            const xpKept = completed * 10; // Approximate XP from each quest
            // Save to history as broken
            const record = {
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
        });
    }
    /**
     * Get progress of active chain
     */
    getChainProgress() {
        const chain = this.getActiveChain();
        if (!chain)
            return { completed: 0, total: 0, percent: 0 };
        return {
            completed: chain.currentIndex,
            total: chain.quests.length,
            percent: Math.floor((chain.currentIndex / chain.quests.length) * 100)
        };
    }
    /**
     * Get all completed chain records (history)
     */
    getChainHistory() {
        return this.settings.chainHistory;
    }
    /**
     * Get all active chains (not completed)
     */
    getActiveChains() {
        return this.settings.activeChains.filter(c => !c.completed);
    }
    /**
     * Get detailed state of active chain (for UI rendering)
     */
    getChainDetails() {
        const chain = this.getActiveChain();
        if (!chain) {
            return { chain: null, progress: { completed: 0, total: 0, percent: 0 }, questStates: [] };
        }
        const progress = this.getChainProgress();
        const questStates = chain.quests.map((quest, idx) => {
            if (idx < chain.currentIndex) {
                return { quest, status: 'completed' };
            }
            else if (idx === chain.currentIndex) {
                return { quest, status: 'active' };
            }
            else {
                return { quest, status: 'locked' };
            }
        });
        return { chain, progress, questStates };
    }
}

/**
 * DLC 5: Context Filters Engine
 * Handles quest filtering by energy level, location context, and custom tags
 *
 * ISOLATED: Only reads/writes to questFilters, filterState
 * DEPENDENCIES: SisyphusSettings types, TFile (for quest metadata)
 * NOTE: This is primarily a VIEW LAYER concern, but keeping logic isolated is good
 */
class FiltersEngine {
    constructor(settings) {
        this.settings = settings;
    }
    /**
     * Set filter for a specific quest
     */
    setQuestFilter(questName, energy, context, tags) {
        this.settings.questFilters[questName] = {
            energyLevel: energy,
            context: context,
            tags: tags
        };
    }
    /**
     * Get filter for a specific quest
     */
    getQuestFilter(questName) {
        return this.settings.questFilters[questName] || null;
    }
    /**
     * Update the active filter state
     */
    setFilterState(energy, context, tags) {
        this.settings.filterState = {
            activeEnergy: energy,
            activeContext: context,
            activeTags: tags
        };
    }
    /**
     * Get current filter state
     */
    getFilterState() {
        return this.settings.filterState;
    }
    /**
     * Check if a quest matches current filter state
     */
    questMatchesFilter(questName) {
        const filters = this.settings.filterState;
        const questFilter = this.settings.questFilters[questName];
        // If no filter set for this quest, always show
        if (!questFilter)
            return true;
        // Energy filter
        if (filters.activeEnergy !== "any" && questFilter.energyLevel !== filters.activeEnergy) {
            return false;
        }
        // Context filter
        if (filters.activeContext !== "any" && questFilter.context !== filters.activeContext) {
            return false;
        }
        // Tags filter (requires ANY of the active tags)
        if (filters.activeTags.length > 0) {
            const hasTag = filters.activeTags.some((tag) => questFilter.tags.includes(tag));
            if (!hasTag)
                return false;
        }
        return true;
    }
    /**
     * Filter a list of quests based on current filter state
     */
    filterQuests(quests) {
        return quests.filter(quest => {
            const questName = quest.basename || quest.name;
            return this.questMatchesFilter(questName);
        });
    }
    /**
     * Get quests by specific energy level
     */
    getQuestsByEnergy(energy, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.energyLevel === energy;
        });
    }
    /**
     * Get quests by specific context
     */
    getQuestsByContext(context, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            return filter && filter.context === context;
        });
    }
    /**
     * Get quests by specific tags
     */
    getQuestsByTags(tags, quests) {
        return quests.filter(q => {
            const questName = q.basename || q.name;
            const filter = this.settings.questFilters[questName];
            if (!filter)
                return false;
            return tags.some(tag => filter.tags.includes(tag));
        });
    }
    /**
     * Clear all active filters
     */
    clearFilters() {
        this.settings.filterState = {
            activeEnergy: "any",
            activeContext: "any",
            activeTags: []
        };
    }
    /**
     * Get all unique tags used across all quests
     */
    getAvailableTags() {
        const tags = new Set();
        for (const questName in this.settings.questFilters) {
            const filter = this.settings.questFilters[questName];
            filter.tags.forEach((tag) => tags.add(tag));
        }
        return Array.from(tags).sort();
    }
    /**
     * Get summary stats about filtered state
     */
    getFilterStats(allQuests) {
        const filtered = this.filterQuests(allQuests);
        const activeFiltersCount = (this.settings.filterState.activeEnergy !== "any" ? 1 : 0) +
            (this.settings.filterState.activeContext !== "any" ? 1 : 0) +
            (this.settings.filterState.activeTags.length > 0 ? 1 : 0);
        return {
            total: allQuests.length,
            filtered: filtered.length,
            activeFiltersCount: activeFiltersCount
        };
    }
    /**
     * Toggle a specific filter value
     * Useful for UI toggle buttons
     */
    toggleEnergyFilter(energy) {
        if (this.settings.filterState.activeEnergy === energy) {
            this.settings.filterState.activeEnergy = "any";
        }
        else {
            this.settings.filterState.activeEnergy = energy;
        }
    }
    /**
     * Toggle context filter
     */
    toggleContextFilter(context) {
        if (this.settings.filterState.activeContext === context) {
            this.settings.filterState.activeContext = "any";
        }
        else {
            this.settings.filterState.activeContext = context;
        }
    }
    /**
     * Toggle a tag in the active tag list
     */
    toggleTag(tag) {
        const idx = this.settings.filterState.activeTags.indexOf(tag);
        if (idx >= 0) {
            this.settings.filterState.activeTags.splice(idx, 1);
        }
        else {
            this.settings.filterState.activeTags.push(tag);
        }
    }
}

class ChaosModal extends obsidian.Modal {
    constructor(app, m) { super(app); this.modifier = m; }
    onOpen() {
        const c = this.contentEl;
        const h1 = c.createEl("h1", { text: "THE OMEN" });
        h1.setAttribute("style", "text-align:center; color:#f55;");
        const ic = c.createEl("div", { text: this.modifier.icon });
        ic.setAttribute("style", "font-size:80px; text-align:center;");
        const h2 = c.createEl("h2", { text: this.modifier.name });
        h2.setAttribute("style", "text-align:center;");
        const p = c.createEl("p", { text: this.modifier.desc });
        p.setAttribute("style", "text-align:center");
        const b = c.createEl("button", { text: "Acknowledge" });
        b.addClass("mod-cta");
        b.style.display = "block";
        b.style.margin = "20px auto";
        b.onclick = () => this.close();
    }
    onClose() { this.contentEl.empty(); }
}
class ShopModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "🛒 BLACK MARKET" });
        contentEl.createEl("p", { text: `Purse: 🪙 ${this.plugin.settings.gold}` });
        this.item(contentEl, "💉 Stimpack", "Heal 20 HP", 50, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.hp = Math.min(this.plugin.settings.maxHp, this.plugin.settings.hp + 20);
        }));
        this.item(contentEl, "💣 Sabotage", "-5 Rival Dmg", 200, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.rivalDmg = Math.max(5, this.plugin.settings.rivalDmg - 5);
        }));
        this.item(contentEl, "🛡️ Shield", "24h Protection", 150, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.shieldedUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
        this.item(contentEl, "😴 Rest Day", "Safe for 24h", 100, () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.restDayUntil = obsidian.moment().add(24, 'hours').toISOString();
        }));
    }
    item(el, name, desc, cost, effect) {
        const c = el.createDiv();
        c.setAttribute("style", "display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;");
        const i = c.createDiv();
        i.createEl("b", { text: name });
        i.createEl("div", { text: desc });
        const b = c.createEl("button", { text: `${cost} G` });
        if (this.plugin.settings.gold < cost) {
            b.setAttribute("disabled", "true");
            b.style.opacity = "0.5";
        }
        else {
            b.addClass("mod-cta");
            b.onclick = () => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.gold -= cost;
                yield effect();
                yield this.plugin.engine.save();
                new obsidian.Notice(`Bought ${name}`);
                this.close();
                new ShopModal(this.app, this.plugin).open();
            });
        }
    }
    onClose() { this.contentEl.empty(); }
}
class QuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.difficulty = 3;
        this.skill = "None";
        this.secSkill = "None";
        this.deadline = "";
        this.highStakes = false;
        this.isBoss = false;
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "⚔️ DEPLOYMENT" });
        new obsidian.Setting(contentEl).setName("Objective").addText(t => {
            t.onChange(v => this.name = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl).setName("Difficulty").addDropdown(d => d.addOption("1", "Trivial").addOption("2", "Easy").addOption("3", "Medium").addOption("4", "Hard").addOption("5", "SUICIDE").setValue("3").onChange(v => this.difficulty = parseInt(v)));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        skills["+ New"] = "+ New";
        new obsidian.Setting(contentEl).setName("Primary Node").addDropdown(d => d.addOptions(skills).onChange(v => {
            if (v === "+ New") {
                this.close();
                new SkillManagerModal(this.app, this.plugin).open();
            }
            else
                this.skill = v;
        }));
        new obsidian.Setting(contentEl).setName("Synergy Node").addDropdown(d => d.addOptions(skills).setValue("None").onChange(v => this.secSkill = v));
        new obsidian.Setting(contentEl).setName("Deadline").addText(t => { t.inputEl.type = "datetime-local"; t.onChange(v => this.deadline = v); });
        new obsidian.Setting(contentEl).setName("High Stakes").setDesc("Double Gold / Double Damage").addToggle(t => t.setValue(false).onChange(v => this.highStakes = v));
        new obsidian.Setting(contentEl).addButton(b => b.setButtonText("Deploy").setCta().onClick(() => {
            if (this.name) {
                this.plugin.engine.createQuest(this.name, this.difficulty, this.skill, this.secSkill, this.deadline, this.highStakes, "Normal", this.isBoss);
                this.close();
            }
        }));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillManagerModal extends obsidian.Modal {
    constructor(app, plugin) { super(app); this.plugin = plugin; }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Add New Node" });
        let n = "";
        new obsidian.Setting(contentEl).setName("Node Name").addText(t => t.onChange(v => n = v)).addButton(b => b.setButtonText("Create").setCta().onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (n) {
                this.plugin.settings.skills.push({ name: n, level: 1, xp: 0, xpReq: 5, lastUsed: new Date().toISOString(), rust: 0, connections: [] });
                yield this.plugin.engine.save();
                this.close();
            }
        })));
    }
    onClose() { this.contentEl.empty(); }
}
class SkillDetailModal extends obsidian.Modal {
    constructor(app, plugin, index) { super(app); this.plugin = plugin; this.index = index; }
    onOpen() {
        const { contentEl } = this;
        const s = this.plugin.settings.skills[this.index];
        contentEl.createEl("h2", { text: `Node: ${s.name}` });
        new obsidian.Setting(contentEl).setName("Name").addText(t => t.setValue(s.name).onChange(v => s.name = v));
        new obsidian.Setting(contentEl).setName("Rust Status").setDesc(`Stacks: ${s.rust}`).addButton(b => b.setButtonText("Manual Polish").onClick(() => __awaiter(this, void 0, void 0, function* () {
            s.rust = 0;
            s.xpReq = Math.floor(s.xpReq / 1.1);
            yield this.plugin.engine.save();
            this.close();
            new obsidian.Notice("Rust polished.");
        })));
        const div = contentEl.createDiv();
        div.setAttribute("style", "margin-top:20px; display:flex; justify-content:space-between;");
        const bSave = div.createEl("button", { text: "Save" });
        bSave.addClass("mod-cta");
        bSave.onclick = () => __awaiter(this, void 0, void 0, function* () { yield this.plugin.engine.save(); this.close(); });
        const bDel = div.createEl("button", { text: "Delete Node" });
        bDel.setAttribute("style", "color:red;");
        bDel.onclick = () => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.skills.splice(this.index, 1);
            yield this.plugin.engine.save();
            this.close();
        });
    }
    onClose() { this.contentEl.empty(); }
}
class ResearchQuestModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.title = "";
        this.type = "survey";
        this.linkedSkill = "None";
        this.linkedCombatQuest = "None";
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RESEARCH DEPLOYMENT" });
        new obsidian.Setting(contentEl)
            .setName("Research Title")
            .addText(t => {
            t.onChange(v => this.title = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        new obsidian.Setting(contentEl)
            .setName("Research Type")
            .addDropdown(d => d
            .addOption("survey", "Survey (100-200 words)")
            .addOption("deep_dive", "Deep Dive (200-400 words)")
            .setValue("survey")
            .onChange(v => this.type = v));
        const skills = { "None": "None" };
        this.plugin.settings.skills.forEach(s => skills[s.name] = s.name);
        new obsidian.Setting(contentEl)
            .setName("Linked Skill")
            .addDropdown(d => d
            .addOptions(skills)
            .setValue("None")
            .onChange(v => this.linkedSkill = v));
        const combatQuests = { "None": "None" };
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    combatQuests[f.basename] = f.basename;
                }
            });
        }
        new obsidian.Setting(contentEl)
            .setName("Link Combat Quest")
            .addDropdown(d => d
            .addOptions(combatQuests)
            .setValue("None")
            .onChange(v => this.linkedCombatQuest = v));
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE RESEARCH")
            .setCta()
            .onClick(() => {
            if (this.title) {
                this.plugin.engine.createResearchQuest(this.title, this.type, this.linkedSkill, this.linkedCombatQuest);
                this.close();
            }
        }));
    }
    onClose() {
        this.contentEl.empty();
    }
}
class ResearchListModal extends obsidian.Modal {
    constructor(app, plugin) {
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
        }
        else {
            quests.forEach((q) => {
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
        }
        else {
            completed.forEach((q) => {
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
class ChainBuilderModal extends obsidian.Modal {
    constructor(app, plugin) {
        super(app);
        this.chainName = "";
        this.selectedQuests = [];
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "CHAIN BUILDER" });
        new obsidian.Setting(contentEl)
            .setName("Chain Name")
            .addText(t => {
            t.onChange(v => this.chainName = v);
            setTimeout(() => t.inputEl.focus(), 50);
        });
        contentEl.createEl("h3", { text: "Select Quests" });
        const questFolder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
        const quests = [];
        if (questFolder instanceof obsidian.TFolder) {
            questFolder.children.forEach(f => {
                if (f instanceof obsidian.TFile && f.extension === "md") {
                    quests.push(f.basename);
                }
            });
        }
        quests.forEach((quest, idx) => {
            new obsidian.Setting(contentEl)
                .setName(quest)
                .addToggle(t => t.onChange(v => {
                if (v) {
                    this.selectedQuests.push(quest);
                }
                else {
                    this.selectedQuests = this.selectedQuests.filter(q => q !== quest);
                }
            }));
        });
        new obsidian.Setting(contentEl)
            .addButton(b => b
            .setButtonText("CREATE CHAIN")
            .setCta()
            .onClick(() => __awaiter(this, void 0, void 0, function* () {
            if (this.chainName && this.selectedQuests.length >= 2) {
                yield this.plugin.engine.createQuestChain(this.chainName, this.selectedQuests);
                this.close();
            }
            else {
                new obsidian.Notice("Chain needs a name and at least 2 quests");
            }
        })));
    }
    onClose() {
        this.contentEl.empty();
    }
}
class VictoryModal extends obsidian.Modal {
    constructor(app, plugin) {
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
        contentEl.createEl("p", {
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
    statLine(el, label, val) {
        const line = el.createDiv({ cls: "sisy-victory-stat" });
        line.innerHTML = `${label}: <span class="sisy-victory-highlight">${val}</span>`;
    }
    onClose() {
        this.contentEl.empty();
    }
}
// [APPEND TO src/ui/modals.ts]
class QuickCaptureModal extends obsidian.Modal {
    constructor(app, plugin) {
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
        input.addEventListener("keypress", (e) => __awaiter(this, void 0, void 0, function* () {
            if (e.key === "Enter" && input.value.trim().length > 0) {
                yield this.plugin.engine.createScrap(input.value);
                this.close();
            }
        }));
        const btn = contentEl.createEl("button", { text: "Capture to Scraps" });
        btn.addClass("mod-cta");
        btn.setAttribute("style", "margin-top: 15px; width: 100%;");
        btn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            if (input.value.trim().length > 0) {
                yield this.plugin.engine.createScrap(input.value);
                this.close();
            }
        });
    }
    onClose() {
        this.contentEl.empty();
    }
}

const DEFAULT_MODIFIER = { name: "Clear Skies", desc: "No effects.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" };
const CHAOS_TABLE = [
    { name: "Clear Skies", desc: "Normal.", xpMult: 1, goldMult: 1, priceMult: 1, icon: "☀️" },
    { name: "Flow State", desc: "+50% XP.", xpMult: 1.5, goldMult: 1, priceMult: 1, icon: "🌊" },
    { name: "Windfall", desc: "+50% Gold.", xpMult: 1, goldMult: 1.5, priceMult: 1, icon: "💰" },
    { name: "Inflation", desc: "Prices 2x.", xpMult: 1, goldMult: 1, priceMult: 2, icon: "📈" },
    { name: "Brain Fog", desc: "XP 0.5x.", xpMult: 0.5, goldMult: 1, priceMult: 1, icon: "🌫️" },
    { name: "Rival Sabotage", desc: "Gold 0.5x.", xpMult: 1, goldMult: 0.5, priceMult: 1, icon: "🕵️" },
    { name: "Adrenaline", desc: "2x XP, -5 HP/Q.", xpMult: 2, goldMult: 1, priceMult: 1, icon: "💉" }
];
const BOSS_DATA = {
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
class SisyphusEngine extends TinyEmitter {
    constructor(app, plugin, audio) {
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
    get settings() { return this.plugin.settings; }
    set settings(val) { this.plugin.settings = val; }
    save() {
        return __awaiter(this, void 0, void 0, function* () { yield this.plugin.saveSettings(); this.trigger("update"); });
    }
    rollDailyMissions() {
        const available = [...MISSION_POOL];
        const selected = [];
        for (let i = 0; i < 3; i++) {
            if (available.length === 0)
                break;
            const idx = Math.floor(Math.random() * available.length);
            const mission = available.splice(idx, 1)[0];
            selected.push(Object.assign(Object.assign({}, mission), { checkFunc: mission.check, progress: 0, completed: false }));
        }
        this.settings.dailyMissions = selected;
        this.settings.dailyMissionDate = obsidian.moment().format("YYYY-MM-DD");
        this.settings.questsCompletedToday = 0;
        this.settings.skillUsesToday = {};
    }
    checkDailyMissions(context) {
        const now = obsidian.moment();
        this.settings.dailyMissions.forEach(mission => {
            if (mission.completed)
                return;
            switch (mission.checkFunc) {
                // [FIX] Added Zero Inbox Logic
                case "zero_inbox":
                    const scraps = this.app.vault.getAbstractFileByPath("Scraps");
                    if (scraps instanceof obsidian.TFolder) {
                        // Complete if 0 files in Scraps
                        mission.progress = scraps.children.length === 0 ? 1 : 0;
                    }
                    else {
                        // If folder doesn't exist, count as done
                        mission.progress = 1;
                    }
                    break;
                case "morning_trivial":
                    if (context.type === "complete" && context.difficulty === 1 && now.hour() < 10)
                        mission.progress++;
                    break;
                case "quest_count":
                    if (context.type === "complete")
                        mission.progress = this.settings.questsCompletedToday;
                    break;
                case "high_stakes":
                    if (context.type === "complete" && context.highStakes)
                        mission.progress++;
                    break;
                case "fast_complete":
                    if (context.type === "complete" && context.questCreated && obsidian.moment().diff(obsidian.moment(context.questCreated), 'hours') <= 2)
                        mission.progress++;
                    break;
                case "synergy":
                    if (context.type === "complete" && context.skill && context.secondarySkill && context.secondarySkill !== "None")
                        mission.progress++;
                    break;
                case "no_damage":
                    if (context.type === "damage")
                        mission.progress = 0;
                    break;
                case "hard_quest":
                    if (context.type === "complete" && context.difficulty && context.difficulty >= 4)
                        mission.progress++;
                    break;
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
                new obsidian.Notice(`✅ Mission Complete: ${mission.name}`);
                this.audio.playSound("success");
            }
        });
        this.save();
    }
    getDifficultyNumber(diffLabel) {
        const map = { "Trivial": 1, "Easy": 2, "Medium": 3, "Hard": 4, "SUICIDE": 5 };
        return map[diffLabel] || 3;
    }
    checkDailyLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = obsidian.moment().format("YYYY-MM-DD");
            if (this.settings.lastLogin) {
                const daysDiff = obsidian.moment().diff(obsidian.moment(this.settings.lastLogin), 'days');
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
                if (this.settings.dailyMissionDate !== today)
                    this.rollDailyMissions();
                yield this.rollChaos(true);
                yield this.save();
            }
        });
    }
    completeQuest(file) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
            if (!fm)
                return;
            const questName = file.basename;
            // Chain Logic
            if (this.chainsEngine.isQuestInChain(questName)) {
                const canStart = this.chainsEngine.canStartQuest(questName);
                if (!canStart) {
                    new obsidian.Notice("Locked by Chain.");
                    return;
                }
                yield this.chainsEngine.completeChainQuest(questName);
            }
            // --- BOSS LOGIC START ---
            if (fm.is_boss) {
                // Extract Level from filename "BOSS_LVL10 - Name"
                const match = file.basename.match(/BOSS_LVL(\d+)/);
                if (match) {
                    const level = parseInt(match[1]);
                    const result = this.analyticsEngine.defeatBoss(level);
                    new obsidian.Notice(result.message);
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
                if (skill.xp >= skill.xpReq) {
                    skill.level++;
                    skill.xp = 0;
                    new obsidian.Notice(`🧠 ${skill.name} Leveled Up!`);
                }
            }
            // Secondary Skill Logic
            const secondary = fm.secondary_skill || "None";
            if (secondary && secondary !== "None") {
                const secSkill = this.settings.skills.find(s => s.name === secondary);
                if (secSkill) {
                    // Link skills
                    if (!skill.connections)
                        skill.connections = [];
                    if (!skill.connections.includes(secondary)) {
                        skill.connections.push(secondary);
                        new obsidian.Notice(`🔗 Neural Link Established`);
                    }
                    // Bonus XP
                    xp += Math.floor(secSkill.level * 0.5);
                    secSkill.xp += 0.5;
                }
            }
            this.settings.xp += xp;
            this.settings.gold += gold;
            if (this.settings.dailyModifier.name === "Adrenaline")
                this.settings.hp -= 5;
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
                msgs.forEach(m => new obsidian.Notice(m));
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
            if (!this.app.vault.getAbstractFileByPath(archivePath))
                yield this.app.vault.createFolder(archivePath);
            // Add completion timestamp
            yield this.app.fileManager.processFrontMatter(file, (f) => {
                f.status = "completed";
                f.completed_at = new Date().toISOString();
            });
            yield this.app.fileManager.renameFile(file, `${archivePath}/${file.name}`);
            yield this.save();
        });
    }
    spawnBoss(level) {
        return __awaiter(this, void 0, void 0, function* () {
            const boss = BOSS_DATA[level];
            if (!boss)
                return;
            // [FIX] Boss Ritual: Audio buildup + Delay
            this.audio.playSound("heartbeat");
            new obsidian.Notice("⚠️ ANOMALY DETECTED...", 2000);
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                this.audio.playSound("death");
                new obsidian.Notice(`☠️ BOSS SPAWNED: ${boss.name}`);
                yield this.createQuest(`BOSS_LVL${level} - ${boss.name}`, 5, "Boss", "None", obsidian.moment().add(3, 'days').toISOString(), true, "Critical", true);
            }), 3000);
        });
    }
    failQuest(file_1) {
        return __awaiter(this, arguments, void 0, function* (file, manualAbort = false) {
            if (this.isResting() && !manualAbort) {
                new obsidian.Notice("Rest Day protection.");
                return;
            }
            if (this.isShielded() && !manualAbort) {
                new obsidian.Notice("Shielded!");
                return;
            }
            let damage = 10 + Math.floor(this.settings.rivalDmg / 2);
            if (this.settings.gold < 0)
                damage *= 2; // Debt penalty
            this.settings.hp -= damage;
            this.settings.damageTakenToday += damage;
            if (!manualAbort)
                this.settings.rivalDmg += 1;
            this.audio.playSound("fail");
            this.checkDailyMissions({ type: "damage" });
            if (this.settings.damageTakenToday > 50) {
                this.meditationEngine.triggerLockdown();
                this.trigger("lockdown");
            }
            const gravePath = "Graveyard/Failures";
            if (!this.app.vault.getAbstractFileByPath(gravePath))
                yield this.app.vault.createFolder(gravePath);
            yield this.app.fileManager.renameFile(file, `${gravePath}/[FAILED] ${file.name}`);
            yield this.save();
        });
    }
    createQuest(name, diff, skill, secSkill, deadlineIso, highStakes, priority, isBoss) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("LOCKDOWN ACTIVE");
                return;
            }
            // ... (Logic same as before, condensed for brevity) ...
            // Note: Copy the rest of your createQuest logic exactly as it was, or use the previous version.
            // For safety, I'll include the standard implementation here:
            let xpReward = 0;
            let goldReward = 0;
            let diffLabel = "";
            switch (diff) {
                case 1:
                    xpReward = Math.floor(this.settings.xpReq * 0.05);
                    goldReward = 10;
                    diffLabel = "Trivial";
                    break;
                case 2:
                    xpReward = Math.floor(this.settings.xpReq * 0.10);
                    goldReward = 20;
                    diffLabel = "Easy";
                    break;
                case 3:
                    xpReward = Math.floor(this.settings.xpReq * 0.20);
                    goldReward = 40;
                    diffLabel = "Medium";
                    break;
                case 4:
                    xpReward = Math.floor(this.settings.xpReq * 0.40);
                    goldReward = 80;
                    diffLabel = "Hard";
                    break;
                case 5:
                    xpReward = Math.floor(this.settings.xpReq * 0.60);
                    goldReward = 150;
                    diffLabel = "SUICIDE";
                    break;
            }
            if (isBoss) {
                xpReward = 1000;
                goldReward = 1000;
                diffLabel = "☠️ BOSS";
            }
            if (highStakes && !isBoss)
                goldReward = Math.floor(goldReward * 1.5);
            const rootPath = "Active_Run/Quests";
            if (!this.app.vault.getAbstractFileByPath(rootPath))
                yield this.app.vault.createFolder(rootPath);
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
            yield this.app.vault.create(`${rootPath}/${safeName}.md`, content);
            this.audio.playSound("click");
            this.save();
        });
    }
    deleteQuest(file) {
        return __awaiter(this, void 0, void 0, function* () { yield this.app.vault.delete(file); this.save(); });
    }
    checkDeadlines() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            if (!(folder instanceof obsidian.TFolder))
                return;
            for (const file of folder.children) {
                if (file instanceof obsidian.TFile) {
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    if ((fm === null || fm === void 0 ? void 0 : fm.deadline) && obsidian.moment().isAfter(obsidian.moment(fm.deadline)))
                        yield this.failQuest(file);
                }
            }
            this.save();
        });
    }
    rollChaos() {
        return __awaiter(this, arguments, void 0, function* (showModal = false) {
            const roll = Math.random();
            if (roll < 0.4)
                this.settings.dailyModifier = DEFAULT_MODIFIER;
            else {
                const idx = Math.floor(Math.random() * (CHAOS_TABLE.length - 1)) + 1;
                this.settings.dailyModifier = CHAOS_TABLE[idx];
            }
            yield this.save();
            if (showModal)
                new ChaosModal(this.app, this.settings.dailyModifier).open();
        });
    }
    attemptRecovery() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.meditationEngine.isLockedDown()) {
                new obsidian.Notice("Not in Lockdown.");
                return;
            }
            const { hours, minutes } = this.meditationEngine.getLockdownTimeRemaining();
            new obsidian.Notice(`Recovering... ${hours}h ${minutes}m remaining.`);
        });
    }
    isLockedDown() { return this.meditationEngine.isLockedDown(); }
    isResting() { return this.settings.restDayUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.restDayUntil)); }
    isShielded() { return this.settings.shieldedUntil && obsidian.moment().isBefore(obsidian.moment(this.settings.shieldedUntil)); }
    createResearchQuest(title, type, linkedSkill, linkedCombatQuest) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.researchEngine.createResearchQuest(title, type, linkedSkill, linkedCombatQuest);
            if (res.success)
                new obsidian.Notice(res.message);
            else
                new obsidian.Notice(res.message);
            yield this.save();
        });
    }
    completeResearchQuest(id, words) { this.researchEngine.completeResearchQuest(id, words); this.save(); }
    deleteResearchQuest(id) { this.researchEngine.deleteResearchQuest(id); this.save(); }
    updateResearchWordCount(id, words) { this.researchEngine.updateResearchWordCount(id, words); }
    getResearchRatio() { return this.researchEngine.getResearchRatio(); }
    canCreateResearchQuest() { return this.researchEngine.canCreateResearchQuest(); }
    startMeditation() {
        return __awaiter(this, void 0, void 0, function* () { const r = this.meditationEngine.meditate(); new obsidian.Notice(r.message); yield this.save(); });
    }
    getMeditationStatus() { return this.meditationEngine.getMeditationStatus(); }
    createQuestChain(name, quests) {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.createQuestChain(name, quests); yield this.save(); });
    }
    getActiveChain() { return this.chainsEngine.getActiveChain(); }
    getChainProgress() { return this.chainsEngine.getChainProgress(); }
    breakChain() {
        return __awaiter(this, void 0, void 0, function* () { yield this.chainsEngine.breakChain(); yield this.save(); });
    }
    createScrap(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const folderPath = "Scraps";
            // Ensure folder exists
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                yield this.app.vault.createFolder(folderPath);
            }
            // Generate filename: YYYY-MM-DD HH-mm-ss
            const timestamp = obsidian.moment().format("YYYY-MM-DD HH-mm-ss");
            const filename = `${folderPath}/${timestamp}.md`;
            // Create file
            yield this.app.vault.create(filename, content);
            new obsidian.Notice("⚡ Scrap Captured");
            this.audio.playSound("click");
        });
    }
    generateSkillGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            const skills = this.settings.skills;
            if (skills.length === 0) {
                new obsidian.Notice("No neural nodes found. Create skills first!");
                return;
            }
            const nodes = [];
            const edges = [];
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
                if (skill.rust > 0)
                    color = "1";
                else if (skill.level >= 10)
                    color = "6";
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
            if (file instanceof obsidian.TFile) {
                yield this.app.vault.modify(file, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub updated.");
            }
            else {
                yield this.app.vault.create(path, JSON.stringify(canvasData, null, 2));
                new obsidian.Notice("Neural Hub created.");
            }
        });
    }
    setFilterState(energy, context, tags) { this.filtersEngine.setFilterState(energy, context, tags); this.save(); }
    clearFilters() { this.filtersEngine.clearFilters(); this.save(); }
    getGameStats() { return this.analyticsEngine.getGameStats(); }
    checkBossMilestones() { return this.analyticsEngine.checkBossMilestones(); }
    generateWeeklyReport() { return this.analyticsEngine.generateWeeklyReport(); }
    taunt(trigger) { }
    parseQuickInput(text) { }
    triggerDeath() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings.level = 1;
            this.settings.hp = 100;
            this.settings.gold = 0;
            this.settings.legacy.deathCount = (this.settings.legacy.deathCount || 0) + 1;
            yield this.save();
        });
    }
}

const VIEW_TYPE_PANOPTICON = "sisyphus-panopticon";
class PanopticonView extends obsidian.ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
    }
    getViewType() { return VIEW_TYPE_PANOPTICON; }
    getDisplayText() { return "Eye Sisyphus"; }
    getIcon() { return "skull"; }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.refresh();
            this.plugin.engine.on('update', this.refresh.bind(this));
        });
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const c = this.contentEl;
            c.empty();
            const container = c.createDiv({ cls: "sisy-container" });
            const scroll = container.createDiv({ cls: "sisy-scroll-area" });
            // --- 1. HEADER & CRITICAL ALERTS ---
            scroll.createEl("h2", { text: "Eye SISYPHUS OS", cls: "sisy-header" });
            // [NEW] DEBT WARNING
            if (this.plugin.settings.gold < 0) {
                const d = scroll.createDiv({ cls: "sisy-alert sisy-alert-debt" });
                d.createEl("h3", { text: "⚠️ DEBT CRISIS ACTIVE" });
                d.createEl("p", { text: "ALL DAMAGE RECEIVED IS DOUBLED." });
                // [FIXED] style moved to attr
                d.createEl("p", {
                    text: `Current Balance: ${this.plugin.settings.gold}g`,
                    attr: { style: "font-weight:bold" }
                });
            }
            if (this.plugin.engine.isLockedDown()) {
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
            if (this.plugin.engine.isResting()) {
                const r = scroll.createDiv({ cls: "sisy-alert sisy-alert-rest" });
                r.createEl("h3", { text: "REST DAY ACTIVE" });
                const timeRemaining = obsidian.moment(this.plugin.settings.restDayUntil).diff(obsidian.moment(), 'minutes');
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
            if (this.plugin.settings.gold < 0)
                lights.createDiv({ text: "DEBT: YES", cls: "sisy-light-active" });
            // DLC 1: Scars display
            const scarCount = ((_a = this.plugin.settings.legacy) === null || _a === void 0 ? void 0 : _a.deathCount) || 0;
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
            yield this.renderQuests(scroll);
            scroll.createDiv({ text: "NEURAL HUB", cls: "sisy-section-title" });
            this.plugin.settings.skills.forEach((s, idx) => {
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
                fill.setAttribute("style", `width: ${(s.xp / s.xpReq) * 100}%; background: ${s.rust > 0 ? '#d35400' : '#00b0ff'}`);
            });
            const addBtn = scroll.createDiv({ text: "+ Add Neural Node", cls: "sisy-add-skill" });
            addBtn.onclick = () => new SkillManagerModal(this.app, this.plugin).open();
            // --- 8. QUICK CAPTURE ---
            const footer = container.createDiv({ cls: "sisy-quick-capture" });
            const input = footer.createEl("input", { cls: "sisy-quick-input", placeholder: "Mission /1...5" });
            input.onkeydown = (e) => __awaiter(this, void 0, void 0, function* () {
                if (e.key === 'Enter' && input.value.trim()) {
                    this.plugin.engine.parseQuickInput(input.value.trim());
                    input.value = "";
                }
            });
        });
    }
    // DLC 1: Render Daily Missions
    renderDailyMissions(parent) {
        const missions = this.plugin.settings.dailyMissions || [];
        if (missions.length === 0) {
            parent.createDiv({ text: "No missions today. Check back tomorrow.", cls: "sisy-empty-state" });
            return;
        }
        const missionsDiv = parent.createDiv({ cls: "sisy-daily-missions" });
        missions.forEach((mission) => {
            const card = missionsDiv.createDiv({ cls: "sisy-mission-card" });
            if (mission.completed)
                card.addClass("sisy-mission-completed");
            const header = card.createDiv({ cls: "sisy-mission-header" });
            const statusIcon = mission.completed ? "YES" : "..";
            header.createEl("span", { text: statusIcon, cls: "sisy-mission-status" });
            header.createEl("span", { text: mission.name, cls: "sisy-mission-name" });
            card.createEl("p", { text: mission.desc, cls: "sisy-mission-desc" });
            const progress = card.createDiv({ cls: "sisy-mission-progress" });
            progress.createEl("span", { text: `${mission.progress}/${mission.target}`, cls: "sisy-mission-counter" });
            const bar = progress.createDiv({ cls: "sisy-bar-bg" });
            const fill = bar.createDiv({ cls: "sisy-bar-fill" });
            const percent = (mission.progress / mission.target) * 100;
            fill.setAttribute("style", `width: ${Math.min(percent, 100)}%`);
            const reward = card.createDiv({ cls: "sisy-mission-reward" });
            if (mission.reward.xp > 0)
                reward.createSpan({ text: `+${mission.reward.xp} XP`, cls: "sisy-reward-xp" });
            if (mission.reward.gold > 0)
                reward.createSpan({ text: `+${mission.reward.gold}g`, cls: "sisy-reward-gold" });
        });
        const allCompleted = missions.every(m => m.completed);
        if (allCompleted && missions.length > 0) {
            missionsDiv.createDiv({ text: "All Missions Complete! +50 Bonus Gold", cls: "sisy-mission-bonus" });
        }
    }
    // DLC 2: Render Research Quests Section
    renderResearchSection(parent) {
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
        }
        else {
            activeResearch.forEach((quest) => {
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
        }
        else {
            completedResearch.forEach((quest) => {
                const item = parent.createEl("p", { text: `+ ${quest.title} (${quest.type === "survey" ? "Survey" : "Deep Dive"})` });
                item.setAttribute("style", "opacity: 0.6; font-size: 0.9em; margin: 3px 0;");
            });
        }
    }
    renderQuests(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const folder = this.app.vault.getAbstractFileByPath("Active_Run/Quests");
            let count = 0;
            if (folder instanceof obsidian.TFolder) {
                let files = folder.children.filter(f => f instanceof obsidian.TFile);
                files = this.plugin.engine.filtersEngine.filterQuests(files); // [AUTO-FIX] Apply filters
                files.sort((a, b) => {
                    var _a, _b;
                    const fmA = (_a = this.app.metadataCache.getFileCache(a)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const fmB = (_b = this.app.metadataCache.getFileCache(b)) === null || _b === void 0 ? void 0 : _b.frontmatter;
                    const dateA = (fmA === null || fmA === void 0 ? void 0 : fmA.deadline) ? obsidian.moment(fmA.deadline).valueOf() : 9999999999999;
                    const dateB = (fmB === null || fmB === void 0 ? void 0 : fmB.deadline) ? obsidian.moment(fmB.deadline).valueOf() : 9999999999999;
                    return dateA - dateB;
                });
                for (const file of files) {
                    count++;
                    const fm = (_a = this.app.metadataCache.getFileCache(file)) === null || _a === void 0 ? void 0 : _a.frontmatter;
                    const card = parent.createDiv({ cls: "sisy-card" });
                    if (fm === null || fm === void 0 ? void 0 : fm.is_boss)
                        card.addClass("sisy-card-boss");
                    const d = String((fm === null || fm === void 0 ? void 0 : fm.difficulty) || "").match(/\d/);
                    if (d)
                        card.addClass(`sisy-card-${d[0]}`);
                    // Top section with title and timer
                    const top = card.createDiv({ cls: "sisy-card-top" });
                    top.createDiv({ text: file.basename, cls: "sisy-card-title" });
                    // Timer
                    if (fm === null || fm === void 0 ? void 0 : fm.deadline) {
                        const diff = obsidian.moment(fm.deadline).diff(obsidian.moment(), 'minutes');
                        const hours = Math.floor(diff / 60);
                        const mins = diff % 60;
                        const timerText = diff < 0 ? "EXPIRED" : `${hours}h ${mins}m`;
                        const timer = top.createDiv({ text: timerText, cls: "sisy-timer" });
                        if (diff < 60)
                            timer.addClass("sisy-timer-late");
                    }
                    // Trash icon (inline, not absolute)
                    const trash = top.createDiv({ cls: "sisy-trash", text: "[X]" });
                    trash.style.cursor = "pointer";
                    trash.style.color = "#ff5555";
                    trash.onclick = (e) => {
                        e.stopPropagation();
                        this.plugin.engine.deleteQuest(file);
                    };
                    // Action buttons
                    const acts = card.createDiv({ cls: "sisy-actions" });
                    const bD = acts.createEl("button", { text: "OK", cls: "sisy-action-btn mod-done" });
                    bD.onclick = () => this.plugin.engine.completeQuest(file);
                    const bF = acts.createEl("button", { text: "XX", cls: "sisy-action-btn mod-fail" });
                    bF.onclick = () => this.plugin.engine.failQuest(file, true);
                }
            }
            if (count === 0) {
                const idle = parent.createDiv({ text: "System Idle.", cls: "sisy-empty-state" });
                const ctaBtn = idle.createEl("button", { text: "[DEPLOY QUEST]", cls: "sisy-btn mod-cta" });
                ctaBtn.style.marginTop = "10px";
                ctaBtn.onclick = () => new QuestModal(this.app, this.plugin).open();
            }
        });
    }
    renderChainSection(parent) {
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
        breakBtn.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.plugin.engine.breakChain();
            this.refresh();
        });
    }
    renderFilterBar(parent) {
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
                this.plugin.engine.setFilterState(opt, filters.activeContext, filters.activeTags);
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
                this.plugin.engine.setFilterState(filters.activeEnergy, opt, filters.activeTags);
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
    renderAnalytics(parent) {
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
        // Boss progress
        analyticsDiv.createEl("h4", { text: "Boss Milestones" }).setAttribute("style", "margin: 12px 0 8px 0; color: #ffc107;");
        const bosses = this.plugin.settings.bossMilestones;
        if (bosses && bosses.length > 0) {
            bosses.forEach((boss) => {
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
    stat(p, label, val, cls = "") {
        const b = p.createDiv({ cls: "sisy-stat-box" });
        if (cls)
            b.addClass(cls);
        b.createDiv({ text: label, cls: "sisy-stat-label" });
        b.createDiv({ text: val, cls: "sisy-stat-val" });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            this.plugin.engine.off('update', this.refresh.bind(this));
        });
    }
}

const DEFAULT_SETTINGS = {
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
};
class SisyphusPlugin extends obsidian.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
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
            yield this.loadSettings();
            this.loadStyles();
            this.audio = new AudioController(this.settings.muted);
            this.engine = new SisyphusEngine(this.app, this, this.audio);
            this.registerView(VIEW_TYPE_PANOPTICON, (leaf) => new PanopticonView(leaf, this));
            this.statusBarItem = this.addStatusBarItem();
            window.sisyphusEngine = this.engine;
            yield this.engine.checkDailyLogin();
            this.updateStatusBar();
            // --- COMMANDS ---
            this.addCommand({ id: 'open-panopticon', name: 'Open Panopticon', callback: () => this.activateView() });
            this.addCommand({ id: 'toggle-focus', name: 'Toggle Focus Audio', callback: () => this.audio.toggleBrownNoise() });
            this.addCommand({ id: 'create-research', name: 'Research: Create Quest', callback: () => new ResearchQuestModal(this.app, this).open() });
            this.addCommand({ id: 'view-research', name: 'Research: View Library', callback: () => new ResearchListModal(this.app, this).open() });
            this.addCommand({ id: 'meditate', name: 'Meditation: Start', callback: () => this.engine.startMeditation() });
            this.addCommand({ id: 'create-chain', name: 'Chains: Create', callback: () => new ChainBuilderModal(this.app, this).open() });
            this.addCommand({ id: 'view-chains', name: 'Chains: View Active', callback: () => { const c = this.engine.getActiveChain(); new obsidian.Notice(c ? `Active: ${c.name}` : "No active chain"); } });
            this.addCommand({ id: 'filter-high', name: 'Filters: High Energy', callback: () => this.engine.setFilterState("high", "any", []) });
            this.addCommand({ id: 'clear-filters', name: 'Filters: Clear', callback: () => this.engine.clearFilters() });
            this.addCommand({ id: 'game-stats', name: 'Analytics: Stats', callback: () => { const s = this.engine.getGameStats(); new obsidian.Notice(`Lvl ${s.level} | Streak ${s.currentStreak}`); } });
            this.addRibbonIcon('skull', 'Sisyphus Sidebar', () => this.activateView());
            this.registerInterval(window.setInterval(() => this.engine.checkDeadlines(), 60000));
            // [FIX] Debounced Word Counter (Typewriter Fix)
            const debouncedUpdate = obsidian.debounce((file, content) => {
                var _a;
                const cache = this.app.metadataCache.getFileCache(file);
                if ((_a = cache === null || cache === void 0 ? void 0 : cache.frontmatter) === null || _a === void 0 ? void 0 : _a.research_id) {
                    const words = content.trim().split(/\s+/).length;
                    this.engine.updateResearchWordCount(cache.frontmatter.research_id, words);
                }
            }, 1000, true);
            this.registerEvent(this.app.workspace.on('editor-change', (editor, info) => {
                if (!info || !info.file)
                    return;
                debouncedUpdate(info.file, editor.getValue());
            }));
        });
    }
    loadStyles() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cssFile = this.app.vault.getAbstractFileByPath(this.manifest.dir + "/styles.css");
                if (cssFile instanceof obsidian.TFile) {
                    const css = yield this.app.vault.read(cssFile);
                    const style = document.createElement("style");
                    style.id = "sisyphus-styles";
                    style.innerHTML = css;
                    document.head.appendChild(style);
                }
            }
            catch (e) {
                console.error("Could not load styles.css", e);
            }
        });
    }
    onunload() {
        return __awaiter(this, void 0, void 0, function* () {
            this.app.workspace.detachLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (this.audio.audioCtx)
                this.audio.audioCtx.close();
            const style = document.getElementById("sisyphus-styles");
            if (style)
                style.remove();
        });
    }
    activateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_PANOPTICON);
            if (leaves.length > 0)
                leaf = leaves[0];
            else {
                leaf = workspace.getRightLeaf(false);
                yield leaf.setViewState({ type: VIEW_TYPE_PANOPTICON, active: true });
            }
            workspace.revealLeaf(leaf);
        });
    }
    updateStatusBar() {
        const shield = (this.engine.isShielded() || this.engine.isResting()) ? (this.engine.isResting() ? "D" : "S") : "";
        const mCount = this.settings.dailyMissions.filter(m => m.completed).length;
        this.statusBarItem.setText(`${this.settings.dailyModifier.icon} ${shield} HP${this.settings.hp} G${this.settings.gold} M${mCount}/3`);
        this.statusBarItem.style.color = this.settings.hp < 30 ? "red" : this.settings.gold < 0 ? "orange" : "";
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () { this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData()); });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () { yield this.saveData(this.settings); });
    }
}

module.exports = SisyphusPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsInNyYy91dGlscy50cyIsInNyYy9lbmdpbmVzL0FuYWx5dGljc0VuZ2luZS50cyIsInNyYy9lbmdpbmVzL01lZGl0YXRpb25FbmdpbmUudHMiLCJzcmMvZW5naW5lcy9SZXNlYXJjaEVuZ2luZS50cyIsInNyYy9lbmdpbmVzL0NoYWluc0VuZ2luZS50cyIsInNyYy9lbmdpbmVzL0ZpbHRlcnNFbmdpbmUudHMiLCJzcmMvdWkvbW9kYWxzLnRzIiwic3JjL2VuZ2luZS50cyIsInNyYy91aS92aWV3LnRzIiwic3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cclxuXHJcblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxyXG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXHJcblxyXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXHJcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxyXG5BTkQgRklUTkVTUy4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUiBCRSBMSUFCTEUgRk9SIEFOWSBTUEVDSUFMLCBESVJFQ1QsXHJcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxyXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxyXG5PVEhFUiBUT1JUSU9VUyBBQ1RJT04sIEFSSVNJTkcgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgVVNFIE9SXHJcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBSZWZsZWN0LCBQcm9taXNlLCBTdXBwcmVzc2VkRXJyb3IsIFN5bWJvbCwgSXRlcmF0b3IgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xyXG4gICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gX19hc3NpZ24odCkge1xyXG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkpIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH1cclxuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcclxuICAgIHZhciB0ID0ge307XHJcbiAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICB0W3BdID0gc1twXTtcclxuICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcclxuICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgIH1cclxuICAgIHJldHVybiB0O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCwga2V5KSB7IGRlY29yYXRvcih0YXJnZXQsIGtleSwgcGFyYW1JbmRleCk7IH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZXNEZWNvcmF0ZShjdG9yLCBkZXNjcmlwdG9ySW4sIGRlY29yYXRvcnMsIGNvbnRleHRJbiwgaW5pdGlhbGl6ZXJzLCBleHRyYUluaXRpYWxpemVycykge1xyXG4gICAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XHJcbiAgICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xyXG4gICAgdmFyIHRhcmdldCA9ICFkZXNjcmlwdG9ySW4gJiYgY3RvciA/IGNvbnRleHRJbltcInN0YXRpY1wiXSA/IGN0b3IgOiBjdG9yLnByb3RvdHlwZSA6IG51bGw7XHJcbiAgICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcclxuICAgIHZhciBfLCBkb25lID0gZmFsc2U7XHJcbiAgICBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4uYWNjZXNzKSBjb250ZXh0LmFjY2Vzc1twXSA9IGNvbnRleHRJbi5hY2Nlc3NbcF07XHJcbiAgICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcclxuICAgICAgICBpZiAoa2luZCA9PT0gXCJhY2Nlc3NvclwiKSB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmdldCkpIGRlc2NyaXB0b3IuZ2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcclxuICAgICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XHJcbiAgICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xyXG4gICAgICAgICAgICBlbHNlIGRlc2NyaXB0b3Jba2V5XSA9IF87XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRhcmdldCkgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgY29udGV4dEluLm5hbWUsIGRlc2NyaXB0b3IpO1xyXG4gICAgZG9uZSA9IHRydWU7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xyXG4gICAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluaXRpYWxpemVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcclxuICAgIH1cclxuICAgIHJldHVybiB1c2VWYWx1ZSA/IHZhbHVlIDogdm9pZCAwO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcHJvcEtleSh4KSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XHJcbiAgICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XHJcbiAgICByZXR1cm4gT2JqZWN0LmRlZmluZVByb3BlcnR5KGYsIFwibmFtZVwiLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IHByZWZpeCA/IFwiXCIuY29uY2F0KHByZWZpeCwgXCIgXCIsIG5hbWUpIDogbmFtZSB9KTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGcgPSBPYmplY3QuY3JlYXRlKCh0eXBlb2YgSXRlcmF0b3IgPT09IFwiZnVuY3Rpb25cIiA/IEl0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpO1xyXG4gICAgcmV0dXJuIGcubmV4dCA9IHZlcmIoMCksIGdbXCJ0aHJvd1wiXSA9IHZlcmIoMSksIGdbXCJyZXR1cm5cIl0gPSB2ZXJiKDIpLCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgd2hpbGUgKGcgJiYgKGcgPSAwLCBvcFswXSAmJiAoXyA9IDApKSwgXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobSwgayk7XHJcbiAgICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xyXG4gICAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xyXG59KSA6IChmdW5jdGlvbihvLCBtLCBrLCBrMikge1xyXG4gICAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcclxuICAgIG9bazJdID0gbVtrXTtcclxufSk7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKHAgIT09IFwiZGVmYXVsdFwiICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobywgcCkpIF9fY3JlYXRlQmluZGluZyhvLCBtLCBwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fdmFsdWVzKG8pIHtcclxuICAgIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XHJcbiAgICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcclxuICAgIGlmIChvICYmIHR5cGVvZiBvLmxlbmd0aCA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHtcclxuICAgICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihzID8gXCJPYmplY3QgaXMgbm90IGl0ZXJhYmxlLlwiIDogXCJTeW1ib2wuaXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19yZWFkKG8sIG4pIHtcclxuICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICB2YXIgaSA9IG0uY2FsbChvKSwgciwgYXIgPSBbXSwgZTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgIGZpbmFsbHkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmaW5hbGx5IHsgaWYgKGUpIHRocm93IGUuZXJyb3I7IH1cclxuICAgIH1cclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcclxuICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgIHJldHVybiBhcjtcclxufVxyXG5cclxuLyoqIEBkZXByZWNhdGVkICovXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xyXG4gICAgaWYgKHBhY2sgfHwgYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgZm9yICh2YXIgaSA9IDAsIGwgPSBmcm9tLmxlbmd0aCwgYXI7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XHJcbiAgICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XHJcbiAgICAgICAgICAgIGFyW2ldID0gZnJvbVtpXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdG8uY29uY2F0KGFyIHx8IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGZyb20pKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IE9iamVjdC5jcmVhdGUoKHR5cGVvZiBBc3luY0l0ZXJhdG9yID09PSBcImZ1bmN0aW9uXCIgPyBBc3luY0l0ZXJhdG9yIDogT2JqZWN0KS5wcm90b3R5cGUpLCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIsIGF3YWl0UmV0dXJuKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgZnVuY3Rpb24gYXdhaXRSZXR1cm4oZikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGYsIHJlamVjdCk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpZiAoZ1tuXSkgeyBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyBpZiAoZikgaVtuXSA9IGYoaVtuXSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XHJcbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jRGVsZWdhdG9yKG8pIHtcclxuICAgIHZhciBpLCBwO1xyXG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IGZhbHNlIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbnZhciBvd25LZXlzID0gZnVuY3Rpb24obykge1xyXG4gICAgb3duS2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIHx8IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGFyID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgayBpbiBvKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGspKSBhclthci5sZW5ndGhdID0gaztcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIG93bktleXMobyk7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnRTdGFyKG1vZCkge1xyXG4gICAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcclxuICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayA9IG93bktleXMobW9kKSwgaSA9IDA7IGkgPCBrLmxlbmd0aDsgaSsrKSBpZiAoa1tpXSAhPT0gXCJkZWZhdWx0XCIpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwga1tpXSk7XHJcbiAgICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0RGVmYXVsdChtb2QpIHtcclxuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xyXG4gICAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xyXG4gICAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgcmVhZCBwcml2YXRlIG1lbWJlciBmcm9tIGFuIG9iamVjdCB3aG9zZSBjbGFzcyBkaWQgbm90IGRlY2xhcmUgaXRcIik7XHJcbiAgICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XHJcbiAgICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBzZXR0ZXJcIik7XHJcbiAgICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xyXG4gICAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XHJcbiAgICBpZiAocmVjZWl2ZXIgPT09IG51bGwgfHwgKHR5cGVvZiByZWNlaXZlciAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgcmVjZWl2ZXIgIT09IFwiZnVuY3Rpb25cIikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgdXNlICdpbicgb3BlcmF0b3Igb24gbm9uLW9iamVjdFwiKTtcclxuICAgIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xyXG4gICAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcclxuICAgICAgICB2YXIgZGlzcG9zZSwgaW5uZXI7XHJcbiAgICAgICAgaWYgKGFzeW5jKSB7XHJcbiAgICAgICAgICAgIGlmICghU3ltYm9sLmFzeW5jRGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0Rpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xyXG4gICAgICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmFzeW5jRGlzcG9zZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChkaXNwb3NlID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgaWYgKCFTeW1ib2wuZGlzcG9zZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5kaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5kaXNwb3NlXTtcclxuICAgICAgICAgICAgaWYgKGFzeW5jKSBpbm5lciA9IGRpc3Bvc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcclxuICAgICAgICBpZiAoaW5uZXIpIGRpc3Bvc2UgPSBmdW5jdGlvbigpIHsgdHJ5IHsgaW5uZXIuY2FsbCh0aGlzKTsgfSBjYXRjaCAoZSkgeyByZXR1cm4gUHJvbWlzZS5yZWplY3QoZSk7IH0gfTtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYXN5bmMpIHtcclxuICAgICAgICBlbnYuc3RhY2sucHVzaCh7IGFzeW5jOiB0cnVlIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG5cclxufVxyXG5cclxudmFyIF9TdXBwcmVzc2VkRXJyb3IgPSB0eXBlb2YgU3VwcHJlc3NlZEVycm9yID09PSBcImZ1bmN0aW9uXCIgPyBTdXBwcmVzc2VkRXJyb3IgOiBmdW5jdGlvbiAoZXJyb3IsIHN1cHByZXNzZWQsIG1lc3NhZ2UpIHtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XHJcbiAgICBmdW5jdGlvbiBmYWlsKGUpIHtcclxuICAgICAgICBlbnYuZXJyb3IgPSBlbnYuaGFzRXJyb3IgPyBuZXcgX1N1cHByZXNzZWRFcnJvcihlLCBlbnYuZXJyb3IsIFwiQW4gZXJyb3Igd2FzIHN1cHByZXNzZWQgZHVyaW5nIGRpc3Bvc2FsLlwiKSA6IGU7XHJcbiAgICAgICAgZW52Lmhhc0Vycm9yID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciByLCBzID0gMDtcclxuICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgd2hpbGUgKHIgPSBlbnYuc3RhY2sucG9wKCkpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmICghci5hc3luYyAmJiBzID09PSAxKSByZXR1cm4gcyA9IDAsIGVudi5zdGFjay5wdXNoKHIpLCBQcm9taXNlLnJlc29sdmUoKS50aGVuKG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuZGlzcG9zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSByLmRpc3Bvc2UuY2FsbChyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoci5hc3luYykgcmV0dXJuIHMgfD0gMiwgUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBzIHw9IDE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGZhaWwoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHMgPT09IDEpIHJldHVybiBlbnYuaGFzRXJyb3IgPyBQcm9taXNlLnJlamVjdChlbnYuZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgaWYgKGVudi5oYXNFcnJvcikgdGhyb3cgZW52LmVycm9yO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uKHBhdGgsIHByZXNlcnZlSnN4KSB7XHJcbiAgICBpZiAodHlwZW9mIHBhdGggPT09IFwic3RyaW5nXCIgJiYgL15cXC5cXC4/XFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFwuKHRzeCkkfCgoPzpcXC5kKT8pKCg/OlxcLlteLi9dKz8pPylcXC4oW2NtXT8pdHMkL2ksIGZ1bmN0aW9uIChtLCB0c3gsIGQsIGV4dCwgY20pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRzeCA/IHByZXNlcnZlSnN4ID8gXCIuanN4XCIgOiBcIi5qc1wiIDogZCAmJiAoIWV4dCB8fCAhY20pID8gbSA6IChkICsgZXh0ICsgXCIuXCIgKyBjbS50b0xvd2VyQ2FzZSgpICsgXCJqc1wiKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBwYXRoO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7XHJcbiAgICBfX2V4dGVuZHM6IF9fZXh0ZW5kcyxcclxuICAgIF9fYXNzaWduOiBfX2Fzc2lnbixcclxuICAgIF9fcmVzdDogX19yZXN0LFxyXG4gICAgX19kZWNvcmF0ZTogX19kZWNvcmF0ZSxcclxuICAgIF9fcGFyYW06IF9fcGFyYW0sXHJcbiAgICBfX2VzRGVjb3JhdGU6IF9fZXNEZWNvcmF0ZSxcclxuICAgIF9fcnVuSW5pdGlhbGl6ZXJzOiBfX3J1bkluaXRpYWxpemVycyxcclxuICAgIF9fcHJvcEtleTogX19wcm9wS2V5LFxyXG4gICAgX19zZXRGdW5jdGlvbk5hbWU6IF9fc2V0RnVuY3Rpb25OYW1lLFxyXG4gICAgX19tZXRhZGF0YTogX19tZXRhZGF0YSxcclxuICAgIF9fYXdhaXRlcjogX19hd2FpdGVyLFxyXG4gICAgX19nZW5lcmF0b3I6IF9fZ2VuZXJhdG9yLFxyXG4gICAgX19jcmVhdGVCaW5kaW5nOiBfX2NyZWF0ZUJpbmRpbmcsXHJcbiAgICBfX2V4cG9ydFN0YXI6IF9fZXhwb3J0U3RhcixcclxuICAgIF9fdmFsdWVzOiBfX3ZhbHVlcyxcclxuICAgIF9fcmVhZDogX19yZWFkLFxyXG4gICAgX19zcHJlYWQ6IF9fc3ByZWFkLFxyXG4gICAgX19zcHJlYWRBcnJheXM6IF9fc3ByZWFkQXJyYXlzLFxyXG4gICAgX19zcHJlYWRBcnJheTogX19zcHJlYWRBcnJheSxcclxuICAgIF9fYXdhaXQ6IF9fYXdhaXQsXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yOiBfX2FzeW5jR2VuZXJhdG9yLFxyXG4gICAgX19hc3luY0RlbGVnYXRvcjogX19hc3luY0RlbGVnYXRvcixcclxuICAgIF9fYXN5bmNWYWx1ZXM6IF9fYXN5bmNWYWx1ZXMsXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdDogX19tYWtlVGVtcGxhdGVPYmplY3QsXHJcbiAgICBfX2ltcG9ydFN0YXI6IF9faW1wb3J0U3RhcixcclxuICAgIF9faW1wb3J0RGVmYXVsdDogX19pbXBvcnREZWZhdWx0LFxyXG4gICAgX19jbGFzc1ByaXZhdGVGaWVsZEdldDogX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcclxuICAgIF9fY2xhc3NQcml2YXRlRmllbGRTZXQ6IF9fY2xhc3NQcml2YXRlRmllbGRTZXQsXHJcbiAgICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW46IF9fY2xhc3NQcml2YXRlRmllbGRJbixcclxuICAgIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlOiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcclxuICAgIF9fZGlzcG9zZVJlc291cmNlczogX19kaXNwb3NlUmVzb3VyY2VzLFxyXG4gICAgX19yZXdyaXRlUmVsYXRpdmVJbXBvcnRFeHRlbnNpb246IF9fcmV3cml0ZVJlbGF0aXZlSW1wb3J0RXh0ZW5zaW9uLFxyXG59O1xyXG4iLCJpbXBvcnQgeyBOb3RpY2UgfSBmcm9tICdvYnNpZGlhbic7XG5cbi8vIEVWRU5UIEJVUyBTWVNURU1cbmV4cG9ydCBjbGFzcyBUaW55RW1pdHRlciB7XG4gICAgcHJpdmF0ZSBsaXN0ZW5lcnM6IHsgW2tleTogc3RyaW5nXTogRnVuY3Rpb25bXSB9ID0ge307XG5cbiAgICBvbihldmVudDogc3RyaW5nLCBmbjogRnVuY3Rpb24pIHtcbiAgICAgICAgKHRoaXMubGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMubGlzdGVuZXJzW2V2ZW50XSB8fCBbXSkucHVzaChmbik7XG4gICAgfVxuXG4gICAgb2ZmKGV2ZW50OiBzdHJpbmcsIGZuOiBGdW5jdGlvbikge1xuICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgICB0aGlzLmxpc3RlbmVyc1tldmVudF0gPSB0aGlzLmxpc3RlbmVyc1tldmVudF0uZmlsdGVyKGYgPT4gZiAhPT0gZm4pO1xuICAgIH1cblxuICAgIHRyaWdnZXIoZXZlbnQ6IHN0cmluZywgZGF0YT86IGFueSkge1xuICAgICAgICAodGhpcy5saXN0ZW5lcnNbZXZlbnRdIHx8IFtdKS5mb3JFYWNoKGZuID0+IGZuKGRhdGEpKTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBdWRpb0NvbnRyb2xsZXIge1xuICAgIGF1ZGlvQ3R4OiBBdWRpb0NvbnRleHQgfCBudWxsID0gbnVsbDtcbiAgICBicm93bk5vaXNlTm9kZTogU2NyaXB0UHJvY2Vzc29yTm9kZSB8IG51bGwgPSBudWxsO1xuICAgIG11dGVkOiBib29sZWFuID0gZmFsc2U7XG5cbiAgICBjb25zdHJ1Y3RvcihtdXRlZDogYm9vbGVhbikgeyB0aGlzLm11dGVkID0gbXV0ZWQ7IH1cblxuICAgIHNldE11dGVkKG11dGVkOiBib29sZWFuKSB7IHRoaXMubXV0ZWQgPSBtdXRlZDsgfVxuXG4gICAgaW5pdEF1ZGlvKCkgeyBpZiAoIXRoaXMuYXVkaW9DdHgpIHRoaXMuYXVkaW9DdHggPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTsgfVxuXG4gICAgcGxheVRvbmUoZnJlcTogbnVtYmVyLCB0eXBlOiBPc2NpbGxhdG9yVHlwZSwgZHVyYXRpb246IG51bWJlciwgdm9sOiBudW1iZXIgPSAwLjEpIHtcbiAgICAgICAgaWYgKHRoaXMubXV0ZWQpIHJldHVybjtcbiAgICAgICAgdGhpcy5pbml0QXVkaW8oKTtcbiAgICAgICAgY29uc3Qgb3NjID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICBjb25zdCBnYWluID0gdGhpcy5hdWRpb0N0eCEuY3JlYXRlR2FpbigpO1xuICAgICAgICBvc2MudHlwZSA9IHR5cGU7XG4gICAgICAgIG9zYy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxO1xuICAgICAgICBvc2MuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KHRoaXMuYXVkaW9DdHghLmRlc3RpbmF0aW9uKTtcbiAgICAgICAgb3NjLnN0YXJ0KCk7XG4gICAgICAgIGdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2b2wsIHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lKTtcbiAgICAgICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDAwMSwgdGhpcy5hdWRpb0N0eCEuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIG9zYy5zdG9wKHRoaXMuYXVkaW9DdHghLmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHBsYXlTb3VuZCh0eXBlOiBcInN1Y2Nlc3NcInxcImZhaWxcInxcImRlYXRoXCJ8XCJjbGlja1wifFwiaGVhcnRiZWF0XCJ8XCJtZWRpdGF0ZVwiKSB7XG4gICAgICAgIGlmICh0eXBlID09PSBcInN1Y2Nlc3NcIikgeyB0aGlzLnBsYXlUb25lKDYwMCwgXCJzaW5lXCIsIDAuMSk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjIpLCAxMDApOyB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGUgPT09IFwiZmFpbFwiKSB7IHRoaXMucGxheVRvbmUoMTUwLCBcInNhd3Rvb3RoXCIsIDAuNCk7IHNldFRpbWVvdXQoKCkgPT4gdGhpcy5wbGF5VG9uZSgxMDAsIFwic2F3dG9vdGhcIiwgMC40KSwgMTUwKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImRlYXRoXCIpIHsgdGhpcy5wbGF5VG9uZSg1MCwgXCJzcXVhcmVcIiwgMS4wKTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImNsaWNrXCIpIHsgdGhpcy5wbGF5VG9uZSg4MDAsIFwic2luZVwiLCAwLjA1KTsgfVxuICAgICAgICBlbHNlIGlmICh0eXBlID09PSBcImhlYXJ0YmVhdFwiKSB7IHRoaXMucGxheVRvbmUoNjAsIFwic2luZVwiLCAwLjEsIDAuNSk7IHNldFRpbWVvdXQoKCk9PnRoaXMucGxheVRvbmUoNTAsIFwic2luZVwiLCAwLjEsIDAuNCksIDE1MCk7IH1cbiAgICAgICAgZWxzZSBpZiAodHlwZSA9PT0gXCJtZWRpdGF0ZVwiKSB7IHRoaXMucGxheVRvbmUoNDMyLCBcInNpbmVcIiwgMi4wLCAwLjA1KTsgfVxuICAgIH1cblxuICAgIHRvZ2dsZUJyb3duTm9pc2UoKSB7XG4gICAgICAgIHRoaXMuaW5pdEF1ZGlvKCk7XG4gICAgICAgIGlmICh0aGlzLmJyb3duTm9pc2VOb2RlKSB7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZS5kaXNjb25uZWN0KCk7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IG51bGw7IFxuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPRkZcIik7IFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyU2l6ZSA9IDQwOTY7IFxuICAgICAgICAgICAgdGhpcy5icm93bk5vaXNlTm9kZSA9IHRoaXMuYXVkaW9DdHghLmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCAxLCAxKTtcbiAgICAgICAgICAgIGxldCBsYXN0T3V0ID0gMDtcbiAgICAgICAgICAgIHRoaXMuYnJvd25Ob2lzZU5vZGUub25hdWRpb3Byb2Nlc3MgPSAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGUub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdoaXRlID0gTWF0aC5yYW5kb20oKSAqIDIgLSAxOyBcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gKGxhc3RPdXQgKyAoMC4wMiAqIHdoaXRlKSkgLyAxLjAyOyBcbiAgICAgICAgICAgICAgICAgICAgbGFzdE91dCA9IG91dHB1dFtpXTsgXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtpXSAqPSAwLjE7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLmJyb3duTm9pc2VOb2RlLmNvbm5lY3QodGhpcy5hdWRpb0N0eCEuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkZvY3VzIEF1ZGlvOiBPTiAoQnJvd24gTm9pc2UpXCIpO1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgRGF5TWV0cmljcywgV2Vla2x5UmVwb3J0LCBCb3NzTWlsZXN0b25lLCBTdHJlYWssIEFjaGlldmVtZW50IH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyA2OiBBbmFseXRpY3MgJiBFbmRnYW1lIEVuZ2luZVxuICogSGFuZGxlcyBhbGwgbWV0cmljcyB0cmFja2luZywgYm9zcyBtaWxlc3RvbmVzLCBhY2hpZXZlbWVudHMsIGFuZCB3aW4gY29uZGl0aW9uXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBzZXR0aW5ncy5kYXlNZXRyaWNzLCB3ZWVrbHlSZXBvcnRzLCBib3NzTWlsZXN0b25lcywgc3RyZWFrLCBhY2hpZXZlbWVudHNcbiAqIERFUEVOREVOQ0lFUzogbW9tZW50LCBTaXN5cGh1c1NldHRpbmdzIHR5cGVzXG4gKi9cbmV4cG9ydCBjbGFzcyBBbmFseXRpY3NFbmdpbmUge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIGF1ZGlvQ29udHJvbGxlcj86IGFueTsgLy8gT3B0aW9uYWwgYXVkaW8gY2FsbGJhY2sgZm9yIG5vdGlmaWNhdGlvbnNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhdWRpb0NvbnRyb2xsZXI/OiBhbnkpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlciA9IGF1ZGlvQ29udHJvbGxlcjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmFjayBkYWlseSBtZXRyaWNzIC0gY2FsbGVkIHdoZW5ldmVyIGEgcXVlc3QgaXMgY29tcGxldGVkL2ZhaWxlZC9ldGNcbiAgICAgKi9cbiAgICB0cmFja0RhaWx5TWV0cmljcyh0eXBlOiAncXVlc3RfY29tcGxldGUnIHwgJ3F1ZXN0X2ZhaWwnIHwgJ3hwJyB8ICdnb2xkJyB8ICdkYW1hZ2UnIHwgJ3NraWxsX2xldmVsJyB8ICdjaGFpbl9jb21wbGV0ZScsIGFtb3VudDogbnVtYmVyID0gMSkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBsZXQgbWV0cmljID0gdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLmZpbmQobSA9PiBtLmRhdGUgPT09IHRvZGF5KTtcbiAgICAgICAgaWYgKCFtZXRyaWMpIHtcbiAgICAgICAgICAgIG1ldHJpYyA9IHtcbiAgICAgICAgICAgICAgICBkYXRlOiB0b2RheSxcbiAgICAgICAgICAgICAgICBxdWVzdHNDb21wbGV0ZWQ6IDAsXG4gICAgICAgICAgICAgICAgcXVlc3RzRmFpbGVkOiAwLFxuICAgICAgICAgICAgICAgIHhwRWFybmVkOiAwLFxuICAgICAgICAgICAgICAgIGdvbGRFYXJuZWQ6IDAsXG4gICAgICAgICAgICAgICAgZGFtYWdlc1Rha2VuOiAwLFxuICAgICAgICAgICAgICAgIHNraWxsc0xldmVsZWQ6IFtdLFxuICAgICAgICAgICAgICAgIGNoYWluc0NvbXBsZXRlZDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5wdXNoKG1ldHJpYyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2NvbXBsZXRlXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnF1ZXN0c0NvbXBsZXRlZCArPSBhbW91bnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwicXVlc3RfZmFpbFwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5xdWVzdHNGYWlsZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInhwXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnhwRWFybmVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJnb2xkXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLmdvbGRFYXJuZWQgKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcImRhbWFnZVwiOlxuICAgICAgICAgICAgICAgIG1ldHJpYy5kYW1hZ2VzVGFrZW4gKz0gYW1vdW50O1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcInNraWxsX2xldmVsXCI6XG4gICAgICAgICAgICAgICAgbWV0cmljLnNraWxsc0xldmVsZWQucHVzaChcIlNraWxsIGxldmVsZWRcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiY2hhaW5fY29tcGxldGVcIjpcbiAgICAgICAgICAgICAgICBtZXRyaWMuY2hhaW5zQ29tcGxldGVkICs9IGFtb3VudDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBkYWlseSBzdHJlYWsgLSBjYWxsZWQgb25jZSBwZXIgZGF5IGF0IGxvZ2luXG4gICAgICovXG4gICAgdXBkYXRlU3RyZWFrKCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIGNvbnN0IGxhc3REYXRlID0gdGhpcy5zZXR0aW5ncy5zdHJlYWsubGFzdERhdGU7XG4gICAgICAgIFxuICAgICAgICBpZiAobGFzdERhdGUgPT09IHRvZGF5KSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIEFscmVhZHkgY291bnRlZCB0b2RheVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB5ZXN0ZXJkYXkgPSBtb21lbnQoKS5zdWJ0cmFjdCgxLCAnZGF5JykuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChsYXN0RGF0ZSA9PT0geWVzdGVyZGF5KSB7XG4gICAgICAgICAgICAvLyBDb25zZWN1dGl2ZSBkYXlcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQrKztcbiAgICAgICAgICAgIGlmICh0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50ID4gdGhpcy5zZXR0aW5ncy5zdHJlYWsubG9uZ2VzdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxvbmdlc3QgPSB0aGlzLnNldHRpbmdzLnN0cmVhay5jdXJyZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU3RyZWFrIGJyb2tlbiwgc3RhcnQgbmV3IG9uZVxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5zdHJlYWsuY3VycmVudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3Muc3RyZWFrLmxhc3REYXRlID0gdG9kYXk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBib3NzIG1pbGVzdG9uZXMgb24gZmlyc3QgcnVuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUJvc3NNaWxlc3RvbmVzKCkge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG1pbGVzdG9uZXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMTAsIG5hbWU6IFwiVGhlIEZpcnN0IFRyaWFsXCIsIHVubG9ja2VkOiBmYWxzZSwgZGVmZWF0ZWQ6IGZhbHNlLCB4cFJld2FyZDogNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogMjAsIG5hbWU6IFwiVGhlIE5lbWVzaXMgUmV0dXJuc1wiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDEwMDAgfSxcbiAgICAgICAgICAgICAgICB7IGxldmVsOiAzMCwgbmFtZTogXCJUaGUgUmVhcGVyIEF3YWtlbnNcIiwgdW5sb2NrZWQ6IGZhbHNlLCBkZWZlYXRlZDogZmFsc2UsIHhwUmV3YXJkOiAxNTAwIH0sXG4gICAgICAgICAgICAgICAgeyBsZXZlbDogNTAsIG5hbWU6IFwiVGhlIEZpbmFsIEFzY2Vuc2lvblwiLCB1bmxvY2tlZDogZmFsc2UsIGRlZmVhdGVkOiBmYWxzZSwgeHBSZXdhcmQ6IDUwMDAgfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyA9IG1pbGVzdG9uZXMgYXMgYW55O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYW55IGJvc3NlcyBzaG91bGQgYmUgdW5sb2NrZWQgYmFzZWQgb24gY3VycmVudCBsZXZlbFxuICAgICAqL1xuICAgIGNoZWNrQm9zc01pbGVzdG9uZXMoKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBtZXNzYWdlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcyB8fCB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQm9zc01pbGVzdG9uZXMoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5mb3JFYWNoKChib3NzOiBCb3NzTWlsZXN0b25lKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sZXZlbCA+PSBib3NzLmxldmVsICYmICFib3NzLnVubG9ja2VkKSB7XG4gICAgICAgICAgICAgICAgYm9zcy51bmxvY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgbWVzc2FnZXMucHVzaChgQm9zcyBVbmxvY2tlZDogJHtib3NzLm5hbWV9IChMZXZlbCAke2Jvc3MubGV2ZWx9KWApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBtZXNzYWdlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXJrIGJvc3MgYXMgZGVmZWF0ZWQgYW5kIGF3YXJkIFhQXG4gICAgICovXG4gICAgZGVmZWF0Qm9zcyhsZXZlbDogbnVtYmVyKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IHhwUmV3YXJkOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGJvc3MgPSB0aGlzLnNldHRpbmdzLmJvc3NNaWxlc3RvbmVzLmZpbmQoKGI6IEJvc3NNaWxlc3RvbmUpID0+IGIubGV2ZWwgPT09IGxldmVsKTtcbiAgICAgICAgaWYgKCFib3NzKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJCb3NzIG5vdCBmb3VuZFwiLCB4cFJld2FyZDogMCB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoYm9zcy5kZWZlYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiQm9zcyBhbHJlYWR5IGRlZmVhdGVkXCIsIHhwUmV3YXJkOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJvc3MuZGVmZWF0ZWQgPSB0cnVlO1xuICAgICAgICBib3NzLmRlZmVhdGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGJvc3MueHBSZXdhcmQ7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkge1xuICAgICAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgd2luIGNvbmRpdGlvblxuICAgICAgICBpZiAobGV2ZWwgPT09IDUwKSB7XG4gICAgICAgICAgICB0aGlzLndpbkdhbWUoKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBCb3NzIERlZmVhdGVkOiAke2Jvc3MubmFtZX0hIFZJQ1RPUlkhYCwgeHBSZXdhcmQ6IGJvc3MueHBSZXdhcmQgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEJvc3MgRGVmZWF0ZWQ6ICR7Ym9zcy5uYW1lfSEgKyR7Ym9zcy54cFJld2FyZH0gWFBgLCB4cFJld2FyZDogYm9zcy54cFJld2FyZCB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRyaWdnZXIgd2luIGNvbmRpdGlvblxuICAgICAqL1xuICAgIHByaXZhdGUgd2luR2FtZSgpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5nYW1lV29uID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5lbmRHYW1lRGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgd2Vla2x5IHJlcG9ydFxuICAgICAqL1xuICAgIGdlbmVyYXRlV2Vla2x5UmVwb3J0KCk6IFdlZWtseVJlcG9ydCB7XG4gICAgICAgIGNvbnN0IHdlZWsgPSBtb21lbnQoKS53ZWVrKCk7XG4gICAgICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN0YXJ0T2YoJ3dlZWsnKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBjb25zdCBlbmREYXRlID0gbW9tZW50KCkuZW5kT2YoJ3dlZWsnKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgd2Vla01ldHJpY3MgPSB0aGlzLnNldHRpbmdzLmRheU1ldHJpY3MuZmlsdGVyKChtOiBEYXlNZXRyaWNzKSA9PiBcbiAgICAgICAgICAgIG1vbWVudChtLmRhdGUpLmlzQmV0d2Vlbihtb21lbnQoc3RhcnREYXRlKSwgbW9tZW50KGVuZERhdGUpLCBudWxsLCAnW10nKVxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxRdWVzdHMgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0NvbXBsZXRlZCwgMCk7XG4gICAgICAgIGNvbnN0IHRvdGFsRmFpbGVkID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5xdWVzdHNGYWlsZWQsIDApO1xuICAgICAgICBjb25zdCBzdWNjZXNzUmF0ZSA9IHRvdGFsUXVlc3RzICsgdG90YWxGYWlsZWQgPiAwID8gTWF0aC5yb3VuZCgodG90YWxRdWVzdHMgLyAodG90YWxRdWVzdHMgKyB0b3RhbEZhaWxlZCkpICogMTAwKSA6IDA7XG4gICAgICAgIGNvbnN0IHRvdGFsWHAgPSB3ZWVrTWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnhwRWFybmVkLCAwKTtcbiAgICAgICAgY29uc3QgdG90YWxHb2xkID0gd2Vla01ldHJpY3MucmVkdWNlKChzdW06IG51bWJlciwgbTogRGF5TWV0cmljcykgPT4gc3VtICsgbS5nb2xkRWFybmVkLCAwKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvcFNraWxscyA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzXG4gICAgICAgICAgICAuc29ydCgoYTogYW55LCBiOiBhbnkpID0+IChiLmxldmVsIC0gYS5sZXZlbCkpXG4gICAgICAgICAgICAuc2xpY2UoMCwgMylcbiAgICAgICAgICAgIC5tYXAoKHM6IGFueSkgPT4gcy5uYW1lKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJlc3REYXkgPSB3ZWVrTWV0cmljcy5sZW5ndGggPiAwIFxuICAgICAgICAgICAgPyB3ZWVrTWV0cmljcy5yZWR1Y2UoKG1heDogRGF5TWV0cmljcywgbTogRGF5TWV0cmljcykgPT4gbS5xdWVzdHNDb21wbGV0ZWQgPiBtYXgucXVlc3RzQ29tcGxldGVkID8gbSA6IG1heCkuZGF0ZVxuICAgICAgICAgICAgOiBzdGFydERhdGU7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB3b3JzdERheSA9IHdlZWtNZXRyaWNzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gd2Vla01ldHJpY3MucmVkdWNlKChtaW46IERheU1ldHJpY3MsIG06IERheU1ldHJpY3MpID0+IG0ucXVlc3RzRmFpbGVkID4gbWluLnF1ZXN0c0ZhaWxlZCA/IG0gOiBtaW4pLmRhdGVcbiAgICAgICAgICAgIDogc3RhcnREYXRlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVwb3J0OiBXZWVrbHlSZXBvcnQgPSB7XG4gICAgICAgICAgICB3ZWVrOiB3ZWVrLFxuICAgICAgICAgICAgc3RhcnREYXRlOiBzdGFydERhdGUsXG4gICAgICAgICAgICBlbmREYXRlOiBlbmREYXRlLFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IHRvdGFsUXVlc3RzLFxuICAgICAgICAgICAgc3VjY2Vzc1JhdGU6IHN1Y2Nlc3NSYXRlLFxuICAgICAgICAgICAgdG90YWxYcDogdG90YWxYcCxcbiAgICAgICAgICAgIHRvdGFsR29sZDogdG90YWxHb2xkLFxuICAgICAgICAgICAgdG9wU2tpbGxzOiB0b3BTa2lsbHMsXG4gICAgICAgICAgICBiZXN0RGF5OiBiZXN0RGF5LFxuICAgICAgICAgICAgd29yc3REYXk6IHdvcnN0RGF5XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLndlZWtseVJlcG9ydHMucHVzaChyZXBvcnQpO1xuICAgICAgICByZXR1cm4gcmVwb3J0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVubG9jayBhbiBhY2hpZXZlbWVudFxuICAgICAqL1xuICAgIHVubG9ja0FjaGlldmVtZW50KGFjaGlldmVtZW50SWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBhY2hpZXZlbWVudCA9IHRoaXMuc2V0dGluZ3MuYWNoaWV2ZW1lbnRzLmZpbmQoKGE6IEFjaGlldmVtZW50KSA9PiBhLmlkID09PSBhY2hpZXZlbWVudElkKTtcbiAgICAgICAgaWYgKCFhY2hpZXZlbWVudCB8fCBhY2hpZXZlbWVudC51bmxvY2tlZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgYWNoaWV2ZW1lbnQudW5sb2NrZWQgPSB0cnVlO1xuICAgICAgICBhY2hpZXZlbWVudC51bmxvY2tlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGdhbWUgc3RhdHMgc25hcHNob3RcbiAgICAgKi9cbiAgICBnZXRHYW1lU3RhdHMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsZXZlbDogdGhpcy5zZXR0aW5ncy5sZXZlbCxcbiAgICAgICAgICAgIGN1cnJlbnRTdHJlYWs6IHRoaXMuc2V0dGluZ3Muc3RyZWFrLmN1cnJlbnQsXG4gICAgICAgICAgICBsb25nZXN0U3RyZWFrOiB0aGlzLnNldHRpbmdzLnN0cmVhay5sb25nZXN0LFxuICAgICAgICAgICAgdG90YWxRdWVzdHM6IHRoaXMuc2V0dGluZ3MuZGF5TWV0cmljcy5yZWR1Y2UoKHN1bTogbnVtYmVyLCBtOiBEYXlNZXRyaWNzKSA9PiBzdW0gKyBtLnF1ZXN0c0NvbXBsZXRlZCwgMCksXG4gICAgICAgICAgICB0b3RhbFhwOiB0aGlzLnNldHRpbmdzLnhwICsgdGhpcy5zZXR0aW5ncy5kYXlNZXRyaWNzLnJlZHVjZSgoc3VtOiBudW1iZXIsIG06IERheU1ldHJpY3MpID0+IHN1bSArIG0ueHBFYXJuZWQsIDApLFxuICAgICAgICAgICAgZ2FtZVdvbjogdGhpcy5zZXR0aW5ncy5nYW1lV29uLFxuICAgICAgICAgICAgYm9zc2VzRGVmZWF0ZWQ6IHRoaXMuc2V0dGluZ3MuYm9zc01pbGVzdG9uZXMuZmlsdGVyKChiOiBCb3NzTWlsZXN0b25lKSA9PiBiLmRlZmVhdGVkKS5sZW5ndGgsXG4gICAgICAgICAgICB0b3RhbEJvc3NlczogdGhpcy5zZXR0aW5ncy5ib3NzTWlsZXN0b25lcy5sZW5ndGhcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3Vydml2YWwgZXN0aW1hdGUgKHJvdWdoIGNhbGN1bGF0aW9uKVxuICAgICAqL1xuICAgIGdldFN1cnZpdmFsRXN0aW1hdGUoKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgZGFtYWdlUGVyRmFpbHVyZSA9IDEwICsgTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnJpdmFsRG1nIC8gMik7XG4gICAgICAgIGNvbnN0IGFjdHVhbERhbWFnZSA9IHRoaXMuc2V0dGluZ3MuZ29sZCA8IDAgPyBkYW1hZ2VQZXJGYWlsdXJlICogMiA6IGRhbWFnZVBlckZhaWx1cmU7XG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MuaHAgLyBNYXRoLm1heCgxLCBhY3R1YWxEYW1hZ2UpKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBtb21lbnQgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIERMQyAzOiBNZWRpdGF0aW9uICYgUmVjb3ZlcnkgRW5naW5lXG4gKiBIYW5kbGVzIGxvY2tkb3duIHN0YXRlLCBtZWRpdGF0aW9uIGhlYWxpbmcsIGFuZCBxdWVzdCBkZWxldGlvbiBxdW90YVxuICogXG4gKiBJU09MQVRFRDogT25seSByZWFkcy93cml0ZXMgdG8gbG9ja2Rvd25VbnRpbCwgaXNNZWRpdGF0aW5nLCBtZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duLCBcbiAqICAgICAgICAgICBxdWVzdERlbGV0aW9uc1RvZGF5LCBsYXN0RGVsZXRpb25SZXNldFxuICogREVQRU5ERU5DSUVTOiBtb21lbnQsIFNpc3lwaHVzU2V0dGluZ3NcbiAqIFNJREUgRUZGRUNUUzogUGxheXMgYXVkaW8gKDQzMiBIeiB0b25lKVxuICovXG5leHBvcnQgY2xhc3MgTWVkaXRhdGlvbkVuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55OyAvLyBPcHRpb25hbCBmb3IgNDMyIEh6IHNvdW5kXG4gICAgcHJpdmF0ZSBtZWRpdGF0aW9uQ29vbGRvd25NcyA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzXG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncywgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hdWRpb0NvbnRyb2xsZXIgPSBhdWRpb0NvbnRyb2xsZXI7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgY3VycmVudGx5IGxvY2tlZCBkb3duXG4gICAgICovXG4gICAgaXNMb2NrZWREb3duKCk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIXRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gbW9tZW50KCkuaXNCZWZvcmUobW9tZW50KHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBsb2NrZG93biB0aW1lIHJlbWFpbmluZyBpbiBtaW51dGVzXG4gICAgICovXG4gICAgZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk6IHsgaG91cnM6IG51bWJlcjsgbWludXRlczogbnVtYmVyOyB0b3RhbE1pbnV0ZXM6IG51bWJlciB9IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBob3VyczogMCwgbWludXRlczogMCwgdG90YWxNaW51dGVzOiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRvdGFsTWludXRlcyA9IG1vbWVudCh0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwpLmRpZmYobW9tZW50KCksICdtaW51dGVzJyk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0b3RhbE1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSB0b3RhbE1pbnV0ZXMgJSA2MDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IGhvdXJzLCBtaW51dGVzLCB0b3RhbE1pbnV0ZXMgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUcmlnZ2VyIGxvY2tkb3duIGFmdGVyIHRha2luZyA1MCsgZGFtYWdlXG4gICAgICovXG4gICAgdHJpZ2dlckxvY2tkb3duKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxvY2tkb3duVW50aWwgPSBtb21lbnQoKS5hZGQoNiwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duID0gMDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQZXJmb3JtIG9uZSBtZWRpdGF0aW9uIGN5Y2xlIChjbGljaylcbiAgICAgKiBSZXR1cm5zOiB7IHN1Y2Nlc3MsIGN5Y2xlc0RvbmUsIGN5Y2xlc1JlbWFpbmluZywgbWVzc2FnZSB9XG4gICAgICovXG4gICAgbWVkaXRhdGUoKTogeyBzdWNjZXNzOiBib29sZWFuOyBjeWNsZXNEb25lOiBudW1iZXI7IGN5Y2xlc1JlbWFpbmluZzogbnVtYmVyOyBtZXNzYWdlOiBzdHJpbmc7IGxvY2tkb3duUmVkdWNlZDogYm9vbGVhbiB9IHtcbiAgICAgICAgaWYgKCF0aGlzLmlzTG9ja2VkRG93bigpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGN5Y2xlc0RvbmU6IDAsXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiTm90IGluIGxvY2tkb3duLiBObyBuZWVkIHRvIG1lZGl0YXRlLlwiLFxuICAgICAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBjeWNsZXNEb25lOiB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sXG4gICAgICAgICAgICAgICAgY3ljbGVzUmVtYWluaW5nOiBNYXRoLm1heCgwLCAxMCAtIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJBbHJlYWR5IG1lZGl0YXRpbmcuIFdhaXQgMzAgc2Vjb25kcy5cIixcbiAgICAgICAgICAgICAgICBsb2NrZG93blJlZHVjZWQ6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmlzTWVkaXRhdGluZyA9IHRydWU7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bisrO1xuICAgICAgICBcbiAgICAgICAgLy8gUGxheSBoZWFsaW5nIGZyZXF1ZW5jeVxuICAgICAgICB0aGlzLnBsYXlNZWRpdGF0aW9uU291bmQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IDEwIC0gdGhpcy5zZXR0aW5ncy5tZWRpdGF0aW9uQ2xpY2tzVGhpc0xvY2tkb3duO1xuICAgICAgICBsZXQgbG9ja2Rvd25SZWR1Y2VkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiAxMCBjeWNsZXMgY29tcGxldGVcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93biA+PSAxMCkge1xuICAgICAgICAgICAgY29uc3QgcmVkdWNlZFRpbWUgPSBtb21lbnQodGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsKS5zdWJ0cmFjdCg1LCAnaG91cnMnKTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubG9ja2Rvd25VbnRpbCA9IHJlZHVjZWRUaW1lLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24gPSAwO1xuICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuYXVkaW9Db250cm9sbGVyPy5wbGF5U291bmQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLXJlc2V0IG1lZGl0YXRpb24gZmxhZyBhZnRlciBjb29sZG93blxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5pc01lZGl0YXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sIHRoaXMubWVkaXRhdGlvbkNvb2xkb3duTXMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY3ljbGVzRG9uZTogMCxcbiAgICAgICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IDAsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZWRpdGF0aW9uIGNvbXBsZXRlLiBMb2NrZG93biByZWR1Y2VkIGJ5IDUgaG91cnMuXCIsXG4gICAgICAgICAgICAgICAgbG9ja2Rvd25SZWR1Y2VkOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2V0IG1lZGl0YXRpb24gZmxhZyBhZnRlciBjb29sZG93blxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaXNNZWRpdGF0aW5nID0gZmFsc2U7XG4gICAgICAgIH0sIHRoaXMubWVkaXRhdGlvbkNvb2xkb3duTXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBjeWNsZXNEb25lOiB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd24sXG4gICAgICAgICAgICBjeWNsZXNSZW1haW5pbmc6IHJlbWFpbmluZyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBNZWRpdGF0aW9uICgke3RoaXMuc2V0dGluZ3MubWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bn0vMTApIC0gJHtyZW1haW5pbmd9IGN5Y2xlcyBsZWZ0YCxcbiAgICAgICAgICAgIGxvY2tkb3duUmVkdWNlZDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5IDQzMiBIeiBoZWFsaW5nIGZyZXF1ZW5jeSBmb3IgMSBzZWNvbmRcbiAgICAgKi9cbiAgICBwcml2YXRlIHBsYXlNZWRpdGF0aW9uU291bmQoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhdWRpb0NvbnRleHQgPSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgKHdpbmRvdyBhcyBhbnkpLndlYmtpdEF1ZGlvQ29udGV4dCkoKTtcbiAgICAgICAgICAgIGNvbnN0IG9zY2lsbGF0b3IgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICAgICAgY29uc3QgZ2Fpbk5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBvc2NpbGxhdG9yLmZyZXF1ZW5jeS52YWx1ZSA9IDQzMjtcbiAgICAgICAgICAgIG9zY2lsbGF0b3IudHlwZSA9IFwic2luZVwiO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuZ2Fpbi5zZXRWYWx1ZUF0VGltZSgwLjMsIGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMSwgYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lICsgMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3IuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgICAgICBnYWluTm9kZS5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9zY2lsbGF0b3Iuc3RhcnQoYXVkaW9Db250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIG9zY2lsbGF0b3Iuc3RvcChhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyAxKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJBdWRpbyBub3QgYXZhaWxhYmxlIGZvciBtZWRpdGF0aW9uXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IG1lZGl0YXRpb24gc3RhdHVzIGZvciBjdXJyZW50IGxvY2tkb3duXG4gICAgICovXG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpOiB7IGN5Y2xlc0RvbmU6IG51bWJlcjsgY3ljbGVzUmVtYWluaW5nOiBudW1iZXI7IHRpbWVSZWR1Y2VkOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGN5Y2xlc0RvbmUgPSB0aGlzLnNldHRpbmdzLm1lZGl0YXRpb25DbGlja3NUaGlzTG9ja2Rvd247XG4gICAgICAgIGNvbnN0IGN5Y2xlc1JlbWFpbmluZyA9IE1hdGgubWF4KDAsIDEwIC0gY3ljbGVzRG9uZSk7XG4gICAgICAgIGNvbnN0IHRpbWVSZWR1Y2VkID0gKDEwIC0gY3ljbGVzUmVtYWluaW5nKSAqIDMwOyAvLyAzMCBtaW4gcGVyIGN5Y2xlXG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY3ljbGVzRG9uZSxcbiAgICAgICAgICAgIGN5Y2xlc1JlbWFpbmluZyxcbiAgICAgICAgICAgIHRpbWVSZWR1Y2VkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgZGVsZXRpb24gcXVvdGEgaWYgbmV3IGRheVxuICAgICAqL1xuICAgIHByaXZhdGUgZW5zdXJlRGVsZXRpb25RdW90YVJlc2V0KCkge1xuICAgICAgICBjb25zdCB0b2RheSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0RGVsZXRpb25SZXNldCAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdERlbGV0aW9uUmVzZXQgPSB0b2RheTtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGhhcyBmcmVlIGRlbGV0aW9ucyBsZWZ0IHRvZGF5XG4gICAgICovXG4gICAgY2FuRGVsZXRlUXVlc3RGcmVlKCk6IGJvb2xlYW4ge1xuICAgICAgICB0aGlzLmVuc3VyZURlbGV0aW9uUXVvdGFSZXNldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5IDwgMztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgZGVsZXRpb24gcXVvdGEgc3RhdHVzXG4gICAgICovXG4gICAgZ2V0RGVsZXRpb25RdW90YSgpOiB7IGZyZWU6IG51bWJlcjsgcGFpZDogbnVtYmVyOyByZW1haW5pbmc6IG51bWJlciB9IHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IE1hdGgubWF4KDAsIDMgLSB0aGlzLnNldHRpbmdzLnF1ZXN0RGVsZXRpb25zVG9kYXkpO1xuICAgICAgICBjb25zdCBwYWlkID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5IC0gMyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZnJlZTogcmVtYWluaW5nLFxuICAgICAgICAgICAgcGFpZDogcGFpZCxcbiAgICAgICAgICAgIHJlbWFpbmluZzogcmVtYWluaW5nXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgcXVlc3QgYW5kIGNoYXJnZSBnb2xkIGlmIG5lY2Vzc2FyeVxuICAgICAqIFJldHVybnM6IHsgY29zdCwgbWVzc2FnZSB9XG4gICAgICovXG4gICAgYXBwbHlEZWxldGlvbkNvc3QoKTogeyBjb3N0OiBudW1iZXI7IG1lc3NhZ2U6IHN0cmluZyB9IHtcbiAgICAgICAgdGhpcy5lbnN1cmVEZWxldGlvblF1b3RhUmVzZXQoKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb3N0ID0gMDtcbiAgICAgICAgbGV0IG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucXVlc3REZWxldGlvbnNUb2RheSA+PSAzKSB7XG4gICAgICAgICAgICAvLyBQYWlkIGRlbGV0aW9uXG4gICAgICAgICAgICBjb3N0ID0gMTA7XG4gICAgICAgICAgICBtZXNzYWdlID0gYFF1ZXN0IGRlbGV0ZWQuIENvc3Q6IC0ke2Nvc3R9Z2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGcmVlIGRlbGV0aW9uXG4gICAgICAgICAgICBjb25zdCByZW1haW5pbmcgPSAzIC0gdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5O1xuICAgICAgICAgICAgbWVzc2FnZSA9IGBRdWVzdCBkZWxldGVkLiAoJHtyZW1haW5pbmcgLSAxfSBmcmVlIGRlbGV0aW9ucyByZW1haW5pbmcpYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdERlbGV0aW9uc1RvZGF5Kys7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCAtPSBjb3N0O1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgY29zdCwgbWVzc2FnZSB9O1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgVEZpbGUsIE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFJlc2VhcmNoUXVlc3QgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaEVuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuICAgIGFwcDogQXBwOyAvLyBBZGRlZCBBcHAgcmVmZXJlbmNlIGZvciBmaWxlIG9wZXJhdGlvbnNcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzLCBhcHA6IEFwcCwgYXVkaW9Db250cm9sbGVyPzogYW55KSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogXCJzdXJ2ZXlcIiB8IFwiZGVlcF9kaXZlXCIsIGxpbmtlZFNraWxsOiBzdHJpbmcsIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyBxdWVzdElkPzogc3RyaW5nIH0+IHtcbiAgICAgICAgLy8gW0ZJWF0gQWxsb3cgZmlyc3QgcmVzZWFyY2ggcXVlc3QgZm9yIGZyZWUgKENvbGQgU3RhcnQpLCBvdGhlcndpc2UgZW5mb3JjZSAyOjFcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoID4gMCAmJiAhdGhpcy5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJSRVNFQVJDSCBCTE9DS0VEOiBDb21wbGV0ZSAyIGNvbWJhdCBxdWVzdHMgcGVyIHJlc2VhcmNoIHF1ZXN0XCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHdvcmRMaW1pdCA9IHR5cGUgPT09IFwic3VydmV5XCIgPyAyMDAgOiA0MDA7XG4gICAgICAgIGNvbnN0IHF1ZXN0SWQgPSBgcmVzZWFyY2hfJHsodGhpcy5zZXR0aW5ncy5sYXN0UmVzZWFyY2hRdWVzdElkIHx8IDApICsgMX1gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmVzZWFyY2hRdWVzdDogUmVzZWFyY2hRdWVzdCA9IHtcbiAgICAgICAgICAgIGlkOiBxdWVzdElkLFxuICAgICAgICAgICAgdGl0bGU6IHRpdGxlLFxuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIGxpbmtlZFNraWxsOiBsaW5rZWRTa2lsbCxcbiAgICAgICAgICAgIHdvcmRMaW1pdDogd29yZExpbWl0LFxuICAgICAgICAgICAgd29yZENvdW50OiAwLFxuICAgICAgICAgICAgbGlua2VkQ29tYmF0UXVlc3Q6IGxpbmtlZENvbWJhdFF1ZXN0LFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gW0ZJWF0gQ3JlYXRlIGFjdHVhbCBNYXJrZG93biBmaWxlXG4gICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBcIkFjdGl2ZV9SdW4vUmVzZWFyY2hcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyUGF0aCkpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihmb2xkZXJQYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNhZmVUaXRsZSA9IHRpdGxlLnJlcGxhY2UoL1teYS16MC05XS9naSwgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke2ZvbGRlclBhdGh9LyR7c2FmZVRpdGxlfS5tZGA7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBgLS0tXG50eXBlOiByZXNlYXJjaFxucmVzZWFyY2hfaWQ6ICR7cXVlc3RJZH1cbnN0YXR1czogYWN0aXZlXG5saW5rZWRfc2tpbGw6ICR7bGlua2VkU2tpbGx9XG53b3JkX2xpbWl0OiAke3dvcmRMaW1pdH1cbmNyZWF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxuLS0tXG4jIPCfk5ogJHt0aXRsZX1cbj4gWyFJTkZPXSBSZXNlYXJjaCBHdWlkZWxpbmVzXG4+ICoqVHlwZToqKiAke3R5cGV9IHwgKipUYXJnZXQ6KiogJHt3b3JkTGltaXR9IHdvcmRzXG4+ICoqTGlua2VkIFNraWxsOioqICR7bGlua2VkU2tpbGx9XG5cbldyaXRlIHlvdXIgcmVzZWFyY2ggaGVyZS4uLlxuYDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuY3JlYXRlKGZpbGVuYW1lLCBjb250ZW50KTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIkVycm9yIGNyZWF0aW5nIHJlc2VhcmNoIGZpbGUuIENoZWNrIGNvbnNvbGUuXCIpO1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5wdXNoKHJlc2VhcmNoUXVlc3QpO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmxhc3RSZXNlYXJjaFF1ZXN0SWQgPSBwYXJzZUludChxdWVzdElkLnNwbGl0KCdfJylbMV0pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnJlc2VhcmNoU3RhdHMudG90YWxSZXNlYXJjaCsrO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgUmVzZWFyY2ggUXVlc3QgQ3JlYXRlZDogJHt0eXBlID09PSBcInN1cnZleVwiID8gXCJTdXJ2ZXlcIiA6IFwiRGVlcCBEaXZlXCJ9YCxcbiAgICAgICAgICAgIHF1ZXN0SWQ6IHF1ZXN0SWRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3RJZDogc3RyaW5nLCBmaW5hbFdvcmRDb3VudDogbnVtYmVyKTogeyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IHhwUmV3YXJkOiBudW1iZXI7IGdvbGRQZW5hbHR5OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKCFyZXNlYXJjaFF1ZXN0KSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJSZXNlYXJjaCBxdWVzdCBub3QgZm91bmRcIiwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIGlmIChyZXNlYXJjaFF1ZXN0LmNvbXBsZXRlZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiUXVlc3QgYWxyZWFkeSBjb21wbGV0ZWRcIiwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBtaW5Xb3JkcyA9IE1hdGguY2VpbChyZXNlYXJjaFF1ZXN0LndvcmRMaW1pdCAqIDAuOCk7XG4gICAgICAgIGlmIChmaW5hbFdvcmRDb3VudCA8IG1pbldvcmRzKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogYFRvbyBzaG9ydCEgTmVlZCAke21pbldvcmRzfSB3b3Jkcy5gLCB4cFJld2FyZDogMCwgZ29sZFBlbmFsdHk6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogYFRvbyBsb25nISBNYXggJHtNYXRoLmNlaWwocmVzZWFyY2hRdWVzdC53b3JkTGltaXQgKiAxLjI1KX0gd29yZHMuYCwgeHBSZXdhcmQ6IDAsIGdvbGRQZW5hbHR5OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCB4cFJld2FyZCA9IHJlc2VhcmNoUXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IDUgOiAyMDtcbiAgICAgICAgbGV0IGdvbGRQZW5hbHR5ID0gMDtcbiAgICAgICAgaWYgKGZpbmFsV29yZENvdW50ID4gcmVzZWFyY2hRdWVzdC53b3JkTGltaXQpIHtcbiAgICAgICAgICAgIGNvbnN0IG92ZXJhZ2VQZXJjZW50ID0gKChmaW5hbFdvcmRDb3VudCAtIHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSAvIHJlc2VhcmNoUXVlc3Qud29yZExpbWl0KSAqIDEwMDtcbiAgICAgICAgICAgIGdvbGRQZW5hbHR5ID0gTWF0aC5mbG9vcigyMCAqIChvdmVyYWdlUGVyY2VudCAvIDEwMCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2V0dGluZ3Muc2tpbGxzLmZpbmQocyA9PiBzLm5hbWUgPT09IHJlc2VhcmNoUXVlc3QubGlua2VkU2tpbGwpO1xuICAgICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgICAgIHNraWxsLnhwICs9IHhwUmV3YXJkO1xuICAgICAgICAgICAgaWYgKHNraWxsLnhwID49IHNraWxsLnhwUmVxKSB7IHNraWxsLmxldmVsKys7IHNraWxsLnhwID0gMDsgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmdvbGQgLT0gZ29sZFBlbmFsdHk7XG4gICAgICAgIHJlc2VhcmNoUXVlc3QuY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgcmVzZWFyY2hRdWVzdC5jb21wbGV0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkKys7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5hdWRpb0NvbnRyb2xsZXI/LnBsYXlTb3VuZCkgdGhpcy5hdWRpb0NvbnRyb2xsZXIucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBtZXNzYWdlID0gYFJlc2VhcmNoIENvbXBsZXRlISArJHt4cFJld2FyZH0gWFBgO1xuICAgICAgICBpZiAoZ29sZFBlbmFsdHkgPiAwKSBtZXNzYWdlICs9IGAgKC0ke2dvbGRQZW5hbHR5fWcgdGF4KWA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlLCB4cFJld2FyZCwgZ29sZFBlbmFsdHkgfTtcbiAgICB9XG5cbiAgICBhc3luYyBkZWxldGVSZXNlYXJjaFF1ZXN0KHF1ZXN0SWQ6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IHRoaXMuc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmluZEluZGV4KHEgPT4gcS5pZCA9PT0gcXVlc3RJZCk7XG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0ID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0c1tpbmRleF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFtGSVhdIFRyeSB0byBmaW5kIGFuZCBkZWxldGUgdGhlIGZpbGVcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzLmZpbmQoZiA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCA9PT0gcXVlc3RJZDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFF1ZXN0cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgaWYgKCFxdWVzdC5jb21wbGV0ZWQpIHRoaXMuc2V0dGluZ3MucmVzZWFyY2hTdGF0cy50b3RhbFJlc2VhcmNoID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsUmVzZWFyY2ggLSAxKTtcbiAgICAgICAgICAgIGVsc2UgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkID0gTWF0aC5tYXgoMCwgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnJlc2VhcmNoQ29tcGxldGVkIC0gMSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IFwiUmVzZWFyY2ggZGVsZXRlZFwiIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6IFwiTm90IGZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChxdWVzdElkOiBzdHJpbmcsIG5ld1dvcmRDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3QgPSB0aGlzLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbmQocSA9PiBxLmlkID09PSBxdWVzdElkKTtcbiAgICAgICAgaWYgKHJlc2VhcmNoUXVlc3QpIHtcbiAgICAgICAgICAgIHJlc2VhcmNoUXVlc3Qud29yZENvdW50ID0gbmV3V29yZENvdW50O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7IGNvbWJhdDogc3RhdHMudG90YWxDb21iYXQsIHJlc2VhcmNoOiBzdGF0cy50b3RhbFJlc2VhcmNoLCByYXRpbzogcmF0aW8udG9GaXhlZCgyKSB9O1xuICAgIH1cblxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzO1xuICAgICAgICBjb25zdCByYXRpbyA9IHN0YXRzLnRvdGFsQ29tYmF0IC8gTWF0aC5tYXgoMSwgc3RhdHMudG90YWxSZXNlYXJjaCk7XG4gICAgICAgIHJldHVybiByYXRpbyA+PSAyO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IFNpc3lwaHVzU2V0dGluZ3MsIFF1ZXN0Q2hhaW4sIFF1ZXN0Q2hhaW5SZWNvcmQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogRExDIDQ6IFF1ZXN0IENoYWlucyBFbmdpbmVcbiAqIEhhbmRsZXMgbXVsdGktcXVlc3Qgc2VxdWVuY2VzIHdpdGggb3JkZXJpbmcsIGxvY2tpbmcsIGFuZCBjb21wbGV0aW9uIHRyYWNraW5nXG4gKiBcbiAqIElTT0xBVEVEOiBPbmx5IHJlYWRzL3dyaXRlcyB0byBhY3RpdmVDaGFpbnMsIGNoYWluSGlzdG9yeSwgY3VycmVudENoYWluSWQsIGNoYWluUXVlc3RzQ29tcGxldGVkXG4gKiBERVBFTkRFTkNJRVM6IFNpc3lwaHVzU2V0dGluZ3MgdHlwZXNcbiAqIElOVEVHUkFUSU9OIFBPSU5UUzogTmVlZHMgdG8gaG9vayBpbnRvIGNvbXBsZXRlUXVlc3QoKSBpbiBtYWluIGVuZ2luZSBmb3IgY2hhaW4gcHJvZ3Jlc3Npb25cbiAqL1xuZXhwb3J0IGNsYXNzIENoYWluc0VuZ2luZSB7XG4gICAgc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3M7XG4gICAgYXVkaW9Db250cm9sbGVyPzogYW55O1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IFNpc3lwaHVzU2V0dGluZ3MsIGF1ZGlvQ29udHJvbGxlcj86IGFueSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuYXVkaW9Db250cm9sbGVyID0gYXVkaW9Db250cm9sbGVyO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIG5ldyBxdWVzdCBjaGFpblxuICAgICAqL1xuICAgIGFzeW5jIGNyZWF0ZVF1ZXN0Q2hhaW4obmFtZTogc3RyaW5nLCBxdWVzdE5hbWVzOiBzdHJpbmdbXSk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluSWQ/OiBzdHJpbmcgfT4ge1xuICAgICAgICBpZiAocXVlc3ROYW1lcy5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQ2hhaW4gbXVzdCBoYXZlIGF0IGxlYXN0IDIgcXVlc3RzXCJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluSWQgPSBgY2hhaW5fJHtEYXRlLm5vdygpfWA7XG4gICAgICAgIGNvbnN0IGNoYWluOiBRdWVzdENoYWluID0ge1xuICAgICAgICAgICAgaWQ6IGNoYWluSWQsXG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgcXVlc3RzOiBxdWVzdE5hbWVzLFxuICAgICAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHN0YXJ0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgaXNCb3NzOiBxdWVzdE5hbWVzW3F1ZXN0TmFtZXMubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhcImJvc3NcIilcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLnB1c2goY2hhaW4pO1xuICAgICAgICB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkID0gY2hhaW5JZDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgbWVzc2FnZTogYENoYWluIGNyZWF0ZWQ6ICR7bmFtZX0gKCR7cXVlc3ROYW1lcy5sZW5ndGh9IHF1ZXN0cylgLFxuICAgICAgICAgICAgY2hhaW5JZDogY2hhaW5JZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgY3VycmVudCBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXRBY3RpdmVDaGFpbigpOiBRdWVzdENoYWluIHwgbnVsbCB7XG4gICAgICAgIGlmICghdGhpcy5zZXR0aW5ncy5jdXJyZW50Q2hhaW5JZCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuc2V0dGluZ3MuYWN0aXZlQ2hhaW5zLmZpbmQoYyA9PiBjLmlkID09PSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDaGFpbklkKTtcbiAgICAgICAgcmV0dXJuIChjaGFpbiAmJiAhY2hhaW4uY29tcGxldGVkKSA/IGNoYWluIDogbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIG5leHQgcXVlc3QgdGhhdCBzaG91bGQgYmUgY29tcGxldGVkIGluIHRoZSBhY3RpdmUgY2hhaW5cbiAgICAgKi9cbiAgICBnZXROZXh0UXVlc3RJbkNoYWluKCk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBhIHF1ZXN0IGlzIHBhcnQgb2YgYW4gYWN0aXZlIChpbmNvbXBsZXRlKSBjaGFpblxuICAgICAqL1xuICAgIGlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMuZmluZChjID0+ICFjLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmICghY2hhaW4pIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGNoYWluLnF1ZXN0cy5pbmNsdWRlcyhxdWVzdE5hbWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGEgcXVlc3QgY2FuIGJlIHN0YXJ0ZWQgKGlzIGl0IHRoZSBuZXh0IHF1ZXN0IGluIHRoZSBjaGFpbj8pXG4gICAgICovXG4gICAgY2FuU3RhcnRRdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikgcmV0dXJuIHRydWU7IC8vIE5vdCBpbiBhIGNoYWluLCBjYW4gc3RhcnQgYW55IHF1ZXN0XG4gICAgICAgIFxuICAgICAgICBjb25zdCBuZXh0UXVlc3QgPSB0aGlzLmdldE5leHRRdWVzdEluQ2hhaW4oKTtcbiAgICAgICAgcmV0dXJuIG5leHRRdWVzdCA9PT0gcXVlc3ROYW1lO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE1hcmsgYSBxdWVzdCBhcyBjb21wbGV0ZWQgaW4gdGhlIGNoYWluXG4gICAgICogQWR2YW5jZXMgY2hhaW4gaWYgc3VjY2Vzc2Z1bCwgYXdhcmRzIGJvbnVzIFhQIGlmIGNoYWluIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIGFzeW5jIGNvbXBsZXRlQ2hhaW5RdWVzdChxdWVzdE5hbWU6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmc7IGNoYWluQ29tcGxldGU6IGJvb2xlYW47IGJvbnVzWHA6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW5cIiwgY2hhaW5Db21wbGV0ZTogZmFsc2UsIGJvbnVzWHA6IDAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFF1ZXN0ID0gY2hhaW4ucXVlc3RzW2NoYWluLmN1cnJlbnRJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UXVlc3QgIT09IHF1ZXN0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlF1ZXN0IGlzIG5vdCBuZXh0IGluIGNoYWluXCIsXG4gICAgICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYm9udXNYcDogMFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY2hhaW4uY3VycmVudEluZGV4Kys7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5RdWVzdHNDb21wbGV0ZWQrKztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGNoYWluIGlzIGNvbXBsZXRlXG4gICAgICAgIGlmIChjaGFpbi5jdXJyZW50SW5kZXggPj0gY2hhaW4ucXVlc3RzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcGxldGVDaGFpbihjaGFpbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGNoYWluLnF1ZXN0cy5sZW5ndGggLSBjaGFpbi5jdXJyZW50SW5kZXg7XG4gICAgICAgIGNvbnN0IHBlcmNlbnQgPSBNYXRoLmZsb29yKChjaGFpbi5jdXJyZW50SW5kZXggLyBjaGFpbi5xdWVzdHMubGVuZ3RoKSAqIDEwMCk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBwcm9ncmVzczogJHtjaGFpbi5jdXJyZW50SW5kZXh9LyR7Y2hhaW4ucXVlc3RzLmxlbmd0aH0gKCR7cmVtYWluaW5nfSByZW1haW5pbmcsICR7cGVyY2VudH0lIGNvbXBsZXRlKWAsXG4gICAgICAgICAgICBjaGFpbkNvbXBsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IDBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wbGV0ZSB0aGUgZW50aXJlIGNoYWluXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjb21wbGV0ZUNoYWluKGNoYWluOiBRdWVzdENoYWluKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IG1lc3NhZ2U6IHN0cmluZzsgY2hhaW5Db21wbGV0ZTogYm9vbGVhbjsgYm9udXNYcDogbnVtYmVyIH0+IHtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgY2hhaW4uY29tcGxldGVkQXQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBib251c1hwID0gMTAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IGJvbnVzWHA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IGNoYWluLmNvbXBsZXRlZEF0LFxuICAgICAgICAgICAgeHBFYXJuZWQ6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLmF1ZGlvQ29udHJvbGxlcj8ucGxheVNvdW5kKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvQ29udHJvbGxlci5wbGF5U291bmQoXCJzdWNjZXNzXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBDaGFpbiBjb21wbGV0ZTogJHtjaGFpbi5uYW1lfSEgKyR7Ym9udXNYcH0gWFAgQm9udXNgLFxuICAgICAgICAgICAgY2hhaW5Db21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGJvbnVzWHA6IGJvbnVzWHBcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCcmVhayBhbiBhY3RpdmUgY2hhaW5cbiAgICAgKiBLZWVwcyBlYXJuZWQgWFAgZnJvbSBjb21wbGV0ZWQgcXVlc3RzXG4gICAgICovXG4gICAgYXN5bmMgYnJlYWtDaGFpbigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB4cEtlcHQ6IG51bWJlciB9PiB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogXCJObyBhY3RpdmUgY2hhaW4gdG8gYnJlYWtcIiwgeHBLZXB0OiAwIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZCA9IGNoYWluLmN1cnJlbnRJbmRleDtcbiAgICAgICAgY29uc3QgeHBLZXB0ID0gY29tcGxldGVkICogMTA7IC8vIEFwcHJveGltYXRlIFhQIGZyb20gZWFjaCBxdWVzdFxuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSB0byBoaXN0b3J5IGFzIGJyb2tlblxuICAgICAgICBjb25zdCByZWNvcmQ6IFF1ZXN0Q2hhaW5SZWNvcmQgPSB7XG4gICAgICAgICAgICBjaGFpbklkOiBjaGFpbi5pZCxcbiAgICAgICAgICAgIGNoYWluTmFtZTogY2hhaW4ubmFtZSxcbiAgICAgICAgICAgIHRvdGFsUXVlc3RzOiBjaGFpbi5xdWVzdHMubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIHhwRWFybmVkOiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY2hhaW5IaXN0b3J5LnB1c2gocmVjb3JkKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5hY3RpdmVDaGFpbnMgPSB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiBjLmlkICE9PSBjaGFpbi5pZCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENoYWluSWQgPSBcIlwiO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQ2hhaW4gYnJva2VuOiAke2NoYWluLm5hbWV9LiBLZXB0ICR7Y29tcGxldGVkfSBxdWVzdCBjb21wbGV0aW9ucyAoJHt4cEtlcHR9IFhQKS5gLFxuICAgICAgICAgICAgeHBLZXB0OiB4cEtlcHRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcHJvZ3Jlc3Mgb2YgYWN0aXZlIGNoYWluXG4gICAgICovXG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpOiB7IGNvbXBsZXRlZDogbnVtYmVyOyB0b3RhbDogbnVtYmVyOyBwZXJjZW50OiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoIWNoYWluKSByZXR1cm4geyBjb21wbGV0ZWQ6IDAsIHRvdGFsOiAwLCBwZXJjZW50OiAwIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29tcGxldGVkOiBjaGFpbi5jdXJyZW50SW5kZXgsXG4gICAgICAgICAgICB0b3RhbDogY2hhaW4ucXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIHBlcmNlbnQ6IE1hdGguZmxvb3IoKGNoYWluLmN1cnJlbnRJbmRleCAvIGNoYWluLnF1ZXN0cy5sZW5ndGgpICogMTAwKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgY29tcGxldGVkIGNoYWluIHJlY29yZHMgKGhpc3RvcnkpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5IaXN0b3J5KCk6IFF1ZXN0Q2hhaW5SZWNvcmRbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmNoYWluSGlzdG9yeTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIGFjdGl2ZSBjaGFpbnMgKG5vdCBjb21wbGV0ZWQpXG4gICAgICovXG4gICAgZ2V0QWN0aXZlQ2hhaW5zKCk6IFF1ZXN0Q2hhaW5bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzLmFjdGl2ZUNoYWlucy5maWx0ZXIoYyA9PiAhYy5jb21wbGV0ZWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBkZXRhaWxlZCBzdGF0ZSBvZiBhY3RpdmUgY2hhaW4gKGZvciBVSSByZW5kZXJpbmcpXG4gICAgICovXG4gICAgZ2V0Q2hhaW5EZXRhaWxzKCk6IHtcbiAgICAgICAgY2hhaW46IFF1ZXN0Q2hhaW4gfCBudWxsO1xuICAgICAgICBwcm9ncmVzczogeyBjb21wbGV0ZWQ6IG51bWJlcjsgdG90YWw6IG51bWJlcjsgcGVyY2VudDogbnVtYmVyIH07XG4gICAgICAgIHF1ZXN0U3RhdGVzOiBBcnJheTx7IHF1ZXN0OiBzdHJpbmc7IHN0YXR1czogJ2NvbXBsZXRlZCcgfCAnYWN0aXZlJyB8ICdsb2NrZWQnIH0+O1xuICAgIH0ge1xuICAgICAgICBjb25zdCBjaGFpbiA9IHRoaXMuZ2V0QWN0aXZlQ2hhaW4oKTtcbiAgICAgICAgaWYgKCFjaGFpbikge1xuICAgICAgICAgICAgcmV0dXJuIHsgY2hhaW46IG51bGwsIHByb2dyZXNzOiB7IGNvbXBsZXRlZDogMCwgdG90YWw6IDAsIHBlcmNlbnQ6IDAgfSwgcXVlc3RTdGF0ZXM6IFtdIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2dyZXNzID0gdGhpcy5nZXRDaGFpblByb2dyZXNzKCk7XG4gICAgICAgIGNvbnN0IHF1ZXN0U3RhdGVzID0gY2hhaW4ucXVlc3RzLm1hcCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgaWYgKGlkeCA8IGNoYWluLmN1cnJlbnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHF1ZXN0LCBzdGF0dXM6ICdjb21wbGV0ZWQnIGFzIGNvbnN0IH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlkeCA9PT0gY2hhaW4uY3VycmVudEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2FjdGl2ZScgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgcXVlc3QsIHN0YXR1czogJ2xvY2tlZCcgYXMgY29uc3QgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4geyBjaGFpbiwgcHJvZ3Jlc3MsIHF1ZXN0U3RhdGVzIH07XG4gICAgfVxufVxuIiwiaW1wb3J0IHsgVEZpbGUgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzLCBDb250ZXh0RmlsdGVyLCBGaWx0ZXJTdGF0ZSwgRW5lcmd5TGV2ZWwsIFF1ZXN0Q29udGV4dCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBETEMgNTogQ29udGV4dCBGaWx0ZXJzIEVuZ2luZVxuICogSGFuZGxlcyBxdWVzdCBmaWx0ZXJpbmcgYnkgZW5lcmd5IGxldmVsLCBsb2NhdGlvbiBjb250ZXh0LCBhbmQgY3VzdG9tIHRhZ3NcbiAqIFxuICogSVNPTEFURUQ6IE9ubHkgcmVhZHMvd3JpdGVzIHRvIHF1ZXN0RmlsdGVycywgZmlsdGVyU3RhdGVcbiAqIERFUEVOREVOQ0lFUzogU2lzeXBodXNTZXR0aW5ncyB0eXBlcywgVEZpbGUgKGZvciBxdWVzdCBtZXRhZGF0YSlcbiAqIE5PVEU6IFRoaXMgaXMgcHJpbWFyaWx5IGEgVklFVyBMQVlFUiBjb25jZXJuLCBidXQga2VlcGluZyBsb2dpYyBpc29sYXRlZCBpcyBnb29kXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWx0ZXJzRW5naW5lIHtcbiAgICBzZXR0aW5nczogU2lzeXBodXNTZXR0aW5ncztcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgZmlsdGVyIGZvciBhIHNwZWNpZmljIHF1ZXN0XG4gICAgICovXG4gICAgc2V0UXVlc3RGaWx0ZXIocXVlc3ROYW1lOiBzdHJpbmcsIGVuZXJneTogRW5lcmd5TGV2ZWwsIGNvbnRleHQ6IFF1ZXN0Q29udGV4dCwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXSA9IHtcbiAgICAgICAgICAgIGVuZXJneUxldmVsOiBlbmVyZ3ksXG4gICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgdGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBmaWx0ZXIgZm9yIGEgc3BlY2lmaWMgcXVlc3RcbiAgICAgKi9cbiAgICBnZXRRdWVzdEZpbHRlcihxdWVzdE5hbWU6IHN0cmluZyk6IENvbnRleHRGaWx0ZXIgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV0gfHwgbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGFjdGl2ZSBmaWx0ZXIgc3RhdGVcbiAgICAgKi9cbiAgICBzZXRGaWx0ZXJTdGF0ZShlbmVyZ3k6IEVuZXJneUxldmVsIHwgXCJhbnlcIiwgY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIiwgdGFnczogc3RyaW5nW10pOiB2b2lkIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZUVuZXJneTogZW5lcmd5IGFzIGFueSxcbiAgICAgICAgICAgIGFjdGl2ZUNvbnRleHQ6IGNvbnRleHQgYXMgYW55LFxuICAgICAgICAgICAgYWN0aXZlVGFnczogdGFnc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRlKCk6IEZpbHRlclN0YXRlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYSBxdWVzdCBtYXRjaGVzIGN1cnJlbnQgZmlsdGVyIHN0YXRlXG4gICAgICovXG4gICAgcXVlc3RNYXRjaGVzRmlsdGVyKHF1ZXN0TmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlO1xuICAgICAgICBjb25zdCBxdWVzdEZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBmaWx0ZXIgc2V0IGZvciB0aGlzIHF1ZXN0LCBhbHdheXMgc2hvd1xuICAgICAgICBpZiAoIXF1ZXN0RmlsdGVyKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuZXJneSBmaWx0ZXJcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmVuZXJneUxldmVsICE9PSBmaWx0ZXJzLmFjdGl2ZUVuZXJneSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0IGZpbHRlclxuICAgICAgICBpZiAoZmlsdGVycy5hY3RpdmVDb250ZXh0ICE9PSBcImFueVwiICYmIHF1ZXN0RmlsdGVyLmNvbnRleHQgIT09IGZpbHRlcnMuYWN0aXZlQ29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUYWdzIGZpbHRlciAocmVxdWlyZXMgQU5ZIG9mIHRoZSBhY3RpdmUgdGFncylcbiAgICAgICAgaWYgKGZpbHRlcnMuYWN0aXZlVGFncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBoYXNUYWcgPSBmaWx0ZXJzLmFjdGl2ZVRhZ3Muc29tZSgodGFnOiBzdHJpbmcpID0+IHF1ZXN0RmlsdGVyLnRhZ3MuaW5jbHVkZXModGFnKSk7XG4gICAgICAgICAgICBpZiAoIWhhc1RhZykgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXIgYSBsaXN0IG9mIHF1ZXN0cyBiYXNlZCBvbiBjdXJyZW50IGZpbHRlciBzdGF0ZVxuICAgICAqL1xuICAgIGZpbHRlclF1ZXN0cyhxdWVzdHM6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4pOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+IHtcbiAgICAgICAgcmV0dXJuIHF1ZXN0cy5maWx0ZXIocXVlc3QgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcXVlc3QuYmFzZW5hbWUgfHwgcXVlc3QubmFtZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXN0TWF0Y2hlc0ZpbHRlcihxdWVzdE5hbWUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgcXVlc3RzIGJ5IHNwZWNpZmljIGVuZXJneSBsZXZlbFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5RW5lcmd5KGVuZXJneTogRW5lcmd5TGV2ZWwsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmVuZXJneUxldmVsID09PSBlbmVyZ3k7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgY29udGV4dFxuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5Q29udGV4dChjb250ZXh0OiBRdWVzdENvbnRleHQsIHF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IEFycmF5PHsgYmFzZW5hbWU/OiBzdHJpbmc7IG5hbWU/OiBzdHJpbmcgfT4ge1xuICAgICAgICByZXR1cm4gcXVlc3RzLmZpbHRlcihxID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXN0TmFtZSA9IHEuYmFzZW5hbWUgfHwgcS5uYW1lO1xuICAgICAgICAgICAgY29uc3QgZmlsdGVyID0gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnNbcXVlc3ROYW1lXTtcbiAgICAgICAgICAgIHJldHVybiBmaWx0ZXIgJiYgZmlsdGVyLmNvbnRleHQgPT09IGNvbnRleHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBxdWVzdHMgYnkgc3BlY2lmaWMgdGFnc1xuICAgICAqL1xuICAgIGdldFF1ZXN0c0J5VGFncyh0YWdzOiBzdHJpbmdbXSwgcXVlc3RzOiBBcnJheTx7IGJhc2VuYW1lPzogc3RyaW5nOyBuYW1lPzogc3RyaW5nIH0+KTogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9PiB7XG4gICAgICAgIHJldHVybiBxdWVzdHMuZmlsdGVyKHEgPT4ge1xuICAgICAgICAgICAgY29uc3QgcXVlc3ROYW1lID0gcS5iYXNlbmFtZSB8fCBxLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXIgPSB0aGlzLnNldHRpbmdzLnF1ZXN0RmlsdGVyc1txdWVzdE5hbWVdO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB0YWdzLnNvbWUodGFnID0+IGZpbHRlci50YWdzLmluY2x1ZGVzKHRhZykpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgYWN0aXZlIGZpbHRlcnNcbiAgICAgKi9cbiAgICBjbGVhckZpbHRlcnMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsXG4gICAgICAgICAgICBhY3RpdmVDb250ZXh0OiBcImFueVwiLFxuICAgICAgICAgICAgYWN0aXZlVGFnczogW11cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHVuaXF1ZSB0YWdzIHVzZWQgYWNyb3NzIGFsbCBxdWVzdHNcbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGVUYWdzKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgdGFncyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBxdWVzdE5hbWUgaW4gdGhpcy5zZXR0aW5ncy5xdWVzdEZpbHRlcnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlciA9IHRoaXMuc2V0dGluZ3MucXVlc3RGaWx0ZXJzW3F1ZXN0TmFtZV07XG4gICAgICAgICAgICBmaWx0ZXIudGFncy5mb3JFYWNoKCh0YWc6IHN0cmluZykgPT4gdGFncy5hZGQodGFnKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VtbWFyeSBzdGF0cyBhYm91dCBmaWx0ZXJlZCBzdGF0ZVxuICAgICAqL1xuICAgIGdldEZpbHRlclN0YXRzKGFsbFF1ZXN0czogQXJyYXk8eyBiYXNlbmFtZT86IHN0cmluZzsgbmFtZT86IHN0cmluZyB9Pik6IHtcbiAgICAgICAgdG90YWw6IG51bWJlcjtcbiAgICAgICAgZmlsdGVyZWQ6IG51bWJlcjtcbiAgICAgICAgYWN0aXZlRmlsdGVyc0NvdW50OiBudW1iZXI7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gdGhpcy5maWx0ZXJRdWVzdHMoYWxsUXVlc3RzKTtcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsdGVyc0NvdW50ID0gKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ICE9PSBcImFueVwiID8gMSA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlQ29udGV4dCAhPT0gXCJhbnlcIiA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MubGVuZ3RoID4gMCA/IDEgOiAwKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0b3RhbDogYWxsUXVlc3RzLmxlbmd0aCxcbiAgICAgICAgICAgIGZpbHRlcmVkOiBmaWx0ZXJlZC5sZW5ndGgsXG4gICAgICAgICAgICBhY3RpdmVGaWx0ZXJzQ291bnQ6IGFjdGl2ZUZpbHRlcnNDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBhIHNwZWNpZmljIGZpbHRlciB2YWx1ZVxuICAgICAqIFVzZWZ1bCBmb3IgVUkgdG9nZ2xlIGJ1dHRvbnNcbiAgICAgKi9cbiAgICB0b2dnbGVFbmVyZ3lGaWx0ZXIoZW5lcmd5OiBFbmVyZ3lMZXZlbCB8IFwiYW55XCIpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID09PSBlbmVyZ3kpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gXCJhbnlcIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlRW5lcmd5ID0gZW5lcmd5IGFzIGFueTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBjb250ZXh0IGZpbHRlclxuICAgICAqL1xuICAgIHRvZ2dsZUNvbnRleHRGaWx0ZXIoY29udGV4dDogUXVlc3RDb250ZXh0IHwgXCJhbnlcIik6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZUNvbnRleHQgPSBcImFueVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5maWx0ZXJTdGF0ZS5hY3RpdmVDb250ZXh0ID0gY29udGV4dCBhcyBhbnk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgYSB0YWcgaW4gdGhlIGFjdGl2ZSB0YWcgbGlzdFxuICAgICAqL1xuICAgIHRvZ2dsZVRhZyh0YWc6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBpZHggPSB0aGlzLnNldHRpbmdzLmZpbHRlclN0YXRlLmFjdGl2ZVRhZ3MuaW5kZXhPZih0YWcpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZmlsdGVyU3RhdGUuYWN0aXZlVGFncy5wdXNoKHRhZyk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nLCBOb3RpY2UsIG1vbWVudCwgVEZpbGUsIFRGb2xkZXIgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgU2lzeXBodXNQbHVnaW4gZnJvbSAnLi4vbWFpbic7IC8vIEZpeDogRGVmYXVsdCBJbXBvcnRcbmltcG9ydCB7IE1vZGlmaWVyIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgQ2hhb3NNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgbW9kaWZpZXI6IE1vZGlmaWVyOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgbTogTW9kaWZpZXIpIHsgc3VwZXIoYXBwKTsgdGhpcy5tb2RpZmllcj1tOyB9IFxuICAgIG9uT3BlbigpIHsgXG4gICAgICAgIGNvbnN0IGMgPSB0aGlzLmNvbnRlbnRFbDsgXG4gICAgICAgIGNvbnN0IGgxID0gYy5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogXCJUSEUgT01FTlwiIH0pOyBcbiAgICAgICAgaDEuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyOyBjb2xvcjojZjU1O1wiKTsgXG4gICAgICAgIGNvbnN0IGljID0gYy5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IHRoaXMubW9kaWZpZXIuaWNvbiB9KTsgXG4gICAgICAgIGljLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsXCJmb250LXNpemU6ODBweDsgdGV4dC1hbGlnbjpjZW50ZXI7XCIpOyBcbiAgICAgICAgY29uc3QgaDIgPSBjLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiB0aGlzLm1vZGlmaWVyLm5hbWUgfSk7IFxuICAgICAgICBoMi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwidGV4dC1hbGlnbjpjZW50ZXI7XCIpOyBcbiAgICAgICAgY29uc3QgcCA9IGMuY3JlYXRlRWwoXCJwXCIsIHt0ZXh0OiB0aGlzLm1vZGlmaWVyLmRlc2N9KTsgXG4gICAgICAgIHAuc2V0QXR0cmlidXRlKFwic3R5bGVcIixcInRleHQtYWxpZ246Y2VudGVyXCIpOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJBY2tub3dsZWRnZVwifSk7IFxuICAgICAgICBiLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgIGIuc3R5bGUuZGlzcGxheT1cImJsb2NrXCI7IFxuICAgICAgICBiLnN0eWxlLm1hcmdpbj1cIjIwcHggYXV0b1wiOyBcbiAgICAgICAgYi5vbmNsaWNrPSgpPT50aGlzLmNsb3NlKCk7IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFNob3BNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwi8J+bkiBCTEFDSyBNQVJLRVRcIiB9KTsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHVyc2U6IPCfqpkgJHt0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkfWAgfSk7IFxuICAgICAgICBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5KJIFN0aW1wYWNrXCIsIFwiSGVhbCAyMCBIUFwiLCA1MCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwID0gTWF0aC5taW4odGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4SHAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwICsgMjApOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfkqMgU2Fib3RhZ2VcIiwgXCItNSBSaXZhbCBEbWdcIiwgMjAwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgPSBNYXRoLm1heCg1LCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yaXZhbERtZyAtIDUpOyBcbiAgICAgICAgfSk7IFxuICAgICAgICB0aGlzLml0ZW0oY29udGVudEVsLCBcIvCfm6HvuI8gU2hpZWxkXCIsIFwiMjRoIFByb3RlY3Rpb25cIiwgMTUwLCBhc3luYyAoKSA9PiB7IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcbiAgICAgICAgdGhpcy5pdGVtKGNvbnRlbnRFbCwgXCLwn5i0IFJlc3QgRGF5XCIsIFwiU2FmZSBmb3IgMjRoXCIsIDEwMCwgYXN5bmMgKCkgPT4geyBcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc3REYXlVbnRpbCA9IG1vbWVudCgpLmFkZCgyNCwgJ2hvdXJzJykudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pOyBcbiAgICB9IFxuICAgIGl0ZW0oZWw6IEhUTUxFbGVtZW50LCBuYW1lOiBzdHJpbmcsIGRlc2M6IHN0cmluZywgY29zdDogbnVtYmVyLCBlZmZlY3Q6ICgpID0+IFByb21pc2U8dm9pZD4pIHsgXG4gICAgICAgIGNvbnN0IGMgPSBlbC5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGMuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuOyBwYWRkaW5nOjEwcHggMDsgYm9yZGVyLWJvdHRvbToxcHggc29saWQgIzMzMztcIik7IFxuICAgICAgICBjb25zdCBpID0gYy5jcmVhdGVEaXYoKTsgXG4gICAgICAgIGkuY3JlYXRlRWwoXCJiXCIsIHsgdGV4dDogbmFtZSB9KTsgXG4gICAgICAgIGkuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBkZXNjIH0pOyBcbiAgICAgICAgY29uc3QgYiA9IGMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBgJHtjb3N0fSBHYCB9KTsgXG4gICAgICAgIGlmKHRoaXMucGx1Z2luLnNldHRpbmdzLmdvbGQgPCBjb3N0KSB7IFxuICAgICAgICAgICAgYi5zZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiLFwidHJ1ZVwiKTsgYi5zdHlsZS5vcGFjaXR5PVwiMC41XCI7IFxuICAgICAgICB9IGVsc2UgeyBcbiAgICAgICAgICAgIGIuYWRkQ2xhc3MoXCJtb2QtY3RhXCIpOyBcbiAgICAgICAgICAgIGIub25jbGljayA9IGFzeW5jICgpID0+IHsgXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCAtPSBjb3N0OyBcbiAgICAgICAgICAgICAgICBhd2FpdCBlZmZlY3QoKTsgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTsgXG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShgQm91Z2h0ICR7bmFtZX1gKTsgXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpOyBcbiAgICAgICAgICAgICAgICBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IFxuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgIH0gXG4gICAgb25DbG9zZSgpIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfSBcbn1cblxuZXhwb3J0IGNsYXNzIFF1ZXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7IFxuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47IFxuICAgIG5hbWU6IHN0cmluZzsgZGlmZmljdWx0eTogbnVtYmVyID0gMzsgc2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiOyBzZWNTa2lsbDogc3RyaW5nID0gXCJOb25lXCI7IGRlYWRsaW5lOiBzdHJpbmcgPSBcIlwiOyBoaWdoU3Rha2VzOiBib29sZWFuID0gZmFsc2U7IGlzQm9zczogYm9vbGVhbiA9IGZhbHNlOyBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikgeyBzdXBlcihhcHApOyB0aGlzLnBsdWdpbiA9IHBsdWdpbjsgfSBcbiAgICBvbk9wZW4oKSB7IFxuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpczsgXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCLimpTvuI8gREVQTE9ZTUVOVFwiIH0pOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk9iamVjdGl2ZVwiKS5hZGRUZXh0KHQgPT4geyBcbiAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLm5hbWUgPSB2KTsgXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7IFxuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEaWZmaWN1bHR5XCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb24oXCIxXCIsXCJUcml2aWFsXCIpLmFkZE9wdGlvbihcIjJcIixcIkVhc3lcIikuYWRkT3B0aW9uKFwiM1wiLFwiTWVkaXVtXCIpLmFkZE9wdGlvbihcIjRcIixcIkhhcmRcIikuYWRkT3B0aW9uKFwiNVwiLFwiU1VJQ0lERVwiKS5zZXRWYWx1ZShcIjNcIikub25DaGFuZ2Uodj0+dGhpcy5kaWZmaWN1bHR5PXBhcnNlSW50KHYpKSk7IFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2tpbGxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTsgXG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNraWxscy5mb3JFYWNoKHMgPT4gc2tpbGxzW3MubmFtZV0gPSBzLm5hbWUpOyBcbiAgICAgICAgc2tpbGxzW1wiKyBOZXdcIl0gPSBcIisgTmV3XCI7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUHJpbWFyeSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykub25DaGFuZ2UodiA9PiB7IFxuICAgICAgICAgICAgaWYodj09PVwiKyBOZXdcIil7IHRoaXMuY2xvc2UoKTsgbmV3IFNraWxsTWFuYWdlck1vZGFsKHRoaXMuYXBwLHRoaXMucGx1Z2luKS5vcGVuKCk7IH0gZWxzZSB0aGlzLnNraWxsPXY7IFxuICAgICAgICB9KSk7IFxuICAgICAgICBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiU3luZXJneSBOb2RlXCIpLmFkZERyb3Bkb3duKGQgPT4gZC5hZGRPcHRpb25zKHNraWxscykuc2V0VmFsdWUoXCJOb25lXCIpLm9uQ2hhbmdlKHYgPT4gdGhpcy5zZWNTa2lsbCA9IHYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiRGVhZGxpbmVcIikuYWRkVGV4dCh0ID0+IHsgdC5pbnB1dEVsLnR5cGUgPSBcImRhdGV0aW1lLWxvY2FsXCI7IHQub25DaGFuZ2UodiA9PiB0aGlzLmRlYWRsaW5lID0gdik7IH0pO1xuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJIaWdoIFN0YWtlc1wiKS5zZXREZXNjKFwiRG91YmxlIEdvbGQgLyBEb3VibGUgRGFtYWdlXCIpLmFkZFRvZ2dsZSh0PT50LnNldFZhbHVlKGZhbHNlKS5vbkNoYW5nZSh2PT50aGlzLmhpZ2hTdGFrZXM9dikpOyBcbiAgICAgICAgXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuYWRkQnV0dG9uKGIgPT4gYi5zZXRCdXR0b25UZXh0KFwiRGVwbG95XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4geyBcbiAgICAgICAgICAgIGlmKHRoaXMubmFtZSl7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0KHRoaXMubmFtZSx0aGlzLmRpZmZpY3VsdHksdGhpcy5za2lsbCx0aGlzLnNlY1NraWxsLHRoaXMuZGVhZGxpbmUsdGhpcy5oaWdoU3Rha2VzLCBcIk5vcm1hbFwiLCB0aGlzLmlzQm9zcyk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgfSkpOyBcbiAgICB9IFxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH0gXG59XG5cbmV4cG9ydCBjbGFzcyBTa2lsbE1hbmFnZXJNb2RhbCBleHRlbmRzIE1vZGFsIHsgXG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjsgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHsgc3VwZXIoYXBwKTsgdGhpcy5wbHVnaW4gPSBwbHVnaW47IH0gXG4gICAgb25PcGVuKCkgeyBcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IFxuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQWRkIE5ldyBOb2RlXCIgfSk7IFxuICAgICAgICBsZXQgbj1cIlwiOyBcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiTm9kZSBOYW1lXCIpLmFkZFRleHQodD0+dC5vbkNoYW5nZSh2PT5uPXYpKS5hZGRCdXR0b24oYj0+Yi5zZXRCdXR0b25UZXh0KFwiQ3JlYXRlXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMoKT0+e1xuICAgICAgICAgICAgaWYobil7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnB1c2goe25hbWU6bixsZXZlbDoxLHhwOjAseHBSZXE6NSxsYXN0VXNlZDpuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkscnVzdDowLGNvbm5lY3Rpb25zOltdfSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLnNhdmUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKTsgXG4gICAgfSBcbiAgICBvbkNsb3NlKCkgeyB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpOyB9IFxufVxuXG5leHBvcnQgY2xhc3MgU2tpbGxEZXRhaWxNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luOyBpbmRleDogbnVtYmVyO1xuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luLCBpbmRleDogbnVtYmVyKSB7IHN1cGVyKGFwcCk7IHRoaXMucGx1Z2luPXBsdWdpbjsgdGhpcy5pbmRleD1pbmRleDsgfVxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7IGNvbnN0IHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5za2lsbHNbdGhpcy5pbmRleF07XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYE5vZGU6ICR7cy5uYW1lfWAgfSk7XG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIk5hbWVcIikuYWRkVGV4dCh0PT50LnNldFZhbHVlKHMubmFtZSkub25DaGFuZ2Uodj0+cy5uYW1lPXYpKTtcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiUnVzdCBTdGF0dXNcIikuc2V0RGVzYyhgU3RhY2tzOiAke3MucnVzdH1gKS5hZGRCdXR0b24oYj0+Yi5zZXRCdXR0b25UZXh0KFwiTWFudWFsIFBvbGlzaFwiKS5vbkNsaWNrKGFzeW5jKCk9PnsgXG4gICAgICAgICAgICBzLnJ1c3Q9MDsgcy54cFJlcT1NYXRoLmZsb29yKHMueHBSZXEvMS4xKTsgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyBcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgICAgICBuZXcgTm90aWNlKFwiUnVzdCBwb2xpc2hlZC5cIik7IFxuICAgICAgICB9KSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkaXYgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7IFxuICAgICAgICBkaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOjIwcHg7IGRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYlNhdmUgPSBkaXYuY3JlYXRlRWwoXCJidXR0b25cIiwge3RleHQ6XCJTYXZlXCJ9KTsgXG4gICAgICAgIGJTYXZlLmFkZENsYXNzKFwibW9kLWN0YVwiKTsgXG4gICAgICAgIGJTYXZlLm9uY2xpY2s9YXN5bmMoKT0+eyBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyB0aGlzLmNsb3NlKCk7IH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiRGVsID0gZGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHt0ZXh0OlwiRGVsZXRlIE5vZGVcIn0pOyBcbiAgICAgICAgYkRlbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLFwiY29sb3I6cmVkO1wiKTsgXG4gICAgICAgIGJEZWwub25jbGljaz1hc3luYygpPT57IFxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLnNwbGljZSh0aGlzLmluZGV4LCAxKTsgXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuc2F2ZSgpOyBcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTsgXG4gICAgICAgIH07XG4gICAgfVxuICAgIG9uQ2xvc2UoKSB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuXG5cbmV4cG9ydCBjbGFzcyBSZXNlYXJjaFF1ZXN0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gICAgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbjtcbiAgICB0aXRsZTogc3RyaW5nID0gXCJcIjtcbiAgICB0eXBlOiBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIiA9IFwic3VydmV5XCI7XG4gICAgbGlua2VkU2tpbGw6IHN0cmluZyA9IFwiTm9uZVwiO1xuICAgIGxpbmtlZENvbWJhdFF1ZXN0OiBzdHJpbmcgPSBcIk5vbmVcIjtcblxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJSRVNFQVJDSCBERVBMT1lNRU5UXCIgfSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJSZXNlYXJjaCBUaXRsZVwiKVxuICAgICAgICAgICAgLmFkZFRleHQodCA9PiB7XG4gICAgICAgICAgICAgICAgdC5vbkNoYW5nZSh2ID0+IHRoaXMudGl0bGUgPSB2KTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHQuaW5wdXRFbC5mb2N1cygpLCA1MCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIlJlc2VhcmNoIFR5cGVcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9uKFwic3VydmV5XCIsIFwiU3VydmV5ICgxMDAtMjAwIHdvcmRzKVwiKVxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb24oXCJkZWVwX2RpdmVcIiwgXCJEZWVwIERpdmUgKDIwMC00MDAgd29yZHMpXCIpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwic3VydmV5XCIpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHYgPT4gdGhpcy50eXBlID0gdiBhcyBcInN1cnZleVwiIHwgXCJkZWVwX2RpdmVcIilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgY29uc3Qgc2tpbGxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIk5vbmVcIjogXCJOb25lXCIgfTtcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2gocyA9PiBza2lsbHNbcy5uYW1lXSA9IHMubmFtZSk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJMaW5rZWQgU2tpbGxcIilcbiAgICAgICAgICAgIC5hZGREcm9wZG93bihkID0+IGRcbiAgICAgICAgICAgICAgICAuYWRkT3B0aW9ucyhza2lsbHMpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKFwiTm9uZVwiKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZSh2ID0+IHRoaXMubGlua2VkU2tpbGwgPSB2KVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBjb21iYXRRdWVzdHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IFwiTm9uZVwiOiBcIk5vbmVcIiB9O1xuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBpZiAocXVlc3RGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmIGluc3RhbmNlb2YgVEZpbGUgJiYgZi5leHRlbnNpb24gPT09IFwibWRcIikge1xuICAgICAgICAgICAgICAgICAgICBjb21iYXRRdWVzdHNbZi5iYXNlbmFtZV0gPSBmLmJhc2VuYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgICAgICAgLnNldE5hbWUoXCJMaW5rIENvbWJhdCBRdWVzdFwiKVxuICAgICAgICAgICAgLmFkZERyb3Bkb3duKGQgPT4gZFxuICAgICAgICAgICAgICAgIC5hZGRPcHRpb25zKGNvbWJhdFF1ZXN0cylcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUoXCJOb25lXCIpXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKHYgPT4gdGhpcy5saW5rZWRDb21iYXRRdWVzdCA9IHYpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgICAgICAgIC5hZGRCdXR0b24oYiA9PiBiXG4gICAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJDUkVBVEUgUkVTRUFSQ0hcIilcbiAgICAgICAgICAgICAgICAuc2V0Q3RhKClcbiAgICAgICAgICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpbmtlZFNraWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlua2VkQ29tYmF0UXVlc3RcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlc2VhcmNoTGlzdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTaXN5cGh1c1BsdWdpbikge1xuICAgICAgICBzdXBlcihhcHApO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBvbk9wZW4oKSB7XG4gICAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUkVTRUFSQ0ggTElCUkFSWVwiIH0pO1xuXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNFbCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1yZXNlYXJjaC1zdGF0c1wiIH0pO1xuICAgICAgICBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBDb21iYXQgUXVlc3RzOiAke3N0YXRzLmNvbWJhdH1gIH0pO1xuICAgICAgICBzdGF0c0VsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBSZXNlYXJjaCBRdWVzdHM6ICR7c3RhdHMucmVzZWFyY2h9YCB9KTtcbiAgICAgICAgc3RhdHNFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUmF0aW86ICR7c3RhdHMucmF0aW99OjFgIH0pO1xuXG4gICAgICAgIGlmICghdGhpcy5wbHVnaW4uZW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSkge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiAxMHB4IDA7XCIpO1xuICAgICAgICAgICAgd2FybmluZy5zZXRUZXh0KFwiUkVTRUFSQ0ggQkxPQ0tFRDogTmVlZCAyOjEgY29tYmF0IHRvIHJlc2VhcmNoIHJhdGlvXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFjdGl2ZSBSZXNlYXJjaFwiIH0pO1xuXG4gICAgICAgIGNvbnN0IHF1ZXN0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlc2VhcmNoUXVlc3RzLmZpbHRlcihxID0+ICFxLmNvbXBsZXRlZCk7XG4gICAgICAgIGlmIChxdWVzdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBhY3RpdmUgcmVzZWFyY2ggcXVlc3RzLlwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcXVlc3RzLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtY2FyZFwiIH0pO1xuICAgICAgICAgICAgICAgIGNhcmQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNDQ0OyBwYWRkaW5nOiAxMHB4OyBtYXJnaW46IDVweCAwOyBib3JkZXItcmFkaXVzOiA0cHg7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogcS50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDAgMCA1cHggMDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gY2FyZC5jcmVhdGVFbChcImRpdlwiKTtcbiAgICAgICAgICAgICAgICBpbmZvLmlubmVySFRNTCA9IGA8Y29kZSBzdHlsZT1cImNvbG9yOiNhYTY0ZmZcIj4ke3EuaWR9PC9jb2RlPjxicj5UeXBlOiAke3EudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSB8IFdvcmRzOiAke3Eud29yZENvdW50fS8ke3Eud29yZExpbWl0fWA7XG4gICAgICAgICAgICAgICAgaW5mby5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtc2l6ZTogMC45ZW07IG9wYWNpdHk6IDAuODtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luLXRvcDogOHB4OyBkaXNwbGF5OiBmbGV4OyBnYXA6IDVweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjb21wbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNPTVBMRVRFXCIgfSk7XG4gICAgICAgICAgICAgICAgY29tcGxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA1cHg7IGJhY2tncm91bmQ6IGdyZWVuOyBjb2xvcjogd2hpdGU7IGJvcmRlcjogbm9uZTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7XCIpO1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocS5pZCwgcS53b3JkQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ0biA9IGFjdGlvbnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkRFTEVURVwiIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDVweDsgYmFja2dyb3VuZDogcmVkOyBjb2xvcjogd2hpdGU7IGJvcmRlcjogbm9uZTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJDb21wbGV0ZWQgUmVzZWFyY2hcIiB9KTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gcS5jb21wbGV0ZWQpO1xuICAgICAgICBpZiAoY29tcGxldGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkLmZvckVhY2goKHE6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIpO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0VGV4dChgKyAke3EudGl0bGV9ICgke3EudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgKTtcbiAgICAgICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwib3BhY2l0eTogMC42OyBmb250LXNpemU6IDAuOWVtO1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB9XG59XG5cblxuZXhwb3J0IGNsYXNzIENoYWluQnVpbGRlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgY2hhaW5OYW1lOiBzdHJpbmcgPSBcIlwiO1xuICAgIHNlbGVjdGVkUXVlc3RzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkNIQUlOIEJVSUxERVJcIiB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuc2V0TmFtZShcIkNoYWluIE5hbWVcIilcbiAgICAgICAgICAgIC5hZGRUZXh0KHQgPT4ge1xuICAgICAgICAgICAgICAgIHQub25DaGFuZ2UodiA9PiB0aGlzLmNoYWluTmFtZSA9IHYpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdC5pbnB1dEVsLmZvY3VzKCksIDUwKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTZWxlY3QgUXVlc3RzXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdEZvbGRlciA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIkFjdGl2ZV9SdW4vUXVlc3RzXCIpO1xuICAgICAgICBjb25zdCBxdWVzdHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBpZiAocXVlc3RGb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBxdWVzdEZvbGRlci5jaGlsZHJlbi5mb3JFYWNoKGYgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmIGluc3RhbmNlb2YgVEZpbGUgJiYgZi5leHRlbnNpb24gPT09IFwibWRcIikge1xuICAgICAgICAgICAgICAgICAgICBxdWVzdHMucHVzaChmLmJhc2VuYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHF1ZXN0cy5mb3JFYWNoKChxdWVzdCwgaWR4KSA9PiB7XG4gICAgICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAgICAgLnNldE5hbWUocXVlc3QpXG4gICAgICAgICAgICAgICAgLmFkZFRvZ2dsZSh0ID0+IHQub25DaGFuZ2UodiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbGVjdGVkUXVlc3RzLnB1c2gocXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZFF1ZXN0cyA9IHRoaXMuc2VsZWN0ZWRRdWVzdHMuZmlsdGVyKHEgPT4gcSAhPT0gcXVlc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpXG4gICAgICAgICAgICAuYWRkQnV0dG9uKGIgPT4gYlxuICAgICAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiQ1JFQVRFIENIQUlOXCIpXG4gICAgICAgICAgICAgICAgLnNldEN0YSgpXG4gICAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jaGFpbk5hbWUgJiYgdGhpcy5zZWxlY3RlZFF1ZXN0cy5sZW5ndGggPj0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZW5naW5lLmNyZWF0ZVF1ZXN0Q2hhaW4odGhpcy5jaGFpbk5hbWUsIHRoaXMuc2VsZWN0ZWRRdWVzdHMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IE5vdGljZShcIkNoYWluIG5lZWRzIGEgbmFtZSBhbmQgYXQgbGVhc3QgMiBxdWVzdHNcIik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFZpY3RvcnlNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgICBwbHVnaW46IFNpc3lwaHVzUGx1Z2luO1xuICAgIFxuICAgIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGFwcCk7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIG9uT3BlbigpIHtcbiAgICAgICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRlbnRFbC5hZGRDbGFzcyhcInNpc3ktdmljdG9yeS1tb2RhbFwiKTtcblxuICAgICAgICAvLyBFcGljIFRpdGxlXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogXCJBU0NFTlNJT04gQUNISUVWRURcIiwgY2xzOiBcInNpc3ktdmljdG9yeS10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gW0ZJWEVEXSBzdHlsZSBtb3ZlZCB0byBhdHRyXG4gICAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IFwi8J+PhlwiLCBhdHRyOiB7IHN0eWxlOiBcImZvbnQtc2l6ZTogNjBweDsgbWFyZ2luOiAyMHB4IDA7XCIgfSB9KTtcblxuICAgICAgICAvLyBTdGF0cyBDb250YWluZXJcbiAgICAgICAgY29uc3Qgc3RhdHMgPSBjb250ZW50RWwuY3JlYXRlRGl2KCk7XG4gICAgICAgIGNvbnN0IGxlZ2FjeSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmxlZ2FjeTtcbiAgICAgICAgY29uc3QgbWV0cmljcyA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRHYW1lU3RhdHMoKTtcblxuICAgICAgICB0aGlzLnN0YXRMaW5lKHN0YXRzLCBcIkZpbmFsIExldmVsXCIsIFwiNTBcIik7XG4gICAgICAgIHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiVG90YWwgUXVlc3RzXCIsIGAke21ldHJpY3MudG90YWxRdWVzdHN9YCk7XG4gICAgICAgIHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiRGVhdGhzIEVuZHVyZWRcIiwgYCR7bGVnYWN5LmRlYXRoQ291bnR9YCk7XG4gICAgICAgIHRoaXMuc3RhdExpbmUoc3RhdHMsIFwiTG9uZ2VzdCBTdHJlYWtcIiwgYCR7bWV0cmljcy5sb25nZXN0U3RyZWFrfSBkYXlzYCk7XG5cbiAgICAgICAgLy8gTWVzc2FnZVxuICAgICAgICAvLyBbRklYRURdIHN0eWxlIG1vdmVkIHRvIGF0dHJcbiAgICAgICAgY29uc3QgbXNnID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IFxuICAgICAgICAgICAgdGV4dDogXCJPbmUgbXVzdCBpbWFnaW5lIFNpc3lwaHVzIGhhcHB5LiBZb3UgaGF2ZSBwdXNoZWQgdGhlIGJvdWxkZXIgdG8gdGhlIHBlYWsuXCIsXG4gICAgICAgICAgICBhdHRyOiB7IHN0eWxlOiBcIm1hcmdpbjogMzBweCAwOyBmb250LXN0eWxlOiBpdGFsaWM7IG9wYWNpdHk6IDAuODtcIiB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnRpbnVlIEJ1dHRvblxuICAgICAgICBjb25zdCBidG4gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkJFR0lOIE5FVyBHQU1FK1wiIH0pO1xuICAgICAgICBidG4uYWRkQ2xhc3MoXCJtb2QtY3RhXCIpO1xuICAgICAgICBidG4uc3R5bGUud2lkdGggPSBcIjEwMCVcIjtcbiAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBPcHRpb25hbDogVHJpZ2dlciBQcmVzdGlnZS9OZXcgR2FtZSsgbG9naWMgaGVyZSBpZiBkZXNpcmVkXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgc3RhdExpbmUoZWw6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWw6IHN0cmluZykge1xuICAgICAgICBjb25zdCBsaW5lID0gZWwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktdmljdG9yeS1zdGF0XCIgfSk7XG4gICAgICAgIGxpbmUuaW5uZXJIVE1MID0gYCR7bGFiZWx9OiA8c3BhbiBjbGFzcz1cInNpc3ktdmljdG9yeS1oaWdobGlnaHRcIj4ke3ZhbH08L3NwYW4+YDtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cblxuXG5cbi8vIFtBUFBFTkQgVE8gc3JjL3VpL21vZGFscy50c11cblxuZXhwb3J0IGNsYXNzIFF1aWNrQ2FwdHVyZU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG4gICAgXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU2lzeXBodXNQbHVnaW4pIHtcbiAgICAgICAgc3VwZXIoYXBwKTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgfVxuXG4gICAgb25PcGVuKCkge1xuICAgICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIuKaoSBRdWljayBDYXB0dXJlXCIgfSk7XG5cbiAgICAgICAgY29uc3QgZGl2ID0gY29udGVudEVsLmNyZWF0ZURpdigpO1xuICAgICAgICBjb25zdCBpbnB1dCA9IGRpdi5jcmVhdGVFbChcImlucHV0XCIsIHsgXG4gICAgICAgICAgICB0eXBlOiBcInRleHRcIiwgXG4gICAgICAgICAgICBhdHRyOiB7IFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBcIldoYXQncyBvbiB5b3VyIG1pbmQ/XCIsXG4gICAgICAgICAgICAgICAgc3R5bGU6IFwid2lkdGg6IDEwMCU7IHBhZGRpbmc6IDEwcHg7IGZvbnQtc2l6ZTogMS4yZW07IGJhY2tncm91bmQ6ICMyMjI7IGJvcmRlcjogMXB4IHNvbGlkICM0NDQ7IGNvbG9yOiAjZTBlMGUwO1wiXG4gICAgICAgICAgICB9IFxuICAgICAgICB9KTtcblxuICAgICAgICBpbnB1dC5mb2N1cygpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBFbnRlciBLZXlcbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIiAmJiBpbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5jcmVhdGVTY3JhcChpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBidG4gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhcHR1cmUgdG8gU2NyYXBzXCIgfSk7XG4gICAgICAgIGJ0bi5hZGRDbGFzcyhcIm1vZC1jdGFcIik7XG4gICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi10b3A6IDE1cHg7IHdpZHRoOiAxMDAlO1wiKTtcbiAgICAgICAgYnRuLm9uY2xpY2sgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoaW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5lbmdpbmUuY3JlYXRlU2NyYXAoaW5wdXQudmFsdWUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBvbkNsb3NlKCkge1xuICAgICAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IEFwcCwgVEZpbGUsIFRGb2xkZXIsIE5vdGljZSwgbW9tZW50IH0gZnJvbSAnb2JzaWRpYW4nO1xuaW1wb3J0IHsgU2lzeXBodXNTZXR0aW5ncywgU2tpbGwsIE1vZGlmaWVyLCBEYWlseU1pc3Npb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IEF1ZGlvQ29udHJvbGxlciwgVGlueUVtaXR0ZXIgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7IEFuYWx5dGljc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9BbmFseXRpY3NFbmdpbmUnO1xuaW1wb3J0IHsgTWVkaXRhdGlvbkVuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9NZWRpdGF0aW9uRW5naW5lJztcbmltcG9ydCB7IFJlc2VhcmNoRW5naW5lIH0gZnJvbSAnLi9lbmdpbmVzL1Jlc2VhcmNoRW5naW5lJztcbmltcG9ydCB7IENoYWluc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9DaGFpbnNFbmdpbmUnO1xuaW1wb3J0IHsgRmlsdGVyc0VuZ2luZSB9IGZyb20gJy4vZW5naW5lcy9GaWx0ZXJzRW5naW5lJztcbmltcG9ydCB7IENoYW9zTW9kYWwsIFZpY3RvcnlNb2RhbCB9IGZyb20gJy4vdWkvbW9kYWxzJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfTU9ESUZJRVI6IE1vZGlmaWVyID0geyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm8gZWZmZWN0cy5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIuKYgO+4j1wiIH07XG5leHBvcnQgY29uc3QgQ0hBT1NfVEFCTEU6IE1vZGlmaWVyW10gPSBbXG4gICAgeyBuYW1lOiBcIkNsZWFyIFNraWVzXCIsIGRlc2M6IFwiTm9ybWFsLlwiLCB4cE11bHQ6IDEsIGdvbGRNdWx0OiAxLCBwcmljZU11bHQ6IDEsIGljb246IFwi4piA77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiRmxvdyBTdGF0ZVwiLCBkZXNjOiBcIis1MCUgWFAuXCIsIHhwTXVsdDogMS41LCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCfjIpcIiB9LFxuICAgIHsgbmFtZTogXCJXaW5kZmFsbFwiLCBkZXNjOiBcIis1MCUgR29sZC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMS41LCBwcmljZU11bHQ6IDEsIGljb246IFwi8J+SsFwiIH0sXG4gICAgeyBuYW1lOiBcIkluZmxhdGlvblwiLCBkZXNjOiBcIlByaWNlcyAyeC5cIiwgeHBNdWx0OiAxLCBnb2xkTXVsdDogMSwgcHJpY2VNdWx0OiAyLCBpY29uOiBcIvCfk4hcIiB9LFxuICAgIHsgbmFtZTogXCJCcmFpbiBGb2dcIiwgZGVzYzogXCJYUCAwLjV4LlwiLCB4cE11bHQ6IDAuNSwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn4yr77iPXCIgfSxcbiAgICB7IG5hbWU6IFwiUml2YWwgU2Fib3RhZ2VcIiwgZGVzYzogXCJHb2xkIDAuNXguXCIsIHhwTXVsdDogMSwgZ29sZE11bHQ6IDAuNSwgcHJpY2VNdWx0OiAxLCBpY29uOiBcIvCflbXvuI9cIiB9LFxuICAgIHsgbmFtZTogXCJBZHJlbmFsaW5lXCIsIGRlc2M6IFwiMnggWFAsIC01IEhQL1EuXCIsIHhwTXVsdDogMiwgZ29sZE11bHQ6IDEsIHByaWNlTXVsdDogMSwgaWNvbjogXCLwn5KJXCIgfVxuXTtcblxuY29uc3QgQk9TU19EQVRBOiBSZWNvcmQ8bnVtYmVyLCB7IG5hbWU6IHN0cmluZywgZGVzYzogc3RyaW5nLCBocF9wZW46IG51bWJlciB9PiA9IHtcbiAgICAxMDogeyBuYW1lOiBcIlRoZSBHYXRla2VlcGVyXCIsIGRlc2M6IFwiVGhlIGZpcnN0IG1ham9yIGZpbHRlci5cIiwgaHBfcGVuOiAyMCB9LFxuICAgIDIwOiB7IG5hbWU6IFwiVGhlIFNoYWRvdyBTZWxmXCIsIGRlc2M6IFwiWW91ciBvd24gYmFkIGhhYml0cyBtYW5pZmVzdC5cIiwgaHBfcGVuOiAzMCB9LFxuICAgIDMwOiB7IG5hbWU6IFwiVGhlIE1vdW50YWluXCIsIGRlc2M6IFwiVGhlIHBlYWsgaXMgdmlzaWJsZS5cIiwgaHBfcGVuOiA0MCB9LFxuICAgIDUwOiB7IG5hbWU6IFwiU2lzeXBodXMgUHJpbWVcIiwgZGVzYzogXCJPbmUgbXVzdCBpbWFnaW5lIFNpc3lwaHVzIGhhcHB5LlwiLCBocF9wZW46IDk5IH1cbn07XG5cbmNvbnN0IE1JU1NJT05fUE9PTCA9IFtcbiAgICB7IGlkOiBcIm1vcm5pbmdfd2luXCIsIG5hbWU6IFwi4piA77iPIE1vcm5pbmcgV2luXCIsIGRlc2M6IFwiQ29tcGxldGUgMSBUcml2aWFsIHF1ZXN0IGJlZm9yZSAxMCBBTVwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTUgfSwgY2hlY2s6IFwibW9ybmluZ190cml2aWFsXCIgfSxcbiAgICB7IGlkOiBcIm1vbWVudHVtXCIsIG5hbWU6IFwi8J+UpSBNb21lbnR1bVwiLCBkZXNjOiBcIkNvbXBsZXRlIDMgcXVlc3RzIHRvZGF5XCIsIHRhcmdldDogMywgcmV3YXJkOiB7IHhwOiAyMCwgZ29sZDogMCB9LCBjaGVjazogXCJxdWVzdF9jb3VudFwiIH0sXG4gICAgeyBpZDogXCJ6ZXJvX2luYm94XCIsIG5hbWU6IFwi8J+nmCBaZXJvIEluYm94XCIsIGRlc2M6IFwiUHJvY2VzcyBhbGwgZmlsZXMgaW4gJ1NjcmFwcydcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDEwIH0sIGNoZWNrOiBcInplcm9faW5ib3hcIiB9LCAvLyBbRklYXSBDb3JyZWN0IGNoZWNrXG4gICAgeyBpZDogXCJzcGVjaWFsaXN0XCIsIG5hbWU6IFwi8J+OryBTcGVjaWFsaXN0XCIsIGRlc2M6IFwiVXNlIHRoZSBzYW1lIHNraWxsIDMgdGltZXNcIiwgdGFyZ2V0OiAzLCByZXdhcmQ6IHsgeHA6IDE1LCBnb2xkOiAwIH0sIGNoZWNrOiBcInNraWxsX3JlcGVhdFwiIH0sXG4gICAgeyBpZDogXCJoaWdoX3N0YWtlc1wiLCBuYW1lOiBcIvCfkqogSGlnaCBTdGFrZXNcIiwgZGVzYzogXCJDb21wbGV0ZSAxIEhpZ2ggU3Rha2VzIHF1ZXN0XCIsIHRhcmdldDogMSwgcmV3YXJkOiB7IHhwOiAwLCBnb2xkOiAzMCB9LCBjaGVjazogXCJoaWdoX3N0YWtlc1wiIH0sXG4gICAgeyBpZDogXCJzcGVlZF9kZW1vblwiLCBuYW1lOiBcIuKaoSBTcGVlZCBEZW1vblwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGhpbiAyaCBvZiBjcmVhdGlvblwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMjUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiZmFzdF9jb21wbGV0ZVwiIH0sXG4gICAgeyBpZDogXCJzeW5lcmdpc3RcIiwgbmFtZTogXCLwn5SXIFN5bmVyZ2lzdFwiLCBkZXNjOiBcIkNvbXBsZXRlIHF1ZXN0IHdpdGggUHJpbWFyeSArIFNlY29uZGFyeSBza2lsbFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMCwgZ29sZDogMTAgfSwgY2hlY2s6IFwic3luZXJneVwiIH0sXG4gICAgeyBpZDogXCJzdXJ2aXZvclwiLCBuYW1lOiBcIvCfm6HvuI8gU3Vydml2b3JcIiwgZGVzYzogXCJEb24ndCB0YWtlIGFueSBkYW1hZ2UgdG9kYXlcIiwgdGFyZ2V0OiAxLCByZXdhcmQ6IHsgeHA6IDAsIGdvbGQ6IDIwIH0sIGNoZWNrOiBcIm5vX2RhbWFnZVwiIH0sXG4gICAgeyBpZDogXCJyaXNrX3Rha2VyXCIsIG5hbWU6IFwi8J+OsiBSaXNrIFRha2VyXCIsIGRlc2M6IFwiQ29tcGxldGUgRGlmZmljdWx0eSA0KyBxdWVzdFwiLCB0YXJnZXQ6IDEsIHJld2FyZDogeyB4cDogMTUsIGdvbGQ6IDAgfSwgY2hlY2s6IFwiaGFyZF9xdWVzdFwiIH1cbl07XG5cbmV4cG9ydCBjbGFzcyBTaXN5cGh1c0VuZ2luZSBleHRlbmRzIFRpbnlFbWl0dGVyIHtcbiAgICBhcHA6IEFwcDtcbiAgICBwbHVnaW46IGFueTtcbiAgICBhdWRpbzogQXVkaW9Db250cm9sbGVyO1xuICAgIGFuYWx5dGljc0VuZ2luZTogQW5hbHl0aWNzRW5naW5lO1xuICAgIG1lZGl0YXRpb25FbmdpbmU6IE1lZGl0YXRpb25FbmdpbmU7XG4gICAgcmVzZWFyY2hFbmdpbmU6IFJlc2VhcmNoRW5naW5lO1xuICAgIGNoYWluc0VuZ2luZTogQ2hhaW5zRW5naW5lO1xuICAgIGZpbHRlcnNFbmdpbmU6IEZpbHRlcnNFbmdpbmU7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBhbnksIGF1ZGlvOiBBdWRpb0NvbnRyb2xsZXIpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgICAgICB0aGlzLmF1ZGlvID0gYXVkaW87XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZSA9IG5ldyBBbmFseXRpY3NFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLm1lZGl0YXRpb25FbmdpbmUgPSBuZXcgTWVkaXRhdGlvbkVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hdWRpbyk7XG4gICAgICAgIC8vIFtGSVhdIFBhc3MgJ2FwcCcgdG8gUmVzZWFyY2hFbmdpbmVcbiAgICAgICAgdGhpcy5yZXNlYXJjaEVuZ2luZSA9IG5ldyBSZXNlYXJjaEVuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncywgdGhpcy5hcHAsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmNoYWluc0VuZ2luZSA9IG5ldyBDaGFpbnNFbmdpbmUodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHRoaXMuYXVkaW8pO1xuICAgICAgICB0aGlzLmZpbHRlcnNFbmdpbmUgPSBuZXcgRmlsdGVyc0VuZ2luZSh0aGlzLnBsdWdpbi5zZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgZ2V0IHNldHRpbmdzKCk6IFNpc3lwaHVzU2V0dGluZ3MgeyByZXR1cm4gdGhpcy5wbHVnaW4uc2V0dGluZ3M7IH1cbiAgICBzZXQgc2V0dGluZ3ModmFsOiBTaXN5cGh1c1NldHRpbmdzKSB7IHRoaXMucGx1Z2luLnNldHRpbmdzID0gdmFsOyB9XG5cbiAgICBhc3luYyBzYXZlKCkgeyBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTsgdGhpcy50cmlnZ2VyKFwidXBkYXRlXCIpOyB9XG5cbiAgICByb2xsRGFpbHlNaXNzaW9ucygpIHtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gWy4uLk1JU1NJT05fUE9PTF07XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkOiBEYWlseU1pc3Npb25bXSA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDM7IGkrKykge1xuICAgICAgICAgICAgaWYgKGF2YWlsYWJsZS5sZW5ndGggPT09IDApIGJyZWFrO1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXZhaWxhYmxlLmxlbmd0aCk7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW9uID0gYXZhaWxhYmxlLnNwbGljZShpZHgsIDEpWzBdO1xuICAgICAgICAgICAgc2VsZWN0ZWQucHVzaCh7IC4uLm1pc3Npb24sIGNoZWNrRnVuYzogbWlzc2lvbi5jaGVjaywgcHJvZ3Jlc3M6IDAsIGNvbXBsZXRlZDogZmFsc2UgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25zID0gc2VsZWN0ZWQ7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9uRGF0ZSA9IG1vbWVudCgpLmZvcm1hdChcIllZWVktTU0tRERcIik7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXkgPSAwO1xuICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5ID0ge307XG4gICAgfVxuXG4gICAgY2hlY2tEYWlseU1pc3Npb25zKGNvbnRleHQ6IHsgdHlwZT86IHN0cmluZzsgZGlmZmljdWx0eT86IG51bWJlcjsgc2tpbGw/OiBzdHJpbmc7IHNlY29uZGFyeVNraWxsPzogc3RyaW5nOyBoaWdoU3Rha2VzPzogYm9vbGVhbjsgcXVlc3RDcmVhdGVkPzogbnVtYmVyIH0pIHtcbiAgICAgICAgY29uc3Qgbm93ID0gbW9tZW50KCk7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MuZGFpbHlNaXNzaW9ucy5mb3JFYWNoKG1pc3Npb24gPT4ge1xuICAgICAgICAgICAgaWYgKG1pc3Npb24uY29tcGxldGVkKSByZXR1cm47XG4gICAgICAgICAgICBzd2l0Y2ggKG1pc3Npb24uY2hlY2tGdW5jKSB7XG4gICAgICAgICAgICAgICAgLy8gW0ZJWF0gQWRkZWQgWmVybyBJbmJveCBMb2dpY1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ6ZXJvX2luYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcmFwcyA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChcIlNjcmFwc1wiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmFwcyBpbnN0YW5jZW9mIFRGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXBsZXRlIGlmIDAgZmlsZXMgaW4gU2NyYXBzXG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW9uLnByb2dyZXNzID0gc2NyYXBzLmNoaWxkcmVuLmxlbmd0aCA9PT0gMCA/IDEgOiAwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZm9sZGVyIGRvZXNuJ3QgZXhpc3QsIGNvdW50IGFzIGRvbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc3Npb24ucHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJtb3JuaW5nX3RyaXZpYWxcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuZGlmZmljdWx0eSA9PT0gMSAmJiBub3cuaG91cigpIDwgMTApIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInF1ZXN0X2NvdW50XCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIikgbWlzc2lvbi5wcm9ncmVzcyA9IHRoaXMuc2V0dGluZ3MucXVlc3RzQ29tcGxldGVkVG9kYXk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJoaWdoX3N0YWtlc1wiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5oaWdoU3Rha2VzKSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJmYXN0X2NvbXBsZXRlXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnF1ZXN0Q3JlYXRlZCAmJiBtb21lbnQoKS5kaWZmKG1vbWVudChjb250ZXh0LnF1ZXN0Q3JlYXRlZCksICdob3VycycpIDw9IDIpIG1pc3Npb24ucHJvZ3Jlc3MrKzsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInN5bmVyZ3lcIjogaWYgKGNvbnRleHQudHlwZSA9PT0gXCJjb21wbGV0ZVwiICYmIGNvbnRleHQuc2tpbGwgJiYgY29udGV4dC5zZWNvbmRhcnlTa2lsbCAmJiBjb250ZXh0LnNlY29uZGFyeVNraWxsICE9PSBcIk5vbmVcIikgbWlzc2lvbi5wcm9ncmVzcysrOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibm9fZGFtYWdlXCI6IGlmIChjb250ZXh0LnR5cGUgPT09IFwiZGFtYWdlXCIpIG1pc3Npb24ucHJvZ3Jlc3MgPSAwOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiaGFyZF9xdWVzdFwiOiBpZiAoY29udGV4dC50eXBlID09PSBcImNvbXBsZXRlXCIgJiYgY29udGV4dC5kaWZmaWN1bHR5ICYmIGNvbnRleHQuZGlmZmljdWx0eSA+PSA0KSBtaXNzaW9uLnByb2dyZXNzKys7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJza2lsbF9yZXBlYXRcIjogXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnR5cGUgPT09IFwiY29tcGxldGVcIiAmJiBjb250ZXh0LnNraWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnNraWxsVXNlc1RvZGF5W2NvbnRleHQuc2tpbGxdID0gKHRoaXMuc2V0dGluZ3Muc2tpbGxVc2VzVG9kYXlbY29udGV4dC5za2lsbF0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2lvbi5wcm9ncmVzcyA9IE1hdGgubWF4KDAsIC4uLk9iamVjdC52YWx1ZXModGhpcy5zZXR0aW5ncy5za2lsbFVzZXNUb2RheSkpO1xuICAgICAgICAgICAgICAgICAgICB9IFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnByb2dyZXNzID49IG1pc3Npb24udGFyZ2V0ICYmICFtaXNzaW9uLmNvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIG1pc3Npb24uY29tcGxldGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnhwICs9IG1pc3Npb24ucmV3YXJkLnhwO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuZ29sZCArPSBtaXNzaW9uLnJld2FyZC5nb2xkO1xuICAgICAgICAgICAgICAgIG5ldyBOb3RpY2UoYOKchSBNaXNzaW9uIENvbXBsZXRlOiAke21pc3Npb24ubmFtZX1gKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvLnBsYXlTb3VuZChcInN1Y2Nlc3NcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNhdmUoKTtcbiAgICB9XG5cbiAgICBnZXREaWZmaWN1bHR5TnVtYmVyKGRpZmZMYWJlbDogc3RyaW5nKTogbnVtYmVyIHtcbiAgICAgICAgY29uc3QgbWFwOiBhbnkgPSB7IFwiVHJpdmlhbFwiOiAxLCBcIkVhc3lcIjogMiwgXCJNZWRpdW1cIjogMywgXCJIYXJkXCI6IDQsIFwiU1VJQ0lERVwiOiA1IH07XG4gICAgICAgIHJldHVybiBtYXBbZGlmZkxhYmVsXSB8fCAzO1xuICAgIH1cblxuICAgIGFzeW5jIGNoZWNrRGFpbHlMb2dpbigpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGRheXNEaWZmID0gbW9tZW50KCkuZGlmZihtb21lbnQodGhpcy5zZXR0aW5ncy5sYXN0TG9naW4pLCAnZGF5cycpO1xuICAgICAgICAgICAgaWYgKGRheXNEaWZmID4gMikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvdERhbWFnZSA9IChkYXlzRGlmZiAtIDEpICogMTA7XG4gICAgICAgICAgICAgICAgaWYgKHJvdERhbWFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCAtPSByb3REYW1hZ2U7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuaGlzdG9yeS5wdXNoKHsgZGF0ZTogdG9kYXksIHN0YXR1czogXCJyb3RcIiwgeHBFYXJuZWQ6IC1yb3REYW1hZ2UgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RMb2dpbiAhPT0gdG9kYXkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubWF4SHAgPSAxMDAgKyAodGhpcy5zZXR0aW5ncy5sZXZlbCAqIDUpO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IE1hdGgubWluKHRoaXMuc2V0dGluZ3MubWF4SHAsIHRoaXMuc2V0dGluZ3MuaHAgKyAyMCk7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhbWFnZVRha2VuVG9kYXkgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sb2NrZG93blVudGlsID0gXCJcIjtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MubGFzdExvZ2luID0gdG9kYXk7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1pc3Npb25EYXRlICE9PSB0b2RheSkgdGhpcy5yb2xsRGFpbHlNaXNzaW9ucygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yb2xsQ2hhb3ModHJ1ZSk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGNvbXBsZXRlUXVlc3QoZmlsZTogVEZpbGUpIHtcbiAgICAgICAgaWYgKHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTE9DS0RPV04gQUNUSVZFXCIpOyByZXR1cm47IH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICBpZiAoIWZtKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCBxdWVzdE5hbWUgPSBmaWxlLmJhc2VuYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hhaW4gTG9naWNcbiAgICAgICAgaWYgKHRoaXMuY2hhaW5zRW5naW5lLmlzUXVlc3RJbkNoYWluKHF1ZXN0TmFtZSkpIHtcbiAgICAgICAgICAgICBjb25zdCBjYW5TdGFydCA9IHRoaXMuY2hhaW5zRW5naW5lLmNhblN0YXJ0UXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgICAgICBpZiAoIWNhblN0YXJ0KSB7IG5ldyBOb3RpY2UoXCJMb2NrZWQgYnkgQ2hhaW4uXCIpOyByZXR1cm47IH1cbiAgICAgICAgICAgICBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jb21wbGV0ZUNoYWluUXVlc3QocXVlc3ROYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIC0tLSBCT1NTIExPR0lDIFNUQVJUIC0tLVxuICAgICAgICBpZiAoZm0uaXNfYm9zcykge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBMZXZlbCBmcm9tIGZpbGVuYW1lIFwiQk9TU19MVkwxMCAtIE5hbWVcIlxuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBmaWxlLmJhc2VuYW1lLm1hdGNoKC9CT1NTX0xWTChcXGQrKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5hbmFseXRpY3NFbmdpbmUuZGVmZWF0Qm9zcyhsZXZlbCk7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShyZXN1bHQubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVFJJR0dFUiBWSUNUT1JZXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuZ2FtZVdvbikge1xuICAgICAgICAgICAgICAgICAgICBuZXcgVmljdG9yeU1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyAtLS0gQk9TUyBMT0dJQyBFTkQgLS0tXG5cbiAgICAgICAgdGhpcy5hbmFseXRpY3NFbmdpbmUudHJhY2tEYWlseU1ldHJpY3MoXCJxdWVzdF9jb21wbGV0ZVwiLCAxKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5yZXNlYXJjaFN0YXRzLnRvdGFsQ29tYmF0Kys7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXdhcmRzXG4gICAgICAgIGxldCB4cCA9IChmbS54cF9yZXdhcmQgfHwgMjApICogdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLnhwTXVsdDtcbiAgICAgICAgbGV0IGdvbGQgPSAoZm0uZ29sZF9yZXdhcmQgfHwgMCkgKiB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIuZ29sZE11bHQ7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBza2lsbE5hbWUgPSBmbS5za2lsbCB8fCBcIk5vbmVcIjtcbiAgICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNldHRpbmdzLnNraWxscy5maW5kKHMgPT4gcy5uYW1lID09PSBza2lsbE5hbWUpO1xuICAgICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgICAgIHNraWxsLnJ1c3QgPSAwO1xuICAgICAgICAgICAgc2tpbGwueHBSZXEgPSBNYXRoLmZsb29yKHNraWxsLnhwUmVxIC8gMS4xKTtcbiAgICAgICAgICAgIHNraWxsLmxhc3RVc2VkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICAgICAgc2tpbGwueHAgKz0gMTtcbiAgICAgICAgICAgIGlmIChza2lsbC54cCA+PSBza2lsbC54cFJlcSkgeyBza2lsbC5sZXZlbCsrOyBza2lsbC54cCA9IDA7IG5ldyBOb3RpY2UoYPCfp6AgJHtza2lsbC5uYW1lfSBMZXZlbGVkIFVwIWApOyB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWNvbmRhcnkgU2tpbGwgTG9naWNcbiAgICAgICAgY29uc3Qgc2Vjb25kYXJ5ID0gZm0uc2Vjb25kYXJ5X3NraWxsIHx8IFwiTm9uZVwiO1xuICAgICAgICBpZiAoc2Vjb25kYXJ5ICYmIHNlY29uZGFyeSAhPT0gXCJOb25lXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlY1NraWxsID0gdGhpcy5zZXR0aW5ncy5za2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gc2Vjb25kYXJ5KTtcbiAgICAgICAgICAgIGlmIChzZWNTa2lsbCkge1xuICAgICAgICAgICAgICAgIC8vIExpbmsgc2tpbGxzXG4gICAgICAgICAgICAgICAgaWYoIXNraWxsLmNvbm5lY3Rpb25zKSBza2lsbC5jb25uZWN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIGlmKCFza2lsbC5jb25uZWN0aW9ucy5pbmNsdWRlcyhzZWNvbmRhcnkpKSB7IHNraWxsLmNvbm5lY3Rpb25zLnB1c2goc2Vjb25kYXJ5KTsgbmV3IE5vdGljZShg8J+UlyBOZXVyYWwgTGluayBFc3RhYmxpc2hlZGApOyB9XG4gICAgICAgICAgICAgICAgLy8gQm9udXMgWFBcbiAgICAgICAgICAgICAgICB4cCArPSBNYXRoLmZsb29yKHNlY1NraWxsLmxldmVsICogMC41KTsgXG4gICAgICAgICAgICAgICAgc2VjU2tpbGwueHAgKz0gMC41OyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MueHAgKz0geHA7IHRoaXMuc2V0dGluZ3MuZ29sZCArPSBnb2xkO1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLm5hbWUgPT09IFwiQWRyZW5hbGluZVwiKSB0aGlzLnNldHRpbmdzLmhwIC09IDU7XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwic3VjY2Vzc1wiKTtcblxuICAgICAgICAvLyBMZXZlbCBVcCAmIEJvc3MgU3Bhd24gQ2hlY2tcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MueHAgPj0gdGhpcy5zZXR0aW5ncy54cFJlcSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5sZXZlbCsrOyBcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MueHAgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy54cFJlcSA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDEuMSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5tYXhIcCA9IDEwMCArICh0aGlzLnNldHRpbmdzLmxldmVsICogNSk7IFxuICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5ocCA9IHRoaXMuc2V0dGluZ3MubWF4SHA7XG4gICAgICAgICAgICB0aGlzLnRhdW50KFwibGV2ZWxfdXBcIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1zZ3MgPSB0aGlzLmFuYWx5dGljc0VuZ2luZS5jaGVja0Jvc3NNaWxlc3RvbmVzKCk7XG4gICAgICAgICAgICBtc2dzLmZvckVhY2gobSA9PiBuZXcgTm90aWNlKG0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3Bhd24gQm9zcyBpZiBtaWxlc3RvbmUgcmVhY2hlZFxuICAgICAgICAgICAgLy8gTm90ZTogV2UgdXNlIHRoZSBsZXZlbCBtYXAgZnJvbSBlbmdpbmUudHMgdG8gY2hlY2sgaWYgYSBib3NzIGV4aXN0cyBmb3IgdGhpcyBsZXZlbFxuICAgICAgICAgICAgLy8gV2UgbmVlZCB0byBhY2Nlc3MgQk9TU19EQVRBIChlbnN1cmUgaXQncyBhdmFpbGFibGUgb3IgdXNlIHRoZSBtYXAgaW5zaWRlIGVuZ2luZSlcbiAgICAgICAgICAgIGlmIChbMTAsIDIwLCAzMCwgNTBdLmluY2x1ZGVzKHRoaXMuc2V0dGluZ3MubGV2ZWwpKSB7XG4gICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25Cb3NzKHRoaXMuc2V0dGluZ3MubGV2ZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5xdWVzdHNDb21wbGV0ZWRUb2RheSsrO1xuICAgICAgICB0aGlzLmFuYWx5dGljc0VuZ2luZS51cGRhdGVTdHJlYWsoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hlY2tEYWlseU1pc3Npb25zKHsgXG4gICAgICAgICAgICB0eXBlOiBcImNvbXBsZXRlXCIsIFxuICAgICAgICAgICAgZGlmZmljdWx0eTogdGhpcy5nZXREaWZmaWN1bHR5TnVtYmVyKGZtLmRpZmZpY3VsdHkpLCBcbiAgICAgICAgICAgIHNraWxsOiBza2lsbE5hbWUsIFxuICAgICAgICAgICAgc2Vjb25kYXJ5U2tpbGw6IHNlY29uZGFyeSxcbiAgICAgICAgICAgIGhpZ2hTdGFrZXM6IGZtLmhpZ2hfc3Rha2VzIFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBcmNoaXZlXG4gICAgICAgIGNvbnN0IGFyY2hpdmVQYXRoID0gXCJBY3RpdmVfUnVuL0FyY2hpdmVcIjtcbiAgICAgICAgaWYgKCF0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoYXJjaGl2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoYXJjaGl2ZVBhdGgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvbXBsZXRpb24gdGltZXN0YW1wXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZikgPT4geyBcbiAgICAgICAgICAgIGYuc3RhdHVzID0gXCJjb21wbGV0ZWRcIjsgXG4gICAgICAgICAgICBmLmNvbXBsZXRlZF9hdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHthcmNoaXZlUGF0aH0vJHtmaWxlLm5hbWV9YCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHNwYXduQm9zcyhsZXZlbDogbnVtYmVyKSB7XG4gICAgICAgIGNvbnN0IGJvc3MgPSBCT1NTX0RBVEFbbGV2ZWxdO1xuICAgICAgICBpZiAoIWJvc3MpIHJldHVybjtcblxuICAgICAgICAvLyBbRklYXSBCb3NzIFJpdHVhbDogQXVkaW8gYnVpbGR1cCArIERlbGF5XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiaGVhcnRiZWF0XCIpO1xuICAgICAgICBuZXcgTm90aWNlKFwi4pqg77iPIEFOT01BTFkgREVURUNURUQuLi5cIiwgMjAwMCk7XG4gICAgICAgIFxuICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiZGVhdGhcIik7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGDimKDvuI8gQk9TUyBTUEFXTkVEOiAke2Jvc3MubmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVRdWVzdChcbiAgICAgICAgICAgICAgICBgQk9TU19MVkwke2xldmVsfSAtICR7Ym9zcy5uYW1lfWAsIFxuICAgICAgICAgICAgICAgIDUsIFwiQm9zc1wiLCBcIk5vbmVcIiwgXG4gICAgICAgICAgICAgICAgbW9tZW50KCkuYWRkKDMsICdkYXlzJykudG9JU09TdHJpbmcoKSwgXG4gICAgICAgICAgICAgICAgdHJ1ZSwgXCJDcml0aWNhbFwiLCB0cnVlXG4gICAgICAgICAgICApO1xuICAgICAgICB9LCAzMDAwKTtcbiAgICB9XG5cbiAgICBhc3luYyBmYWlsUXVlc3QoZmlsZTogVEZpbGUsIG1hbnVhbEFib3J0OiBib29sZWFuID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNSZXN0aW5nKCkgJiYgIW1hbnVhbEFib3J0KSB7IG5ldyBOb3RpY2UoXCJSZXN0IERheSBwcm90ZWN0aW9uLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGlmICh0aGlzLmlzU2hpZWxkZWQoKSAmJiAhbWFudWFsQWJvcnQpIHsgbmV3IE5vdGljZShcIlNoaWVsZGVkIVwiKTsgcmV0dXJuOyB9XG5cbiAgICAgICAgbGV0IGRhbWFnZSA9IDEwICsgTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnJpdmFsRG1nIC8gMik7XG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmdvbGQgPCAwKSBkYW1hZ2UgKj0gMjsgLy8gRGVidCBwZW5hbHR5XG4gICAgICAgIFxuICAgICAgICB0aGlzLnNldHRpbmdzLmhwIC09IGRhbWFnZTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ICs9IGRhbWFnZTtcbiAgICAgICAgaWYgKCFtYW51YWxBYm9ydCkgdGhpcy5zZXR0aW5ncy5yaXZhbERtZyArPSAxO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJmYWlsXCIpO1xuICAgICAgICB0aGlzLmNoZWNrRGFpbHlNaXNzaW9ucyh7IHR5cGU6IFwiZGFtYWdlXCIgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5kYW1hZ2VUYWtlblRvZGF5ID4gNTApIHtcbiAgICAgICAgICAgIHRoaXMubWVkaXRhdGlvbkVuZ2luZS50cmlnZ2VyTG9ja2Rvd24oKTtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcihcImxvY2tkb3duXCIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBncmF2ZVBhdGggPSBcIkdyYXZleWFyZC9GYWlsdXJlc1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChncmF2ZVBhdGgpKSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZ3JhdmVQYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBgJHtncmF2ZVBhdGh9L1tGQUlMRURdICR7ZmlsZS5uYW1lfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgY3JlYXRlUXVlc3QobmFtZTogc3RyaW5nLCBkaWZmOiBudW1iZXIsIHNraWxsOiBzdHJpbmcsIHNlY1NraWxsOiBzdHJpbmcsIGRlYWRsaW5lSXNvOiBzdHJpbmcsIGhpZ2hTdGFrZXM6IGJvb2xlYW4sIHByaW9yaXR5OiBzdHJpbmcsIGlzQm9zczogYm9vbGVhbikge1xuICAgICAgICBpZiAodGhpcy5tZWRpdGF0aW9uRW5naW5lLmlzTG9ja2VkRG93bigpKSB7IG5ldyBOb3RpY2UoXCJMT0NLRE9XTiBBQ1RJVkVcIik7IHJldHVybjsgfVxuICAgICAgICBcbiAgICAgICAgLy8gLi4uIChMb2dpYyBzYW1lIGFzIGJlZm9yZSwgY29uZGVuc2VkIGZvciBicmV2aXR5KSAuLi5cbiAgICAgICAgLy8gTm90ZTogQ29weSB0aGUgcmVzdCBvZiB5b3VyIGNyZWF0ZVF1ZXN0IGxvZ2ljIGV4YWN0bHkgYXMgaXQgd2FzLCBvciB1c2UgdGhlIHByZXZpb3VzIHZlcnNpb24uXG4gICAgICAgIC8vIEZvciBzYWZldHksIEknbGwgaW5jbHVkZSB0aGUgc3RhbmRhcmQgaW1wbGVtZW50YXRpb24gaGVyZTpcbiAgICAgICAgXG4gICAgICAgIGxldCB4cFJld2FyZCA9IDA7IGxldCBnb2xkUmV3YXJkID0gMDsgbGV0IGRpZmZMYWJlbCA9IFwiXCI7XG4gICAgICAgIHN3aXRjaChkaWZmKSB7XG4gICAgICAgICAgICBjYXNlIDE6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC4wNSk7IGdvbGRSZXdhcmQgPSAxMDsgZGlmZkxhYmVsID0gXCJUcml2aWFsXCI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOiB4cFJld2FyZCA9IE1hdGguZmxvb3IodGhpcy5zZXR0aW5ncy54cFJlcSAqIDAuMTApOyBnb2xkUmV3YXJkID0gMjA7IGRpZmZMYWJlbCA9IFwiRWFzeVwiOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjIwKTsgZ29sZFJld2FyZCA9IDQwOyBkaWZmTGFiZWwgPSBcIk1lZGl1bVwiOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDogeHBSZXdhcmQgPSBNYXRoLmZsb29yKHRoaXMuc2V0dGluZ3MueHBSZXEgKiAwLjQwKTsgZ29sZFJld2FyZCA9IDgwOyBkaWZmTGFiZWwgPSBcIkhhcmRcIjsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDU6IHhwUmV3YXJkID0gTWF0aC5mbG9vcih0aGlzLnNldHRpbmdzLnhwUmVxICogMC42MCk7IGdvbGRSZXdhcmQgPSAxNTA7IGRpZmZMYWJlbCA9IFwiU1VJQ0lERVwiOyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNCb3NzKSB7IHhwUmV3YXJkPTEwMDA7IGdvbGRSZXdhcmQ9MTAwMDsgZGlmZkxhYmVsPVwi4pig77iPIEJPU1NcIjsgfVxuICAgICAgICBpZiAoaGlnaFN0YWtlcyAmJiAhaXNCb3NzKSBnb2xkUmV3YXJkID0gTWF0aC5mbG9vcihnb2xkUmV3YXJkICogMS41KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJvb3RQYXRoID0gXCJBY3RpdmVfUnVuL1F1ZXN0c1wiO1xuICAgICAgICBpZiAoIXRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChyb290UGF0aCkpIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihyb290UGF0aCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzYWZlTmFtZSA9IG5hbWUucmVwbGFjZSgvW15hLXowLTldL2dpLCAnXycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBgLS0tXG50eXBlOiBxdWVzdFxuc3RhdHVzOiBhY3RpdmVcbmRpZmZpY3VsdHk6ICR7ZGlmZkxhYmVsfVxucHJpb3JpdHk6ICR7cHJpb3JpdHl9XG54cF9yZXdhcmQ6ICR7eHBSZXdhcmR9XG5nb2xkX3Jld2FyZDogJHtnb2xkUmV3YXJkfVxuc2tpbGw6ICR7c2tpbGx9XG5oaWdoX3N0YWtlczogJHtoaWdoU3Rha2VzID8gJ3RydWUnIDogJ2ZhbHNlJ31cbmlzX2Jvc3M6ICR7aXNCb3NzfVxuY3JlYXRlZDogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XG5kZWFkbGluZTogJHtkZWFkbGluZUlzb31cbi0tLVxuIyDimpTvuI8gJHtuYW1lfWA7XG4gICAgICAgIFxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoYCR7cm9vdFBhdGh9LyR7c2FmZU5hbWV9Lm1kYCwgY29udGVudCk7XG4gICAgICAgIHRoaXMuYXVkaW8ucGxheVNvdW5kKFwiY2xpY2tcIik7XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cbiAgICBcbiAgICBhc3luYyBkZWxldGVRdWVzdChmaWxlOiBURmlsZSkgeyBhd2FpdCB0aGlzLmFwcC52YXVsdC5kZWxldGUoZmlsZSk7IHRoaXMuc2F2ZSgpOyB9XG5cbiAgICBhc3luYyBjaGVja0RlYWRsaW5lcygpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGlmICghKGZvbGRlciBpbnN0YW5jZW9mIFRGb2xkZXIpKSByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmb2xkZXIuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBpZiAoZm0/LmRlYWRsaW5lICYmIG1vbWVudCgpLmlzQWZ0ZXIobW9tZW50KGZtLmRlYWRsaW5lKSkpIGF3YWl0IHRoaXMuZmFpbFF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2F2ZSgpO1xuICAgIH1cblxuICAgIGFzeW5jIHJvbGxDaGFvcyhzaG93TW9kYWw6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICBjb25zdCByb2xsID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgaWYgKHJvbGwgPCAwLjQpIHRoaXMuc2V0dGluZ3MuZGFpbHlNb2RpZmllciA9IERFRkFVTFRfTU9ESUZJRVI7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKENIQU9TX1RBQkxFLmxlbmd0aCAtIDEpKSArIDE7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzLmRhaWx5TW9kaWZpZXIgPSBDSEFPU19UQUJMRVtpZHhdO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZSgpO1xuICAgICAgICBpZiAoc2hvd01vZGFsKSBuZXcgQ2hhb3NNb2RhbCh0aGlzLmFwcCwgdGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyKS5vcGVuKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYXR0ZW1wdFJlY292ZXJ5KCkge1xuICAgICAgICBpZiAoIXRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKSkgeyBuZXcgTm90aWNlKFwiTm90IGluIExvY2tkb3duLlwiKTsgcmV0dXJuOyB9XG4gICAgICAgIGNvbnN0IHsgaG91cnMsIG1pbnV0ZXMgfSA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRMb2NrZG93blRpbWVSZW1haW5pbmcoKTtcbiAgICAgICAgbmV3IE5vdGljZShgUmVjb3ZlcmluZy4uLiAke2hvdXJzfWggJHttaW51dGVzfW0gcmVtYWluaW5nLmApO1xuICAgIH1cblxuICAgIGlzTG9ja2VkRG93bigpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5pc0xvY2tlZERvd24oKTsgfVxuICAgIGlzUmVzdGluZygpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3MucmVzdERheVVudGlsICYmIG1vbWVudCgpLmlzQmVmb3JlKG1vbWVudCh0aGlzLnNldHRpbmdzLnJlc3REYXlVbnRpbCkpOyB9XG4gICAgaXNTaGllbGRlZCgpIHsgcmV0dXJuIHRoaXMuc2V0dGluZ3Muc2hpZWxkZWRVbnRpbCAmJiBtb21lbnQoKS5pc0JlZm9yZShtb21lbnQodGhpcy5zZXR0aW5ncy5zaGllbGRlZFVudGlsKSk7IH1cblxuICAgIGFzeW5jIGNyZWF0ZVJlc2VhcmNoUXVlc3QodGl0bGU6IHN0cmluZywgdHlwZTogYW55LCBsaW5rZWRTa2lsbDogc3RyaW5nLCBsaW5rZWRDb21iYXRRdWVzdDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IHRoaXMucmVzZWFyY2hFbmdpbmUuY3JlYXRlUmVzZWFyY2hRdWVzdCh0aXRsZSwgdHlwZSwgbGlua2VkU2tpbGwsIGxpbmtlZENvbWJhdFF1ZXN0KTtcbiAgICAgICAgaWYocmVzLnN1Y2Nlc3MpIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpOyBlbHNlIG5ldyBOb3RpY2UocmVzLm1lc3NhZ2UpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG4gICAgXG4gICAgY29tcGxldGVSZXNlYXJjaFF1ZXN0KGlkOiBzdHJpbmcsIHdvcmRzOiBudW1iZXIpIHsgdGhpcy5yZXNlYXJjaEVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QoaWQsIHdvcmRzKTsgdGhpcy5zYXZlKCk7IH1cbiAgICBkZWxldGVSZXNlYXJjaFF1ZXN0KGlkOiBzdHJpbmcpIHsgdGhpcy5yZXNlYXJjaEVuZ2luZS5kZWxldGVSZXNlYXJjaFF1ZXN0KGlkKTsgdGhpcy5zYXZlKCk7IH1cbiAgICB1cGRhdGVSZXNlYXJjaFdvcmRDb3VudChpZDogc3RyaW5nLCB3b3JkczogbnVtYmVyKSB7IHRoaXMucmVzZWFyY2hFbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoaWQsIHdvcmRzKTsgfVxuICAgIGdldFJlc2VhcmNoUmF0aW8oKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTsgfVxuICAgIGNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKSB7IHJldHVybiB0aGlzLnJlc2VhcmNoRW5naW5lLmNhbkNyZWF0ZVJlc2VhcmNoUXVlc3QoKTsgfVxuICAgIFxuICAgIGFzeW5jIHN0YXJ0TWVkaXRhdGlvbigpIHsgY29uc3QgciA9IHRoaXMubWVkaXRhdGlvbkVuZ2luZS5tZWRpdGF0ZSgpOyBuZXcgTm90aWNlKHIubWVzc2FnZSk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0TWVkaXRhdGlvblN0YXR1cygpIHsgcmV0dXJuIHRoaXMubWVkaXRhdGlvbkVuZ2luZS5nZXRNZWRpdGF0aW9uU3RhdHVzKCk7IH1cbiAgICBcbiAgICBhc3luYyBjcmVhdGVRdWVzdENoYWluKG5hbWU6IHN0cmluZywgcXVlc3RzOiBzdHJpbmdbXSkgeyBhd2FpdCB0aGlzLmNoYWluc0VuZ2luZS5jcmVhdGVRdWVzdENoYWluKG5hbWUsIHF1ZXN0cyk7IGF3YWl0IHRoaXMuc2F2ZSgpOyB9XG4gICAgZ2V0QWN0aXZlQ2hhaW4oKSB7IHJldHVybiB0aGlzLmNoYWluc0VuZ2luZS5nZXRBY3RpdmVDaGFpbigpOyB9XG4gICAgZ2V0Q2hhaW5Qcm9ncmVzcygpIHsgcmV0dXJuIHRoaXMuY2hhaW5zRW5naW5lLmdldENoYWluUHJvZ3Jlc3MoKTsgfVxuICAgIGFzeW5jIGJyZWFrQ2hhaW4oKSB7IGF3YWl0IHRoaXMuY2hhaW5zRW5naW5lLmJyZWFrQ2hhaW4oKTsgYXdhaXQgdGhpcy5zYXZlKCk7IH1cblxuICAgIGFzeW5jIGNyZWF0ZVNjcmFwKGNvbnRlbnQ6IHN0cmluZykge1xuICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gXCJTY3JhcHNcIjtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuc3VyZSBmb2xkZXIgZXhpc3RzXG4gICAgICAgIGlmICghdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlclBhdGgpKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoZm9sZGVyUGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZW5lcmF0ZSBmaWxlbmFtZTogWVlZWS1NTS1ERCBISC1tbS1zc1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBtb21lbnQoKS5mb3JtYXQoXCJZWVlZLU1NLUREIEhILW1tLXNzXCIpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke2ZvbGRlclBhdGh9LyR7dGltZXN0YW1wfS5tZGA7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZmlsZVxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICBcbiAgICAgICAgbmV3IE5vdGljZShcIuKaoSBTY3JhcCBDYXB0dXJlZFwiKTtcbiAgICAgICAgdGhpcy5hdWRpby5wbGF5U291bmQoXCJjbGlja1wiKTtcbiAgICB9XG4gICAgYXN5bmMgZ2VuZXJhdGVTa2lsbEdyYXBoKCkge1xuICAgICAgICBjb25zdCBza2lsbHMgPSB0aGlzLnNldHRpbmdzLnNraWxscztcbiAgICAgICAgaWYgKHNraWxscy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJObyBuZXVyYWwgbm9kZXMgZm91bmQuIENyZWF0ZSBza2lsbHMgZmlyc3QhXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XG4gICAgICAgIGNvbnN0IGVkZ2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCB3aWR0aCA9IDI1MDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gMTQwOyAvLyBJbmNyZWFzZWQgaGVpZ2h0IGZvciBzdGF0c1xuICAgICAgICBjb25zdCByYWRpdXMgPSBNYXRoLm1heCg0MDAsIHNraWxscy5sZW5ndGggKiA2MCk7IC8vIER5bmFtaWMgcmFkaXVzIHByZXZlbnRzIG92ZXJsYXBcbiAgICAgICAgY29uc3QgY2VudGVyWCA9IDA7XG4gICAgICAgIGNvbnN0IGNlbnRlclkgPSAwO1xuICAgICAgICBjb25zdCBhbmdsZVN0ZXAgPSAoMiAqIE1hdGguUEkpIC8gc2tpbGxzLmxlbmd0aDtcblxuICAgICAgICAvLyAxLiBDcmVhdGUgTm9kZXNcbiAgICAgICAgc2tpbGxzLmZvckVhY2goKHNraWxsLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYW5nbGUgPSBpbmRleCAqIGFuZ2xlU3RlcDtcbiAgICAgICAgICAgIGNvbnN0IHggPSBjZW50ZXJYICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgICAgICAgY29uc3QgeSA9IGNlbnRlclkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSk7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBDb2xvciBiYXNlZCBvbiBzdGF0dXNcbiAgICAgICAgICAgIC8vIDE9UmVkIChSdXN0eSksIDQ9R3JlZW4gKEhlYWx0aHkpLCA2PVB1cnBsZSAoTWFzdGVyZWQgPiBMdjEwKVxuICAgICAgICAgICAgbGV0IGNvbG9yID0gXCI0XCI7IFxuICAgICAgICAgICAgaWYgKHNraWxsLnJ1c3QgPiAwKSBjb2xvciA9IFwiMVwiO1xuICAgICAgICAgICAgZWxzZSBpZiAoc2tpbGwubGV2ZWwgPj0gMTApIGNvbG9yID0gXCI2XCI7XG5cbiAgICAgICAgICAgIC8vIFN0YXR1cyBUZXh0XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gc2tpbGwucnVzdCA+IDAgPyBcIuKaoO+4jyBSVVNUWVwiIDogXCLwn5+iIEFDVElWRVwiO1xuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBNYXRoLmZsb29yKChza2lsbC54cCAvIHNraWxsLnhwUmVxKSAqIDEwMCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmtkb3duIENvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBgIyMgJHtza2lsbC5uYW1lfVxuKipMdiAke3NraWxsLmxldmVsfSoqXG4ke3N0YXR1c0ljb259XG5YUDogJHtza2lsbC54cH0vJHtza2lsbC54cFJlcX0gKCR7cHJvZ3Jlc3N9JSlcbltQb2xpc2ggTm9kZV1gOyBcblxuICAgICAgICAgICAgbm9kZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgaWQ6IHNraWxsLm5hbWUsXG4gICAgICAgICAgICAgICAgeDogTWF0aC5mbG9vcih4KSxcbiAgICAgICAgICAgICAgICB5OiBNYXRoLmZsb29yKHkpLFxuICAgICAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgICAgICAgICAgIGNvbG9yOiBjb2xvclxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIDIuIENyZWF0ZSBFZGdlcyAoU3luZXJnaWVzKVxuICAgICAgICBza2lsbHMuZm9yRWFjaChza2lsbCA9PiB7XG4gICAgICAgICAgICBpZiAoc2tpbGwuY29ubmVjdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBza2lsbC5jb25uZWN0aW9ucy5mb3JFYWNoKHRhcmdldE5hbWUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGNyZWF0ZSBlZGdlIGlmIHRhcmdldCBleGlzdHMgdG8gYXZvaWQgYnJva2VuIGxpbmtzXG4gICAgICAgICAgICAgICAgICAgIGlmIChza2lsbHMuZmluZChzID0+IHMubmFtZSA9PT0gdGFyZ2V0TmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkZ2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBgJHtza2lsbC5uYW1lfS0ke3RhcmdldE5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tTm9kZTogc2tpbGwubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tU2lkZTogXCJyaWdodFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvTm9kZTogdGFyZ2V0TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1NpZGU6IFwibGVmdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbG9yOiBcIjRcIiAvLyBHcmVlbiBjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyAzLiBDb25zdHJ1Y3QgQ2FudmFzIEpTT05cbiAgICAgICAgY29uc3QgY2FudmFzRGF0YSA9IHtcbiAgICAgICAgICAgIG5vZGVzOiBub2RlcyxcbiAgICAgICAgICAgIGVkZ2VzOiBlZGdlc1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIDQuIFNhdmUgdG8gRmlsZVxuICAgICAgICBjb25zdCBwYXRoID0gXCJBY3RpdmVfUnVuL05ldXJhbF9IdWIuY2FudmFzXCI7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgocGF0aCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgdXBkYXRlZC5cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMikpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5ldXJhbCBIdWIgY3JlYXRlZC5cIik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgc2V0RmlsdGVyU3RhdGUoZW5lcmd5OiBhbnksIGNvbnRleHQ6IGFueSwgdGFnczogc3RyaW5nW10pIHsgdGhpcy5maWx0ZXJzRW5naW5lLnNldEZpbHRlclN0YXRlKGVuZXJneSwgY29udGV4dCwgdGFncyk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgY2xlYXJGaWx0ZXJzKCkgeyB0aGlzLmZpbHRlcnNFbmdpbmUuY2xlYXJGaWx0ZXJzKCk7IHRoaXMuc2F2ZSgpOyB9XG4gICAgXG4gICAgZ2V0R2FtZVN0YXRzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuZ2V0R2FtZVN0YXRzKCk7IH1cbiAgICBjaGVja0Jvc3NNaWxlc3RvbmVzKCkgeyByZXR1cm4gdGhpcy5hbmFseXRpY3NFbmdpbmUuY2hlY2tCb3NzTWlsZXN0b25lcygpOyB9XG4gICAgZ2VuZXJhdGVXZWVrbHlSZXBvcnQoKSB7IHJldHVybiB0aGlzLmFuYWx5dGljc0VuZ2luZS5nZW5lcmF0ZVdlZWtseVJlcG9ydCgpOyB9XG5cbiAgICB0YXVudCh0cmlnZ2VyOiBzdHJpbmcpIHsgLyogU2FtZSBhcyBiZWZvcmUgKi8gfVxuICAgIHBhcnNlUXVpY2tJbnB1dCh0ZXh0OiBzdHJpbmcpIHsgLyogU2FtZSBhcyBiZWZvcmUgKi8gfVxuICAgIGFzeW5jIHRyaWdnZXJEZWF0aCgpIHsgLyogU2FtZSBhcyBiZWZvcmUsIHJlc2V0cyBzdGF0cyAqLyBcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5sZXZlbCA9IDE7IHRoaXMuc2V0dGluZ3MuaHAgPSAxMDA7IHRoaXMuc2V0dGluZ3MuZ29sZCA9IDA7IFxuICAgICAgICB0aGlzLnNldHRpbmdzLmxlZ2FjeS5kZWF0aENvdW50ID0gKHRoaXMuc2V0dGluZ3MubGVnYWN5LmRlYXRoQ291bnQgfHwgMCkgKyAxO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmUoKTtcbiAgICB9XG59XG4iLCJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVEZpbGUsIFRGb2xkZXIsIG1vbWVudCB9IGZyb20gJ29ic2lkaWFuJztcbmltcG9ydCBTaXN5cGh1c1BsdWdpbiBmcm9tICcuLi9tYWluJztcbmltcG9ydCB7IFF1ZXN0TW9kYWwsIFNob3BNb2RhbCwgU2tpbGxEZXRhaWxNb2RhbCwgU2tpbGxNYW5hZ2VyTW9kYWwgfSBmcm9tICcuL21vZGFscyc7XG5pbXBvcnQgeyBTa2lsbCwgRGFpbHlNaXNzaW9uIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY29uc3QgVklFV19UWVBFX1BBTk9QVElDT04gPSBcInNpc3lwaHVzLXBhbm9wdGljb25cIjtcblxuZXhwb3J0IGNsYXNzIFBhbm9wdGljb25WaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICAgIHBsdWdpbjogU2lzeXBodXNQbHVnaW47XG5cbiAgICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFNpc3lwaHVzUGx1Z2luKSB7XG4gICAgICAgIHN1cGVyKGxlYWYpO1xuICAgICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB9XG5cbiAgICBnZXRWaWV3VHlwZSgpIHsgcmV0dXJuIFZJRVdfVFlQRV9QQU5PUFRJQ09OOyB9XG4gICAgZ2V0RGlzcGxheVRleHQoKSB7IHJldHVybiBcIkV5ZSBTaXN5cGh1c1wiOyB9XG4gICAgZ2V0SWNvbigpIHsgcmV0dXJuIFwic2t1bGxcIjsgfVxuXG4gICAgYXN5bmMgb25PcGVuKCkgeyBcbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7IFxuICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUub24oJ3VwZGF0ZScsIHRoaXMucmVmcmVzaC5iaW5kKHRoaXMpKTsgXG4gICAgfVxuXG4gICAgYXN5bmMgcmVmcmVzaCgpIHtcbiAgICAgICAgY29uc3QgYyA9IHRoaXMuY29udGVudEVsOyBjLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IGMuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY29udGFpbmVyXCIgfSk7XG4gICAgICAgIGNvbnN0IHNjcm9sbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zY3JvbGwtYXJlYVwiIH0pO1xuXG4gICAgICAgIC8vIC0tLSAxLiBIRUFERVIgJiBDUklUSUNBTCBBTEVSVFMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJFeWUgU0lTWVBIVVMgT1NcIiwgY2xzOiBcInNpc3ktaGVhZGVyXCIgfSk7XG4gICAgICAgLy8gW05FV10gREVCVCBXQVJOSU5HXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkge1xuICAgICAgICAgICAgY29uc3QgZCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LWRlYnRcIiB9KTtcbiAgICAgICAgICAgIGQuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwi4pqg77iPIERFQlQgQ1JJU0lTIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgZC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkFMTCBEQU1BR0UgUkVDRUlWRUQgSVMgRE9VQkxFRC5cIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gW0ZJWEVEXSBzdHlsZSBtb3ZlZCB0byBhdHRyXG4gICAgICAgICAgICBkLmNyZWF0ZUVsKFwicFwiLCB7IFxuICAgICAgICAgICAgICAgIHRleHQ6IGBDdXJyZW50IEJhbGFuY2U6ICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1nYCwgXG4gICAgICAgICAgICAgICAgYXR0cjogeyBzdHlsZTogXCJmb250LXdlaWdodDpib2xkXCIgfSBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IFxuXG4gICAgICAgIGlmKHRoaXMucGx1Z2luLmVuZ2luZS5pc0xvY2tlZERvd24oKSkge1xuICAgICAgICAgICAgY29uc3QgbCA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LWxvY2tkb3duXCIgfSk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkxPQ0tET1dOIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgeyBob3VycywgbWludXRlczogbWlucyB9ID0gdGhpcy5wbHVnaW4uZW5naW5lLm1lZGl0YXRpb25FbmdpbmUuZ2V0TG9ja2Rvd25UaW1lUmVtYWluaW5nKCk7XG4gICAgICAgICAgICBsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBUaW1lIFJlbWFpbmluZzogJHtob3Vyc31oICR7bWluc31tYCB9KTtcbiAgICAgICAgICAgIGNvbnN0IGJ0biA9IGwuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkFUVEVNUFQgUkVDT1ZFUllcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkU3RhdHVzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldE1lZGl0YXRpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZERpdiA9IGwuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBtZWREaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMHB4OyBwYWRkaW5nOiAxMHB4OyBiYWNrZ3JvdW5kOiByZ2JhKDE3MCwgMTAwLCAyNTUsIDAuMSk7IGJvcmRlci1yYWRpdXM6IDRweDtcIik7XG4gICAgICAgICAgICBtZWREaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYE1lZGl0YXRpb246ICR7bWVkU3RhdHVzLmN5Y2xlc0RvbmV9LzEwICgke21lZFN0YXR1cy5jeWNsZXNSZW1haW5pbmd9IGxlZnQpYCB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgbWVkQmFyID0gbWVkRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgbWVkQmFyLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiaGVpZ2h0OiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsMC4xKTsgYm9yZGVyLXJhZGl1czogM3B4OyBtYXJnaW46IDVweCAwOyBvdmVyZmxvdzogaGlkZGVuO1wiKTtcbiAgICAgICAgICAgIGNvbnN0IG1lZEZpbGwgPSBtZWRCYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICBjb25zdCBtZWRQZXJjZW50ID0gKG1lZFN0YXR1cy5jeWNsZXNEb25lIC8gMTApICogMTAwO1xuICAgICAgICAgICAgbWVkRmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7bWVkUGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IG1lZEJ0biA9IG1lZERpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTUVESVRBVEVcIiB9KTtcbiAgICAgICAgICAgIG1lZEJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA4cHg7IG1hcmdpbi10b3A6IDVweDsgYmFja2dyb3VuZDogcmdiYSgxNzAsIDEwMCwgMjU1LCAwLjMpOyBib3JkZXI6IDFweCBzb2xpZCAjYWE2NGZmOyBjb2xvcjogI2FhNjRmZjsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgICAgIG1lZEJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5zdGFydE1lZGl0YXRpb24oKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVmcmVzaCgpLCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcInNpc3ktYnRuXCIpO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuYXR0ZW1wdFJlY292ZXJ5KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5wbHVnaW4uZW5naW5lLmlzUmVzdGluZygpKSB7XG4gICAgICAgICAgICAgY29uc3QgciA9IHNjcm9sbC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hbGVydCBzaXN5LWFsZXJ0LXJlc3RcIiB9KTtcbiAgICAgICAgICAgICByLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJFU1QgREFZIEFDVElWRVwiIH0pO1xuICAgICAgICAgICAgIGNvbnN0IHRpbWVSZW1haW5pbmcgPSBtb21lbnQodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzdERheVVudGlsKS5kaWZmKG1vbWVudCgpLCAnbWludXRlcycpO1xuICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcih0aW1lUmVtYWluaW5nIC8gNjApO1xuICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSB0aW1lUmVtYWluaW5nICUgNjA7XG4gICAgICAgICAgICAgci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgJHtob3Vyc31oICR7bWluc31tIHJlbWFpbmluZyB8IE5vIGRhbWFnZSwgUnVzdCBwYXVzZWRgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIDIuIEhVRCBHUklEICgyeDIpIC0tLVxuICAgICAgICBjb25zdCBodWQgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktaHVkXCIgfSk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiSEVBTFRIXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLmhwfS8ke3RoaXMucGx1Z2luLnNldHRpbmdzLm1heEhwfWAsIHRoaXMucGx1Z2luLnNldHRpbmdzLmhwIDwgMzAgPyBcInNpc3ktY3JpdGljYWxcIiA6IFwiXCIpO1xuICAgICAgICB0aGlzLnN0YXQoaHVkLCBcIkdPTERcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZH1gLCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCA/IFwic2lzeS12YWwtZGVidFwiIDogXCJcIik7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiTEVWRUxcIiwgYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MubGV2ZWx9YCk7XG4gICAgICAgIHRoaXMuc3RhdChodWQsIFwiUklWQUwgRE1HXCIsIGAke3RoaXMucGx1Z2luLnNldHRpbmdzLnJpdmFsRG1nfWApO1xuXG4gICAgICAgIC8vIC0tLSAzLiBUSEUgT1JBQ0xFIC0tLVxuICAgICAgICBjb25zdCBvcmFjbGUgPSBzY3JvbGwuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktb3JhY2xlXCIgfSk7XG4gICAgICAgIG9yYWNsZS5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJPUkFDTEUgUFJFRElDVElPTlwiIH0pO1xuICAgICAgICBjb25zdCBzdXJ2aXZhbCA9IE1hdGguZmxvb3IodGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgLyAodGhpcy5wbHVnaW4uc2V0dGluZ3Mucml2YWxEbWcgKiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ29sZCA8IDAgPyAyIDogMSkpKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBzdXJ2VGV4dCA9IGBTdXJ2aXZhbDogJHtzdXJ2aXZhbH0gZGF5c2A7XG4gICAgICAgIGNvbnN0IGlzQ3Jpc2lzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuaHAgPCAzMCB8fCB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEdsaXRjaCBMb2dpY1xuICAgICAgICBpZiAoaXNDcmlzaXMgJiYgTWF0aC5yYW5kb20oKSA8IDAuMykge1xuICAgICAgICAgICAgY29uc3QgZ2xpdGNoZXMgPSBbXCJbQ09SUlVQVEVEXVwiLCBcIj8/PyBEQVlTIExFRlRcIiwgXCJOTyBGVVRVUkVcIiwgXCJSVU5cIl07XG4gICAgICAgICAgICBzdXJ2VGV4dCA9IGdsaXRjaGVzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGdsaXRjaGVzLmxlbmd0aCldO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3VydkVsID0gb3JhY2xlLmNyZWF0ZURpdih7IHRleHQ6IHN1cnZUZXh0IH0pO1xuICAgICAgICBpZiAoc3Vydml2YWwgPCAyIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiPz8/XCIpIHx8IHN1cnZUZXh0LmluY2x1ZGVzKFwiQ09SUlVQVEVEXCIpKSB7XG4gICAgICAgICAgICAgc3VydkVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiY29sb3I6I2ZmNTU1NTsgZm9udC13ZWlnaHQ6Ym9sZDsgbGV0dGVyLXNwYWNpbmc6IDFweDtcIik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxpZ2h0cyA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1zdGF0dXMtbGlnaHRzXCIgfSk7XG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nb2xkIDwgMCkgbGlnaHRzLmNyZWF0ZURpdih7IHRleHQ6IFwiREVCVDogWUVTXCIsIGNsczogXCJzaXN5LWxpZ2h0LWFjdGl2ZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IFNjYXJzIGRpc3BsYXlcbiAgICAgICAgY29uc3Qgc2NhckNvdW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGVnYWN5Py5kZWF0aENvdW50IHx8IDA7XG4gICAgICAgIGlmIChzY2FyQ291bnQgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzY2FyRWwgPSBvcmFjbGUuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktc2Nhci1kaXNwbGF5XCIgfSk7XG4gICAgICAgICAgICBzY2FyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogYFNjYXJzOiAke3NjYXJDb3VudH1gIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVuYWx0eSA9IE1hdGgucG93KDAuOSwgc2NhckNvdW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmNlbnRMb3N0ID0gTWF0aC5mbG9vcigoMSAtIHBlbmFsdHkpICogMTAwKTtcbiAgICAgICAgICAgIHNjYXJFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogYCgtJHtwZXJjZW50TG9zdH0lIHN0YXJ0aW5nIGdvbGQpYCB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRExDIDE6IE5leHQgbWlsZXN0b25lXG4gICAgICAgIGNvbnN0IGxldmVsTWlsZXN0b25lcyA9IFsxMCwgMjAsIDMwLCA1MF07XG4gICAgICAgIGNvbnN0IG5leHRNaWxlc3RvbmUgPSBsZXZlbE1pbGVzdG9uZXMuZmluZChtID0+IG0gPiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sZXZlbCk7XG4gICAgICAgIGlmIChuZXh0TWlsZXN0b25lKSB7XG4gICAgICAgICAgICBjb25zdCBtaWxlc3RvbmVFbCA9IG9yYWNsZS5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1taWxlc3RvbmVcIiB9KTtcbiAgICAgICAgICAgIG1pbGVzdG9uZUVsLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGBOZXh0IE1pbGVzdG9uZTogTGV2ZWwgJHtuZXh0TWlsZXN0b25lfWAgfSk7XG4gICAgICAgICAgICBpZiAobmV4dE1pbGVzdG9uZSA9PT0gMTAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMjAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gMzAgfHwgbmV4dE1pbGVzdG9uZSA9PT0gNTApIHtcbiAgICAgICAgICAgICAgICBtaWxlc3RvbmVFbC5jcmVhdGVFbChcInNtYWxsXCIsIHsgdGV4dDogXCIoQm9zcyBVbmxvY2spXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAtLS0gNC4gREFJTFkgTUlTU0lPTlMgKERMQyAxKSAtLS1cbiAgICAgICAgc2Nyb2xsLmNyZWF0ZURpdih7IHRleHQ6IFwiVE9EQVlTIE9CSkVDVElWRVNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckRhaWx5TWlzc2lvbnMoc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gNS4gQ09OVFJPTFMgLS0tXG4gICAgICAgIGNvbnN0IGN0cmxzID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNvbnRyb2xzXCIgfSk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERVBMT1lcIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KS5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIGN0cmxzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJTSE9QXCIsIGNsczogXCJzaXN5LWJ0blwiIH0pLm9uY2xpY2sgPSAoKSA9PiBuZXcgU2hvcE1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpO1xuICAgICAgICBjdHJscy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRk9DVVNcIiwgY2xzOiBcInNpc3ktYnRuXCIgfSkub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKTtcblxuICAgICAgICAvLyAtLS0gNi4gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIC8vIC0tLSBETEMgNTogQ09OVEVYVCBGSUxURVJTIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJGSUxURVIgQ09OVFJPTFNcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICB0aGlzLnJlbmRlckZpbHRlckJhcihzY3JvbGwpO1xuXG4gICAgICAgIC8vIC0tLSBETEMgNDogUVVFU1QgQ0hBSU5TIC0tLVxuICAgICAgICBjb25zdCBhY3RpdmVDaGFpbiA9IHRoaXMucGx1Z2luLmVuZ2luZS5nZXRBY3RpdmVDaGFpbigpO1xuICAgICAgICBpZiAoYWN0aXZlQ2hhaW4pIHtcbiAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBDSEFJTlwiLCBjbHM6IFwic2lzeS1zZWN0aW9uLXRpdGxlXCIgfSk7XG4gICAgICAgICAgICB0aGlzLnJlbmRlckNoYWluU2VjdGlvbihzY3JvbGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gLS0tIERMQyAyOiBSRVNFQVJDSCBMSUJSQVJZIC0tLVxuICAgICAgICBzY3JvbGwuY3JlYXRlRGl2KHsgdGV4dDogXCJSRVNFQVJDSCBMSUJSQVJZXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJSZXNlYXJjaFNlY3Rpb24oc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gRExDIDY6IEFOQUxZVElDUyAmIEVOREdBTUUgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFOQUxZVElDUyAmIFBST0dSRVNTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgdGhpcy5yZW5kZXJBbmFseXRpY3Moc2Nyb2xsKTtcblxuICAgICAgICAvLyAtLS0gQUNUSVZFIFRIUkVBVFMgLS0tXG4gICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIkFDVElWRSBUSFJFQVRTXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJRdWVzdHMoc2Nyb2xsKTtcblxuICAgICAgICAgICAgICAgIHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5FVVJBTCBIVUJcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpbGxzLmZvckVhY2goKHM6IFNraWxsLCBpZHg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3Qgcm93ID0gc2Nyb2xsLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXNraWxsLXJvd1wiIH0pO1xuICAgICAgICAgICAgcm93Lm9uY2xpY2sgPSAoKSA9PiBuZXcgU2tpbGxEZXRhaWxNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIGlkeCkub3BlbigpO1xuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1za2lsbC1tZXRhXCIgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBzLm5hbWUgfSk7XG4gICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgTHZsICR7cy5sZXZlbH1gIH0pO1xuICAgICAgICAgICAgaWYgKHMucnVzdCA+IDApIHtcbiAgICAgICAgICAgICAgICBtZXRhLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgUlVTVCAke3MucnVzdH1gLCBjbHM6IFwic2lzeS1ydXN0LWJhZGdlXCIgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBiYXIgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktYmFyLWJnXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBmaWxsID0gYmFyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1maWxsXCIgfSk7XG4gICAgICAgICAgICBmaWxsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGB3aWR0aDogJHsocy54cC9zLnhwUmVxKSoxMDB9JTsgYmFja2dyb3VuZDogJHtzLnJ1c3QgPiAwID8gJyNkMzU0MDAnIDogJyMwMGIwZmYnfWApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGFkZEJ0biA9IHNjcm9sbC5jcmVhdGVEaXYoeyB0ZXh0OiBcIisgQWRkIE5ldXJhbCBOb2RlXCIsIGNsczogXCJzaXN5LWFkZC1za2lsbFwiIH0pO1xuICAgICAgICBhZGRCdG4ub25jbGljayA9ICgpID0+IG5ldyBTa2lsbE1hbmFnZXJNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4pLm9wZW4oKTtcblxuICAgICAgICAvLyAtLS0gOC4gUVVJQ0sgQ0FQVFVSRSAtLS1cbiAgICAgICAgY29uc3QgZm9vdGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXF1aWNrLWNhcHR1cmVcIiB9KTtcbiAgICAgICAgY29uc3QgaW5wdXQgPSBmb290ZXIuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJzaXN5LXF1aWNrLWlucHV0XCIsIHBsYWNlaG9sZGVyOiBcIk1pc3Npb24gLzEuLi41XCIgfSk7XG4gICAgICAgIGlucHV0Lm9ua2V5ZG93biA9IGFzeW5jIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgaW5wdXQudmFsdWUudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnBhcnNlUXVpY2tJbnB1dChpbnB1dC52YWx1ZS50cmltKCkpO1xuICAgICAgICAgICAgICAgIGlucHV0LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBETEMgMTogUmVuZGVyIERhaWx5IE1pc3Npb25zXG4gICAgcmVuZGVyRGFpbHlNaXNzaW9ucyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IG1pc3Npb25zID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGFpbHlNaXNzaW9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChtaXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5ID0gcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gbWlzc2lvbnMgdG9kYXkuIENoZWNrIGJhY2sgdG9tb3Jyb3cuXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtaXNzaW9uc0RpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1kYWlseS1taXNzaW9uc1wiIH0pO1xuICAgICAgICBcbiAgICAgICAgbWlzc2lvbnMuZm9yRWFjaCgobWlzc2lvbjogRGFpbHlNaXNzaW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXJkID0gbWlzc2lvbnNEaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1jYXJkXCIgfSk7XG4gICAgICAgICAgICBpZiAobWlzc2lvbi5jb21wbGV0ZWQpIGNhcmQuYWRkQ2xhc3MoXCJzaXN5LW1pc3Npb24tY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24taGVhZGVyXCIgfSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNJY29uID0gbWlzc2lvbi5jb21wbGV0ZWQgPyBcIllFU1wiIDogXCIuLlwiO1xuICAgICAgICAgICAgaGVhZGVyLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IHN0YXR1c0ljb24sIGNsczogXCJzaXN5LW1pc3Npb24tc3RhdHVzXCIgfSk7XG4gICAgICAgICAgICBoZWFkZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogbWlzc2lvbi5uYW1lLCBjbHM6IFwic2lzeS1taXNzaW9uLW5hbWVcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogbWlzc2lvbi5kZXNjLCBjbHM6IFwic2lzeS1taXNzaW9uLWRlc2NcIiB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LW1pc3Npb24tcHJvZ3Jlc3NcIiB9KTtcbiAgICAgICAgICAgIHByb2dyZXNzLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IGAke21pc3Npb24ucHJvZ3Jlc3N9LyR7bWlzc2lvbi50YXJnZXR9YCwgY2xzOiBcInNpc3ktbWlzc2lvbi1jb3VudGVyXCIgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJhciA9IHByb2dyZXNzLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWJhci1iZ1wiIH0pO1xuICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1iYXItZmlsbFwiIH0pO1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IChtaXNzaW9uLnByb2dyZXNzIC8gbWlzc2lvbi50YXJnZXQpICogMTAwO1xuICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7TWF0aC5taW4ocGVyY2VudCwgMTAwKX0lYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJld2FyZCA9IGNhcmQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktbWlzc2lvbi1yZXdhcmRcIiB9KTtcbiAgICAgICAgICAgIGlmIChtaXNzaW9uLnJld2FyZC54cCA+IDApIHJld2FyZC5jcmVhdGVTcGFuKHsgdGV4dDogYCske21pc3Npb24ucmV3YXJkLnhwfSBYUGAsIGNsczogXCJzaXN5LXJld2FyZC14cFwiIH0pO1xuICAgICAgICAgICAgaWYgKG1pc3Npb24ucmV3YXJkLmdvbGQgPiAwKSByZXdhcmQuY3JlYXRlU3Bhbih7IHRleHQ6IGArJHttaXNzaW9uLnJld2FyZC5nb2xkfWdgLCBjbHM6IFwic2lzeS1yZXdhcmQtZ29sZFwiIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBhbGxDb21wbGV0ZWQgPSBtaXNzaW9ucy5ldmVyeShtID0+IG0uY29tcGxldGVkKTtcbiAgICAgICAgaWYgKGFsbENvbXBsZXRlZCAmJiBtaXNzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBib251cyA9IG1pc3Npb25zRGl2LmNyZWF0ZURpdih7IHRleHQ6IFwiQWxsIE1pc3Npb25zIENvbXBsZXRlISArNTAgQm9udXMgR29sZFwiLCBjbHM6IFwic2lzeS1taXNzaW9uLWJvbnVzXCIgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG4gICAgLy8gRExDIDI6IFJlbmRlciBSZXNlYXJjaCBRdWVzdHMgU2VjdGlvblxuICAgIHJlbmRlclJlc2VhcmNoU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHJlc2VhcmNoUXVlc3RzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVzZWFyY2hRdWVzdHMgfHwgW107XG4gICAgICAgIGNvbnN0IGFjdGl2ZVJlc2VhcmNoID0gcmVzZWFyY2hRdWVzdHMuZmlsdGVyKHEgPT4gIXEuY29tcGxldGVkKTtcbiAgICAgICAgY29uc3QgY29tcGxldGVkUmVzZWFyY2ggPSByZXNlYXJjaFF1ZXN0cy5maWx0ZXIocSA9PiBxLmNvbXBsZXRlZCk7XG5cbiAgICAgICAgLy8gU3RhdHMgYmFyXG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldFJlc2VhcmNoUmF0aW8oKTtcbiAgICAgICAgY29uc3Qgc3RhdHNEaXYgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktcmVzZWFyY2gtc3RhdHNcIiB9KTtcbiAgICAgICAgc3RhdHNEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjNjY2OyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IG1hcmdpbi1ib3R0b206IDEwcHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcmF0aW9UZXh0ID0gc3RhdHNEaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFJlc2VhcmNoIFJhdGlvOiAke3N0YXRzLmNvbWJhdH06JHtzdGF0cy5yZXNlYXJjaH0gKCR7c3RhdHMucmF0aW99OjEpYCB9KTtcbiAgICAgICAgcmF0aW9UZXh0LnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMDsgZm9udC1zaXplOiAwLjllbTtcIik7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXRoaXMucGx1Z2luLmVuZ2luZS5jYW5DcmVhdGVSZXNlYXJjaFF1ZXN0KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmcgPSBzdGF0c0Rpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIkJMT0NLRUQ6IE5lZWQgMiBjb21iYXQgcGVyIDEgcmVzZWFyY2hcIiB9KTtcbiAgICAgICAgICAgIHdhcm5pbmcuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJjb2xvcjogb3JhbmdlOyBmb250LXdlaWdodDogYm9sZDsgbWFyZ2luOiA1cHggMDtcIik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBY3RpdmUgUmVzZWFyY2hcbiAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiQUNUSVZFIFJFU0VBUkNIXCIsIGNsczogXCJzaXN5LXNlY3Rpb24tdGl0bGVcIiB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChhY3RpdmVSZXNlYXJjaC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIk5vIGFjdGl2ZSByZXNlYXJjaC5cIiwgY2xzOiBcInNpc3ktZW1wdHktc3RhdGVcIiB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjdGl2ZVJlc2VhcmNoLmZvckVhY2goKHF1ZXN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXJkID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXJlc2VhcmNoLWNhcmRcIiB9KTtcbiAgICAgICAgICAgICAgICBjYXJkLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiYm9yZGVyOiAxcHggc29saWQgI2FhNjRmZjsgcGFkZGluZzogMTBweDsgbWFyZ2luLWJvdHRvbTogOHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4wNSk7XCIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IG1hcmdpbi1ib3R0b206IDZweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0aXRsZSA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50aXRsZSB9KTtcbiAgICAgICAgICAgICAgICB0aXRsZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkOyBmbGV4OiAxO1wiKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVMYWJlbCA9IGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBxdWVzdC50eXBlID09PSBcInN1cnZleVwiID8gXCJTVVJWRVlcIiA6IFwiREVFUCBESVZFXCIgfSk7XG4gICAgICAgICAgICAgICAgdHlwZUxhYmVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZm9udC1zaXplOiAwLjc1ZW07IHBhZGRpbmc6IDJweCA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMTcwLCAxMDAsIDI1NSwgMC4zKTsgYm9yZGVyLXJhZGl1czogMnB4O1wiKTtcblxuICAgICAgICAgICAgICAgIGNhcmQuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiBgSUQ6ICR7cXVlc3QuaWR9YCB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtZmFtaWx5Om1vbm9zcGFjZTsgZm9udC1zaXplOjAuOGVtOyBjb2xvcjojYWE2NGZmOyBvcGFjaXR5OjAuODsgbWFyZ2luLWJvdHRvbTo0cHg7XCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRDb3VudCA9IGNhcmQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFdvcmRzOiAke3F1ZXN0LndvcmRDb3VudH0vJHtxdWVzdC53b3JkTGltaXR9YCB9KTtcbiAgICAgICAgICAgICAgICB3b3JkQ291bnQuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDVweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBiYXIgPSBjYXJkLmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjsgbWFyZ2luOiA2cHggMDtcIik7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsbCA9IGJhci5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gTWF0aC5taW4oMTAwLCAocXVlc3Qud29yZENvdW50IC8gcXVlc3Qud29yZExpbWl0KSAqIDEwMCk7XG4gICAgICAgICAgICAgICAgZmlsbC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgd2lkdGg6ICR7cGVyY2VudH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQ6ICNhYTY0ZmY7IHRyYW5zaXRpb246IHdpZHRoIDAuM3M7YCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb25zID0gY2FyZC5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDhweDtcIik7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB2aWV3QnRuID0gYWN0aW9ucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ09NUExFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZmxleDogMTsgcGFkZGluZzogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDg1LCAyNTUsIDg1LCAwLjIpOyBib3JkZXI6IDFweCBzb2xpZCAjNTVmZjU1OyBjb2xvcjogIzU1ZmY1NTsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMC44NWVtO1wiKTtcbiAgICAgICAgICAgICAgICB2aWV3QnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVJlc2VhcmNoUXVlc3QocXVlc3QuaWQsIHF1ZXN0LndvcmRDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJERUxFVEVcIiB9KTtcbiAgICAgICAgICAgICAgICBkZWxldGVCdG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmbGV4OiAxOyBwYWRkaW5nOiA2cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCA4NSwgODUsIDAuMik7IGJvcmRlcjogMXB4IHNvbGlkICNmZjU1NTU7IGNvbG9yOiAjZmY1NTU1OyBib3JkZXItcmFkaXVzOiAzcHg7IGN1cnNvcjogcG9pbnRlcjsgZm9udC1zaXplOiAwLjg1ZW07XCIpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZUJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuZGVsZXRlUmVzZWFyY2hRdWVzdChxdWVzdC5pZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbXBsZXRlZCBSZXNlYXJjaFxuICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJDT01QTEVURUQgUkVTRUFSQ0hcIiwgY2xzOiBcInNpc3ktc2VjdGlvbi10aXRsZVwiIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbXBsZXRlZFJlc2VhcmNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcGFyZW50LmNyZWF0ZURpdih7IHRleHQ6IFwiTm8gY29tcGxldGVkIHJlc2VhcmNoLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29tcGxldGVkUmVzZWFyY2guZm9yRWFjaCgocXVlc3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBwYXJlbnQuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYCsgJHtxdWVzdC50aXRsZX0gKCR7cXVlc3QudHlwZSA9PT0gXCJzdXJ2ZXlcIiA/IFwiU3VydmV5XCIgOiBcIkRlZXAgRGl2ZVwifSlgIH0pO1xuICAgICAgICAgICAgICAgIGl0ZW0uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJvcGFjaXR5OiAwLjY7IGZvbnQtc2l6ZTogMC45ZW07IG1hcmdpbjogM3B4IDA7XCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgICAgICAgICAgYXN5bmMgcmVuZGVyUXVlc3RzKHBhcmVudDogSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFwiQWN0aXZlX1J1bi9RdWVzdHNcIik7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChmb2xkZXIgaW5zdGFuY2VvZiBURm9sZGVyKSB7XG4gICAgICAgICAgICBsZXQgZmlsZXMgPSBmb2xkZXIuY2hpbGRyZW4uZmlsdGVyKGYgPT4gZiBpbnN0YW5jZW9mIFRGaWxlKSBhcyBURmlsZVtdO1xuICAgICAgICAgICAgZmlsZXMgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZmlsdGVyc0VuZ2luZS5maWx0ZXJRdWVzdHMoZmlsZXMpIGFzIFRGaWxlW107IC8vIFtBVVRPLUZJWF0gQXBwbHkgZmlsdGVyc1xuICAgICAgICAgICAgZmlsZXMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtQSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGEpPy5mcm9udG1hdHRlcjtcbiAgICAgICAgICAgICAgICBjb25zdCBmbUIgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShiKT8uZnJvbnRtYXR0ZXI7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZUEgPSBmbUE/LmRlYWRsaW5lID8gbW9tZW50KGZtQS5kZWFkbGluZSkudmFsdWVPZigpIDogOTk5OTk5OTk5OTk5OTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRlQiA9IGZtQj8uZGVhZGxpbmUgPyBtb21lbnQoZm1CLmRlYWRsaW5lKS52YWx1ZU9mKCkgOiA5OTk5OTk5OTk5OTk5O1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlQSAtIGRhdGVCOyBcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBwYXJlbnQuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2FyZFwiIH0pO1xuICAgICAgICAgICAgICAgIGlmIChmbT8uaXNfYm9zcykgY2FyZC5hZGRDbGFzcyhcInNpc3ktY2FyZC1ib3NzXCIpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGQgPSBTdHJpbmcoZm0/LmRpZmZpY3VsdHkgfHwgXCJcIikubWF0Y2goL1xcZC8pO1xuICAgICAgICAgICAgICAgIGlmIChkKSBjYXJkLmFkZENsYXNzKGBzaXN5LWNhcmQtJHtkWzBdfWApO1xuXG4gICAgICAgICAgICAgICAgLy8gVG9wIHNlY3Rpb24gd2l0aCB0aXRsZSBhbmQgdGltZXJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3AgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNhcmQtdG9wXCIgfSk7XG4gICAgICAgICAgICAgICAgdG9wLmNyZWF0ZURpdih7IHRleHQ6IGZpbGUuYmFzZW5hbWUsIGNsczogXCJzaXN5LWNhcmQtdGl0bGVcIiB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUaW1lclxuICAgICAgICAgICAgICAgIGlmIChmbT8uZGVhZGxpbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlmZiA9IG1vbWVudChmbS5kZWFkbGluZSkuZGlmZihtb21lbnQoKSwgJ21pbnV0ZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1pbnMgPSBkaWZmICUgNjA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVyVGV4dCA9IGRpZmYgPCAwID8gXCJFWFBJUkVEXCIgOiBgJHtob3Vyc31oICR7bWluc31tYDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXIgPSB0b3AuY3JlYXRlRGl2KHsgdGV4dDogdGltZXJUZXh0LCBjbHM6IFwic2lzeS10aW1lclwiIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZiA8IDYwKSB0aW1lci5hZGRDbGFzcyhcInNpc3ktdGltZXItbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBUcmFzaCBpY29uIChpbmxpbmUsIG5vdCBhYnNvbHV0ZSlcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFzaCA9IHRvcC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS10cmFzaFwiLCB0ZXh0OiBcIltYXVwiIH0pO1xuICAgICAgICAgICAgICAgIHRyYXNoLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xuICAgICAgICAgICAgICAgIHRyYXNoLnN0eWxlLmNvbG9yID0gXCIjZmY1NTU1XCI7XG4gICAgICAgICAgICAgICAgdHJhc2gub25jbGljayA9IChlKSA9PiB7IFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpOyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLmRlbGV0ZVF1ZXN0KGZpbGUpOyBcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBhY3RzID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1hY3Rpb25zXCIgfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgYkQgPSBhY3RzLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJPS1wiLCBjbHM6IFwic2lzeS1hY3Rpb24tYnRuIG1vZC1kb25lXCIgfSk7XG4gICAgICAgICAgICAgICAgYkQub25jbGljayA9ICgpID0+IHRoaXMucGx1Z2luLmVuZ2luZS5jb21wbGV0ZVF1ZXN0KGZpbGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJGID0gYWN0cy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiWFhcIiwgY2xzOiBcInNpc3ktYWN0aW9uLWJ0biBtb2QtZmFpbFwiIH0pO1xuICAgICAgICAgICAgICAgIGJGLm9uY2xpY2sgPSAoKSA9PiB0aGlzLnBsdWdpbi5lbmdpbmUuZmFpbFF1ZXN0KGZpbGUsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaWRsZSA9IHBhcmVudC5jcmVhdGVEaXYoeyB0ZXh0OiBcIlN5c3RlbSBJZGxlLlwiLCBjbHM6IFwic2lzeS1lbXB0eS1zdGF0ZVwiIH0pO1xuICAgICAgICAgICAgY29uc3QgY3RhQnRuID0gaWRsZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiW0RFUExPWSBRVUVTVF1cIiwgY2xzOiBcInNpc3ktYnRuIG1vZC1jdGFcIiB9KTtcbiAgICAgICAgICAgIGN0YUJ0bi5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEwcHhcIjtcbiAgICAgICAgICAgIGN0YUJ0bi5vbmNsaWNrID0gKCkgPT4gbmV3IFF1ZXN0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBcblxuICAgIHJlbmRlckNoYWluU2VjdGlvbihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGNoYWluID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWNoYWluKSB7XG4gICAgICAgICAgICBwYXJlbnQuY3JlYXRlRGl2KHsgdGV4dDogXCJObyBhY3RpdmUgY2hhaW4uXCIsIGNsczogXCJzaXN5LWVtcHR5LXN0YXRlXCIgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNoYWluRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWNoYWluLWNvbnRhaW5lclwiIH0pO1xuICAgICAgICBjaGFpbkRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICM0Y2FmNTA7IHBhZGRpbmc6IDEycHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSg3NiwgMTc1LCA4MCwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaGVhZGVyID0gY2hhaW5EaXYuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGNoYWluLm5hbWUgfSk7XG4gICAgICAgIGhlYWRlci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMCAwIDEwcHggMDsgY29sb3I6ICM0Y2FmNTA7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSB0aGlzLnBsdWdpbi5lbmdpbmUuZ2V0Q2hhaW5Qcm9ncmVzcygpO1xuICAgICAgICBjb25zdCBwcm9ncmVzc1RleHQgPSBjaGFpbkRpdi5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUHJvZ3Jlc3M6ICR7cHJvZ3Jlc3MuY29tcGxldGVkfS8ke3Byb2dyZXNzLnRvdGFsfWAgfSk7XG4gICAgICAgIHByb2dyZXNzVGV4dC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNXB4IDA7IGZvbnQtc2l6ZTogMC45ZW07XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmFyID0gY2hhaW5EaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGJhci5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImhlaWdodDogNnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LDAuMSk7IGJvcmRlci1yYWRpdXM6IDNweDsgbWFyZ2luOiA4cHggMDsgb3ZlcmZsb3c6IGhpZGRlbjtcIik7XG4gICAgICAgIGNvbnN0IGZpbGwgPSBiYXIuY3JlYXRlRGl2KCk7XG4gICAgICAgIGZpbGwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYHdpZHRoOiAke3Byb2dyZXNzLnBlcmNlbnR9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kOiAjNGNhZjUwOyB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzO2ApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcXVlc3RMaXN0ID0gY2hhaW5EaXYuY3JlYXRlRGl2KHsgY2xzOiBcInNpc3ktY2hhaW4tcXVlc3RzXCIgfSk7XG4gICAgICAgIHF1ZXN0TGlzdC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMTBweCAwOyBmb250LXNpemU6IDAuODVlbTtcIik7XG4gICAgICAgIFxuICAgICAgICBjaGFpbi5xdWVzdHMuZm9yRWFjaCgocXVlc3QsIGlkeCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXRlbSA9IHF1ZXN0TGlzdC5jcmVhdGVFbChcInBcIik7XG4gICAgICAgICAgICBjb25zdCBpY29uID0gaWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJPS1wiIDogaWR4ID09PSBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIj4+PlwiIDogXCJMT0NLXCI7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBpZHggPCBwcm9ncmVzcy5jb21wbGV0ZWQgPyBcIkRPTkVcIiA6IGlkeCA9PT0gcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJBQ1RJVkVcIiA6IFwiTE9DS0VEXCI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGl0ZW0uc2V0VGV4dChgWyR7aWNvbn1dICR7cXVlc3R9ICgke3N0YXR1c30pYCk7XG4gICAgICAgICAgICBpdGVtLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGBtYXJnaW46IDNweCAwOyBwYWRkaW5nOiAzcHg7IFxuICAgICAgICAgICAgICAgICR7aWR4IDwgcHJvZ3Jlc3MuY29tcGxldGVkID8gXCJvcGFjaXR5OiAwLjY7XCIgOiBpZHggPT09IHByb2dyZXNzLmNvbXBsZXRlZCA/IFwiZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiIDogXCJvcGFjaXR5OiAwLjQ7XCJ9YCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYWN0aW9ucyA9IGNoYWluRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBhY3Rpb25zLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwiZGlzcGxheTogZmxleDsgZ2FwOiA1cHg7IG1hcmdpbi10b3A6IDEwcHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYnJlYWtCdG4gPSBhY3Rpb25zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJCUkVBSyBDSEFJTlwiIH0pO1xuICAgICAgICBicmVha0J0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZsZXg6IDE7IHBhZGRpbmc6IDZweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDAuOGVtO1wiKTtcbiAgICAgICAgYnJlYWtCdG4ub25jbGljayA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmVuZ2luZS5icmVha0NoYWluKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckZpbHRlckJhcihwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWx0ZXJTdGF0ZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpbHRlckRpdiA9IHBhcmVudC5jcmVhdGVEaXYoeyBjbHM6IFwic2lzeS1maWx0ZXItYmFyXCIgfSk7XG4gICAgICAgIGZpbHRlckRpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICMwMDg4ZmY7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDRweDsgYmFja2dyb3VuZDogcmdiYSgwLCAxMzYsIDI1NSwgMC4wNSk7IG1hcmdpbi1ib3R0b206IDE1cHg7XCIpO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5lcmd5IGZpbHRlclxuICAgICAgICBjb25zdCBlbmVyZ3lEaXYgPSBmaWx0ZXJEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgIGVuZXJneURpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGVuZXJneURpdi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkVuZXJneTogXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBlbmVyZ3lPcHRpb25zID0gW1wiYW55XCIsIFwiaGlnaFwiLCBcIm1lZGl1bVwiLCBcImxvd1wiXTtcbiAgICAgICAgZW5lcmd5T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBlbmVyZ3lEaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBvcHQudG9VcHBlckNhc2UoKSB9KTtcbiAgICAgICAgICAgIGJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBgbWFyZ2luOiAwIDNweDsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBjdXJzb3I6IHBvaW50ZXI7IFxuICAgICAgICAgICAgICAgICR7ZmlsdGVycy5hY3RpdmVFbmVyZ3kgPT09IG9wdCA/IFwiYmFja2dyb3VuZDogIzAwODhmZjsgY29sb3I6IHdoaXRlO1wiIDogXCJiYWNrZ3JvdW5kOiByZ2JhKDAsIDEzNiwgMjU1LCAwLjIpO1wifWApO1xuICAgICAgICAgICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLnNldEZpbHRlclN0YXRlKG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlQ29udGV4dCwgZmlsdGVycy5hY3RpdmVUYWdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dCBmaWx0ZXJcbiAgICAgICAgY29uc3QgY29udGV4dERpdiA9IGZpbHRlckRpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgY29udGV4dERpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbi1ib3R0b206IDhweDtcIik7XG4gICAgICAgIGNvbnRleHREaXYuY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogXCJDb250ZXh0OiBcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImZvbnQtd2VpZ2h0OiBib2xkO1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbnRleHRPcHRpb25zID0gW1wiYW55XCIsIFwiaG9tZVwiLCBcIm9mZmljZVwiLCBcImFueXdoZXJlXCJdO1xuICAgICAgICBjb250ZXh0T3B0aW9ucy5mb3JFYWNoKG9wdCA9PiB7XG4gICAgICAgICAgICBjb25zdCBidG4gPSBjb250ZXh0RGl2LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogb3B0LnRvVXBwZXJDYXNlKCkgfSk7XG4gICAgICAgICAgICBidG4uc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgYG1hcmdpbjogMCAzcHg7IHBhZGRpbmc6IDRweCA4cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBcbiAgICAgICAgICAgICAgICAke2ZpbHRlcnMuYWN0aXZlQ29udGV4dCA9PT0gb3B0ID8gXCJiYWNrZ3JvdW5kOiAjMDA4OGZmOyBjb2xvcjogd2hpdGU7XCIgOiBcImJhY2tncm91bmQ6IHJnYmEoMCwgMTM2LCAyNTUsIDAuMik7XCJ9YCk7XG4gICAgICAgICAgICBidG4ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuc2V0RmlsdGVyU3RhdGUoZmlsdGVycy5hY3RpdmVFbmVyZ3ksIG9wdCBhcyBhbnksIGZpbHRlcnMuYWN0aXZlVGFncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGJ1dHRvblxuICAgICAgICBjb25zdCBjbGVhckJ0biA9IGZpbHRlckRpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ0xFQVIgRklMVEVSU1wiIH0pO1xuICAgICAgICBjbGVhckJ0bi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIndpZHRoOiAxMDAlOyBwYWRkaW5nOiA2cHg7IG1hcmdpbi10b3A6IDhweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDg1LCA4NSwgMC4yKTsgYm9yZGVyOiAxcHggc29saWQgI2ZmNTU1NTsgY29sb3I6ICNmZjU1NTU7IGJvcmRlci1yYWRpdXM6IDNweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDtcIik7XG4gICAgICAgIGNsZWFyQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5lbmdpbmUuY2xlYXJGaWx0ZXJzKCk7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcbiAgICAgICAgfTtcbiAgICB9XG5cblxuICAgIHJlbmRlckFuYWx5dGljcyhwYXJlbnQ6IEhUTUxFbGVtZW50KSB7XG4gICAgICAgIGNvbnN0IHN0YXRzID0gdGhpcy5wbHVnaW4uZW5naW5lLmdldEdhbWVTdGF0cygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYW5hbHl0aWNzRGl2ID0gcGFyZW50LmNyZWF0ZURpdih7IGNsczogXCJzaXN5LWFuYWx5dGljc1wiIH0pO1xuICAgICAgICBhbmFseXRpY3NEaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJib3JkZXI6IDFweCBzb2xpZCAjZmZjMTA3OyBwYWRkaW5nOiAxMnB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGJhY2tncm91bmQ6IHJnYmEoMjU1LCAxOTMsIDcsIDAuMDUpOyBtYXJnaW4tYm90dG9tOiAxNXB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGFuYWx5dGljc0Rpdi5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBTkFMWVRJQ1MgJiBQUk9HUkVTU1wiIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiAwIDAgMTBweCAwOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0cyBncmlkXG4gICAgICAgIGNvbnN0IHN0YXRzRGl2ID0gYW5hbHl0aWNzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICBzdGF0c0Rpdi5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMHB4OyBtYXJnaW4tYm90dG9tOiAxMHB4O1wiKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHN0YXRzX2l0ZW1zID0gW1xuICAgICAgICAgICAgeyBsYWJlbDogXCJMZXZlbFwiLCB2YWx1ZTogc3RhdHMubGV2ZWwgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiQ3VycmVudCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmN1cnJlbnRTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiTG9uZ2VzdCBTdHJlYWtcIiwgdmFsdWU6IHN0YXRzLmxvbmdlc3RTdHJlYWsgfSxcbiAgICAgICAgICAgIHsgbGFiZWw6IFwiVG90YWwgUXVlc3RzXCIsIHZhbHVlOiBzdGF0cy50b3RhbFF1ZXN0cyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBzdGF0c19pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RhdEJveCA9IHN0YXRzRGl2LmNyZWF0ZURpdigpO1xuICAgICAgICAgICAgc3RhdEJveC5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImJvcmRlcjogMXB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDhweDsgYm9yZGVyLXJhZGl1czogM3B4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMTkzLCA3LCAwLjEpO1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogaXRlbS5sYWJlbCB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjhlbTsgb3BhY2l0eTogMC43O1wiKTtcbiAgICAgICAgICAgIHN0YXRCb3guY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogU3RyaW5nKGl0ZW0udmFsdWUpIH0pLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIFwibWFyZ2luOiA1cHggMCAwIDA7IGZvbnQtc2l6ZTogMS4yZW07IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogI2ZmYzEwNztcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQm9zcyBwcm9ncmVzc1xuICAgICAgICBhbmFseXRpY3NEaXYuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiQm9zcyBNaWxlc3RvbmVzXCIgfSkuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW46IDEycHggMCA4cHggMDsgY29sb3I6ICNmZmMxMDc7XCIpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYm9zc2VzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYm9zc01pbGVzdG9uZXM7XG4gICAgICAgIGlmIChib3NzZXMgJiYgYm9zc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGJvc3Nlcy5mb3JFYWNoKChib3NzOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3NzSXRlbSA9IGFuYWx5dGljc0Rpdi5jcmVhdGVEaXYoKTtcbiAgICAgICAgICAgICAgICBib3NzSXRlbS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogNnB4IDA7IHBhZGRpbmc6IDhweDsgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjIpOyBib3JkZXItcmFkaXVzOiAzcHg7XCIpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGljb24gPSBib3NzLmRlZmVhdGVkID8gXCJPS1wiIDogYm9zcy51bmxvY2tlZCA/IFwiPj5cIiA6IFwiTE9DS1wiO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBib3NzSXRlbS5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBgWyR7aWNvbn1dIExldmVsICR7Ym9zcy5sZXZlbH06ICR7Ym9zcy5uYW1lfWAgfSk7XG4gICAgICAgICAgICAgICAgbmFtZS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBib3NzLmRlZmVhdGVkID8gXCJjb2xvcjogIzRjYWY1MDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCIgOiBib3NzLnVubG9ja2VkID8gXCJjb2xvcjogI2ZmYzEwNztcIiA6IFwib3BhY2l0eTogMC41O1wiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBXaW4gY29uZGl0aW9uXG4gICAgICAgIGlmIChzdGF0cy5nYW1lV29uKSB7XG4gICAgICAgICAgICBjb25zdCB3aW5EaXYgPSBhbmFseXRpY3NEaXYuY3JlYXRlRGl2KCk7XG4gICAgICAgICAgICB3aW5EaXYuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgXCJtYXJnaW4tdG9wOiAxMnB4OyBwYWRkaW5nOiAxMnB4OyBiYWNrZ3JvdW5kOiByZ2JhKDc2LCAxNzUsIDgwLCAwLjIpOyBib3JkZXI6IDJweCBzb2xpZCAjNGNhZjUwOyBib3JkZXItcmFkaXVzOiA0cHg7IHRleHQtYWxpZ246IGNlbnRlcjtcIik7XG4gICAgICAgICAgICB3aW5EaXYuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJHQU1FIFdPTiFcIiB9KS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcIm1hcmdpbjogMDsgZm9udC1zaXplOiAxLjJlbTsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjNGNhZjUwO1wiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0KHA6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWw6IHN0cmluZywgY2xzOiBzdHJpbmcgPSBcIlwiKSB7XG4gICAgICAgIGNvbnN0IGIgPSBwLmNyZWF0ZURpdih7IGNsczogXCJzaXN5LXN0YXQtYm94XCIgfSk7IFxuICAgICAgICBpZiAoY2xzKSBiLmFkZENsYXNzKGNscyk7XG4gICAgICAgIGIuY3JlYXRlRGl2KHsgdGV4dDogbGFiZWwsIGNsczogXCJzaXN5LXN0YXQtbGFiZWxcIiB9KTtcbiAgICAgICAgYi5jcmVhdGVEaXYoeyB0ZXh0OiB2YWwsIGNsczogXCJzaXN5LXN0YXQtdmFsXCIgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgb25DbG9zZSgpIHtcbiAgICAgICAgdGhpcy5wbHVnaW4uZW5naW5lLm9mZigndXBkYXRlJywgdGhpcy5yZWZyZXNoLmJpbmQodGhpcykpO1xuICAgIH1cbn1cbiIsImltcG9ydCB7IE5vdGljZSwgUGx1Z2luLCBURmlsZSwgV29ya3NwYWNlTGVhZiwgZGVib3VuY2UgfSBmcm9tICdvYnNpZGlhbic7XG5pbXBvcnQgeyBTaXN5cGh1c1NldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBTaXN5cGh1c0VuZ2luZSwgREVGQVVMVF9NT0RJRklFUiB9IGZyb20gJy4vZW5naW5lJztcbmltcG9ydCB7IEF1ZGlvQ29udHJvbGxlciB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHsgUGFub3B0aWNvblZpZXcsIFZJRVdfVFlQRV9QQU5PUFRJQ09OIH0gZnJvbSBcIi4vdWkvdmlld1wiO1xuaW1wb3J0IHsgUmVzZWFyY2hRdWVzdE1vZGFsLCBDaGFpbkJ1aWxkZXJNb2RhbCwgUmVzZWFyY2hMaXN0TW9kYWwsIFF1aWNrQ2FwdHVyZU1vZGFsIH0gZnJvbSBcIi4vdWkvbW9kYWxzXCI7XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNpc3lwaHVzU2V0dGluZ3MgPSB7XG4gICAgaHA6IDEwMCwgbWF4SHA6IDEwMCwgeHA6IDAsIGdvbGQ6IDAsIHhwUmVxOiAxMDAsIGxldmVsOiAxLCByaXZhbERtZzogMTAsXG4gICAgbGFzdExvZ2luOiBcIlwiLCBzaGllbGRlZFVudGlsOiBcIlwiLCByZXN0RGF5VW50aWw6IFwiXCIsIHNraWxsczogW10sXG4gICAgZGFpbHlNb2RpZmllcjogREVGQVVMVF9NT0RJRklFUiwgXG4gICAgbGVnYWN5OiB7IHNvdWxzOiAwLCBwZXJrczogeyBzdGFydEdvbGQ6IDAsIHN0YXJ0U2tpbGxQb2ludHM6IDAsIHJpdmFsRGVsYXk6IDAgfSwgcmVsaWNzOiBbXSwgZGVhdGhDb3VudDogMCB9LCBcbiAgICBtdXRlZDogZmFsc2UsIGhpc3Rvcnk6IFtdLCBydW5Db3VudDogMSwgbG9ja2Rvd25VbnRpbDogXCJcIiwgZGFtYWdlVGFrZW5Ub2RheTogMCxcbiAgICBkYWlseU1pc3Npb25zOiBbXSwgXG4gICAgZGFpbHlNaXNzaW9uRGF0ZTogXCJcIiwgXG4gICAgcXVlc3RzQ29tcGxldGVkVG9kYXk6IDAsIFxuICAgIHNraWxsVXNlc1RvZGF5OiB7fSxcbiAgICByZXNlYXJjaFF1ZXN0czogW10sXG4gICAgcmVzZWFyY2hTdGF0czogeyB0b3RhbFJlc2VhcmNoOiAwLCB0b3RhbENvbWJhdDogMCwgcmVzZWFyY2hDb21wbGV0ZWQ6IDAsIGNvbWJhdENvbXBsZXRlZDogMCB9LFxuICAgIGxhc3RSZXNlYXJjaFF1ZXN0SWQ6IDAsXG4gICAgbWVkaXRhdGlvbkN5Y2xlc0NvbXBsZXRlZDogMCxcbiAgICBxdWVzdERlbGV0aW9uc1RvZGF5OiAwLFxuICAgIGxhc3REZWxldGlvblJlc2V0OiBcIlwiLFxuICAgIGlzTWVkaXRhdGluZzogZmFsc2UsXG4gICAgbWVkaXRhdGlvbkNsaWNrc1RoaXNMb2NrZG93bjogMCxcbiAgICBhY3RpdmVDaGFpbnM6IFtdLFxuICAgIGNoYWluSGlzdG9yeTogW10sXG4gICAgY3VycmVudENoYWluSWQ6IFwiXCIsXG4gICAgY2hhaW5RdWVzdHNDb21wbGV0ZWQ6IDAsXG4gICAgcXVlc3RGaWx0ZXJzOiB7fSxcbiAgICBmaWx0ZXJTdGF0ZTogeyBhY3RpdmVFbmVyZ3k6IFwiYW55XCIsIGFjdGl2ZUNvbnRleHQ6IFwiYW55XCIsIGFjdGl2ZVRhZ3M6IFtdIH0sXG4gICAgZGF5TWV0cmljczogW10sXG4gICAgd2Vla2x5UmVwb3J0czogW10sXG4gICAgYm9zc01pbGVzdG9uZXM6IFtdLFxuICAgIHN0cmVhazogeyBjdXJyZW50OiAwLCBsb25nZXN0OiAwLCBsYXN0RGF0ZTogXCJcIiB9LFxuICAgIGFjaGlldmVtZW50czogW10sXG4gICAgZ2FtZVdvbjogZmFsc2Vcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2lzeXBodXNQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBTaXN5cGh1c1NldHRpbmdzO1xuICAgIHN0YXR1c0Jhckl0ZW06IEhUTUxFbGVtZW50O1xuICAgIGVuZ2luZTogU2lzeXBodXNFbmdpbmU7XG4gICAgYXVkaW86IEF1ZGlvQ29udHJvbGxlcjtcblxuICAgIGFzeW5jIG9ubG9hZCgpIHtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IFxuICAgICAgICAgICAgaWQ6ICdhY2NlcHQtZGVhdGgnLCBcbiAgICAgICAgICAgIG5hbWU6ICdBQ0NFUFQgREVBVEggKFJlc2V0IFJ1biknLCBcbiAgICAgICAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS50cmlnZ2VyRGVhdGgoKSBcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgXG4gICAgICAgICAgICBpZDogJ3Jlcm9sbC1jaGFvcycsIFxuICAgICAgICAgICAgbmFtZTogJ1Jlcm9sbCBDaGFvcycsIFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnJvbGxDaGFvcyh0cnVlKSBcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBpZDogJ3F1aWNrLWNhcHR1cmUnLFxuICAgICAgICAgICAgbmFtZTogJ1F1aWNrIENhcHR1cmUgKFNjcmFwKScsXG4gICAgICAgICAgICBjYWxsYmFjazogKCkgPT4gbmV3IFF1aWNrQ2FwdHVyZU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKClcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdnZW5lcmF0ZS1za2lsbC1ncmFwaCcsXG4gICAgICAgICAgICBuYW1lOiAnTmV1cmFsIEh1YjogR2VuZXJhdGUgU2tpbGwgR3JhcGgnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLmdlbmVyYXRlU2tpbGxHcmFwaCgpXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5sb2FkU3R5bGVzKCk7XG4gICAgICAgIHRoaXMuYXVkaW8gPSBuZXcgQXVkaW9Db250cm9sbGVyKHRoaXMuc2V0dGluZ3MubXV0ZWQpO1xuICAgICAgICB0aGlzLmVuZ2luZSA9IG5ldyBTaXN5cGh1c0VuZ2luZSh0aGlzLmFwcCwgdGhpcywgdGhpcy5hdWRpbyk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlclZpZXcoVklFV19UWVBFX1BBTk9QVElDT04sIChsZWFmKSA9PiBuZXcgUGFub3B0aWNvblZpZXcobGVhZiwgdGhpcykpO1xuXG4gICAgICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xuICAgICAgICAod2luZG93IGFzIGFueSkuc2lzeXBodXNFbmdpbmUgPSB0aGlzLmVuZ2luZTtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuZW5naW5lLmNoZWNrRGFpbHlMb2dpbigpO1xuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xuXG4gICAgICAgIC8vIC0tLSBDT01NQU5EUyAtLS1cbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdvcGVuLXBhbm9wdGljb24nLCBuYW1lOiAnT3BlbiBQYW5vcHRpY29uJywgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndG9nZ2xlLWZvY3VzJywgbmFtZTogJ1RvZ2dsZSBGb2N1cyBBdWRpbycsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmF1ZGlvLnRvZ2dsZUJyb3duTm9pc2UoKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdjcmVhdGUtcmVzZWFyY2gnLCBuYW1lOiAnUmVzZWFyY2g6IENyZWF0ZSBRdWVzdCcsIGNhbGxiYWNrOiAoKSA9PiBuZXcgUmVzZWFyY2hRdWVzdE1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAndmlldy1yZXNlYXJjaCcsIG5hbWU6ICdSZXNlYXJjaDogVmlldyBMaWJyYXJ5JywgY2FsbGJhY2s6ICgpID0+IG5ldyBSZXNlYXJjaExpc3RNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ21lZGl0YXRlJywgbmFtZTogJ01lZGl0YXRpb246IFN0YXJ0JywgY2FsbGJhY2s6ICgpID0+IHRoaXMuZW5naW5lLnN0YXJ0TWVkaXRhdGlvbigpIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NyZWF0ZS1jaGFpbicsIG5hbWU6ICdDaGFpbnM6IENyZWF0ZScsIGNhbGxiYWNrOiAoKSA9PiBuZXcgQ2hhaW5CdWlsZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMpLm9wZW4oKSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICd2aWV3LWNoYWlucycsIG5hbWU6ICdDaGFpbnM6IFZpZXcgQWN0aXZlJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgYyA9IHRoaXMuZW5naW5lLmdldEFjdGl2ZUNoYWluKCk7IG5ldyBOb3RpY2UoYyA/IGBBY3RpdmU6ICR7Yy5uYW1lfWAgOiBcIk5vIGFjdGl2ZSBjaGFpblwiKTsgfSB9KTtcbiAgICAgICAgdGhpcy5hZGRDb21tYW5kKHsgaWQ6ICdmaWx0ZXItaGlnaCcsIG5hbWU6ICdGaWx0ZXJzOiBIaWdoIEVuZXJneScsIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmVuZ2luZS5zZXRGaWx0ZXJTdGF0ZShcImhpZ2hcIiwgXCJhbnlcIiwgW10pIH0pO1xuICAgICAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogJ2NsZWFyLWZpbHRlcnMnLCBuYW1lOiAnRmlsdGVyczogQ2xlYXInLCBjYWxsYmFjazogKCkgPT4gdGhpcy5lbmdpbmUuY2xlYXJGaWx0ZXJzKCkgfSk7XG4gICAgICAgIHRoaXMuYWRkQ29tbWFuZCh7IGlkOiAnZ2FtZS1zdGF0cycsIG5hbWU6ICdBbmFseXRpY3M6IFN0YXRzJywgY2FsbGJhY2s6ICgpID0+IHsgY29uc3QgcyA9IHRoaXMuZW5naW5lLmdldEdhbWVTdGF0cygpOyBuZXcgTm90aWNlKGBMdmwgJHtzLmxldmVsfSB8IFN0cmVhayAke3MuY3VycmVudFN0cmVha31gKTsgfSB9KTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuYWRkUmliYm9uSWNvbignc2t1bGwnLCAnU2lzeXBodXMgU2lkZWJhcicsICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkpO1xuICAgICAgICB0aGlzLnJlZ2lzdGVySW50ZXJ2YWwod2luZG93LnNldEludGVydmFsKCgpID0+IHRoaXMuZW5naW5lLmNoZWNrRGVhZGxpbmVzKCksIDYwMDAwKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBbRklYXSBEZWJvdW5jZWQgV29yZCBDb3VudGVyIChUeXBld3JpdGVyIEZpeClcbiAgICAgICAgY29uc3QgZGVib3VuY2VkVXBkYXRlID0gZGVib3VuY2UoKGZpbGU6IFRGaWxlLCBjb250ZW50OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gICAgICAgICAgICBpZiAoY2FjaGU/LmZyb250bWF0dGVyPy5yZXNlYXJjaF9pZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHdvcmRzID0gY29udGVudC50cmltKCkuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmdpbmUudXBkYXRlUmVzZWFyY2hXb3JkQ291bnQoY2FjaGUuZnJvbnRtYXR0ZXIucmVzZWFyY2hfaWQsIHdvcmRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTAwMCwgdHJ1ZSk7XG5cbiAgICAgICAgdGhpcy5yZWdpc3RlckV2ZW50KHRoaXMuYXBwLndvcmtzcGFjZS5vbignZWRpdG9yLWNoYW5nZScsIChlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgICAgIGlmICghaW5mbyB8fCAhaW5mby5maWxlKSByZXR1cm47XG4gICAgICAgICAgICBkZWJvdW5jZWRVcGRhdGUoaW5mby5maWxlLCBlZGl0b3IuZ2V0VmFsdWUoKSk7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2FkU3R5bGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3NzRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm1hbmlmZXN0LmRpciArIFwiL3N0eWxlcy5jc3NcIik7XG4gICAgICAgICAgICBpZiAoY3NzRmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3NzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChjc3NGaWxlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICBzdHlsZS5pZCA9IFwic2lzeXBodXMtc3R5bGVzXCI7XG4gICAgICAgICAgICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY3NzO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7IGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgbG9hZCBzdHlsZXMuY3NzXCIsIGUpOyB9XG4gICAgfVxuXG4gICAgYXN5bmMgb251bmxvYWQoKSB7XG4gICAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZih0aGlzLmF1ZGlvLmF1ZGlvQ3R4KSB0aGlzLmF1ZGlvLmF1ZGlvQ3R4LmNsb3NlKCk7XG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaXN5cGh1cy1zdHlsZXNcIik7XG4gICAgICAgIGlmIChzdHlsZSkgc3R5bGUucmVtb3ZlKCk7XG4gICAgfVxuXG4gICAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgICAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGNvbnN0IGxlYXZlcyA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFX1BBTk9QVElDT04pO1xuICAgICAgICBpZiAobGVhdmVzLmxlbmd0aCA+IDApIGxlYWYgPSBsZWF2ZXNbMF07XG4gICAgICAgIGVsc2UgeyBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSk7IGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFX1BBTk9QVElDT04sIGFjdGl2ZTogdHJ1ZSB9KTsgfVxuICAgICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG5cbiAgICB1cGRhdGVTdGF0dXNCYXIoKSB7XG4gICAgICAgIGNvbnN0IHNoaWVsZCA9ICh0aGlzLmVuZ2luZS5pc1NoaWVsZGVkKCkgfHwgdGhpcy5lbmdpbmUuaXNSZXN0aW5nKCkpID8gKHRoaXMuZW5naW5lLmlzUmVzdGluZygpID8gXCJEXCIgOiBcIlNcIikgOiBcIlwiO1xuICAgICAgICBjb25zdCBtQ291bnQgPSB0aGlzLnNldHRpbmdzLmRhaWx5TWlzc2lvbnMuZmlsdGVyKG0gPT4gbS5jb21wbGV0ZWQpLmxlbmd0aDtcbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtLnNldFRleHQoYCR7dGhpcy5zZXR0aW5ncy5kYWlseU1vZGlmaWVyLmljb259ICR7c2hpZWxkfSBIUCR7dGhpcy5zZXR0aW5ncy5ocH0gRyR7dGhpcy5zZXR0aW5ncy5nb2xkfSBNJHttQ291bnR9LzNgKTtcbiAgICAgICAgdGhpcy5zdGF0dXNCYXJJdGVtLnN0eWxlLmNvbG9yID0gdGhpcy5zZXR0aW5ncy5ocCA8IDMwID8gXCJyZWRcIiA6IHRoaXMuc2V0dGluZ3MuZ29sZCA8IDAgPyBcIm9yYW5nZVwiIDogXCJcIjtcbiAgICB9XG4gICAgXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkgeyB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTsgfVxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHsgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTsgfVxufVxuIl0sIm5hbWVzIjpbIk5vdGljZSIsIm1vbWVudCIsIk1vZGFsIiwiU2V0dGluZyIsIlRGb2xkZXIiLCJURmlsZSIsIkl0ZW1WaWV3IiwiUGx1Z2luIiwiZGVib3VuY2UiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQWtHQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FB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
