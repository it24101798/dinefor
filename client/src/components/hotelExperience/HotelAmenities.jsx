import React from "react";

function HotelAmenities({ amenities, facilities, diningHighlights }) {
  const allItems = [...(amenities || []), ...(facilities || [])];

  if (allItems.length === 0 && !diningHighlights) {
    return null;
  }

  return (
    <section className="py-6">
      <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Amenities</h2>
      <div className="flex flex-wrap gap-2">
        {allItems.map((item, index) => (
          <span key={index} className="chip">
            {item}
          </span>
        ))}
      </div>
      {diningHighlights && (
        <div className="mt-4 p-4 rounded-xl bg-secondary-container/10 border border-secondary/30">
          <p className="font-label-sm text-label-sm text-secondary">Dining Highlights</p>
          <p className="font-body-md text-body-md text-text-deep-green">{diningHighlights}</p>
        </div>
      )}
    </section>
  );
}

export default HotelAmenities;