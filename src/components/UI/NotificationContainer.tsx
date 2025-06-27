import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import Modal from './Modal';
import Toast from './Toast';

const NotificationContainer: React.FC = () => {
  const { modals, toasts, hideModal, hideToast } = useNotification();

  return (
    <>
      {/* Modals */}
      {modals.map((modal) => (
        <Modal
          key={modal.id}
          modal={modal}
          onClose={hideModal}
        />
      ))}

      {/* Toasts Container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
          {toasts.map((toast, index) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                toast={toast}
                onClose={hideToast}
                index={index}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationContainer;