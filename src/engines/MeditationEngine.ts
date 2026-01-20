import { moment } from 'obsidian';
import { SisyphusSettings } from './types';

/**
 * DLC 3: Meditation & Recovery Engine
 * Handles lockdown state, meditation healing, and quest deletion quota
 * 
 * ISOLATED: Only reads/writes to lockdownUntil, isMeditating, meditationClicksThisLockdown, 
 *           questDeletionsToday, lastDeletionReset
 * DEPENDENCIES: moment, SisyphusSettings
 * SIDE EFFECTS: Plays audio (432 Hz tone)
 */
export class MeditationEngine {
    settings: SisyphusSettings;
    audioController?: any; // Optional for 432 Hz sound
    private meditationCooldownMs = 30000; // 30 seconds

    constructor(settings: SisyphusSettings, audioController?: any) {
        this.settings = settings;
        this.audioController = audioController;
    }

    /**
     * Check if currently locked down
     */
    isLockedDown(): boolean {
        if (!this.settings.lockdownUntil) return false;
        return moment().isBefore(moment(this.settings.lockdownUntil));
    }

    /**
     * Get lockdown time remaining in minutes
     */
    getLockdownTimeRemaining(): { hours: number; minutes: number; totalMinutes: number } {
        if (!this.isLockedDown()) {
            return { hours: 0, minutes: 0, totalMinutes: 0 };
        }
        
        const totalMinutes = moment(this.settings.lockdownUntil).diff(moment(), 'minutes');
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return { hours, minutes, totalMinutes };
    }

    /**
     * Trigger lockdown after taking 50+ damage
     */
    triggerLockdown() {
        this.settings.lockdownUntil = moment().add(6, 'hours').toISOString();
        this.settings.meditationClicksThisLockdown = 0;
    }

    /**
     * Perform one meditation cycle (click)
     * Returns: { success, cyclesDone, cyclesRemaining, message }
     */
    meditate(): { success: boolean; cyclesDone: number; cyclesRemaining: number; message: string; lockdownReduced: boolean } {
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
        let lockdownReduced = false;
        
        // Check if 10 cycles complete
        if (this.settings.meditationClicksThisLockdown >= 10) {
            const reducedTime = moment(this.settings.lockdownUntil).subtract(5, 'hours');
            this.settings.lockdownUntil = reducedTime.toISOString();
            this.settings.meditationClicksThisLockdown = 0;
            lockdownReduced = true;
            
            if (this.audioController?.playSound) {
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
    private playMeditationSound() {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        } catch (e) {
            console.log("Audio not available for meditation");
        }
    }

    /**
     * Get meditation status for current lockdown
     */
    getMeditationStatus(): { cyclesDone: number; cyclesRemaining: number; timeReduced: number } {
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
    private ensureDeletionQuotaReset() {
        const today = moment().format("YYYY-MM-DD");
        
        if (this.settings.lastDeletionReset !== today) {
            this.settings.lastDeletionReset = today;
            this.settings.questDeletionsToday = 0;
        }
    }

    /**
     * Check if user has free deletions left today
     */
    canDeleteQuestFree(): boolean {
        this.ensureDeletionQuotaReset();
        return this.settings.questDeletionsToday < 3;
    }

    /**
     * Get deletion quota status
     */
    getDeletionQuota(): { free: number; paid: number; remaining: number } {
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
    applyDeletionCost(): { cost: number; message: string } {
        this.ensureDeletionQuotaReset();
        
        let cost = 0;
        let message = "";
        
        if (this.settings.questDeletionsToday >= 3) {
            // Paid deletion
            cost = 10;
            message = `Quest deleted. Cost: -${cost}g`;
        } else {
            // Free deletion
            const remaining = 3 - this.settings.questDeletionsToday;
            message = `Quest deleted. (${remaining - 1} free deletions remaining)`;
        }
        
        this.settings.questDeletionsToday++;
        this.settings.gold -= cost;
        
        return { cost, message };
    }
}
