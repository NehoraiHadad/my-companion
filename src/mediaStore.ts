const DATABASE = "little-friend-media-v4";
const STORE = "clips";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("לא ניתן לפתוח את אחסון האנימציות"));
  });
}

export async function saveMedia(key: string, media: Blob) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(media, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("שמירת האנימציה נכשלה"));
  });
  database.close();
}

export async function loadMedia(key: string): Promise<Blob | null> {
  const database = await openDatabase();
  const clip = await new Promise<Blob | null>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error("טעינת האנימציה נכשלה"));
  });
  database.close();
  return clip;
}

export async function removeMedia(keys: string[]) {
  if (!keys.length) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    keys.forEach((key) => store.delete(key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("מחיקת האנימציות נכשלה"));
  });
  database.close();
}

export const saveClip = saveMedia;
export const loadClip = loadMedia;
export const removeClips = removeMedia;
