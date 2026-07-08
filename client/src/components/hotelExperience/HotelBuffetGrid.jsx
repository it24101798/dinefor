import React from "react";
import { Link } from "react-router-dom";

function HotelBuffetGrid({ buffets }) {
  if (!buffets || buffets.length === 0) {
    return (
      <section className="py-6">
        <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Available Buffets</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">No buffets available at this time.</p>
      </section>
    );
  }

  return (
    <section className="py-6">
      <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Available Buffets</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {buffets.map((buffet) => (
          <Link
            key={buffet._id}
            to={`/buffets/${buffet._id}`}
            className="card-ambient-hover p-4"
          >
            <img
              src={buffet.thumbnail || buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=200&fit=crop"}
              alt={buffet.title}
              className="w-full h-32 object-cover rounded-xl mb-3"
            />
            <h3 className="font-label-md text-label-md text-text-deep-green">{buffet.title}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{buffet.category}</p>
            <p className="font-headline-md text-headline-md text-highlight-gold mt-2">
              Rs. {Number(buffet.price || 0).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default HotelBuffetGrid;