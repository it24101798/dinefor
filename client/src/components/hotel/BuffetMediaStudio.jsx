import { useState } from "react";
import api from "../../services/api";
import MediaUploader from "../MediaUploader";

function BuffetMediaStudio({ buffet, headers, onUpdated }) {
  const [open, setOpen] = useState(false);
  const images = buffet?.images || [];
  const videos = buffet?.videos || [];

  const updateBuffetMedia = async (updates) => {
    const res = await api.put(`/buffets/${buffet._id}/media`, updates, { headers });
    onUpdated?.(res.data.buffet, res.data.message || "Buffet media updated successfully.");
  };

  const addImage = (data) => updateBuffetMedia({ images: [...images, data.fileUrl] });
  const addVideo = (data) => updateBuffetMedia({ videos: [...videos, data.fileUrl] });
  const removeImage = (url) => updateBuffetMedia({ images: images.filter((item) => item !== url) });
  const removeVideo = (url) => updateBuffetMedia({ videos: videos.filter((item) => item !== url) });

  return (
    <div className="buffet-media-studio">
      <button className="btn secondary small" type="button" onClick={() => setOpen(!open)}>
        {open ? "Hide Media Studio" : "Manage Photos/Videos"}
      </button>

      {open && (
        <div className="buffet-media-panel">
          <div className="section-header compact">
            <span className="eyebrow">Buffet Media</span>
            <h3>{buffet.title}</h3>
          </div>

          <div className="media-studio-upload-grid compact-grid">
            <div className="media-studio-upload-card">
              <h4>Thumbnail / Main Photo</h4>
              <MediaUploader
                accept="image/*"
                label="Upload thumbnail"
                helper="This becomes the main feed/listing image."
                onUpload={(data) => updateBuffetMedia({ thumbnail: data.fileUrl, images: [data.fileUrl, ...images.filter((url) => url !== data.fileUrl)] })}
              />
            </div>

            <div className="media-studio-upload-card">
              <h4>Add Buffet Photos</h4>
              <MediaUploader
                multiple
                accept="image/*"
                label="Upload buffet photos"
                helper="Upload dishes, buffet spread, dessert, seafood, ambience photos."
                onUpload={addImage}
              />
            </div>

            <div className="media-studio-upload-card">
              <h4>Add Buffet Videos</h4>
              <MediaUploader
                multiple
                accept="video/*"
                label="Upload buffet videos"
                helper="Short videos work best for discovery feeds."
                onUpload={addVideo}
              />
            </div>
          </div>

          <div className="media-library-block">
            <h4>Photos</h4>
            <div className="media-masonry-grid small-grid">
              {images.map((url) => (
                <article className="media-library-card" key={url}>
                  <img src={url} alt="Buffet" />
                  {buffet.thumbnail === url && <span className="media-badge">Thumbnail</span>}
                  <button className="btn danger small" type="button" onClick={() => removeImage(url)}>
                    Remove
                  </button>
                </article>
              ))}
              {!images.length && <p className="muted">No buffet photos yet.</p>}
            </div>
          </div>

          <div className="media-library-block">
            <h4>Videos</h4>
            <div className="media-masonry-grid small-grid">
              {videos.map((url) => (
                <article className="media-library-card" key={url}>
                  <video src={url} controls />
                  <button className="btn danger small" type="button" onClick={() => removeVideo(url)}>
                    Remove
                  </button>
                </article>
              ))}
              {!videos.length && <p className="muted">No buffet videos yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuffetMediaStudio;
