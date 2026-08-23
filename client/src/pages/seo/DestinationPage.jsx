import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";
import BuffetCard from "../../components/buffet/BuffetCard";
import SEO from "../../components/seo/SEO";
import { CATEGORIES, DESTINATIONS } from "./seoCatalog";
import "./seo-pages.css";

const SITE_URL = "https://dinefor.com";

export default function DestinationPage() {
  const { citySlug, categorySlug } = useParams();
  const destination = DESTINATIONS[citySlug];
  const category = categorySlug ? CATEGORIES[categorySlug] : null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destination || (categorySlug && !category)) return;
    let active = true;
    setLoading(true);
    api.get("/seo/buffets", { params: { city: destination.name, category: category?.value, sort: "recommended", limit: 30 } })
      .then(({ data }) => active && setItems(data?.items || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [destination, category, categorySlug]);

  const title = category ? `${category.label} in ${destination?.name || "Sri Lanka"}` : `Best Buffets in ${destination?.name || "Sri Lanka"}`;
  const description = category
    ? `Discover ${category.label.toLowerCase()} in ${destination?.name}, compare verified hotel experiences, prices and ratings, and reserve with DineFor.`
    : destination?.intro;
  const canonicalPath = category ? `/destinations/${citySlug}/${categorySlug}` : `/destinations/${citySlug}`;

  const schema = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: title, url: `${SITE_URL}${canonicalPath}`, description },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: destination?.name || "Destination", item: `${SITE_URL}/destinations/${citySlug}` },
        ...(category ? [{ "@type": "ListItem", position: 3, name: category.label, item: `${SITE_URL}${canonicalPath}` }] : []),
      ]},
      { "@type": "ItemList", itemListElement: items.slice(0, 12).map((item, index) => ({
        "@type": "ListItem", position: index + 1, name: item.title, url: `${SITE_URL}/buffets/${item.slug || item._id}`,
      }))},
    ],
  }), [canonicalPath, category, citySlug, description, destination, items, title]);

  if (!destination || (categorySlug && !category)) {
    return <main className="seo-page"><div className="seo-state"><h1>Destination guide not found</h1><Link to="/discover">Explore all buffets</Link></div></main>;
  }

  return (
    <main className="seo-page">
      <SEO title={title} description={description} canonicalPath={canonicalPath} structuredData={schema} />
      <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span>/</span><Link to={`/destinations/${citySlug}`}>{destination.name}</Link>{category && <><span>/</span><span>{category.label}</span></>}
      </nav>
      <header className="seo-hero seo-destination-hero">
        <p className="seo-eyebrow">DINEFOR DESTINATION GUIDE</p>
        <h1>{title}</h1><p>{description}</p>
        <div className="seo-links">{Object.entries(CATEGORIES).map(([slug, item]) => <Link key={slug} to={`/destinations/${citySlug}/${slug}`}>{item.label}</Link>)}</div>
      </header>
      <section className="seo-results" aria-labelledby="destination-results-title">
        <div className="seo-section-head"><div><span>VERIFIED HOTEL DINING</span><h2 id="destination-results-title">Experiences to explore</h2></div><strong>{items.length} experiences</strong></div>
        {loading ? <div className="seo-state">Finding experiences…</div> : items.length ? <div className="seo-grid">{items.map((buffet) => <BuffetCard key={buffet._id} buffet={buffet} />)}</div> : <div className="seo-state">No matching active buffets are available yet. Try another meal type or explore all current experiences.</div>}
      </section>
      <section className="seo-link-hub" aria-labelledby="nearby-guides-title">
        <h2 id="nearby-guides-title">Explore more Sri Lanka buffet guides</h2>
        <div className="seo-link-grid">
          {Object.entries(DESTINATIONS).filter(([slug]) => slug !== citySlug).map(([slug, item]) => <Link key={slug} to={`/destinations/${slug}`}>Best buffets in {item.name}<span>Explore →</span></Link>)}
          <Link to="/buffets-under-5000">Buffets under Rs. 5,000<span>Explore →</span></Link>
          <Link to="/top-rated-buffets">Top rated buffets<span>Explore →</span></Link>
        </div>
      </section>
    </main>
  );
}
