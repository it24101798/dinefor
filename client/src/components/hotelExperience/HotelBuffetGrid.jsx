import FeedCard from "../FeedCard";

function HotelBuffetGrid({ buffets = [] }) {
  return (
    <section id="hotel-buffets" className="df-hotel-section">
      <div className="df-section-head">
        <span className="eyebrow">Buffets</span>
        <h2>Buffet experiences from this hotel</h2>
      </div>
      {buffets.length === 0 ? (
        <div className="df-empty-state">No active buffets are available from this hotel yet.</div>
      ) : (
        <div className="feed-grid masonry-lite">
          {buffets.map((buffet) => <FeedCard key={buffet._id} buffet={buffet} />)}
        </div>
      )}
    </section>
  );
}

export default HotelBuffetGrid;
