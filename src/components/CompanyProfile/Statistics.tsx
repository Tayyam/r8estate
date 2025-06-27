import React from 'react';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface StatisticsProps {
  company: CompanyProfileType;
}

const Statistics: React.FC<StatisticsProps> = ({ company }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Statistics</h3>
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{company.totalReviews || 0}</div>
          <div className="text-sm text-gray-600">Total Reviews</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{company.totalRating || 0}</div>
          <div className="text-sm text-gray-600">Average Rating</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{company.verified ? 'Yes' : 'No'}</div>
          <div className="text-sm text-gray-600">Verified</div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;