import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { Notification } from '../types/notification';
import { useAuth } from './AuthContext';
import { asDate } from '../utils/asDate';

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
  showModal: (modal: Omit<NotificationModal, 'id'>) => void;
  hideModal: (id: string) => void;
  hideAllModals: () => void;
  showToast: (toast: Omit<NotificationToast, 'id'>) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  showSuccessModal: (title: string, message: string, onConfirm?: () => void) => void;
  showErrorModal: (title: string, message: string, onConfirm?: () => void) => void;
  showWarningModal: (title: string, message: string, onConfirm?: () => void, onCancel?: () => void) => void;
  showInfoModal: (title: string, message: string, onConfirm?: () => void) => void;
  showSuccessToast: (title: string, message: string, duration?: number) => void;
  showErrorToast: (title: string, message: string, duration?: number) => void;
  showWarningToast: (title: string, message: string, duration?: number) => void;
  showInfoToast: (title: string, message: string, duration?: number) => void;
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

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.userId as string,
    title: row.title as string,
    message: row.message as string,
    type: row.type as Notification['type'],
    isRead: !!row.isRead,
    relatedId: (row.relatedId as string) || undefined,
    link: (row.link as string) || undefined,
    createdAt: asDate(row.createdAt),
  };
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<NotificationModal[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { currentUser } = useAuth();

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const loadList = async (count?: number) => {
    if (!currentUser) return [];
    let q = supabase
      .from('notifications')
      .select('*')
      .eq('userId', currentUser.uid)
      .order('createdAt', { ascending: false });
    if (count) q = q.limit(count);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      return [];
    }
    return (data || []).map((r) => mapRow(r as Record<string, unknown>));
  };

  React.useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      const list = await loadList(100);
      if (cancelled) return;
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    };
    void refresh();

    const channel = supabase
      .channel(`notifications:${currentUser.uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${currentUser.uid}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.uid]);

  const fetchNotifications = async (count = 5): Promise<Notification[]> => loadList(count);

  const fetchAllNotifications = async (): Promise<Notification[]> => loadList();

  const markAsRead = async (id: string): Promise<void> => {
    if (!currentUser) return;
    const { error } = await supabase.from('notifications').update({ isRead: true }).eq('id', id);
    if (error) throw error;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('userId', currentUser.uid)
      .eq('isRead', false);
    if (error) throw error;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string): Promise<void> => {
    if (!currentUser) return;
    const notificationToDelete = notifications.find((n) => n.id === id);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (notificationToDelete && !notificationToDelete.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const deleteAllNotifications = async (): Promise<void> => {
    if (!currentUser) return;
    const { error } = await supabase.from('notifications').delete().eq('userId', currentUser.uid);
    if (error) throw error;
    setNotifications([]);
    setUnreadCount(0);
  };

  const refreshNotifications = () => {
    loadList(100)
      .then((fetched) => {
        setNotifications(fetched);
        setUnreadCount(fetched.filter((n) => !n.isRead).length);
      })
      .catch(console.error);
  };

  const showModal = (modal: Omit<NotificationModal, 'id'>) => {
    const newModal: NotificationModal = {
      ...modal,
      id: generateId(),
      showCancel: modal.showCancel ?? true,
    };
    setModals((prev) => [...prev, newModal]);
  };

  const hideModal = (id: string) => {
    setModals((prev) => prev.filter((modal) => modal.id !== id));
  };

  const hideAllModals = () => {
    setModals([]);
  };

  const showToast = (toast: Omit<NotificationToast, 'id'>) => {
    const newToast: NotificationToast = {
      ...toast,
      id: generateId(),
      duration: toast.duration ?? 5000,
    };
    setToasts((prev) => [...prev, newToast]);
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => hideToast(newToast.id), newToast.duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const hideAllToasts = () => {
    setToasts([]);
  };

  const showSuccessModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({ type: 'success', title, message, onConfirm, showCancel: false, confirmText: 'OK' });
  };

  const showErrorModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({ type: 'error', title, message, onConfirm, showCancel: false, confirmText: 'OK' });
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
      cancelText: 'Cancel',
    });
  };

  const showInfoModal = (title: string, message: string, onConfirm?: () => void) => {
    showModal({ type: 'info', title, message, onConfirm, showCancel: false, confirmText: 'OK' });
  };

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
    notifications,
    unreadCount,
    fetchNotifications,
    fetchAllNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
