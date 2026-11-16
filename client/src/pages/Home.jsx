import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import HomeSearch from '../components/home/HomeSearch';
import HeroMediaCarousel from '../components/HeroMediaCarousel';
import { Hero, BuffetTile, ResultsState, Footer, Icon } from '../design/ReferenceUI';
import { DiningMoments, DiscoveryCategories, HowItWorks, CitiesToExplore, HotelInvitation } from '../components/home/HomeSections';
import '../components/home/homeSections.css';
import MobileDiscoveryHome from '../mobile/home/MobileDiscoveryHome';

export default function Home() {
  const [buffets, setBuffets] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [category, setCategory] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    Promise.allSettled([api.get('/buffets'), api.get('/site-settings')]).then(([buffetResult, settingsResult]) => {
      if (!active) return;
      if (settingsResult.status === 'fulfilled') setSettings(settingsResult.value.data || {});
      if (buffetResult.status === 'fulfilled') {
        const data = buffetResult.value.data;
        const list = Array.isArray(data) ? data : data?.buffets || data?.data;
        if (Array.isArray(list)) setBuffets(list.filter((item) => item?._id || item?.id));
        else setError(true);
      } else setError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [retry]);

  const { featuredBuffets, discoveryBuffets } = useMemo(() => {
    const matching = category
      ? buffets.filter((item) => [item.category, item.buffetType, item.title, item.description]
          .filter(Boolean).join(' ').toLowerCase().includes(category.toLowerCase()))
      : buffets;
    const ranked = [...matching].sort((a, b) =>
      Number(b.averageRating || 0) - Number(a.averageRating || 0));
    const featured = ranked.filter((item) => item.isFeatured === true).slice(0, 3);
    const featuredIds = new Set(featured.map((item) => String(item._id || item.id)));
    const discovery = ranked.filter((item) => !featuredIds.has(String(item._id || item.id))).slice(0, 9);
    return { featuredBuffets: featured, discoveryBuffets: discovery };
  }, [buffets, category]);
  const showMedia = Boolean(settings.heroMediaUrl || settings.heroMediaItems?.some((item) => item.url && item.isActive !== false));

  return <><MobileDiscoveryHome buffets={[...featuredBuffets, ...discoveryBuffets]} loading={loading} error={error} onRetry={() => setRetry((value) => value + 1)} /><main className="rf-page rf-home rf-home-next dfm-desktop-home">
    <div className="rf-container">
      <section className="rf-home-lead">
        <Hero home eyebrow="Discover • Reserve • Dine" title={<>Good food.<br /><span className="rf-home-accent">Great company.</span></>} description="Find delicious buffet experiences, compare what you love, and make your next meal something to look forward to." />
        <div className="rf-home-search-wrap"><h2 className="rf-home-search-label">Where shall we eat next?</h2><HomeSearch /></div>
      </section>

      <DiningMoments />
      <DiscoveryCategories value={category} onChange={setCategory} />

      <section className="rf-featured-next" aria-labelledby="home-featured-heading">
        <div className="rf-section-head"><div><span className="rf-section-kicker">DISCOVER SOMETHING DELICIOUS</span><h2 id="home-featured-heading">Find your next favourite</h2><p>Explore buffet experiences from participating hotels, with real prices and details.</p></div><Link className="rf-home-view-all" to="/listings">See all buffets <Icon name="arrow_forward" /></Link></div>
        <ResultsState loading={loading} error={error} retry={() => setRetry((value) => value + 1)} empty={!featuredBuffets.length && !discoveryBuffets.length} reset={category ? () => setCategory('') : undefined} />
        {!loading && !error && featuredBuffets.length > 0 && <div className="rf-home-featured-wrap"><div className="rf-home-collection-label"><Icon name="auto_awesome" /> Featured dining experiences</div><div className="rf-grid rf-home-featured-grid">{featuredBuffets.map((buffet) => <BuffetTile key={buffet._id || buffet.id} buffet={buffet} />)}</div></div>}
        {!loading && !error && discoveryBuffets.length > 0 && <div className="rf-home-discovery-wrap"><div className="rf-home-collection-label"><Icon name="restaurant_menu" /> Browse available buffets</div><div className="rf-grid rf-home-featured-grid">{discoveryBuffets.map((buffet) => <BuffetTile key={buffet._id || buffet.id} buffet={buffet} />)}</div></div>}
        {!loading && !error && (featuredBuffets.length + discoveryBuffets.length > 0) && <div className="rf-home-browse-more"><Link to="/listings" className="rf-button">View all available buffets <Icon name="arrow_forward" /></Link></div>}
      </section>

      <HowItWorks />
      <CitiesToExplore />
      {showMedia && <section className="rf-cms-media rf-home-inspiration-media" aria-label="Dining inspiration"><HeroMediaCarousel settings={settings} /></section>}
      <HotelInvitation />
      <Footer />
    </div>
  </main></>;
}
