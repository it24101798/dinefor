function SkeletonCard({ type = "card" }) {
  return (
    <div className={`df-skeleton df-skeleton-${type}`}>
      <div className="df-skeleton-media" />
      <div className="df-skeleton-line large" />
      <div className="df-skeleton-line" />
      <div className="df-skeleton-line short" />
    </div>
  );
}

export default SkeletonCard;
