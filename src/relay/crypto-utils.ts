/**
 * Utilities for End-to-End Encryption using Web Crypto API.
 * Uses AES-GCM 256-bit encryption.
 */

// Generate a random Session ID (UUID v4-like or random string)
export function generateSessionId(): string {
	return crypto.randomUUID();
}

/**
 * Generates a random AES-GCM key.
 * Returns the raw key buffer (exported) and the CryptoKey object.
 */
export async function generateKey(): Promise<{ key: CryptoKey; raw: string }> {
	const key = await crypto.subtle.generateKey(
		{
			name: "AES-GCM",
			length: 256,
		},
		true, // extractable
		["encrypt", "decrypt"],
	);

	const rawBuffer = await crypto.subtle.exportKey("raw", key);
	// Encode raw key to Base64Url for easy sharing via QR
	const raw = arrayBufferToBase64(rawBuffer);

	return { key, raw };
}

/**
 * Imports a key from a Base64 string.
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
	const rawBuffer = base64ToArrayBuffer(base64Key);
	return crypto.subtle.importKey("raw", rawBuffer, { name: "AES-GCM" }, false, [
		"encrypt",
		"decrypt",
	]);
}

/**
 * Encrypts data (string) using the provided key.
 * Returns JSON object { iv: base64, data: base64 }
 */
export async function encrypt(
	message: string,
	key: CryptoKey,
): Promise<{ iv: string; data: string }> {
	const encoder = new TextEncoder();
	const encodedMessage = encoder.encode(message);

	const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

	const encryptedBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		encodedMessage,
	);

	return {
		iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
		data: arrayBufferToBase64(encryptedBuffer),
	};
}

/**
 * Decrypts data using the provided key.
 */
export async function decrypt(
	encrypted: { iv: string; data: string },
	key: CryptoKey,
): Promise<string> {
	const iv = base64ToArrayBuffer(encrypted.iv);
	const data = base64ToArrayBuffer(encrypted.data);

	const decryptedBuffer = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: new Uint8Array(iv),
		},
		key,
		data,
	);

	const decoder = new TextDecoder();
	return decoder.decode(decryptedBuffer);
}

// Helpers

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		const b = bytes[i];
		if (b !== undefined) {
			binary += String.fromCharCode(b);
		}
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary_string = atob(base64);
	const len = binary_string.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}
