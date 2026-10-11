import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

// Un tap sur une notification ouvre l'app : prises -> « Aujourd'hui », examens -> « Examens ».
export function NotificationRouter() {
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!last) return;
    const data = last.notification.request.content.data ?? {};
    if (data.type === 'exam-result') router.push({ pathname: '/add-result', params: { examId: String(data.examId ?? '') } });
    else if (data.type === 'exam' && data.examId) router.push({ pathname: '/exam/[id]', params: { id: String(data.examId) } });
    else router.navigate('/');
  }, [last]);
  return null;
}
