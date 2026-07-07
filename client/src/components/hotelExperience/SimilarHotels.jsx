import React from "react";
import { Link } from "react-router-dom";

function SimilarHotels({ hotels }) {
  if (!hotels || hotels.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Similar Hotels</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hotels.slice(0, 3).map((hotel) => (
          <Link
            key={hotel._id}
            to={`/hotels/${hotel._id}`}
            className="card-ambient-hover p-4"
          >
            <img
              src={hotel.coverImage || hotel.coverMediaUrl || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop"}
              alt={hotel.hotelName}
              className="w-full h-32 object-cover rounded-xl mb-3"
            />
            <h3 className="font-label-md text-label-md text-text-deep-green">{hotel.hotelName}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{hotel.city || hotel.location}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default SimilarHotels;