import type confetti from 'canvas-confetti';

let confettiFn: typeof confetti | null = null;

async function getConfetti() {
	if (!confettiFn) {
		const mod = await import('canvas-confetti');
		confettiFn = (mod.default || mod) as typeof confetti;
	}
	return confettiFn;
}

/**
 * Fires a celebratory burst of confetti when an individual station code is successfully unlocked.
 */
export async function fireUnlockConfetti() {
	if (typeof window === 'undefined') return;

	try {
		const fire = await getConfetti();
		fire({
			particleCount: 55,
			spread: 65,
			origin: { y: 0.65 },
			colors: ['#10b981', '#f59e0b', '#38bdf8', '#fbbf24', '#ffffff'],
			disableForReducedMotion: true,
			zIndex: 9999
		});
	} catch (err) {
		console.warn('[Confetti] Failed to load confetti:', err);
	}
}

/**
 * Fires a grand multi-stage confetti celebration when all station codes are unlocked and the game is finished.
 */
export async function fireVictoryCelebration() {
	if (typeof window === 'undefined') return;

	try {
		const fire = await getConfetti();

		// Center burst
		fire({
			particleCount: 90,
			spread: 100,
			origin: { y: 0.5 },
			colors: ['#10b981', '#f59e0b', '#34d399', '#fbbf24', '#ffffff', '#a855f7'],
			zIndex: 9999
		});

		// Left cannon
		setTimeout(() => {
			fire({
				particleCount: 75,
				angle: 60,
				spread: 55,
				origin: { x: 0.05, y: 0.8 },
				colors: ['#10b981', '#f59e0b', '#38bdf8', '#34d399'],
				zIndex: 9999
			});
		}, 250);

		// Right cannon
		setTimeout(() => {
			fire({
				particleCount: 75,
				angle: 120,
				spread: 55,
				origin: { x: 0.95, y: 0.8 },
				colors: ['#10b981', '#f59e0b', '#ec4899', '#fbbf24'],
				zIndex: 9999
			});
		}, 450);

		// Grand finale shower
		setTimeout(() => {
			fire({
				particleCount: 130,
				spread: 120,
				origin: { y: 0.35 },
				colors: ['#10b981', '#f59e0b', '#38bdf8', '#ffffff', '#fbbf24', '#34d399'],
				zIndex: 9999
			});
		}, 800);
	} catch (err) {
		console.warn('[Confetti] Failed to load victory celebration:', err);
	}
}
