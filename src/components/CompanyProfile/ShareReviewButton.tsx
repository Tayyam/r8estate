import React, { useState } from 'react';
import { Share2, Check, Copy, Link } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ShareReviewButtonProps {
  reviewId: string;
  companyId: string;
  companyName: string;
}

const ShareReviewButton: React.FC<ShareReviewButtonProps> = ({
  reviewId,
  companyId,
  companyName
}) => {
  const { translations } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Format company name for URL
  const formatCompanyNameForUrl = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  // Create shareable link
  const getShareableLink = () => {
    const baseUrl = 'https://r8estate.netlify.app';
    const companySlug = formatCompanyNameForUrl(companyName);
    return `${baseUrl}/company/${companySlug}/${companyId}/reviews?review=${reviewId}`;
  };

  // Copy link to clipboard
  const copyToClipboard = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setShowDropdown(false);
  };

  // Share on social platforms
  const shareOnSocial = (platform: string) => {
    const link = getShareableLink();
    const text = translations?.checkOutThisReview || 'Check out this review on R8ESTATE';
    
    let shareUrl = '';
    
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ': ' + link)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank');
    setShowDropdown(false);
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1 rtl:space-x-reverse px-2 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors duration-200"
        title={translations?.shareReview || 'Share Review'}
      >
        <Share2 className="h-4 w-4" />
        <span>{translations?.share || 'Share'}</span>
      </button>

      {/* Share Options Dropdown */}
      {showDropdown && (
        <div 
          className="absolute z-10 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden right-0 rtl:left-0 rtl:right-auto w-48"
          onClick={handleClickOutside}
        >
          <div className="p-2">
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600" />
              )}
              <span>{copied ? (translations?.copied || 'Copied!') : (translations?.copyLink || 'Copy Link')}</span>
            </button>
            <button
              onClick={() => shareOnSocial('whatsapp')}
              className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
            >
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12.001 21.75c-2.366 0-4.665-.78-6.559-2.232l-.442-.337-4.604 1.21 1.235-4.502-.355-.449a9.739 9.739 0 01-2.026-6.054C-.75 4.289 4.729-.75 12.001-.75S24.75 4.289 24.75 9.386c0 5.098-5.479 12.364-12.749 12.364zm-6.248-3.787c2.074 1.563 4.418 2.287 6.248 2.287 5.986 0 11.249-6.093 11.249-10.114 0-4.022-4.5-8.636-11.25-8.636S1 5.537 1 9.386c0 1.913.644 3.717 1.809 5.227l-1.193 3.682 4.136-1.083z" />
              </svg>
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => shareOnSocial('facebook')}
              className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
            >
              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.991 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.064 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
            <button
              onClick={() => shareOnSocial('twitter')}
              className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
            >
              <svg className="h-4 w-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              <span>Twitter</span>
            </button>
            <button
              onClick={() => shareOnSocial('telegram')}
              className="w-full flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
            >
              <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.269c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394a.75.75 0 01-.6.242l.213-3.035 5.532-5.003c.24-.213-.052-.332-.373-.119l-6.834 4.302-2.948-.925c-.64-.204-.653-.64.135-.954l11.515-4.446c.528-.196.994.126.812.977z" />
              </svg>
              <span>Telegram</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareReviewButton;