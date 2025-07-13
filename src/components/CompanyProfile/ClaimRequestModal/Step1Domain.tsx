import React from 'react';
import { Globe, Check } from 'lucide-react';

interface Step1DomainProps {
  companyDomain: string;
  handleDomainChoice: (hasDomain: boolean) => void;
  translations: any;
  supervisorEmail: string;
  setSupervisorEmail: (email: string) => void;
}

const Step1Domain: React.FC<Step1DomainProps> = ({
  companyDomain,
  handleDomainChoice,
  translations,
  supervisorEmail,
  setSupervisorEmail
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="h-8 w-8 text-blue-600" />
        </div>
        <h4 className="text-lg font-bold text-gray-900 mb-2">
          {translations?.domainVerification || 'Company Domain Verification'}
        </h4>
        <p className="text-gray-600">
          {translations?.domainVerificationQuestion || 'Do you have an email address with the company domain?'} 
          {companyDomain ? ` (@${companyDomain})` : ''}
        </p>
      </div>
      
      <div className="flex flex-col space-y-3">
        {companyDomain && (
          <div className="space-y-4">
            <button
              onClick={() => handleDomainChoice(true)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <Check className="h-5 w-5" />
              <span>
                {translations?.yesHaveDomainEmail || 'Yes, I have an email with'} @{companyDomain}
              </span>
            </button>
            
            <div>
              <label htmlFor="supervisorEmail" className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.supervisorEmail || 'Supervisor Email'} *
              </label>
              <input
                id="supervisorEmail"
                type="email"
                value={supervisorEmail}
                onChange={(e) => setSupervisorEmail(e.target.value)}
                placeholder={translations?.enterSupervisorEmail || 'Enter supervisor email address'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {translations?.supervisorEmailHelp || "Your supervisor's email will be used to verify your company claim."}
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => handleDomainChoice(false)}
          className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
        >
          {translations?.noDontHaveDomainEmail || 'No, I don\'t have a company email'}
        </button>
      </div>
    </div>
  );
};

export default Step1Domain;