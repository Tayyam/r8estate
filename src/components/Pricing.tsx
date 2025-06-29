import React, { useState } from 'react';
import { Check, Star, Zap, Shield, Users, BarChart3, MessageSquare, Crown, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Pricing = () => {
  const { translations } = useLanguage();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const plans = [
    {
      id: 'free',
      name: translations?.freePlan || 'Free',
      price: translations?.freePrice || '£0',
      priceEn: '£0',
      period: '',
      description: translations?.forStartups || 'For startups',
      icon: Users,
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      features: [
        translations?.basicCompanyProfile || 'Basic company profile',
        translations?.viewReviews || 'View reviews',
        translations?.basicStatistics || 'Basic statistics',
        translations?.emailSupport || 'Email support'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: translations?.proPlan || 'Professional',
      price: translations?.proPrice || '£299',
      priceEn: '£299',
      period: translations?.monthlyPeriod || '/ monthly',
      description: translations?.forGrowingCompanies || 'For growing companies',
      icon: Star,
      color: '#194866',
      bgColor: 'rgba(25, 72, 102, 0.1)',
      features: [
        translations?.allFreePlanFeatures || 'All free plan features',
        translations?.replyToReviews || 'Reply to reviews',
        translations?.advancedAnalytics || 'Advanced analytics',
        translations?.detailedInsights || 'Detailed insights',
        translations?.prioritySupport || 'Priority support',
        translations?.customBranding || 'Custom branding',
        translations?.multiUserManagement || 'Multi-user management',
        translations?.monthlyReports || 'Monthly reports'
      ],
      popular: true
    }
  ];

  const features = [
    {
      icon: BarChart3,
      title: translations?.advancedAnalyticsTitle || 'Advanced Analytics',
      description: translations?.advancedAnalyticsDesc || 'Get detailed insights into your company performance and customer reviews',
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)'
    },
    {
      icon: MessageSquare,
      title: translations?.replyToReviewsTitle || 'Reply to Reviews',
      description: translations?.replyToReviewsDesc || 'Engage with your customers by responding to their reviews and building trust',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.1)'
    },
    {
      icon: Shield,
      title: translations?.prioritySupportTitle || 'Priority Support',
      description: translations?.prioritySupportDesc || 'Get fast and dedicated support from our specialized team',
      color: '#8B5CF6',
      bgColor: 'rgba(139, 92, 246, 0.1)'
    }
  ];

  const faqItems = [
    {
      question: translations?.faqQuestion1 || 'Can I change my plan at any time?',
      answer: translations?.faqAnswer1 || 'Yes, you can upgrade or downgrade your plan at any time. Changes will be applied immediately and billing will be adjusted accordingly.'
    },
    {
      question: translations?.faqQuestion2 || 'What payment methods are available?',
      answer: translations?.faqAnswer2 || 'We accept all major credit cards, bank transfers, and mobile payments via Vodafone Cash and Orange Money.'
    },
    {
      question: translations?.faqQuestion3 || 'Are there any additional fees?',
      answer: translations?.faqAnswer3 || 'No, all prices are inclusive and there are no hidden fees. What you see is what you pay.'
    },
    {
      question: translations?.faqQuestion4 || 'Can I cancel my subscription at any time?',
      answer: translations?.faqAnswer4 || 'Yes, you can cancel your subscription at any time with no commitments. You\'ll retain access until the end of your current billing period.'
    },
    {
      question: translations?.faqQuestion5 || 'Do you offer discounts for large companies?',
      answer: translations?.faqAnswer5 || 'Yes, we offer custom plans and discounts for large companies and institutions. Contact us to discuss your needs.'
    }
  ];

  const handleSubscribe = (planId: string) => {
    console.log(`Subscribe to plan: ${planId}`);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-8 shadow-xl" style={{ backgroundColor: '#194866' }}>
              <Crown className="h-10 w-10" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.pricingTitle || 'Choose the Right Plan for Your Company'}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 leading-relaxed">
              {translations?.pricingSubtitle || 'Flexible plans suitable for real estate companies of all sizes'}
            </p>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ backgroundColor: '#EE183F' }}></div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {plans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl shadow-lg p-8 transition-all duration-300 hover:scale-105 relative overflow-hidden ${
                    plan.popular 
                      ? 'border-2 shadow-2xl' 
                      : 'border-2 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: plan.popular ? '#194866' : undefined
                  }}
                >
                  {/* Most Popular Badge */}
                  {plan.popular && (
                    <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto text-white px-8 py-3 rounded-bl-2xl rtl:rounded-br-2xl rtl:rounded-bl-none font-bold text-sm shadow-lg" style={{ backgroundColor: '#EE183F' }}>
                      {translations?.mostPopular || 'Most Popular'}
                    </div>
                  )}

                  <div className="text-center mb-8 mt-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-6 shadow-lg"
                      style={{ 
                        backgroundColor: plan.popular ? '#194866' : plan.color,
                        background: plan.popular ? 'linear-gradient(135deg, #194866 0%, #EE183F 100%)' : undefined
                      }}
                    >
                      <IconComponent className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#194866' }}>
                      {plan.name}
                    </h3>
                    <div className="text-4xl font-bold mb-2" style={{ color: plan.popular ? '#194866' : '#6B7280' }}>
                      {plan.price}
                    </div>
                    <div className="text-lg text-gray-600 mb-4">
                      {plan.period}
                    </div>
                    <p className="text-gray-600">
                      {plan.description}
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: plan.popular ? 'rgba(25, 72, 102, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}
                        >
                          <Check className="h-4 w-4" style={{ color: plan.popular ? '#194866' : '#10B981' }} />
                        </div>
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 rtl:space-x-reverse ${
                      plan.popular 
                        ? 'text-white hover:scale-105' 
                        : 'border-2 text-gray-700 bg-white hover:border-gray-400'
                    }`}
                    style={{
                      backgroundColor: plan.popular ? '#194866' : undefined,
                      borderColor: plan.popular ? undefined : '#e5e7eb'
                    }}
                    onMouseEnter={(e) => {
                      if (plan.popular) {
                        e.target.style.backgroundColor = '#0f3147';
                      } else {
                        e.target.style.borderColor = '#194866';
                        e.target.style.color = '#194866';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (plan.popular) {
                        e.target.style.backgroundColor = '#194866';
                      } else {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.color = '#374151';
                      }
                    }}
                  >
                    {plan.popular && <Zap className="h-5 w-5" />}
                    <span>{plan.id === 'free' ? (translations?.getStartedFree || 'Get Started Free') : (translations?.subscribeNow || 'Subscribe Now')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20" style={{ backgroundColor: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.professionalPlanFeatures || 'Professional Plan Features'}
            </h2>
            <p className="text-xl text-gray-600">
              {translations?.professionalPlanSubtitle || 'Discover how the Professional plan can help your company grow'}
            </p>
            <div className="w-16 h-1 mx-auto rounded-full mt-4" style={{ backgroundColor: '#194866' }}></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent"
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = feature.color;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'transparent';
                  }}
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-6 shadow-lg"
                    style={{ backgroundColor: feature.color }}
                  >
                    <IconComponent className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: '#194866' }}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.faq || 'Frequently Asked Questions'}
            </h2>
            <p className="text-xl text-gray-600">
              {translations?.faqSubtitle || 'Answers to the most common questions about our plans'}
            </p>
            <div className="w-16 h-1 mx-auto rounded-full mt-4" style={{ backgroundColor: '#EE183F' }}></div>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-8 py-6 text-left rtl:text-right flex items-center justify-between transition-all duration-200"
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = openFaqIndex === index ? '#f1f5f9' : 'transparent';
                  }}
                >
                  <h3 className="text-lg font-bold text-gray-900 flex-1">
                    {item.question}
                  </h3>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                      openFaqIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {openFaqIndex === index && (
                  <div className="px-8 pb-6 pt-2">
                    <p className="text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #194866 0%, #EE183F 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white mx-auto mb-8 backdrop-blur-sm">
            <Crown className="h-8 w-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {translations?.readyToStart || 'Ready to Get Started?'}
          </h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            {translations?.ctaDescription || 'Join hundreds of real estate companies that trust our platform to manage their digital reputation'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => handleSubscribe('free')}
              className="bg-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              style={{ color: '#194866' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              {translations?.getStartedFree || 'Get Started Free'}
            </button>
            <button 
              onClick={() => handleSubscribe('pro')}
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:bg-white hover:scale-105"
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.color = '#194866';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'white';
              }}
            >
              {translations?.subscribeToProfessional || 'Subscribe to Professional'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;