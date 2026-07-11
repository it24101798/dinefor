import React from "react";

function SkeletonCard({ type = "buffet", count = 1 }) {
  const renderCard = () => {
    if (type === "buffet") {
      return (
        <div className="card-ambient overflow-hidden animate-pulse">
          <div className="h-48 bg-surface-container-high" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-surface-container-high rounded w-3/4" />
            <div className="h-4 bg-surface-container-high rounded w-1/2" />
            <div className="h-4 bg-surface-container-high rounded w-1/3" />
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 bg-surface-container-high rounded w-1/4" />
              <div className="h-8 bg-surface-container-high rounded-full w-1/4" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="card-ambient overflow-hidden animate-pulse p-4 space-y-3">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-4 bg-surface-container-high rounded w-1/2" />
        <div className="h-4 bg-surface-container-high rounded w-1/3" />
      </div>
    );
  };

  if (count > 1) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <React.Fragment key={i}>{renderCard()}</React.Fragment>
        ))}
      </div>
    );
  }

  return renderCard();
}

export default SkeletonCard;