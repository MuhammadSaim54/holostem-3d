import { PropertyCard } from "@/components/SpatialStage";

const DB_NAME = "TouchlessStemStudioDB";
const STORE_NAME = "customLessons";
const KEY_NAME = "savedCustomLesson";

export interface SavedCustomLessonData {
  glbBlob: Blob;
  modelName: string;
  category: string;
  summary: string;
  formula: string;
  stats: { label: string; value: string }[];
  bullets: string[];
  properties: PropertyCard[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCustomLessonToDB(data: SavedCustomLessonData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(data, KEY_NAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

export async function loadCustomLessonFromDB(): Promise<SavedCustomLessonData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY_NAME);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearCustomLessonFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY_NAME);
  } catch {}
}