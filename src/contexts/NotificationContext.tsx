import React, { createContext, useContext, useState, ReactNode } from 'react';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, deleteDoc, doc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification } from '../types/notification';
import { useAuth } from './AuthContext';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationModal {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export interface NotificationToast {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  // Modals
  showModal: (modal: Omit<NotificationModal, 'id'>) => void;
  hideModal: (id: string) => void;
  hideAllModals: () => void;
  
  // Toasts
  showToast: (toast: Omit<NotificationToast, 'id'>) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  
  // Quick methods
  showSuccessModal: (title: string, message: string, onConfirm?: () => void) => void;
  showErrorModal: (title: string, message: string, onConfirm?: () => void) => void;
  showWarningModal: (title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => void;
  showInfoModal: (title: string, message: string, onConfirm?: () => void) => void;
  
  showSuccessToast: (title: string, message: string, duration?: number) => void;
  showErrorToast: (title: string, message: string, duration?: number) => void;
  showWarningToast: (title: string, message: string, duration?: number) => void;
  showInfoToast: (title: string, message: string, duration?: number) => void;
  
  // State
  modals: NotificationModal[];
  toasts: NotificationToast[];
}

interface NotificationContextExtendedType extends NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: (count?: number) => Promise<Notification[]>;
  fetchAllNotifications: () => Promise<Notification[]>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextExtendedType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context as NotificationContextExtendedType;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<NotificationModal[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { currentUser } = useAuth();

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Listen for notifications
  React.useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    // Create query for user's notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(100) // Limit to last 100 notifications to avoid performance issues
    );
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];
      
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.isRead).length);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });
    
    return () => unsubscribe();
  }, [currentUser]);
  
  // Fetch recent notifications
  const fetchNotifications = async (count = 5): Promise<Notification[]> => {
    if (!currentUser) return [];
    
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(count)
      );
      
      const snapshot = await getDocs(q);
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];
      
      return fetchedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  };
  
  // Fetch all notifications
  const fetchAllNotifications = async (): Promise<Notification[]> => {
    if (!currentUser) return [];
    
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Notification[];
      
      return fetchedNotifications;
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      return [];
    }
  };
  
  // Mark notification as read
  const markAsRead = async (id: string): Promise<void> => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'notifications', id), {
        isRead: true
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { isRead: true });
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };
  
  // Delete notification
  const deleteNotification = async (id: string): Promise<void> => {
    if (!currentUser) return;
    
    try {
      await deleteDoc(doc(db, 'notifications', id));
      
      // Update local state
      const notificationToDelete = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notificationToDelete && !notificationToDelete.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };
  
  // Delete all notifications
  const deleteAllNotifications = async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      const batch = writeBatch(db);
      
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  };
  
  // Refresh notifications
  const refreshNotifications = () => {
    fetchNotifications().then(fetchedNotifications => {
      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter(n => !n.isRead).length);
    }).catch(error => {
      console.error('Error refreshing notifications:', error);
    });
  };
  
  // Modal methods
  const showModal = (modal: Omit<NotificationModal, 'id'>) => {
    const newModal: NotificationModal = {
      ...modal,
      id: generateId(),
      showCancel: modal.showCancel ?? true
    };
    setModals(prev => [...prev, newModal]);
  };

  const hideModal = (id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  };

  const hideAllModals = () => {
    setModals([]);
  };

  // Toast methods
  const showToast = (toast: Omit<NotificationToast, 'id'>) => {
    const newToast: NotificationToast = {
      ...toast,
      id: generateId(),
      duration: toast.duration ?? 5000
    };
    setToasts(prev => [...prev, newToast]);

    // Auto hide toast
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(newToast.id);
      }, newToast.duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const hideAllToasts = () => {
    setToasts([]);
  };

  // Quick modal methods
  const showSuccessModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({
      type: 'success',
      title,
      message,
      onConfirm,
      showCancel: false,
      confirmText: 'OK'
    });
  };

  const showErrorModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({
      type: 'error',
      title,
      message,
      onConfirm,
      showCancel: false,
      confirmText: 'OK'
    });
  };

  const showWarningModal = (title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => {
    showModal({
      type: 'warning',
      title,
      message,
      onConfirm,
      onCancel,
      showCancel: true,
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
  };

  const showInfoModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({
      type: 'info',
      title,
      message,
      onConfirm,
      showCancel: false,
      confirmText: 'OK'
    });
  };

  // Quick toast methods
  const showSuccessToast = (title: string, message: string, duration?: number) => {
    showToast({ type: 'success', title, message, duration });
  };

  const showErrorToast = (title: string, message: string, duration?: number) => {
    showToast({ type: 'error', title, message, duration });
  };

  const showWarningToast = (title: string, message: string, duration?: number) => {
    showToast({ type: 'warning', title, message, duration });
  };

  const showInfoToast = (title: string, message: string, duration?: number) => {
    showToast({ type: 'info', title, message, duration });
  };

  const value: NotificationContextType = {
    showModal,
    hideModal,
    hideAllModals,
    showToast,
    hideToast,
    hideAllToasts,
    showSuccessModal,
    showErrorModal,
    showWarningModal,
    showInfoModal,
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    modals,
    toasts,
    // Add the new notification-related methods and state
    notifications,
    unreadCount,
    fetchNotifications,
    fetchAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};