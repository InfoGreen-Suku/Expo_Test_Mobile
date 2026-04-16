import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const DB_NAME = "voters.db";
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function ensureVotersSchema(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(voters_list)`,
  );
  const hasStatusColumn = columns.some((column) => column.name === "status");
  const hasVerifiedByName = columns.some(
    (column) => column.name === "verified_by_name",
  );
  const hasVerifiedByDeviceId = columns.some(
    (column) => column.name === "verified_by_device_id",
  );
  const hasVerifiedAt = columns.some((column) => column.name === "verified_at");

  if (!hasStatusColumn) {
    await db.execAsync(
      `ALTER TABLE voters_list ADD COLUMN status INTEGER NOT NULL DEFAULT 0`,
    );
  }

  if (!hasVerifiedByName) {
    await db.execAsync(
      `ALTER TABLE voters_list ADD COLUMN verified_by_name TEXT`,
    );
  }

  if (!hasVerifiedByDeviceId) {
    await db.execAsync(
      `ALTER TABLE voters_list ADD COLUMN verified_by_device_id TEXT`,
    );
  }

  if (!hasVerifiedAt) {
    await db.execAsync(`ALTER TABLE voters_list ADD COLUMN verified_at TEXT`);
  }
}

async function ensureVotersDbReady() {
  if (!FileSystem.documentDirectory || !FileSystem.bundleDirectory) {
    throw new Error("FileSystem directories are unavailable.");
  }

  const localDbPath = `${SQLITE_DIR}/${DB_NAME}`;
  const localDbInfo = await FileSystem.getInfoAsync(localDbPath);
  if (localDbInfo.exists) return;

  await FileSystem.makeDirectoryAsync(SQLITE_DIR, { intermediates: true });

  const bundledDbCandidates = [
    `${FileSystem.bundleDirectory}${DB_NAME}`,
    `file:///android_asset/${DB_NAME}`,
  ];

  let bundledDbPath: string | null = null;
  for (const candidate of bundledDbCandidates) {
    const info = await FileSystem.getInfoAsync(candidate);
    if (info.exists) {
      bundledDbPath = candidate;
      break;
    }
  }

  if (!bundledDbPath) {
    throw new Error(
      `Bundled voters.db not found. Checked: ${bundledDbCandidates.join(", ")}`,
    );
  }

  await FileSystem.copyAsync({
    from: bundledDbPath,
    to: localDbPath,
  });
}

async function getDb() {
  await ensureVotersDbReady();
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME, undefined, SQLITE_DIR).then(
      async (db) => {
        await ensureVotersSchema(db);
        return db;
      },
    );
  }
  return dbPromise;
}

export async function getVoterBySr(sr: number, bhagNo: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT *
     FROM voters_list
     WHERE sr = ?
       AND CAST(bhag_no AS TEXT) = ?`,
    [sr, bhagNo.trim()],
  );
  return row ?? null;
}

export async function getDistinctBhagNos() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ bhag_no: string | number | null }>(
    `SELECT bhag_no
     FROM voters_list
     WHERE bhag_no IS NOT NULL
       AND TRIM(CAST(bhag_no AS TEXT)) != ''`,
  );

  const uniqueBhagNos = new Set<string>();
  for (const row of rows) {
    const normalized = String(row.bhag_no).trim();
    if (normalized) {
      uniqueBhagNos.add(normalized);
    }
  }

  return Array.from(uniqueBhagNos).sort((a, b) => {
    const numberA = Number(a);
    const numberB = Number(b);
    const bothNumeric = !Number.isNaN(numberA) && !Number.isNaN(numberB);

    if (bothNumeric) {
      return numberA - numberB;
    }
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export async function markVoterVerified(
  sr: number,
  bhagNo: string,
  meta?: {
    userName?: string | null;
    deviceId?: string | null;
    verifiedAt?: string | null;
  },
) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE voters_list
     SET status = 1,
         verified_by_name = ?,
         verified_by_device_id = ?,
         verified_at = ?
     WHERE sr = ?
       AND CAST(bhag_no AS TEXT) = ?`,
    [
      meta?.userName ?? null,
      meta?.deviceId ?? null,
      meta?.verifiedAt ?? null,
      sr,
      bhagNo.trim(),
    ],
  );
}
