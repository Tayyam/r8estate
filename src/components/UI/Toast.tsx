import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationToast, NotificationType } from '../../contexts/NotificationContext';

interface ToastProps {
  toast: NotificationToast;
  onClose: (id: string) => void;
  index: number;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose, index }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Show animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (toast.duration! / 100));
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toast.duration]);

  // Get toast styling based on type
  const getToastStyling = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bg: 'bg-white',
          border: 'border-green-200',
          progressBar: 'bg-green-500'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bg: 'bg-white',
          border: 'border-red-200',
          progressBar: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          bg: 'bg-white',
          border: 'border-yellow-200',
          progressBar: 'bg-yellow-500'
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bg: 'bg-white',
          border: 'border-blue-200',
          progressBar: 'bg-blue-500'
        };
      default:
        return {
          icon: Info,
          iconColor: 'text-gray-600',
          bg: 'bg-white',
          border: 'border-gray-200',
          progressBar: 'bg-gray-500'
        };
    }
  };

  const styling = getToastStyling(toast.type);
  const IconComponent = styling.icon;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300);
  };

  return (
    <div
      className={`relative transform transition-all duration-300 ease-out ${
        isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
      style={{
        transform: `translateY(${index * -8}px)`,
        zIndex: 1000 - index
      }}
    >
      <div className={`w-full max-w-sm ${styling.bg} rounded-xl shadow-lg border-2 ${styling.border} overflow-hidden`}>
        {/* Progress Bar */}
        {toast.duration && toast.duration > 0 && (
          <div className="h-1 bg-gray-200">
            <div 
              className={`h-full transition-all duration-100 ease-linear ${styling.progressBar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            {/* Icon */}
            <div className="flex-shrink-0">
              <IconComponent className={`h-6 w-6 ${styling.iconColor}`} />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {toast.title}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {toast.message}
              </p>

              {/* Action Button */}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    handleClose();
                  }}
                  className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 hover:scale-110"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;