export type SoundEffect = 'click' | 'clunk' | 'ratchet' | 'beep' | 'success' | 'error' | 'victory';

class SoundEngine {
	private audioCtx: AudioContext | null = null;
	private unlocked = false;
	private muted = false;

	constructor() {
		if (typeof window !== 'undefined') {
			this.setupUnlockListeners();
		}
	}

	private getAudioContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.audioCtx) {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				this.audioCtx = new AudioContextClass();
			}
		}
		return this.audioCtx;
	}

	/**
	 * Safe audio-context unlocking for iOS Safari and mobile Chrome.
	 * Listens to first user gesture (pointerdown/touchstart/click).
	 */
	private setupUnlockListeners() {
		const unlock = () => {
			if (this.unlocked) return;

			// Unlock Web Audio API context
			const ctx = this.getAudioContext();
			if (ctx && ctx.state === 'suspended') {
				ctx.resume().catch((e) => console.warn('AudioContext resume failed:', e));
			}

			this.unlocked = true;

			// Clean up listeners
			window.removeEventListener('touchstart', unlock);
			window.removeEventListener('touchend', unlock);
			window.removeEventListener('pointerdown', unlock);
			window.removeEventListener('click', unlock);
		};

		window.addEventListener('touchstart', unlock, { passive: true, once: true });
		window.addEventListener('touchend', unlock, { passive: true, once: true });
		window.addEventListener('pointerdown', unlock, { passive: true, once: true });
		window.addEventListener('click', unlock, { passive: true, once: true });
	}

	/**
	 * Tactile haptic feedback patterns using navigator.vibrate()
	 */
	public vibrate(pattern: number | number[]) {
		if (typeof window === 'undefined') return;
		if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
			try {
				navigator.vibrate(pattern);
			} catch {
				// Vibration disabled or not permitted
			}
		}
	}

	/**
	 * Procedural audio generation using Web Audio API oscillators and gain envelopes.
	 * Ensures crisp, tactile escape room game feel without external asset dependencies.
	 */
	private playSyntheticSound(type: SoundEffect) {
		const ctx = this.getAudioContext();
		if (!ctx) return;

		if (ctx.state === 'suspended') {
			ctx.resume();
		}

		const now = ctx.currentTime;

		switch (type) {
			case 'click': {
				// Sharp, micro mechanical switch snap
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.setValueAtTime(1400, now);
				osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

				gain.gain.setValueAtTime(0.35, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.035);
				break;
			}

			case 'ratchet': {
				// High-frequency mechanical gear tooth click
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'triangle';
				osc.frequency.setValueAtTime(2200, now);
				osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);

				gain.gain.setValueAtTime(0.25, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.025);
				break;
			}

			case 'clunk': {
				// Heavy metallic tumbler drop / solenoid latch
				const osc1 = ctx.createOscillator();
				const osc2 = ctx.createOscillator();
				const gain = ctx.createGain();

				osc1.type = 'triangle';
				osc1.frequency.setValueAtTime(180, now);
				osc1.frequency.exponentialRampToValueAtTime(45, now + 0.12);

				osc2.type = 'square';
				osc2.frequency.setValueAtTime(90, now);
				osc2.frequency.exponentialRampToValueAtTime(30, now + 0.1);

				gain.gain.setValueAtTime(0.4, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

				osc1.connect(gain);
				osc2.connect(gain);
				gain.connect(ctx.destination);

				osc1.start(now);
				osc2.start(now);
				osc1.stop(now + 0.14);
				osc2.stop(now + 0.14);
				break;
			}

			case 'beep': {
				// Tactical retro HUD tone
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.type = 'sine';
				osc.frequency.setValueAtTime(880, now);

				gain.gain.setValueAtTime(0.2, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(now);
				osc.stop(now + 0.085);
				break;
			}

			case 'success': {
				// Harmonious cyber victory chord (C5 -> E5 -> G5 -> C6)
				const freqs = [523.25, 659.25, 783.99, 1046.5];
				freqs.forEach((freq, idx) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					const noteStart = now + idx * 0.09;

					osc.type = 'sine';
					osc.frequency.setValueAtTime(freq, noteStart);

					gain.gain.setValueAtTime(0.001, noteStart);
					gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
					gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(noteStart);
					osc.stop(noteStart + 0.55);
				});
				break;
			}

			case 'error': {
				// Low dual-sawtooth lockout buzz
				const osc1 = ctx.createOscillator();
				const osc2 = ctx.createOscillator();
				const gain = ctx.createGain();

				osc1.type = 'sawtooth';
				osc1.frequency.setValueAtTime(140, now);

				osc2.type = 'sawtooth';
				osc2.frequency.setValueAtTime(136, now); // 4Hz beating dissonance

				gain.gain.setValueAtTime(0.3, now);
				gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

				osc1.connect(gain);
				osc2.connect(gain);
				gain.connect(ctx.destination);

				osc1.start(now);
				osc2.start(now);
				osc1.stop(now + 0.3);
				osc2.stop(now + 0.3);
				break;
			}

			case 'victory': {
				// Grand celebratory triumph fanfare (C4 -> E4 -> G4 -> C5 -> G5 -> C6 grand major chord)
				const fanfareNotes = [
					{ f: 261.63, time: 0, dur: 0.18, vol: 0.3 },
					{ f: 329.63, time: 0.14, dur: 0.18, vol: 0.3 },
					{ f: 392.00, time: 0.28, dur: 0.18, vol: 0.35 },
					{ f: 523.25, time: 0.42, dur: 0.35, vol: 0.4 },
					{ f: 659.25, time: 0.72, dur: 0.2, vol: 0.35 },
					{ f: 783.99, time: 0.90, dur: 0.2, vol: 0.4 },
					{ f: 1046.50, time: 1.08, dur: 1.5, vol: 0.45 }
				];

				fanfareNotes.forEach((n) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					const noteStart = now + n.time;

					osc.type = 'triangle';
					osc.frequency.setValueAtTime(n.f, noteStart);

					gain.gain.setValueAtTime(0.001, noteStart);
					gain.gain.linearRampToValueAtTime(n.vol, noteStart + 0.02);
					gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + n.dur);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(noteStart);
					osc.stop(noteStart + n.dur + 0.05);
				});

				// Full sustained major chord at resolution
				const chordFreqs = [523.25, 659.25, 783.99, 1046.5];
				chordFreqs.forEach((f) => {
					const osc = ctx.createOscillator();
					const gain = ctx.createGain();
					const chordStart = now + 1.08;

					osc.type = 'sine';
					osc.frequency.setValueAtTime(f, chordStart);

					gain.gain.setValueAtTime(0.001, chordStart);
					gain.gain.linearRampToValueAtTime(0.2, chordStart + 0.04);
					gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 1.6);

					osc.connect(gain);
					gain.connect(ctx.destination);
					osc.start(chordStart);
					osc.stop(chordStart + 1.65);
				});
				break;
			}
		}
	}

	/**
	 * Plays a sound effect with matching haptic feedback.
	 */
	public play(type: SoundEffect) {
		if (this.muted) return;

		// Haptic vibration feedback corresponding to tactile feel
		switch (type) {
			case 'click':
				this.vibrate(15);
				break;
			case 'ratchet':
				this.vibrate(10);
				break;
			case 'clunk':
				this.vibrate([40, 20, 30]);
				break;
			case 'beep':
				this.vibrate(25);
				break;
			case 'success':
				this.vibrate([60, 40, 100, 40, 200]);
				break;
			case 'error':
				this.vibrate([120, 60, 120, 60, 250]);
				break;
			case 'victory':
				this.vibrate([100, 60, 100, 60, 150, 80, 400]);
				break;
		}

		if (!this.muted) {
			this.playSyntheticSound(type);
		}
	}

	public toggleMute(): boolean {
		this.muted = !this.muted;
		return this.muted;
	}

	public isMuted(): boolean {
		return this.muted;
	}
}

export const audio = new SoundEngine();
