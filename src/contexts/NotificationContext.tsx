import React, { createContext, useContext, useState, ReactNode } from 'react';

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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [modals, setModals] = useState<NotificationModal[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

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
    toasts
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};