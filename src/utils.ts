import { Notice } from 'obsidian';

// EVENT BUS SYSTEM
export class TinyEmitter {
    private listeners: { [key: string]: Function[] } = {};

    on(event: string, fn: Function) {
        (this.listeners[event] = this.listeners[event] || []).push(fn);
    }

    off(event: string, fn: Function) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
    }

    trigger(event: string, data?: any) {
        (this.listeners[event] || []).forEach(fn => fn(data));
    }
}

export class AudioController {
    audioCtx: AudioContext | null = null;
    brownNoiseNode: ScriptProcessorNode | null = null;
    muted: boolean = false;

    constructor(muted: boolean) { this.muted = muted; }

    setMuted(muted: boolean) { this.muted = muted; }

    initAudio() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); }

    playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
        if (this.muted) return;
        this.initAudio();
        const osc = this.audioCtx!.createOscillator();
        const gain = this.audioCtx!.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx!.destination);
        osc.start();
        gain.gain.setValueAtTime(vol, this.audioCtx!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx!.currentTime + duration);
        osc.stop(this.audioCtx!.currentTime + duration);
    }

    playSound(type: "success"|"fail"|"death"|"click"|"heartbeat"|"meditate") {
        if (type === "success") { this.playTone(600, "sine", 0.1); setTimeout(() => this.playTone(800, "sine", 0.2), 100); }
        else if (type === "fail") { this.playTone(150, "sawtooth", 0.4); setTimeout(() => this.playTone(100, "sawtooth", 0.4), 150); }
        else if (type === "death") { this.playTone(50, "square", 1.0); }
        else if (type === "click") { this.playTone(800, "sine", 0.05); }
        else if (type === "heartbeat") { this.playTone(60, "sine", 0.1, 0.5); setTimeout(()=>this.playTone(50, "sine", 0.1, 0.4), 150); }
        else if (type === "meditate") { this.playTone(432, "sine", 2.0, 0.05); }
    }

    toggleBrownNoise() {
        this.initAudio();
        if (this.brownNoiseNode) { 
            this.brownNoiseNode.disconnect(); 
            this.brownNoiseNode = null; 
            new Notice("Focus Audio: OFF"); 
        } else {
            const bufferSize = 4096; 
            this.brownNoiseNode = this.audioCtx!.createScriptProcessor(bufferSize, 1, 1);
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
            this.brownNoiseNode.connect(this.audioCtx!.destination);
            new Notice("Focus Audio: ON (Brown Noise)");
        }
    }
}
