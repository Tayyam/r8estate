import React from 'react';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">تم إغلاق الموقع</h1>
        <p className="text-gray-700 text-lg">
          عذرًا، هذا الموقع غير متاح حاليًا. الرجاء المحاولة لاحقًا.
        </p>
      </div>
    </div>
  );
};

export default App;
