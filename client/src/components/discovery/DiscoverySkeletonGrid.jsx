function DiscoverySkeletonGrid() {
  return (
    <div className="df-skeleton-grid" aria-label="Loading premium buffet cards">
      {[1, 2, 3, 4].map((item) => (
        <article className="df-skeleton-premium-card" key={item}>
          <div className="df-skeleton-media" />
          <div className="df-skeleton-line wide" />
          <div className="df-skeleton-line" />
          <div className="df-skeleton-row">
            <div className="df-skeleton-pill" />
            <div className="df-skeleton-pill" />
          </div>
        </article>
      ))}
    </div>
  );
}

export default DiscoverySkeletonGrid;
