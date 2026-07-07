import React, { useState } from "react";

function HotelGallery({ gallery }) {
  const [activeImage, setActiveImage] = useState(0);

  if (!gallery || gallery.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <h2 className="font-headline-md text-headline-md text-text-deep-green mb-4">Gallery</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {gallery.slice(0, 4).map((img, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl cursor-pointer ${
              index === 0 ? "col-span-2 row-span-2" : ""
            }`}
            onClick={() => setActiveImage(index)}
          >
            <img
              src={img}
              alt={`Gallery ${index + 1}`}
              className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default HotelGallery;