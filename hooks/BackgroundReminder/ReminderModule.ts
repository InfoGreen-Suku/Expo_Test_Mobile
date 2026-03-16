import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'ReminderModule' doesn't seem to be linked. Make sure: \n\n` +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n' +
  '- The module is properly linked in MainApplication.java\n';

const ReminderModule = NativeModules.ReminderModule
  ? NativeModules.ReminderModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      },
    );

// export function showReminder(message = "Reminder!") {
//   if (Platform.OS !== 'android') {
//     console.warn('ReminderModule is only supported on Android.');
//     return;
//   }

//   if (!ReminderModule?.showReminder) {
//     console.error(
//       'ReminderModule is linked, but the "showReminder" method is not available. ' +
//       'Check the native implementation and ensure it is exported correctly.'
//     );
//     return;
//   }

//   try {
//     ReminderModule.showReminder(message);
//     console.log('Reminder shown successfully.');
//   } catch (error:any) {
//     console.error('Error showing reminder:', error.message || error);
//   }
// }

export function scheduleReminder(message: string, triggerAtMs: number) {
  if (Platform.OS !== 'android') return;
  if (!ReminderModule?.scheduleReminder) {
    console.error('scheduleReminder is not available on ReminderModule');
    return;
  }
  try {
    const now = Date.now();
    const at = triggerAtMs <= now ? now + 1000 : triggerAtMs;
    ReminderModule.scheduleReminder(message, at);
  } catch (e:any) {
    console.error('Error scheduling reminder:', e?.message || e);
  }
}

export function cancelReminder(message: string) {
  if (Platform.OS !== 'android') return;
  if (!ReminderModule?.cancelReminder) return;
  try { ReminderModule.cancelReminder(message); } catch {}
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    // On Android 13+, runtime POST_NOTIFICATIONS is needed; defer to React Native Permissions library if used.
    // Here we assume user will grant from system settings if needed; return true to avoid blocking.
    return true;
  } catch {
    return false;
  }
}

export async function ensureOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const allowed = await ReminderModule.canDrawOverlays?.();
    if (!allowed) ReminderModule.requestOverlayPermission?.();
    return !!allowed;
  } catch {
    return false;
  }
}

export async function ensureExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const allowed = await ReminderModule.canScheduleExactAlarms?.();
    if (!allowed) ReminderModule.requestExactAlarmPermission?.();
    return !!allowed;
  } catch {
    return false;
  }
}

export async function ensureBatteryOptimizationExemption(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const ignoring = await ReminderModule.isIgnoringBatteryOptimizations?.();
    if (!ignoring) ReminderModule.requestIgnoreBatteryOptimizations?.();
    return !!ignoring;
  } catch {
    return false;
  }
}

// For debugging
console.log('NativeModules:', Object.keys(NativeModules));
console.log('ReminderModule exists:', !!NativeModules.ReminderModule);
console.log(
  'Available methods in ReminderModule:',
  NativeModules.ReminderModule ? Object.keys(NativeModules.ReminderModule) : 'Module not found'
);

export default ReminderModule;
