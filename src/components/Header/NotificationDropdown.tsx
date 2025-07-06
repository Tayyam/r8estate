import React, { useEffect, useState } from 'react';
import { Bell, Check, ChevronRight, Loader } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../types/notification';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  onViewAll: () => void;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onViewAll, onClose }) => {
  const { fetchNotifications, markAllAsRead, unreadCount } = useNotification();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications when dropdown opens
  useEffect(() => {
    setLoading(true);
    fetchNotifications(5).then(fetchedNotifications => {
      setNotifications(fetchedNotifications);
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    });
  }, [fetchNotifications]);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      onClose(); // Close dropdown
      navigate(notification.link);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          <span>{translations?.notifications || 'Notifications'}</span>
          {unreadCount > 0 && (
            <span className="ml-2 text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Check className="h-3 w-3 mr-1" />
            <span>{translations?.markAllAsRead || 'Mark all as read'}</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto" style={{ maxHeight: '350px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="h-5 w-5 text-blue-500 animate-spin mr-2" />
            <span className="text-gray-500 text-sm">{translations?.loading || 'Loading...'}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">
              {translations?.noNotifications || 'No notifications yet'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map(notification => (
              <NotificationItem 
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={onViewAll}
          className="w-full flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 py-1"
        >
          <span>{translations?.viewAllNotifications || 'View all notifications'}</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;