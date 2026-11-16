import AccountLayout from "../design/AccountLayout";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import FeedCard from "../components/FeedCard";

export default function Recommendations() {
  const [items, setItems] = useState([]);
  const [personalization, setPersonalization] =
    useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get(
        "/recommendations/personalized"
      );

      setItems(
        response.data?.recommendations || []
      );
      setPersonalization(
        response.data?.personalization || {}
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load recommendations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AccountLayout className="df-account-finish" title="Picked for your next meal." description="Buffet experiences selected around your dining interests." artwork="/images/characters/buffet-search.png" artAlt="Food and dining location illustration">
      <div className="df-account-body">
        <span className="badge-gold">
          Smart Discovery
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">
          Recommended for You
        </h2>
        <p className="text-on-surface-variant max-w-2xl">
          Ranked using your cuisine preferences, saved buffets,
          booking history, recent browsing, ratings and availability.
        </p>

        {!personalization.hasProfileSignals && !loading && (
          <div className="card-ambient p-4 mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-on-surface-variant">
              Complete your profile to improve recommendation accuracy.
            </p>
            <Link
              to="/profile"
              className="btn-outline text-center"
            >
              Update Preferences
            </Link>
          </div>
        )}

        {personalization.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {personalization.interests.map((interest) => (
              <span
                key={interest}
                className="chip chip-active"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {message && (
          <div className="p-3 rounded-xl bg-error/10 text-error mt-5">
            {message}
          </div>
        )}

        {loading ? (
          <div className="df-account-results">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="card-ambient h-96 animate-pulse"
              />
            ))}
          </div>
        ) : items.length ? (
          <div className="df-account-results">
            {items.map((buffet) => (
              <div key={buffet._id}>
                <FeedCard buffet={buffet} />
                {buffet.recommendationReasons?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {buffet.recommendationReasons.map(
                      (reason) => (
                        <span
                          key={reason}
                          className="px-2.5 py-1 rounded-full bg-secondary-container/20 text-secondary text-xs"
                        >
                          {reason}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <section className="card-ambient p-10 text-center mt-7">
            <span className="material-symbols-outlined text-5xl text-outline">
              explore_off
            </span>
            <h2 className="font-headline-md text-headline-md text-text-deep-green mt-3">
              No active recommendations yet
            </h2>
            <Link
              to="/buffets"
              className="btn-primary inline-block mt-5"
            >
              Browse Buffets
            </Link>
          </section>
        )}
      </div>
    </AccountLayout>
  );
}
