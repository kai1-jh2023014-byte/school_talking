import { promises as fs } from "fs";
import path from "path";
import { LOGIN_ID_BY_USER_ID } from "./demo-accounts";
import { homeroomOf } from "./constants";
import { normalizeStatus } from "./questions";
import { createSeedStore } from "./seed";
import type { Question, StoreData, User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
export const STORE_VERSION = 5;

let writeChain: Promise<unknown> = Promise.resolve();

function classFromHomeroom(homeroom?: string): string | undefined {
  const match = homeroom?.match(/([A-D])組/);
  return match?.[1];
}

function migrateUsers(users: User[]): boolean {
  let changed = false;
  for (const user of users) {
    const nextId = LOGIN_ID_BY_USER_ID[user.id];
    if (nextId && user.loginId !== nextId) {
      user.loginId = nextId;
      changed = true;
    }
    if (!user.status) {
      user.status = "active";
      changed = true;
    }
    if (!user.createdAt) {
      user.createdAt = new Date().toISOString();
      changed = true;
    }
    if (user.role === "student" && !user.className) {
      user.className = classFromHomeroom(user.homeroom);
      if (!user.homeroom) user.homeroom = homeroomOf(user.grade, user.className);
      changed = true;
    }
  }
  return changed;
}

function migrateQuestions(questions: Question[]): boolean {
  let changed = false;
  for (const question of questions) {
    const next = normalizeStatus(question.status);
    if (next !== question.status) {
      question.status = next;
      changed = true;
    }
    if (!question.questionType) {
      question.questionType = "その他";
      changed = true;
    }
    if (!question.events) {
      question.events = [];
      changed = true;
    }
    if (!question.transferHistory) {
      question.transferHistory = [];
      changed = true;
    }
  }
  return changed;
}

function migrateStore(store: StoreData): boolean {
  let changed = false;
  if ((store.version ?? 1) < 4) {
    if (migrateUsers(store.users)) changed = true;
    if (migrateQuestions(store.questions)) changed = true;
    store.version = 4;
    changed = true;
  }
  if ((store.version ?? 1) < 5) {
    if (!store.prompts) store.prompts = [];
    if (!store.promptResponses) store.promptResponses = [];
    if (!store.followUps) store.followUps = [];
    store.version = 5;
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
    store.schoolInsight = undefined;
    store.prompts = seeded.prompts ?? [];
    store.promptResponses = seeded.promptResponses ?? [];
    store.followUps = seeded.followUps ?? [];
    return store;
  });
}
