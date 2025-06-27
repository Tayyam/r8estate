import React from 'react';

interface NotificationMessagesProps {
  error: string;
  success: string;
}

const NotificationMessages: React.FC<NotificationMessagesProps> = ({ error, success }) => {
  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-xl p-4 z-50 max-w-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-xl p-4 z-50 max-w-md">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}
    </>
  );
};

export default NotificationMessages;