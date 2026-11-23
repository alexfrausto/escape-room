/**
 * Mission: Impossible Tactical VFX Engine
 * Replaces confetti with high-impact HTML5 Canvas shockwaves, volumetric light beams,
 * sweeping laser shafts, and incandescent fuse-spark explosions.
 */

interface SparkParticle {
	x: number;
	y: number;
	prevX: number;
	prevY: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	alpha: number;
	decay: number;
	drag: number;
	gravity: number;
	flicker: boolean;
}

interface ShockwaveRing {
	x: number;
	y: number;
	radius: number;
	maxRadius: number;
	lineWidth: number;
	color: string;
	alpha: number;
	speed: number;
}

interface LightBeam {
	originX: number;
	originY: number;
	angle: number;
	angularVelocity: number;
	length: number;
	spread: number; // half-angle in radians
	color: string;
	alpha: number;
	maxAlpha: number;
	life: number;
	maxLife: number;
}

interface CoreFlash {
	x: number;
	y: number;
	radius: number;
	color: string;
	alpha: number;
	decay: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animFrameId: number | null = null;
let lastTimestamp = 0;

let sparks: SparkParticle[] = [];
let rings: ShockwaveRing[] = [];
let beams: LightBeam[] = [];
let flashes: CoreFlash[] = [];

function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ensureCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
	if (typeof window === 'undefined' || typeof document === 'undefined') return null;

	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.setAttribute('aria-hidden', 'true');
		Object.assign(canvas.style, {
			position: 'fixed',
			inset: '0',
			width: '100vw',
			height: '100vh',
			pointerEvents: 'none',
			zIndex: '9999'
		});
		document.body.appendChild(canvas);
		ctx = canvas.getContext('2d');
	}

	if (!ctx) return null;

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const width = window.innerWidth;
	const height = window.innerHeight;

	if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);
	}

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return { canvas, ctx };
}

function teardownCanvas() {
	if (animFrameId !== null) {
		cancelAnimationFrame(animFrameId);
		animFrameId = null;
	}
	if (canvas && canvas.parentNode) {
		canvas.parentNode.removeChild(canvas);
	}
	canvas = null;
	ctx = null;
	lastTimestamp = 0;
}

function startLoop() {
	if (animFrameId !== null) return;
	lastTimestamp = performance.now();
	animFrameId = requestAnimationFrame(renderFrame);
}

function renderFrame(now: number) {
	const env = ensureCanvas();
	if (!env) {
		teardownCanvas();
		return;
	}

	const { ctx: c } = env;
	const width = window.innerWidth;
	const height = window.innerHeight;
	const dt = Math.min((now - lastTimestamp) / 16.6667, 2.5); // normalized to ~60fps
	lastTimestamp = now;

	c.clearRect(0, 0, width, height);
	c.save();
	c.globalCompositeOperation = 'lighter';

	// 1. Render core flashes
	for (let i = flashes.length - 1; i >= 0; i--) {
		const f = flashes[i];
		f.alpha -= f.decay * dt;
		f.radius += 6 * dt;

		if (f.alpha <= 0.01) {
			flashes.splice(i, 1);
			continue;
		}

		const grad = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
		grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, f.alpha * 1.15)})`);
		grad.addColorStop(0.3, hexToRgba(f.color, f.alpha * 0.75));
		grad.addColorStop(1, hexToRgba(f.color, 0));

		c.fillStyle = grad;
		c.beginPath();
		c.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
		c.fill();
	}

	// 2. Render volumetric light beams / sweeping lasers
	for (let i = beams.length - 1; i >= 0; i--) {
		const b = beams[i];
		b.life += dt;
		b.angle += b.angularVelocity * dt;

		if (b.life >= b.maxLife) {
			beams.splice(i, 1);
			continue;
		}

		const progress = b.life / b.maxLife;
		// Quick attack, smooth cinematic fade-out
		const envelope = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
		b.alpha = b.maxAlpha * Math.max(0, envelope);

		const x1 = b.originX + Math.cos(b.angle - b.spread) * b.length;
		const y1 = b.originY + Math.sin(b.angle - b.spread) * b.length;
		const x2 = b.originX + Math.cos(b.angle + b.spread) * b.length;
		const y2 = b.originY + Math.sin(b.angle + b.spread) * b.length;

		const endX = b.originX + Math.cos(b.angle) * b.length;
		const endY = b.originY + Math.sin(b.angle) * b.length;

		const grad = c.createLinearGradient(b.originX, b.originY, endX, endY);
		grad.addColorStop(0, hexToRgba('#ffffff', b.alpha * 0.9));
		grad.addColorStop(0.25, hexToRgba(b.color, b.alpha * 0.75));
		grad.addColorStop(1, hexToRgba(b.color, 0));

		c.fillStyle = grad;
		c.beginPath();
		c.moveTo(b.originX, b.originY);
		c.lineTo(x1, y1);
		c.lineTo(x2, y2);
		c.closePath();
		c.fill();
	}

	// 3. Render expanding shockwave rings
	for (let i = rings.length - 1; i >= 0; i--) {
		const r = rings[i];
		const remaining = Math.max(0.05, 1 - r.radius / r.maxRadius);
		r.radius += r.speed * (0.45 + remaining * 0.85) * dt;
		r.alpha = Math.max(0, remaining * 0.9);
		r.lineWidth = Math.max(1, r.lineWidth * (1 - 0.025 * dt));

		if (r.radius >= r.maxRadius || r.alpha <= 0.01) {
			rings.splice(i, 1);
			continue;
		}

		c.save();
		c.strokeStyle = hexToRgba(r.color, r.alpha);
		c.lineWidth = r.lineWidth;
		c.shadowBlur = 18;
		c.shadowColor = r.color;
		c.beginPath();
		c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
		c.stroke();
		c.restore();
	}

	// 4. Render incandescent sparks & fuse embers
	for (let i = sparks.length - 1; i >= 0; i--) {
		const p = sparks[i];
		p.prevX = p.x;
		p.prevY = p.y;

		p.vx *= Math.pow(p.drag, dt);
		p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.alpha -= p.decay * dt;

		if (p.alpha <= 0.02) {
			sparks.splice(i, 1);
			continue;
		}

		const flickerAlpha = p.flicker ? p.alpha * (0.65 + Math.random() * 0.35) : p.alpha;

		c.strokeStyle = hexToRgba(p.color, flickerAlpha);
		c.lineWidth = p.size;
		c.lineCap = 'round';
		c.beginPath();
		c.moveTo(p.prevX, p.prevY);
		c.lineTo(p.x, p.y);
		c.stroke();

		// Hot white spark head
		if (p.size >= 2) {
			c.fillStyle = `rgba(255, 255, 255, ${flickerAlpha * 0.8})`;
			c.beginPath();
			c.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
			c.fill();
		}
	}

	c.restore();

	if (sparks.length > 0 || rings.length > 0 || beams.length > 0 || flashes.length > 0) {
		animFrameId = requestAnimationFrame(renderFrame);
	} else {
		teardownCanvas();
	}
}

function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace('#', '');
	const bigint = parseInt(clean, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function spawnDetonation(opts: {
	x: number;
	y: number;
	sparkCount: number;
	beamCount: number;
	colors: string[];
	ringColor: string;
	flashColor: string;
	scale?: number;
}) {
	const scale = opts.scale ?? 1;
	const maxDim = Math.max(window.innerWidth, window.innerHeight);

	// Core flash
	flashes.push({
		x: opts.x,
		y: opts.y,
		radius: 65 * scale,
		color: opts.flashColor,
		alpha: 0.72,
		decay: 0.038
	});

	// Primary & secondary shockwave rings
	rings.push({
		x: opts.x,
		y: opts.y,
		radius: 14,
		maxRadius: maxDim * 0.42 * scale,
		lineWidth: 6 * scale,
		color: opts.ringColor,
		alpha: 0.9,
		speed: 14 * scale
	});

	rings.push({
		x: opts.x,
		y: opts.y,
		radius: 6,
		maxRadius: maxDim * 0.28 * scale,
		lineWidth: 3 * scale,
		color: '#bae6fd',
		alpha: 0.88,
		speed: 9.5 * scale
	});

	// Radial volumetric light beams
	for (let i = 0; i < opts.beamCount; i++) {
		const baseAngle = (Math.PI * 2 * i) / opts.beamCount + (Math.random() - 0.5) * 0.25;
		const color = opts.colors[i % opts.colors.length];
		beams.push({
			originX: opts.x,
			originY: opts.y,
			angle: baseAngle,
			angularVelocity: (Math.random() - 0.5) * 0.012,
			length: maxDim * (0.55 + Math.random() * 0.55) * scale,
			spread: 0.025 + Math.random() * 0.055,
			color,
			alpha: 0,
			maxAlpha: 0.24 + Math.random() * 0.2,
			life: 0,
			maxLife: 28 + Math.random() * 24
		});
	}

	// Incandescent sparks & fuse embers
	for (let i = 0; i < opts.sparkCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const speed = (4 + Math.random() * 14) * scale;
		const color = opts.colors[Math.floor(Math.random() * opts.colors.length)];
		sparks.push({
			x: opts.x,
			y: opts.y,
			prevX: opts.x,
			prevY: opts.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 1.5 * scale,
			size: 1.5 + Math.random() * 2.5,
			color,
			alpha: 0.95 + Math.random() * 0.05,
			decay: 0.014 + Math.random() * 0.018,
			drag: 0.945 + Math.random() * 0.025,
			gravity: 0.14 + Math.random() * 0.12,
			flicker: Math.random() > 0.35
		});
	}
}

function spawnSweepingLasers(
	originX: number,
	originY: number,
	angles: number[],
	color: string,
	angularVelocity: number
) {
	const maxDim = Math.hypot(window.innerWidth, window.innerHeight);
	for (const angle of angles) {
		beams.push({
			originX,
			originY,
			angle,
			angularVelocity,
			length: maxDim * 1.15,
			spread: 0.032,
			color,
			alpha: 0,
			maxAlpha: 0.34,
			life: 0,
			maxLife: 56
		});
	}
}

/**
 * Fires a tactical breach shockwave, radial light beams, and fuse sparks
 * when an individual station lock is successfully bypassed.
 */
export async function fireUnlockConfetti() {
	if (typeof window === 'undefined') return;
	if (!ensureCanvas()) return;

	const cx = window.innerWidth * 0.5;
	const cy = window.innerHeight * 0.52;

	if (prefersReducedMotion()) {
		rings.push({
			x: cx,
			y: cy,
			radius: 20,
			maxRadius: Math.min(window.innerWidth, window.innerHeight) * 0.38,
			lineWidth: 3,
			color: '#10b981',
			alpha: 0.6,
			speed: 6
		});
		startLoop();
		return;
	}

	spawnDetonation({
		x: cx,
		y: cy,
		sparkCount: 72,
		beamCount: 12,
		colors: ['#3b82f6', '#38bdf8', '#93c5fd', '#10b981', '#ffffff'],
		ringColor: '#38bdf8',
		flashColor: '#60a5fa',
		scale: 0.95
	});

	// Crossed volumetric cyber light beams from top corners
	spawnSweepingLasers(0, 0, [Math.PI * 0.24], '#38bdf8', 0.008);
	spawnSweepingLasers(window.innerWidth, 0, [Math.PI * 0.76], '#3b82f6', -0.008);

	startLoop();
}

/**
 * Fires a multi-stage cyber-blue vault detonation & volumetric light-beam show
 * when all stations are breached and the mission is accomplished.
 */
export async function fireVictoryCelebration() {
	if (typeof window === 'undefined') return;
	if (!ensureCanvas()) return;

	const w = window.innerWidth;
	const h = window.innerHeight;

	if (prefersReducedMotion()) {
		rings.push({
			x: w * 0.5,
			y: h * 0.45,
			radius: 24,
			maxRadius: Math.max(w, h) * 0.45,
			lineWidth: 4,
			color: '#38bdf8',
			alpha: 0.65,
			speed: 5
		});
		startLoop();
		return;
	}

	// Stage 1: Central Electric Cobalt & Ice-Cyan Plasma Detonation
	spawnDetonation({
		x: w * 0.5,
		y: h * 0.46,
		sparkCount: 95,
		beamCount: 16,
		colors: ['#2563eb', '#3b82f6', '#38bdf8', '#bae6fd', '#ffffff'],
		ringColor: '#38bdf8',
		flashColor: '#93c5fd',
		scale: 1.15
	});
	startLoop();

	// Stage 2: Crisscrossing Volumetric Light Beams + Left Flank Blast
	setTimeout(() => {
		if (!ensureCanvas()) return;
		const cw = window.innerWidth;
		const ch = window.innerHeight;
		spawnSweepingLasers(0, 0, [Math.PI * 0.18, Math.PI * 0.34], '#3b82f6', 0.011);
		spawnSweepingLasers(cw, 0, [Math.PI * 0.66, Math.PI * 0.82], '#38bdf8', -0.011);
		spawnDetonation({
			x: cw * 0.22,
			y: ch * 0.62,
			sparkCount: 55,
			beamCount: 8,
			colors: ['#2563eb', '#38bdf8', '#e0f2fe', '#ffffff'],
			ringColor: '#3b82f6',
			flashColor: '#38bdf8',
			scale: 0.85
		});
		startLoop();
	}, 260);

	// Stage 3: Right Flank Blast + Upward Cyan/Emerald Spotlights
	setTimeout(() => {
		if (!ensureCanvas()) return;
		const cw = window.innerWidth;
		const ch = window.innerHeight;
		spawnSweepingLasers(cw * 0.1, ch, [-Math.PI * 0.36], '#38bdf8', 0.009);
		spawnSweepingLasers(cw * 0.9, ch, [-Math.PI * 0.64], '#10b981', -0.009);
		spawnDetonation({
			x: cw * 0.78,
			y: ch * 0.58,
			sparkCount: 55,
			beamCount: 8,
			colors: ['#10b981', '#38bdf8', '#93c5fd', '#ffffff'],
			ringColor: '#10b981',
			flashColor: '#34d399',
			scale: 0.85
		});
		startLoop();
	}, 540);

	// Stage 4: Grand Finale Cyber Supernova
	setTimeout(() => {
		if (!ensureCanvas()) return;
		const cw = window.innerWidth;
		const ch = window.innerHeight;
		spawnDetonation({
			x: cw * 0.5,
			y: ch * 0.38,
			sparkCount: 120,
			beamCount: 18,
			colors: ['#2563eb', '#3b82f6', '#38bdf8', '#10b981', '#bae6fd', '#ffffff'],
			ringColor: '#38bdf8',
			flashColor: '#e0f2fe',
			scale: 1.3
		});
		startLoop();
	}, 900);
}
