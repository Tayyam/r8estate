@@ .. @@
   return (
     <div>
       {/* Notification Messages */}
+      
+      {/* Form */}
+      <form onSubmit={handleSubmit} className="space-y-6">
+        {/* Company Information */}
+        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
+          <h2 className="text-lg font-medium text-gray-900 mb-4">
+            {translations?.companyInformation || 'Company Information'}
+          </h2>
+          
+          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
+            {/* Company Name */}
+            <div>
+              <label className="block text-sm font-medium text-gray-700 mb-1">
+                {translations?.companyName || 'Company Name'} *
+              </label>
+              <div className="relative">
+                <Building2 className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
+                <input
   )
+                  type="text"
+                  required
+                  value={formData.name}
+                  onChange={(e) => handleInputChange('name', e.target.value)}
+                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
+                  placeholder={translations?.enterCompanyName || 'Enter company name'}
+                />
+              </div>
+            </div>
+
+            {/* Email */}
+            <div>
+              <label className="block text-sm font-medium text-gray-700 mb-1">
+                {translations?.companyEmail || 'Company Email'}
+              </label>
+              <div className="relative">
+                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
+                <input
+                  type="email"
+                  value={formData.email || company.email || ''}
+                  onChange={(e) => handleInputChange('email', e.target.value)}
+                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
+                  placeholder={translations?.enterCompanyEmail || 'Enter company email'}
+                />
+              </div>
+            </div>