import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Constants from 'expo-constants';

// Notifications don't work in Expo Go (SDK 53+ removed remote push there and
// local scheduling is unreliable), so every entry point no-ops in that runtime.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

Notifications.setNotificationHandler({
  // SDK 54 shape: shouldShowAlert is deprecated in favour of banner + list.
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Reads current permission without prompting — used to reflect the toggle's
// real state on mount.
export async function getNotificationPermission() {
  if (isExpoGo) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] getPermissions failed', e);
    return false;
  }
}

// Prompts for permission only if not already granted. Returns whether granted.
export async function requestNotificationPermissions() {
  if (isExpoGo) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    if (!existing.canAskAgain) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] requestPermissions failed', e);
    return false;
  }
}

export async function cancelAllReminders() {
  if (isExpoGo) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[notifications] cancel failed', e);
  }
}

// Schedules (or reschedules) a single daily, repeating training reminder at the
// given device-local HH:MM. Cancels any previous reminder first so toggling the
// time never stacks duplicates. Returns true if a reminder is now scheduled.
export async function scheduleTrainingReminder(time = '18:00') {
  if (isExpoGo) return false;
  const [hour, minute] = String(time).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  await cancelAllReminders();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚔ Time to train',
        body: 'Your swords await. Sharpen the blade today.',
      },
      trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    return true;
  } catch (e) {
    console.warn('[notifications] schedule failed', e);
    return false;
  }
}
