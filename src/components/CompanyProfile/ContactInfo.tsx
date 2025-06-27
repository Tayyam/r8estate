import React from 'react';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface ContactInfoProps {
  company: CompanyProfileType;
  getGovernorateName: (id: string) => string;
}

const ContactInfo: React.FC<ContactInfoProps> = ({ company, getGovernorateName }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <Mail className="h-5 w-5 text-gray-400" />
          <span className="text-gray-700">{company.email}</span>
        </div>
        {company.phone && (
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Phone className="h-5 w-5 text-gray-400" />
            <span className="text-gray-700">{company.phone}</span>
          </div>
        )}
        {company.website && (
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Globe className="h-5 w-5 text-gray-400" />
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
              {company.website}
            </a>
          </div>
        )}
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <MapPin className="h-5 w-5 text-gray-400" />
          <span className="text-gray-700">{getGovernorateName(company.location)}</span>
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;