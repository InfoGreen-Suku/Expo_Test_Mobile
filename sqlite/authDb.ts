import * as SQLite from "expo-sqlite";

export type LocalUserRow = {
  id: number;
  name: string;
  mobileNumber: string;
  deviceId: string;
  createdAt: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DB_NAME = "auth.db";

async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initAuthDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobileNumber TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);
}

export async function insertLocalUser(input: {
  name: string;
  mobileNumber: string;
  deviceId: string;
}): Promise<LocalUserRow> {
  const db = await getDb();
  await initAuthDb();

  const createdAt = new Date().toISOString();

  const result = await db.runAsync(
    "INSERT INTO users (name, mobileNumber, deviceId, createdAt) VALUES (?, ?, ?, ?)",
    [input.name, input.mobileNumber, input.deviceId, createdAt],
  );

  const row = await db.getFirstAsync<LocalUserRow>(
    "SELECT id, name, mobileNumber, deviceId, createdAt FROM users WHERE id = ?",
    [result.lastInsertRowId],
  );

  if (!row) {
    throw new Error("Failed to read inserted user row.");
  }
  return row;
}

export async function getLatestLocalUser(): Promise<LocalUserRow | null> {
  const db = await getDb();
  await initAuthDb();

  const row = await db.getFirstAsync<LocalUserRow>(
    "SELECT id, name, mobileNumber, deviceId, createdAt FROM users ORDER BY id DESC LIMIT 1",
  );
  return row ?? null;
}

export async function clearAllLocalUsers(): Promise<void> {
  const db = await getDb();
  await initAuthDb();
  await db.execAsync("DELETE FROM users;");
}
