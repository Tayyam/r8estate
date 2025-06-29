import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, User, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';

interface ContactProps {
  onNavigate: (page: string) => void;
}

const Contact: React.FC<ContactProps> = ({ onNavigate }) => {
  const { translations, language } = useLanguage();
  const { showSuccessToast } = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  // Get translations with English fallback
  const text = {
    contactUs: translations?.contactUs || 'Contact Us',
    contactUsSubtitle: translations?.contactUsSubtitle || 'We\'re here to help you. For inquiries, please email us at info@r8estate.com or use the form below.',
    contactInfo: translations?.contactInfo || 'Contact Information',
    getInTouch: translations?.getInTouch || 'Get in Touch',
    name: translations?.name || 'Name',
    email: translations?.email || 'Email',
    subject: translations?.subject || 'Subject',
    message: translations?.message || 'Message',
    sendMessage: translations?.sendMessage || 'Send Message',
    namePlaceholder: translations?.namePlaceholder || 'Enter your full name',
    emailPlaceholder: translations?.emailPlaceholder || 'Enter your email address',
    subjectPlaceholder: translations?.subjectPlaceholder || 'Enter your message subject',
    messagePlaceholder: translations?.messagePlaceholder || 'Write your message here...',
    emailAddress: translations?.emailAddress || 'info@r8estate.com',
    phoneNumber: translations?.phoneNumber || '+20 123 456 7890',
    address: translations?.address || 'Cairo, Egypt',
    businessHours: translations?.businessHours || 'Business Hours',
    workingHours: translations?.workingHours || 'Sunday - Thursday: 9:00 AM - 6:00 PM',
    responseTime: translations?.responseTime || 'Response Time',
    responseTimeText: translations?.responseTimeText || 'We usually respond within 24 hours',
    messageSent: translations?.messageSent || 'Thank you! Your message has been sent.'
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    showSuccessToast(
      translations?.messageSent || 'Message Sent!',
      translations?.messageSentDesc || 'We have received your message and will get back to you soon.',
      5000
    );
    
    setFormData({ name: '', email: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-xl" style={{ backgroundColor: '#194866' }}>
              <MessageSquare className="h-10 w-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
              {text.contactUs}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 leading-relaxed">
              {text.contactUsSubtitle}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6" style={{ color: '#194866' }}>
                  {text.contactInfo}
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 rounded-full mb-8"></div>
              </div>

              {/* Contact Details */}
              <div className="space-y-6">
                <div className="flex items-center space-x-4 rtl:space-x-reverse p-6 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    </h3>
                    <p className="text-gray-600">{text.emailAddress}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 rtl:space-x-reverse p-6 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </h3>
                    <p className="text-gray-600">{text.phoneNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 rtl:space-x-reverse p-6 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {language === 'ar' ? 'العنوان' : 'Address'}
                    </h3>
                    <p className="text-gray-600">{text.address}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-blue-50 p-6 rounded-xl text-center hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">
                    {text.businessHours}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {text.workingHours}
                  </p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl text-center hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">
                    {text.responseTime}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {text.responseTimeText}
                  </p>
                </div>
              </div>

              {/* Map View - For illustration, just a placeholder */}
              <div className="bg-gray-200 rounded-xl overflow-hidden h-64 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-600 text-center">
                    Map will be embedded here
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-3xl font-bold mb-6" style={{ color: '#194866' }}>
                {text.getInTouch}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 rounded-full mb-8"></div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {text.name} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 rtl:right-3 rtl:left-auto flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={text.namePlaceholder}
                      className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {text.email} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 rtl:right-3 rtl:left-auto flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={text.emailPlaceholder}
                      className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Subject Field */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    {text.subject} *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 rtl:right-3 rtl:left-auto flex items-center pointer-events-none">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder={text.subjectPlaceholder}
                      className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                      dir={language === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {text.message} *
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    required
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder={text.messagePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-vertical"
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl disabled:opacity-70"
                  style={{ backgroundColor: '#194866' }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#0f3147';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.backgroundColor = '#194866';
                    }
                  }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>{text.sendMessage}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Contact;