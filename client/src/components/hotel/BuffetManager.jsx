import api from "../../services/api";
import BuffetMediaStudio from "./BuffetMediaStudio";

function BuffetManager({ myBuffets = [], headers, onChanged }) {
  const deleteBuffet = async (id) => {
    if (!window.confirm("Delete this buffet?")) return;
    await api.delete(`/buffets/${id}`, { headers });
    onChanged?.();
  };

  return (
    <section className="panel reveal-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Inventory</span>
          <h2>My Buffets</h2>
          <p>Manage buffet listings, time slots, and media used in discovery pages.</p>
        </div>
      </div>

      {myBuffets.length === 0 ? (
        <p>No buffets created yet.</p>
      ) : (
        <div className="feed-grid buffet-manager-grid">
          {myBuffets.map((buffet) => {
            const mainImage = buffet.thumbnail || buffet.images?.[0] || "https://images.unsplash.com/photo-1555244162-803834f70033";

            return (
              <article className="mini-card buffet-manager-card" key={buffet._id}>
                <img src={mainImage} alt={buffet.title} />
                <div>
                  <h3>{buffet.title}</h3>
                  <p>{buffet.buffetType} • {buffet.category}</p>
                  <p>Rs. {Number(buffet.price || 0).toLocaleString()}</p>

                  {buffet.timeSlots?.map((slot) => (
                    <small key={slot._id || `${slot.startTime}-${slot.endTime}`}>
                      {slot.startTime} - {slot.endTime}: {slot.availableSeats}/{slot.totalSeats}
                      <br />
                    </small>
                  ))}

                  <div className="buffet-manager-actions">
                    <button className="btn danger small" type="button" onClick={() => deleteBuffet(buffet._id)}>
                      Delete
                    </button>
                  </div>

                  <BuffetMediaStudio buffet={buffet} headers={headers} onUpdated={onChanged} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BuffetManager;
