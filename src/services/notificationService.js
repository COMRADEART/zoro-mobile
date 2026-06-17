import Constants from 'expo-constants';

// Notifications don't work in Expo Go (SDK 53+ removed remote push there and
// local scheduling is unreliable). Lazy-load expo-notifications only in a
// development build so Expo Go never executes its top-level side effects.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let Notifications = null;
let SchedulableTriggerInputTypes = null;

function ensureNotifications() {
  if (isExpoGo || Notifications) return Notifications;
  try {
    Notifications = require('expo-notifications');
    SchedulableTriggerInputTypes = Notifications.SchedulableTriggerInputTypes;
    Notifications.setNotificationHandler({
      // SDK 54 shape: shouldShowAlert is deprecated in favour of banner + list.
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('[notifications] failed to load expo-notifications module', e);
    Notifications = null;
  }
  return Notifications;
}

// Reads current permission without prompting — used to reflect the toggle's
// real state on mount.
export async function getNotificationPermission() {
  const ns = ensureNotifications();
  if (!ns) return false;
  try {
    const { status } = await ns.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] getPermissions failed', e);
    return false;
  }
}

// Prompts for permission only if not already granted. Returns whether granted.
export async function requestNotificationPermissions() {
  const ns = ensureNotifications();
  if (!ns) return false;
  try {
    const existing = await ns.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    if (!existing.canAskAgain) return false;
    const { status } = await ns.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] requestPermissions failed', e);
    return false;
  }
}

export async function cancelAllReminders() {
  const ns = ensureNotifications();
  if (!ns) return;
  try {
    await ns.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[notifications] cancel failed', e);
  }
}

// Schedules (or reschedules) a single daily, repeating training reminder at the
// given device-local HH:MM. Cancels any previous reminder first so toggling the
// time never stacks duplicates. Returns true if a reminder is now scheduled.
export async function scheduleTrainingReminder(time = '18:00') {
  const ns = ensureNotifications();
  if (!ns) return false;
  const [hour, minute] = String(time).split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const granted = await requestNotificationPermissions();
  if (!granted) return false;
  await cancelAllReminders();
  try {
    await ns.scheduleNotificationAsync({
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
