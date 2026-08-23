import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import BuffetCard from "../../components/buffet/BuffetCard";
import SEO from "../../components/seo/SEO";
import { DESTINATIONS, PRICE_COLLECTIONS } from "./seoCatalog";
import "./seo-pages.css";

export default function PriceCollectionPage({ slug }) {
  const preset = PRICE_COLLECTIONS[slug];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/seo/buffets", { params: { maxPrice: preset.maxPrice, sort: "rating", limit: 30 } })
      .then(({ data }) => active && setItems(data?.items || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [preset.maxPrice]);

  const schema = useMemo(() => ({
    "@context": "https://schema.org", "@type": "CollectionPage", name: preset.title,
    url: `https://dinefor.com/${slug}`, description: preset.description,
    mainEntity: { "@type": "ItemList", itemListElement: items.slice(0, 12).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: `https://dinefor.com/buffets/${item.slug || item._id}` })) },
  }), [items, preset, slug]);

  return <main className="seo-page">
    <SEO title={preset.title} description={preset.description} canonicalPath={`/${slug}`} structuredData={schema} />
    <header className="seo-hero"><p className="seo-eyebrow">DINEFOR VALUE GUIDE</p><h1>{preset.title}</h1><p>{preset.description} Prices and availability can change, so always review the current buffet details before reserving.</p><div className="seo-links">{Object.entries(DESTINATIONS).slice(0,4).map(([citySlug, city]) => <Link key={citySlug} to={`/destinations/${citySlug}`}>{city.name}</Link>)}<Link to="/top-rated-buffets">Top rated</Link></div></header>
    <section className="seo-results"><div className="seo-section-head"><div><span>PRICE-CURATED RESULTS</span><h2>Buffets to compare</h2></div><strong>{items.length} experiences</strong></div>{loading ? <div className="seo-state">Finding experiences…</div> : items.length ? <div className="seo-grid">{items.map((buffet) => <BuffetCard key={buffet._id} buffet={buffet} />)}</div> : <div className="seo-state">No active buffets currently match this price range.</div>}</section>
  </main>;
}
