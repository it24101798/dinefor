import api from "../../services/api";
import { Link } from "react-router-dom";

function BuffetFeatureManager({ buffets, token, onChange }) {
  const updateFeature = async (buffetId, shouldFeature) => {
    try {
      await api.put(
        `/buffets/${buffetId}/${
          shouldFeature ? "feature" : "unfeature"
        }`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (onChange) onChange();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Feature update failed");
    }
  };

  return (
    <section className="panel">
      <h2>Featured Buffet Revenue Controls</h2>
      <p className="muted-text">
        Use this to boost buffet visibility. Later this can become a paid hotel
        promotion feature.
      </p>

      <div className="feed-grid">
        {buffets.map((buffet) => (
          <article className="mini-card" key={buffet._id}>
            <img
              src={
                buffet.images?.[0] ||
                "https://images.unsplash.com/photo-1555244162-803834f70033"
              }
              alt={buffet.title}
            />

            <div>
              <p className="eyebrow">{buffet.hotel?.hotelName}</p>
              <h3>{buffet.title}</h3>
              <p>{buffet.buffetType} • {buffet.category}</p>
              <p>⭐ {buffet.averageRating || 0} ({buffet.totalReviews || 0})</p>
              <p>{buffet.isFeatured ? "Featured ✅" : "Not featured"}</p>

              <div className="action-row">
                <Link to={`/buffets/${buffet._id}`} className="btn secondary">
                  View
                </Link>

                {buffet.isFeatured ? (
                  <button
                    className="btn danger"
                    onClick={() => updateFeature(buffet._id, false)}
                  >
                    Remove Featured
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    onClick={() => updateFeature(buffet._id, true)}
                  >
                    Feature
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default BuffetFeatureManager;
