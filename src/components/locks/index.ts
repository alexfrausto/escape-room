export { default as TumblerLock } from './TumblerLock.svelte';
export { default as CryptexLock } from './CryptexLock.svelte';
export { default as SafeDialLock } from './SafeDialLock.svelte';
export { default as BreakerLock } from './BreakerLock.svelte';
export { default as CompassLock } from './CompassLock.svelte';
export { default as SlidersLock } from './SlidersLock.svelte';
export { default as TerminalLock } from './TerminalLock.svelte';
export { default as PatternLock } from './PatternLock.svelte';
export { default as PatchbayLock } from './PatchbayLock.svelte';
export { default as FrequencyLock } from './FrequencyLock.svelte';
export { default as PianoLock } from './PianoLock.svelte';

export const AVAILABLE_LOCKS = [
	'tumbler',
	'cryptex',
	'safedial',
	'breaker',
	'compass',
	'sliders',
	'terminal',
	'pattern',
	'patchbay',
	'frequency',
	'piano'
] as const;
