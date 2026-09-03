import { promises as fs } from "fs";
import path from "path";
import type { StoreData } from "./types";
import { createSeedStore } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

let writeChain: Promise<unknown> = Promise.resolve();

async function ensureStore(): Promise<StoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, "uploads"), { recursive: true });
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed.users || !parsed.questions) {
      throw new Error("invalid store");
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
    store.users = seeded.users;
    store.questions = seeded.questions;
    return store;
  });
}
