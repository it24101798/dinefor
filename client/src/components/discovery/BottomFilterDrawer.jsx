import FilterSidebar from "./FilterSidebar";

function BottomFilterDrawer({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="df-filter-drawer-shell" role="dialog" aria-modal="true">
      <button className="df-filter-backdrop" type="button" onClick={onClose} aria-label="Close filters" />
      <div className="df-filter-drawer">
        <div className="df-drawer-handle" />
        <div className="df-drawer-header">
          <h3>Refine your search</h3>
          <button type="button" onClick={onClose}>Done</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default BottomFilterDrawer;
