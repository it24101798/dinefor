import api from "../../services/api";
import MediaUploader from "../MediaUploader";

function HotelMediaManager({ hotel, headers, onUpdated }) {
  const gallery = hotel?.galleryImages?.length ? hotel.galleryImages : hotel?.images || [];
  const videos = hotel?.videos || [];

  const updateHotelMedia = async (updates, successMessage = "Hotel media updated successfully.") => {
    const res = await api.put("/hotels/my-hotel", updates, { headers });
    onUpdated?.(res.data.hotel, res.data.message || successMessage);
  };

  const addGalleryItem = (data) => {
    const nextGallery = [...gallery, data.fileUrl];
    updateHotelMedia({ galleryImages: nextGallery, images: nextGallery });
  };

  const addVideoItem = (data) => {
    updateHotelMedia({ videos: [...videos, data.fileUrl] });
  };

  const removeGalleryItem = (url) => {
    const nextGallery = gallery.filter((item) => item !== url);
    updateHotelMedia({ galleryImages: nextGallery, images: nextGallery });
  };

  const removeVideoItem = (url) => {
    updateHotelMedia({ videos: videos.filter((item) => item !== url) });
  };

  return (
    <section className="panel reveal-card hotel-media-suite media-studio-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Hotel Media Studio</span>
          <h2>Photos, Videos, Logo & Cover</h2>
          <p>
            Add real hotel visuals for the public hotel profile, buffet feed, map cards, and future featured placements.
          </p>
        </div>
      </div>

      <div className="media-studio-hero-preview">
        <div className="media-box large">
          <h3>Cover Preview</h3>
          {hotel?.coverMediaUrl ? (
            hotel.coverMediaType === "video" ? (
              <video src={hotel.coverMediaUrl} controls className="media-preview" />
            ) : (
              <img src={hotel.coverMediaUrl} alt="Hotel cover" className="media-preview" />
            )
          ) : (
            <div className="empty-media-box">No cover image/video added yet.</div>
          )}
        </div>

        <div className="media-box logo-box">
          <h3>Logo Preview</h3>
          {hotel?.logo ? (
            <img src={hotel.logo} alt="Hotel logo" className="logo-preview" />
          ) : (
            <div className="empty-media-box">No logo added yet.</div>
          )}
        </div>
      </div>

      <div className="media-studio-upload-grid">
        <div className="media-studio-upload-card">
          <h3>Cover Image / Video</h3>
          <MediaUploader
            label="Upload cover"
            helper="Best for hotel profile hero. Image or short MP4 video."
            onUpload={(data) => updateHotelMedia({ coverMediaUrl: data.fileUrl, coverMediaType: data.mediaType })}
          />
        </div>

        <div className="media-studio-upload-card">
          <h3>Hotel Logo</h3>
          <MediaUploader
            accept="image/*"
            label="Upload logo"
            helper="Square logo works best. PNG, JPG, or WEBP."
            onUpload={(data) => updateHotelMedia({ logo: data.fileUrl })}
          />
        </div>

        <div className="media-studio-upload-card">
          <h3>Gallery Photos</h3>
          <MediaUploader
            multiple
            accept="image/*"
            label="Upload gallery photos"
            helper="Upload buffet, restaurant, lobby, dining and ambience photos."
            onUpload={addGalleryItem}
          />
        </div>

        <div className="media-studio-upload-card">
          <h3>Hotel Videos</h3>
          <MediaUploader
            multiple
            accept="video/*"
            label="Upload hotel videos"
            helper="Short videos create stronger Pinterest/Google-style discovery later."
            onUpload={addVideoItem}
          />
        </div>
      </div>

      <div className="media-library-block">
        <div className="section-header">
          <span className="eyebrow">Gallery</span>
          <h2>Public Profile Photos</h2>
        </div>

        <div className="media-masonry-grid">
          {gallery.map((url) => (
            <article className="media-library-card" key={url}>
              <img src={url} alt="Hotel gallery" />
              <button className="btn danger small" type="button" onClick={() => removeGalleryItem(url)}>
                Remove
              </button>
            </article>
          ))}
          {!gallery.length && <p className="muted">No gallery photos uploaded yet.</p>}
        </div>
      </div>

      <div className="media-library-block">
        <div className="section-header">
          <span className="eyebrow">Video Library</span>
          <h2>Hotel Videos</h2>
        </div>

        <div className="media-masonry-grid">
          {videos.map((url) => (
            <article className="media-library-card" key={url}>
              <video src={url} controls />
              <button className="btn danger small" type="button" onClick={() => removeVideoItem(url)}>
                Remove
              </button>
            </article>
          ))}
          {!videos.length && <p className="muted">No hotel videos uploaded yet.</p>}
        </div>
      </div>
    </section>
  );
}

export default HotelMediaManager;
