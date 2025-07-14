import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, ArrowUp, Building2, Users, Star, CheckCircle, CreditCard } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, CountQuerySnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';

const Dashboard = () => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    claimedCompanies: 0,
    subscribedCompanies: 0, // Placeholder as 0 for now
    totalReviews: 0,
    claimRate: 0
  });

  const calculateStats = async () => {
    try {
      setLoading(true);
      
      // Get companies data
      const companiesQuery = query(collection(db, 'companies'));
      const companiesCountSnapshot = await getCountFromServer(companiesQuery);
      const totalCompanies = companiesCountSnapshot.data().count;
      
      // Get claimed companies
      const claimedCompaniesQuery = query(
        collection(db, 'companies'),
        where('claimed', '==', true)
      );
      const claimedCompaniesCountSnapshot = await getCountFromServer(claimedCompaniesQuery);
      const claimedCompanies = claimedCompaniesCountSnapshot.data().count;
      
      // Get reviews count
      const reviewsQuery = query(collection(db, 'reviews'));
      const reviewsCountSnapshot = await getCountFromServer(reviewsQuery);
      const totalReviews = reviewsCountSnapshot.data().count;
      
      // Calculate claim rate
      const claimRate = totalCompanies > 0 ? (claimedCompanies / totalCompanies) * 100 : 0;
      
      setStats({
        totalCompanies,
        claimedCompanies,
        subscribedCompanies: 0, // Placeholder
        totalReviews,
        claimRate: Math.round(claimRate)
      });
      
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();
  }, []);

  // Render a horizontal bar chart for claim rate
  const renderClaimRateChart = () => {
    return (
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
              {translations?.claimRate || 'Claim Rate'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-blue-600">
              {stats.claimRate}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
          <div 
            style={{ width: `${stats.claimRate}%` }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
          ></div>
        </div>
      </div>
    );
  };

  // Render a pie chart for claimed vs unclaimed companies
  const renderCompanyStatusChart = () => {
    const claimedPercentage = stats.claimRate;
    const unclaimedPercentage = 100 - claimedPercentage;
    
    return (
      <div className="relative">
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 relative">
            <div 
              className="absolute bg-green-500" 
              style={{
                width: '100%',
                height: '100%',
                clipPath: `polygon(50% 50%, 50% 0%, ${claimedPercentage > 50 ? '100% 0%' : `${50 + (claimedPercentage/100) * 50}% 0%`}, ${claimedPercentage > 75 ? '100% 100%' : `${claimedPercentage > 25 ? '100% 0%' : '50% 0%'}`}, ${claimedPercentage > 75 ? '0% 100%' : `${claimedPercentage > 50 ? '0% 100%' : '50% 0%'}`}, ${claimedPercentage > 25 ? '0% 0%' : '50% 0%'})`
              }}
            ></div>
            <div 
              className="absolute bg-gray-400" 
              style={{
                width: '100%',
                height: '100%',
                clipPath: `polygon(50% 50%, 50% 0%, ${unclaimedPercentage > 50 ? '0% 0%' : `${50 - (unclaimedPercentage/100) * 50}% 0%`}, ${unclaimedPercentage > 75 ? '0% 0%' : `${unclaimedPercentage > 25 ? '0% 0%' : '50% 0%'}`}, ${unclaimedPercentage > 75 ? '100% 0%' : `${unclaimedPercentage > 50 ? '100% 0%' : '50% 0%'}`}, ${unclaimedPercentage > 25 ? '100% 100%' : '50% 0%'})`
              }}
            ></div>
          </div>
        </div>

        <div className="mt-4 flex justify-center space-x-6">
          <div className="flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-xs text-gray-600">
              {translations?.claimed || 'Claimed'} ({stats.claimedCompanies})
            </span>
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
            <span className="text-xs text-gray-600">
              {translations?.unclaimed || 'Unclaimed'} ({stats.totalCompanies - stats.claimedCompanies})
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <BarChart className="h-6 w-6" style={{ color: '#194866' }} />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
              {translations?.adminDashboard || 'Admin Dashboard'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {translations?.platformOverview || 'Platform overview and key metrics'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Companies */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                {translations?.totalCompanies || 'Total Companies'}
              </h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalCompanies.toLocaleString()}
              </div>
            </div>

            {/* Claimed Companies */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                {translations?.claimedCompanies || 'Claimed Companies'}
              </h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.claimedCompanies.toLocaleString()}
              </div>
            </div>

            {/* Subscribed Companies */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                {translations?.subscribedCompanies || 'Subscribed Companies'}
              </h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.subscribedCompanies.toLocaleString()}
              </div>
            </div>

            {/* Total Reviews */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-700">
                {translations?.totalReviews || 'Total Reviews'}
              </h3>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalReviews.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claim Rate Chart */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                {translations?.companiesClaimRate || 'Companies Claim Rate'}
              </h3>
              {renderClaimRateChart()}
              <p className="text-sm text-gray-500 mt-4">
                {translations?.claimRateExplanation || 
                 'The percentage of companies that have been claimed by their owners.'}
              </p>
            </div>

            {/* Company Status Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                {translations?.companyStatusDistribution || 'Company Status Distribution'}
              </h3>
              {renderCompanyStatusChart()}
              <p className="text-sm text-gray-500 mt-4 text-center">
                {translations?.companyStatusExplanation || 
                 'Distribution of claimed vs. unclaimed companies on the platform.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;