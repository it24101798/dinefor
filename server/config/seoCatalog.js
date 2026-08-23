const DESTINATIONS = [
  { slug: "colombo", name: "Colombo", district: "Colombo", intro: "Explore hotel buffets across Colombo, compare prices, ratings and meal types, and reserve verified dining experiences with DineFor." },
  { slug: "galle", name: "Galle", district: "Galle", intro: "Discover hotel buffet experiences in Galle, including coastal dining, seafood, weekend meals and special events." },
  { slug: "kandy", name: "Kandy", district: "Kandy", intro: "Find verified hotel buffets in Kandy and compare meal types, prices, ratings and availability in one place." },
  { slug: "negombo", name: "Negombo", district: "Gampaha", intro: "Browse hotel buffet experiences in Negombo, from seafood and dinner buffets to relaxed weekend dining." },
  { slug: "bentota", name: "Bentota", district: "Galle", intro: "Explore resort and hotel buffet experiences around Bentota and compare premium dining options by price and rating." },
  { slug: "ella", name: "Ella", district: "Badulla", intro: "Discover hotel dining and buffet experiences around Ella with location, pricing and guest-rating information." },
];

const CATEGORIES = [
  { slug: "breakfast", value: "breakfast", label: "Breakfast Buffets" },
  { slug: "lunch", value: "lunch", label: "Lunch Buffets" },
  { slug: "dinner", value: "dinner", label: "Dinner Buffets" },
  { slug: "high-tea", value: "high-tea", label: "High Tea" },
  { slug: "seafood", value: "seafood", label: "Seafood Buffets" },
  { slug: "brunch", value: "brunch", label: "Brunch Buffets" },
];

const PRICE_COLLECTIONS = [
  { slug: "buffets-under-5000", maxPrice: 5000, title: "Buffets Under Rs. 5,000", description: "Explore DineFor buffet experiences priced up to Rs. 5,000 per person." },
  { slug: "buffets-under-7500", maxPrice: 7500, title: "Buffets Under Rs. 7,500", description: "Compare verified hotel buffet experiences priced up to Rs. 7,500 per person." },
  { slug: "buffets-under-10000", maxPrice: 10000, title: "Buffets Under Rs. 10,000", description: "Discover premium buffet experiences priced up to Rs. 10,000 per person." },
];

const destinationRoutes = DESTINATIONS.flatMap((destination) => [
  `/destinations/${destination.slug}`,
  ...CATEGORIES.map((category) => `/destinations/${destination.slug}/${category.slug}`),
]);

module.exports = { DESTINATIONS, CATEGORIES, PRICE_COLLECTIONS, destinationRoutes };
