import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import BuffetCard from "../../components/buffet/BuffetCard";
import SEO from "../../components/seo/SEO";
import "./seo-pages.css";

const PRESETS = {
  "best-buffets-in-colombo": { title: "Best Buffets in Colombo", city: "Colombo", intro: "Explore verified hotel buffets in Colombo, compare prices and ratings, and find an experience for your next meal." },
  "best-buffets-in-galle": { title: "Best Buffets in Galle", city: "Galle", intro: "Discover hotel buffets and dining experiences in Galle, from coastal dinners to relaxed weekend meals." },
  "best-buffets-in-kandy": { title: "Best Buffets in Kandy", city: "Kandy", intro: "Browse verified buffet experiences in Kandy and compare dining options in one place." },
  "most-popular-buffets": { title: "Most Popular Buffets", sort: "popular", intro: "See buffet experiences attracting the most interest on DineFor." },
  "top-rated-buffets": { title: "Top Rated Buffets", sort: "rating", intro: "Explore highly rated buffet experiences based on guest feedback available on DineFor." },
  "latest-buffets": { title: "Latest Buffet Experiences", sort: "newest", intro: "Discover recently added buffet experiences from DineFor hotel partners." },
  "best-high-tea-in-colombo": { title: "Best High Tea in Colombo", city: "Colombo", category: "high-tea", intro: "Find high-tea experiences in Colombo and compare hotel, price and guest rating information." },
  "best-dinner-buffets-in-colombo": { title: "Best Dinner Buffets in Colombo", city: "Colombo", category: "dinner", intro: "Browse dinner buffet experiences in Colombo from verified DineFor hotel partners." },
  "best-lunch-buffets-in-colombo": { title: "Best Lunch Buffets in Colombo", city: "Colombo", category: "lunch", intro: "Compare lunch buffet experiences across Colombo and choose the right option for your occasion." },
  "best-seafood-buffets-in-colombo": { title: "Best Seafood Buffets in Colombo", city: "Colombo", category: "seafood", intro: "Explore seafood buffet experiences available from Colombo hotel partners." },
};

export default function SeoLandingPage({ slug: fixedSlug }) {
  const params = useParams();
  const slug = fixedSlug || params.slug;
  const preset = PRESETS[slug];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/seo/buffets", { params: { city: preset?.city, category: preset?.category, sort: preset?.sort, limit: 24 } })
      .then(({ data }) => active && setItems(data?.items || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug, preset?.city, preset?.category, preset?.sort]);

  const schema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: preset?.title || "Buffet Experiences",
    url: `https://dinefor.com/${slug}`,
    description: preset?.intro,
    isPartOf: { "@type": "WebSite", name: "DineFor", url: "https://dinefor.com" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 10).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.title,
        url: `https://dinefor.com/buffets/${item._id}`,
      })),
    },
  }), [items, preset, slug]);

  if (!preset) return <div className="seo-page"><h1>Dining guide not found</h1><Link to="/discover">Explore buffets</Link></div>;

  return (
    <main className="seo-page">
      <SEO title={preset.title} description={preset.intro} canonicalPath={`/${slug}`} structuredData={schema} />
      <header className="seo-hero">
        <p className="seo-eyebrow">DINEFOR DINING GUIDE</p>
        <h1>{preset.title}</h1>
        <p>{preset.intro}</p>
        <div className="seo-links">
          <Link to="/discover">Discover all</Link><Link to="/map">Explore map</Link><Link to="/most-popular-buffets">Popular buffets</Link><Link to="/top-rated-buffets">Top rated</Link>
        </div>
      </header>
      <section className="seo-results" aria-labelledby="seo-results-title">
        <div className="seo-section-head"><div><span>CURATED RESULTS</span><h2 id="seo-results-title">Buffets to explore</h2></div><strong>{items.length} experiences</strong></div>
        {loading ? <div className="seo-state">Finding experiences…</div> : items.length ? <div className="seo-grid">{items.map((buffet) => <BuffetCard key={buffet._id} buffet={buffet} />)}</div> : <div className="seo-state">No matching active buffets are available yet. Explore all current experiences instead.</div>}
      </section>
      <section className="seo-about"><h2>Find your next buffet with DineFor</h2><p>DineFor brings verified hotel buffet discovery, guest reviews, location information and reservations into one experience. Availability and prices are provided by participating hotels and may change.</p></section>
    </main>
  );
}
