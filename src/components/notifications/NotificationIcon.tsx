import { MessageSquare, Calendar, Clock, DollarSign, AlertCircle, Sparkles, Building2, Briefcase, FileText } from 'lucide-react';
import { getNotificationCategory } from '@/lib/notifications/notificationTypes';

export function NotificationIcon({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
  const category = getNotificationCategory(type);
  switch (category) {
    case 'booking':
      return <Calendar className={`${className} text-blue-500`} />;
    case 'appointment':
      return <Clock className={`${className} text-blue-500`} />;
    case 'payment':
      return <DollarSign className={`${className} text-purple-500`} />;
    case 'message':
      return <MessageSquare className={`${className} text-green-500`} />;
    case 'job':
      return <Briefcase className={`${className} text-orange-500`} />;
    case 'ai':
      return <Sparkles className={`${className} text-green-700`} />;
    case 'empresa':
      return <Building2 className={`${className} text-indigo-500`} />;
    case 'case':
      return <FileText className={`${className} text-teal-500`} />;
    default:
      return <AlertCircle className={`${className} text-amber-500`} />;
  }
}
