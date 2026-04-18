import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";

const DB_NAME = "voters.db";
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Run SQLite work one-at-a-time. Parallel `prepareAsync` / queries (e.g. UI +
 * `react-native-background-actions`) can trigger Android
 * `NativeDatabase.prepareAsync` NullPointerException (expo-sqlite).
 */
let votersDbAccessQueue: Promise<unknown> = Promise.resolve();

function runVotersDbSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const next = votersDbAccessQueue.then(fn, fn);
  votersDbAccessQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

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
  const hasOnlineStatus = columns.some(
    (column) => column.name === "online_status",
  );

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

  if (!hasOnlineStatus) {
    await db.execAsync(
      `ALTER TABLE voters_list ADD COLUMN online_status INTEGER NOT NULL DEFAULT 0`,
    );
  }
}

async function ensureVoterLookupIndex(db: SQLite.SQLiteDatabase) {
  await db.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_voters_list_sr_bhag ON voters_list(sr, bhag_no)`,
  );
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

async function openVotersDb(): Promise<SQLite.SQLiteDatabase> {
  await ensureVotersDbReady();
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME, undefined, SQLITE_DIR).then(
      async (db) => {
        await ensureVotersSchema(db);
        await ensureVoterLookupIndex(db);
        return db;
      },
    );
  }
  return dbPromise;
}

async function withVotersDb<T>(
  fn: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return runVotersDbSerialized(async () => {
    const db = await openVotersDb();
    return fn(db);
  });
}

/** Local wall time as `YYYY-MM-DD HH:mm:ss` for `verified_at` (matches API / SQL style). */
export function formatVerifiedAtStorageLocal(date: Date = new Date()): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

/** Open DB (and copy bundled file on first run) early so the first lookup is not delayed. */
export async function warmUpVotersDb(): Promise<void> {
  await withVotersDb(async () => undefined);
}

export async function getVoterBySr(sr: number, bhagNo: string) {
  return withVotersDb(async (db) => {
    const row = await db.getFirstAsync<any>(
      `SELECT *
       FROM voters_list
       WHERE sr = ?
         AND CAST(bhag_no AS TEXT) = ?`,
      [sr, bhagNo.trim()],
    );
    return row ?? null;
  });
}

/** Count of rows with `status = 1` and total rows for a booth (`bhag_no`). */
export async function getBoothVoterVerificationCounts(
  boothBhagNo: string,
): Promise<{
  verifiedCount: number;
  totalCount: number;
}> {
  const bhag = boothBhagNo.trim();
  if (!bhag) {
    return { verifiedCount: 0, totalCount: 0 };
  }

  return withVotersDb(async (db) => {
    const row = await db.getFirstAsync<{
      total_count: number | null;
      verified_count: number | null;
    }>(
      `SELECT COUNT(*) AS total_count,
              COALESCE(SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END), 0) AS verified_count
       FROM voters_list
       WHERE CAST(bhag_no AS TEXT) = ?`,
      [bhag],
    );

    return {
      totalCount: Number(row?.total_count ?? 0),
      verifiedCount: Number(row?.verified_count ?? 0),
    };
  });
}

export type BoothVerifiedListRow = {
  sr: number;
  verified_at: string | null;
};

/** Rows with `status = 1` for the booth, for display (e.g. modal). */
export async function getBoothVerifiedVotersList(
  boothBhagNo: string,
): Promise<BoothVerifiedListRow[]> {
  const bhag = boothBhagNo.trim();
  if (!bhag) return [];

  return withVotersDb(async (db) => {
    const rows = await db.getAllAsync<{
      sr: number;
      verified_at: string | null;
    }>(
      `SELECT sr, verified_at
       FROM voters_list
       WHERE status = 1
         AND CAST(bhag_no AS TEXT) = ?
       ORDER BY sr ASC`,
      [bhag],
    );

    return rows.map((r) => ({
      sr: Number(r.sr),
      verified_at: r.verified_at,
    }));
  });
}

/** Verified rows (`status = 1`) for this booth where `verified_by_device_id` matches. */
export async function getBoothVerifiedCountForDevice(
  boothBhagNo: string,
  deviceId: string,
): Promise<number> {
  const bhag = boothBhagNo.trim();
  const dev = deviceId.trim();
  if (!bhag || !dev) return 0;

  return withVotersDb(async (db) => {
    const row = await db.getFirstAsync<{ c: number | null }>(
      `SELECT COUNT(*) AS c
       FROM voters_list
       WHERE CAST(bhag_no AS TEXT) = ?
         AND status = 1
         AND TRIM(COALESCE(verified_by_device_id, '')) = ?`,
      [bhag, dev],
    );
    return Number(row?.c ?? 0);
  });
}

export async function getBoothVerifiedVotersListForDevice(
  boothBhagNo: string,
  deviceId: string,
): Promise<BoothVerifiedListRow[]> {
  const bhag = boothBhagNo.trim();
  const dev = deviceId.trim();
  if (!bhag || !dev) return [];

  return withVotersDb(async (db) => {
    const rows = await db.getAllAsync<{
      sr: number;
      verified_at: string | null;
    }>(
      `SELECT sr, verified_at
       FROM voters_list
       WHERE status = 1
         AND CAST(bhag_no AS TEXT) = ?
         AND TRIM(COALESCE(verified_by_device_id, '')) = ?
       ORDER BY sr ASC`,
      [bhag, dev],
    );

    return rows.map((r) => ({
      sr: Number(r.sr),
      verified_at: r.verified_at,
    }));
  });
}

export async function getDistinctBhagNos() {
  return withVotersDb(async (db) => {
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
  return withVotersDb(async (db) => {
    await db.runAsync(
      `UPDATE voters_list
       SET status = 1,
           verified_by_name = ?,
           verified_by_device_id = ?,
           verified_at = ?,
           online_status = 0
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
  });
}

export type VoterStatusSyncRow = {
  sr: number;
  bhag_no: string | number;
  status: number;
  verified_by_device_id: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
};

/**
 * Verified rows not yet reported to the server (`online_status = 0`), only for the
 * given booth (`bhag_no` matches the selected booth from the app).
 */
export async function getVotersPendingStatusSync(
  boothBhagNo: string,
): Promise<VoterStatusSyncRow[]> {
  const bhag = boothBhagNo.trim();
  if (!bhag) return [];

  return withVotersDb(async (db) => {
    const rows = await db.getAllAsync<{
      sr: number;
      bhag_no: string | number | null;
      status: number | null;
      verified_by_device_id: string | null;
      verified_by_name: string | null;
      verified_at: string | null;
    }>(
      `SELECT sr, bhag_no, status, verified_by_device_id, verified_by_name, verified_at
       FROM voters_list
       WHERE status = 1
         AND online_status = 0
         AND verified_at IS NOT NULL
         AND TRIM(CAST(verified_at AS TEXT)) != ''
         AND CAST(bhag_no AS TEXT) = ?`,
      [bhag],
    );
    return rows.map((r) => ({
      sr: Number(r.sr),
      bhag_no: r.bhag_no ?? "",
      status: Number(r.status ?? 0),
      verified_by_device_id: r.verified_by_device_id,
      verified_by_name: r.verified_by_name,
      verified_at: r.verified_at,
    }));
  });
}

export async function markVotersStatusSynced(
  keys: { sr: number; bhagNo: string }[],
): Promise<void> {
  if (keys.length === 0) return;
  return withVotersDb(async (db) => {
    for (const { sr, bhagNo } of keys) {
      await db.runAsync(
        `UPDATE voters_list
         SET online_status = 1
         WHERE sr = ?
           AND CAST(bhag_no AS TEXT) = ?`,
        [sr, bhagNo.trim()],
      );
    }
  });
}

function strOrNullFromApi(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

export type ServerVerifiedListEntry = {
  sr: number;
  status: number;
  verified_by_device_id: string | null;
  verified_by_name: string | null;
  verified_at: string | null;
};

function parseServerVerifiedListEntry(
  raw: unknown,
): ServerVerifiedListEntry | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return {
      sr: raw,
      status: 1,
      verified_by_device_id: null,
      verified_by_name: null,
      verified_at: null,
    };
  }

  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const sr = Number(o.sr);
  if (!Number.isFinite(sr)) return null;

  const statusRaw = o.status != null ? Number(o.status) : 1;
  const status = Number.isFinite(statusRaw) ? statusRaw : 1;

  return {
    sr,
    status,
    verified_by_device_id: strOrNullFromApi(o.device_id),
    verified_by_name: strOrNullFromApi(o.user_name),
    verified_at: strOrNullFromApi(o.date_time),
  };
}

/**
 * After `updated_voter_list.php` succeeds: for each `sr_list` item matching
 * `bhag_no`, set `status`, `online_status = 1`, `verified_by_device_id`,
 * `verified_by_name`, and `verified_at` from the payload. Other columns and
 * other rows are unchanged.
 */
export async function applyServerVerifiedListPatch(
  boothBhagNo: string,
  srList: unknown[],
): Promise<void> {
  const bhag = boothBhagNo.trim();
  if (!bhag) return;

  const entries = srList
    .map(parseServerVerifiedListEntry)
    .filter((e): e is ServerVerifiedListEntry => e != null);
  if (entries.length === 0) return;

  return withVotersDb(async (db) => {
    await db.execAsync("BEGIN IMMEDIATE");
    try {
      for (const e of entries) {
        await db.runAsync(
          `UPDATE voters_list
           SET status = ?,
               online_status = 1,
               verified_by_device_id = ?,
               verified_by_name = ?,
               verified_at = ?
           WHERE sr = ?
             AND CAST(bhag_no AS TEXT) = ?`,
          [
            e.status,
            e.verified_by_device_id,
            e.verified_by_name,
            e.verified_at,
            e.sr,
            bhag,
          ],
        );
      }
      await db.execAsync("COMMIT");
    } catch (err) {
      try {
        await db.execAsync("ROLLBACK");
      } catch {
        /* ignore rollback errors */
      }
      throw err;
    }
  });
}
