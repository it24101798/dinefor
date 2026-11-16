import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import DiscoveryCard from "../../discovery/DiscoveryCard";

export default function RelatedBuffets({ buffetId, city, category, date, guests }) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    async function search(params) {
      const { data } = await api.get("/discovery/search", {
        params: { ...params, limit: 8 }, signal: controller.signal,
      });
      if (!Array.isArray(data?.data)) throw new Error("Invalid buffet search response");
      return data.data.filter((item) => item?._id && item.title && String(item._id) !== String(buffetId)).slice(0, 3);
    }
    async function load() {
      const nearby = city ? await search({ location: city }) : [];
      if (nearby.length) return { items: nearby, nearby: true };
      const matches = await search(category ? { category } : {});
      return { items: matches.length || !category ? matches : await search({}), nearby: false };
    }
    load().then((value) => {
      if (!controller.signal.aborted) setResult(value);
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ error: true, items: [] });
    });
    return () => controller.abort();
  }, [buffetId, city, category, attempt]);

  return <section className="df06-related" aria-labelledby="df06-related-title">
    <header>
      <h2 id="df06-related-title">{result?.nearby ? `Other buffets in ${city}` : "Explore other buffets"}</h2>
      <Link className="df06-text-button" to={result?.nearby ? `/listings?${new URLSearchParams({ location: city })}` : "/listings"}>Browse buffets</Link>
    </header>
    {!result && <p role="status">Finding buffet options…</p>}
    {result?.error && <p role="status">Couldn’t load other buffets. <button type="button" className="df06-text-button" onClick={() => setAttempt((value) => value + 1)}>Try again</button></p>}
    {!!result?.items.length && <div className="df06-related-grid">
      {result.items.map((item) => <DiscoveryCard key={item._id} buffet={item} compact date={date} guests={guests} />)}
    </div>}
    {result && !result.error && !result.items.length && <p>No other matching buffets are listed right now.</p>}
  </section>;
}
