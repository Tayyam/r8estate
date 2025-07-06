import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Notification as NotificationType } from '../../types/notification';
import NotificationItem from '../Header/NotificationItem';
import { ArrowLeft, Bell, Check, Filter, Loader, Trash2 } from 'lucide-react';

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { fetchAllNotifications, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotification();
  const { translations } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  // Load all notifications
  useEffect(() => {
    setLoading(true);
    fetchAllNotifications().then(fetchedNotifications => {
      setNotifications(fetchedNotifications);
      setLoading(false);
    }).catch(error => {
      console.error('Error fetching all notifications:', error);
      setLoading(false);
    });
  }, [fetchAllNotifications]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'read') return notification.isRead;
    if (filter === 'unread') return !notification.isRead;
    return true;
  });

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle delete all notifications
  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle back
  const handleBack = () => {
    if (onNavigate) {
      onNavigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span>{translations?.back || 'Back'}</span>
            </button>
            
            <h1 className="text-2xl font-bold text-center flex-1 text-gray-900">
              {translations?.notifications || 'Notifications'}
            </h1>
            
            <div className="w-20"></div> {/* Empty div for centering */}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Action Toolbar */}
          <div className="px-4 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            {/* Filter */}
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-gray-500 mr-2" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
                <option value="all">{translations?.allNotifications || 'All Notifications'}</option>
                <option value="unread">{translations?.unread || 'Unread'}</option>
                <option value="read">{translations?.read || 'Read'}</option>
              </select>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-gray-100"
                disabled={!notifications.some(n => !n.isRead)}
              >
                <Check className="h-4 w-4" />
                <span>{translations?.markAllAsRead || 'Mark all as read'}</span>
              </button>
              
              <button
                onClick={handleDeleteAll}
                className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-gray-100"
                disabled={notifications.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                <span>{translations?.deleteAll || 'Delete all'}</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="h-6 w-6 text-blue-500 animate-spin mr-3" />
                <span className="text-gray-600">{translations?.loadingNotifications || 'Loading notifications...'}</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'all' 
                    ? (translations?.noNotifications || 'No notifications')
                    : filter === 'unread' 
                      ? (translations?.noUnreadNotifications || 'No unread notifications')
                      : (translations?.noReadNotifications || 'No read notifications')}
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {translations?.notificationsWillAppearHere || 'New notifications will appear here as you interact with the platform.'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredNotifications.map(notification => (
                  <NotificationItem 
                    key={notification.id}
                    notification={notification}
                    onClick={() => {}} // Handle navigation in the item itself
                    showDelete
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;