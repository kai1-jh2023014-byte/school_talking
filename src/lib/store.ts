import { promises as fs } from "fs";
import path from "path";
import { LOGIN_ID_BY_USER_ID } from "./demo-accounts";
import { createSeedStore } from "./seed";
import type { StoreData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
export const STORE_VERSION = 2;

let writeChain: Promise<unknown> = Promise.resolve();

function migrateStore(store: StoreData): boolean {
  let changed = false;
  if ((store.version ?? 1) < 2) {
    for (const user of store.users) {
      const nextId = LOGIN_ID_BY_USER_ID[user.id];
      if (nextId && user.loginId !== nextId) {
        user.loginId = nextId;
        changed = true;
      }
    }
    store.version = 2;
    changed = true;
  }
  return changed;
}

async function ensureStore(): Promise<StoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed.users || !parsed.questions) {
      throw new Error("invalid store");
    }
    if (migrateStore(parsed)) {
      await fs.writeFile(STORE_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed;
  } catch {
    const seeded = createSeedStore();
    await fs.writeFile(STORE_PATH, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

export async function readStore(): Promise<StoreData> {
  return ensureStore();
}

export async function updateStore<T>(
  mutator: (store: StoreData) => T | Promise<T>,
): Promise<T> {
  const run = writeChain.then(async () => {
    const store = await ensureStore();
    const result = await mutator(store);
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function uploadsDir(): string {
  return path.join(DATA_DIR, "uploads");
}

export async function resetStore(): Promise<StoreData> {
  return updateStore((store) => {
    const seeded = createSeedStore();
    store.version = seeded.version;
    store.users = seeded.users;
    store.questions = seeded.questions;
    return store;
  });
}
