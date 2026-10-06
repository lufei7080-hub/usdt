export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
};

export const showBrowserNotification = ({ title, body, tag, onClick }) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  if (document.visibilityState === 'visible') return false;

  try {
    const n = new Notification(title, { body, tag, icon: '/favicon.svg' });
    if (typeof onClick === 'function') {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
    return true;
  } catch {
    return false;
  }
};
