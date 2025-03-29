import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {[...Array(10)].map((_, index) => (
        <div
          key={index}
          className="animate-pulse"
        >
          <div className="aspect-[3/4] bg-gray-700 rounded-lg relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-gray-700 rounded-md w-3/4" />
            <div className="h-3 bg-gray-700 rounded-md w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
