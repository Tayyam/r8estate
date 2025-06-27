import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationModal, NotificationType } from '../../contexts/NotificationContext';

interface ModalProps {
  modal: NotificationModal;
  onClose: (id: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const Modal: React.FC<ModalProps> = ({ modal, onClose, onConfirm, onCancel }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Get modal styling based on type
  const getModalStyling = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          confirmBg: 'bg-green-600 hover:bg-green-700',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
          borderColor: 'border-yellow-200'
        };
      case 'info':
        return {
          icon: Info,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          icon: Info,
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600',
          confirmBg: 'bg-gray-600 hover:bg-gray-700',
          borderColor: 'border-gray-200'
        };
    }
  };

  const styling = getModalStyling(modal.type);
  const IconComponent = styling.icon;

  const handleConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    if (onConfirm) {
      onConfirm();
    }
    onClose(modal.id);
  };

  const handleCancel = () => {
    if (modal.onCancel) {
      modal.onCancel();
    }
    if (onCancel) {
      onCancel();
    }
    onClose(modal.id);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{
        animation: 'modalFadeIn 0.3s ease-out'
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)'
        }}
        onClick={handleBackdropClick}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 w-full max-w-md border-2 ${styling.borderColor}`}
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 z-10 rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-all duration-200 hover:scale-110"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${styling.iconBg} mb-6`}>
              <IconComponent className={`h-8 w-8 ${styling.iconColor}`} />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {modal.title}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              {modal.message}
            </p>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-center space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
              {modal.showCancel && (
                <button
                  onClick={handleCancel}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 transform hover:scale-105"
                >
                  {modal.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`w-full sm:w-auto px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${styling.confirmBg}`}
              >
                {modal.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;