import { File, Paths } from "expo-file-system";

const LOG_FILE = new File(Paths.document, "api_logs.txt");

function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

/**
 * Append a log entry
 */
export async function logApiEvent(title: string, data: any) {
  try {
    const timestamp = formatTimestamp();
    const message = `[${timestamp}] ${title}:\n${JSON.stringify(data, null, 2)}\n\n`;

    // Check if file exists
    const dir = LOG_FILE.parentDirectory;
    if (!dir.exists) {
      dir.create({ idempotent: true, intermediates: true });
    }

    if (LOG_FILE.exists) {
      const current = LOG_FILE.textSync();
      LOG_FILE.write(current + message);
    } else {
      LOG_FILE.write(message);
    }
  } catch (error) {
    console.error("❌ Failed to write log:", error);
  }
}

/**
 * Read all logs
 */
export async function getLogs(): Promise<string> {
  try {
    if (!LOG_FILE.exists) return "No logs found.";

    return LOG_FILE.textSync();
  } catch (error) {
    console.error("❌ Failed to read logs:", error);
    return "Error reading logs.";
  }
}

/**
 * Clear the log file
 */
export async function clearLogs() {
  try {
    if (LOG_FILE.exists) {
      LOG_FILE.delete();
    }
  } catch (error) {
    console.error("❌ Failed to clear logs:", error);
  }
}
