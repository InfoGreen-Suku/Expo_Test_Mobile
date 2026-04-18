import { PermissionsAndroid, Platform } from "react-native";

/**
 * Android 13+ (API 33): POST_NOTIFICATIONS for foreground service / heads-up notifications.
 * Safe to call on every launch; the system no-ops if already decided.
 */
export async function requestAndroidPostNotificationsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  if (typeof Platform.Version !== "number" || Platform.Version < 33) {
    return true;
  }
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}
