import stationsData from '../config/stations.json';
import type { StationDefinition, LockType, VerificationResult } from '../types';

export const STATIONS: StationDefinition[] = stationsData as StationDefinition[];

/**
 * Normalizes user input and compares against expected target solution.
 * Handles whitespace trimming, case insensitivity, and flexible separators.
 */
export function normalizeInput(input: string): string {
	return input.trim().toUpperCase();
}

/**
 * Retrieves a station definition by its unique LockType ID.
 */
export function getStationById(id: string): StationDefinition | undefined {
	const normalizedId = id.trim().toLowerCase();
	return STATIONS.find((s) => s.id === normalizedId);
}

/**
 * Retrieves all registered station definitions sorted by order.
 */
export function getAllStations(): StationDefinition[] {
	return [...STATIONS];
}

/**
 * Extracts and matches a station from id
 */
export function getStationByQr(qrText: string): StationDefinition | undefined {
	if (!qrText || typeof qrText !== 'string') return undefined;

	const cleaned = qrText.trim().toUpperCase();

	const idMatch = STATIONS.find((s) => s.id.toUpperCase() === cleaned);
	if (idMatch) return idMatch;

	return undefined;
}

const ELEMENT_TRANSLATIONS: Record<string, string> = {
	FIRE: 'FUEGO',
	EARTH: 'TIERRA',
	MOON: 'LUNA',
	WATER: 'AGUA',
	AIR: 'AIRE',
	SUN: 'SOL'
};

function normalizeElementalString(str: string): string {
	const parts = str.split('-').map((p) => p.trim());
	return parts.map((part) => ELEMENT_TRANSLATIONS[part] || part).join('-');
}

const DIRECTION_MAP: Record<string, string> = {
	U: 'A',
	D: 'B',
	L: 'I',
	R: 'D'
};

function normalizeDirectionString(str: string): string {
	const parts = str.split('-').map((p) => p.trim());
	return parts.map((part) => DIRECTION_MAP[part] || part).join('-');
}

function normalizeSafeDialString(str: string): string {
	return str.replace(/\bR(\d+)/g, 'D$1').replace(/\bL(\d+)/g, 'I$1');
}

function normalizePatchbayString(str: string): string {
	const parts = str.split('-').map((p) => p.trim().toUpperCase()).filter(Boolean);
	return parts.sort().join('-');
}

function normalizePatternString(str: string): string {
	return str.replace(/[^\d]/g, '');
}

function normalizeFrequencyString(str: string): string {
	const cleaned = str.replace(/[^\d.,]/g, '').replace(',', '.');
	const num = parseFloat(cleaned);
	return isNaN(num) ? str : num.toFixed(1);
}

const NOTE_TRANSLATIONS: Record<string, string> = {
	DO: 'C',
	RE: 'D',
	MI: 'E',
	FA: 'F',
	SOL: 'G',
	LA: 'A',
	SI: 'B'
};

function normalizeMusicNotes(str: string): string {
	const cleaned = str.toUpperCase().replace(/[^\w-]/g, '');
	const parts = cleaned.includes('-')
		? cleaned.split('-').map((p) => p.trim())
		: cleaned.match(/(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])/g) || [];
	return parts.map((p) => NOTE_TRANSLATIONS[p] || p).join('-');
}

/**
 * Verifies user input against the station target code.
 */
export function verifyStationCode(stationId: LockType | string, input: string): VerificationResult {
	const station = getStationById(stationId);
	if (!station) {
		return {
			success: false,
			message: `Unknown station ID: ${stationId}`
		};
	}

	const normalizedInput = normalizeInput(input);
	const normalizedTarget = normalizeInput(station.code);

	let isMatch = normalizedInput === normalizedTarget;

	if (!isMatch) {
		switch (station.type) {
			case 'cryptex':
			case '2':
				isMatch = normalizeElementalString(normalizedInput) === normalizeElementalString(normalizedTarget);
				break;
			case 'safedial':
			case '3':
				isMatch = normalizeSafeDialString(normalizedInput) === normalizeSafeDialString(normalizedTarget);
				break;
			case 'compass':
			case '5':
				isMatch = normalizeDirectionString(normalizedInput) === normalizeDirectionString(normalizedTarget);
				break;
			case 'pattern':
			case '8': {
				const pInput = normalizePatternString(normalizedInput);
				const pTarget = normalizePatternString(normalizedTarget);
				isMatch = pInput.length > 0 && pInput === pTarget;
				break;
			}
			case 'patchbay':
			case '9':
				isMatch = normalizePatchbayString(normalizedInput) === normalizePatchbayString(normalizedTarget);
				break;
			case 'frequency':
			case '10':
				isMatch = normalizeFrequencyString(normalizedInput) === normalizeFrequencyString(normalizedTarget);
				break;
			case 'piano':
			case '11': {
				const nInput = normalizeMusicNotes(normalizedInput);
				const nTarget = normalizeMusicNotes(normalizedTarget);
				isMatch = nInput.length > 0 && nInput === nTarget;
				break;
			}
		}
	}

	return {
		success: isMatch,
		station,
		message: isMatch
			? `Station "${station.id}" access code confirmed.`
			: `Invalid verification code for "${station.id}".`
	};
}
