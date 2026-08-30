const DATABASE_NAME = "companion-secrets-v1";
const STORE_NAME = "encrypted-settings";
const KEY_ID = "local-aes-key";
const SETTINGS_ID = "ai-settings";
let mutationQueue: Promise<unknown> = Promise.resolve();

type CipherRecord = { version: 1; iv: ArrayBuffer; ciphertext: ArrayBuffer };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Opening encrypted storage failed"));
  });
}

async function readRecord<T>(id: string): Promise<T | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error ?? new Error("Reading encrypted storage failed"));
    });
  } finally { database.close(); }
}

async function writeRecord(id: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Writing encrypted storage failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Writing encrypted storage was aborted"));
    });
  } finally { database.close(); }
}

async function deleteRecord(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Deleting encrypted storage failed"));
    });
  } finally { database.close(); }
}

async function encryptionKey(): Promise<CryptoKey> {
  const existing = await readRecord<CryptoKey>(KEY_ID);
  if (existing) return existing;
  const created = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await writeRecord(KEY_ID, created);
  return created;
}

export function hasEncryptedAiStorage(): boolean {
  return typeof indexedDB !== "undefined" && typeof globalThis.crypto?.subtle !== "undefined";
}

export async function readEncryptedAiSettings(): Promise<Record<string, unknown>> {
  if (!hasEncryptedAiStorage()) return {};
  try {
    const record = await readRecord<CipherRecord>(SETTINGS_ID);
    if (!record || record.version !== 1) return {};
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: record.iv }, await encryptionKey(), record.ciphertext);
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    await clearEncryptedAiSettings();
    return {};
  }
}

function enqueueMutation(operation: () => Promise<boolean>): Promise<boolean> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function saveEncryptedAiSettings(settings: unknown): Promise<boolean> {
  if (!hasEncryptedAiStorage()) return Promise.resolve(false);
  return enqueueMutation(async () => {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer;
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await encryptionKey(),
        new TextEncoder().encode(JSON.stringify(settings)),
      );
      await writeRecord(SETTINGS_ID, { version: 1, iv, ciphertext } satisfies CipherRecord);
      return true;
    } catch {
      return false;
    }
  });
}

export function clearEncryptedAiSettings(): Promise<boolean> {
  if (!hasEncryptedAiStorage()) return Promise.resolve(false);
  return enqueueMutation(async () => {
    try { await deleteRecord(SETTINGS_ID); return true; }
    catch { return false; }
  });
}
