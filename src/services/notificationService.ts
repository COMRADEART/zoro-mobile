import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Stable identifiers so each reminder can be (re)scheduled and cancelled
// independently — cancelling everything before every schedule made the two
// reminders clobber each other.
const TRAINING_REMINDER_ID = 'training-reminder';
const REST_REMINDER_ID = 'rest-reminder';

// The rest nudge is an evening check-in, independent of the user's morning
// training-reminder time.
const REST_REMINDER_HOUR = 20;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (isExpoGo) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTrainingReminder(time: string) {
  if (isExpoGo) return;
  if (!(await requestNotificationPermissions())) return;
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync(TRAINING_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: TRAINING_REMINDER_ID,
    content: { title: 'Daily Training', body: 'Your swords await. Time to train.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function scheduleRestReminder() {
  if (isExpoGo) return;
  if (!(await requestNotificationPermissions())) return;
  const at = new Date();
  at.setHours(REST_REMINDER_HOUR, 0, 0, 0);
  if (at <= new Date()) at.setDate(at.getDate() + 1);
  await Notifications.cancelScheduledNotificationAsync(REST_REMINDER_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: REST_REMINDER_ID,
    content: { title: 'Recovery Needed', body: 'Your stamina is low. Rest to recover before training.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
    },
  });
}

export async function cancelTrainingReminder() {
  if (isExpoGo) return;
  await Notifications.cancelScheduledNotificationAsync(TRAINING_REMINDER_ID);
}

export async function cancelAllReminders() {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
