import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Notification } from '../../types/notification';
import { MessageSquare, AlertCircle, Building2, Shield, ThumbsUp, ThumbsDown, FileCheck, FileX, Reply, Edit, Trash2 } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onClick,
  showDelete = false,
  onDelete
}) => {
  const { language } = useLanguage();
  const { markAsRead } = useNotification();

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'company-reply':
        return <Reply className="h-5 w-5 text-blue-500" />;
      case 'admin-edit-review':
        return <Edit className="h-5 w-5 text-orange-500" />;
      case 'admin-delete-review':
        return <Trash2 className="h-5 w-5 text-red-500" />;
      case 'review-votes':
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case 'new-review':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case 'admin-delete-reply':
        return <FileX className="h-5 w-5 text-red-500" />;
      case 'reply-votes':
        return <ThumbsDown className="h-5 w-5 text-amber-500" />;
      case 'new-report':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'new-claim-request':
        return <Building2 className="h-5 w-5 text-blue-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format time
  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: language === 'ar' ? ar : undefined 
    });
  };

  // Handle click
  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    onClick();
  };

  // Handle delete
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  return (
    <li 
      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            {getNotificationIcon(notification.type)}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">
            {notification.title}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(notification.createdAt)}
          </p>
        </div>
        {!notification.isRead && (
          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></span>
        )}
        {showDelete && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 p-1 ml-1"
            title="Delete notification"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
};

export default NotificationItem;