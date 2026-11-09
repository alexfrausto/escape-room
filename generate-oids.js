import crypto from 'node:crypto';

/**
 * Generates an 8-character random ID (hexadecimal).
 * Uses 4 cryptographically secure random bytes = 8 hex chars.
 */
function createShortId(length = 8) {
	return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

const count = parseInt(process.argv[2], 10) || 8;
const ids = Array.from({ length: count }, () => createShortId(8));

console.log(`Generated ${count} random 8-character IDs:\n`);
ids.forEach((id, idx) => {
	console.log(`${idx + 1}. ${id}`);
});

console.log('\nJSON format:');
console.log(JSON.stringify(ids, null, 2));
