import React from 'react';

const FeatureCard = ({ icon: Icon, title, description }) => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group">
      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
        <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;