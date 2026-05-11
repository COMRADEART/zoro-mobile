import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (isExpoGo) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder({ hour, minute, title, body, repeat = false }) {
  if (isExpoGo) return;
  await cancelAllReminders();
  const permission = await requestNotificationPermissions();
  if (!permission) return;

  const trigger = {
    hour,
    minute,
    repeats: repeat,
  };

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
}

export async function cancelAllReminders() {
  if (isExpoGo) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleRestReminder(time) {
  const [hour, minute] = time.split(':').map(Number);
  await scheduleReminder({
    hour,
    minute,
    title: '⛩ Recovery Needed',
    body: 'Your stamina is low. Rest to recover before training.',
    repeat: false,
  });
}

export async function scheduleTrainingReminder(time) {
  const [hour, minute] = time.split(':').map(Number);
  await scheduleReminder({
    hour,
    minute,
    title: '⚔ Daily Training',
    body: 'Your swords await. Time to train.',
    repeat: true,
  });
}