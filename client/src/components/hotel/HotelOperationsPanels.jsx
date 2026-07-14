import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

const toLines = (values = []) => (Array.isArray(values) ? values.join("\n") : "");
const fromLines = (value = "") => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const isVideoUrl = (url = "") => /\.(mp4|webm|ogg)(\?|$)/i.test(String(url));

function UploadButton({ label, accept, multiple = false, headers, apiBase, onUploaded, onError, disabled = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("media", file));

    try {
      setUploading(true);
      const endpoint = multiple ? "/api/uploads/multiple" : "/api/uploads";
      const { data } = await api.post(`${apiBase}${endpoint}`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });

      const uploaded = multiple ? data.files || [] : [data];
      onUploaded?.(uploaded);
    } catch (error) {
      onError?.(error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={uploadFiles} />
      <button type="button" className="btn-outline flex items-center justify-center gap-2" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
        <span className="material-symbols-outlined text-[18px]">{uploading ? "progress_activity" : "upload"}</span>
        {uploading ? "Uploading..." : label}
      </button>
    </>
  );
}

function MediaPreview({ url, alt, onRemove }) {
  return (
    <div className="card-ambient overflow-hidden bg-surface-container-low relative group">
      <div className="aspect-[4/3]">
        {isVideoUrl(url) ? (
          <video src={url} controls className="w-full h-full object-cover" />
        ) : (
          <img src={url} alt={alt} className="w-full h-full object-cover" />
        )}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/65 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" aria-label="Remove media">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      )}
    </div>
  );
}

export function HotelMediaWorkspace({ hotel, headers, apiBase, onUpdated, setMessage, setMessageType }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ logo: "", coverMediaUrl: "", coverMediaType: "image", galleryImages: [], videos: [] });

  useEffect(() => {
    setForm({
      logo: hotel?.logo || "",
      coverMediaUrl: hotel?.coverMediaUrl || "",
      coverMediaType: hotel?.coverMediaType || "image",
      galleryImages: hotel?.galleryImages?.length ? hotel.galleryImages : hotel?.images || [],
      videos: hotel?.videos || [],
    });
  }, [hotel]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        logo: form.logo,
        coverMediaUrl: form.coverMediaUrl,
        coverMediaType: form.coverMediaType,
        galleryImages: form.galleryImages,
        images: form.galleryImages,
        videos: form.videos,
      };
      const { data } = await api.put(`${apiBase}/api/hotels/my-hotel`, payload, { headers });
      onUpdated?.(data.hotel || { ...hotel, ...payload });
      setMessage("Hotel media saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save hotel media.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadError = (error) => {
    setMessage(error.response?.data?.message || error.message || "Upload failed.");
    setMessageType("error");
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Hotel media</span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">Media Library</h2>
        <p className="text-on-surface-variant mt-2">Upload your logo, cover image or video, gallery photos and promotional videos directly from your device.</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <section className="card-ambient p-5 md:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-headline-md text-headline-md text-text-deep-green">Hotel logo</h3>
              <p className="text-sm text-on-surface-variant mt-1">Recommended: square PNG, JPG or WEBP.</p>
            </div>
            <UploadButton label="Upload Logo" accept="image/jpeg,image/png,image/webp" headers={headers} apiBase={apiBase} onError={handleUploadError} onUploaded={(files) => setForm((current) => ({ ...current, logo: files[0]?.fileUrl || current.logo }))} />
          </div>
          {form.logo && <div className="max-w-[220px]"><MediaPreview url={form.logo} alt="Hotel logo" onRemove={() => setForm((current) => ({ ...current, logo: "" }))} /></div>}
        </section>

        <section className="card-ambient p-5 md:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-headline-md text-headline-md text-text-deep-green">Cover media</h3>
              <p className="text-sm text-on-surface-variant mt-1">Use one premium hotel image or short MP4/WEBM/OGG video.</p>
            </div>
            <UploadButton label="Upload Cover" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/ogg" headers={headers} apiBase={apiBase} onError={handleUploadError} onUploaded={(files) => {
              const file = files[0];
              if (!file) return;
              setForm((current) => ({ ...current, coverMediaUrl: file.fileUrl, coverMediaType: file.mediaType }));
            }} />
          </div>
          {form.coverMediaUrl && <div className="max-w-2xl"><MediaPreview url={form.coverMediaUrl} alt="Hotel cover media" onRemove={() => setForm((current) => ({ ...current, coverMediaUrl: "", coverMediaType: "image" }))} /></div>}
        </section>

        <section className="card-ambient p-5 md:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-headline-md text-headline-md text-text-deep-green">Gallery images</h3>
              <p className="text-sm text-on-surface-variant mt-1">Upload up to eight images at a time.</p>
            </div>
            <UploadButton label="Upload Gallery Images" accept="image/jpeg,image/png,image/webp" multiple headers={headers} apiBase={apiBase} onError={handleUploadError} onUploaded={(files) => setForm((current) => ({ ...current, galleryImages: [...current.galleryImages, ...files.map((file) => file.fileUrl).filter(Boolean)] }))} />
          </div>
          {form.galleryImages.length > 0 && <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{form.galleryImages.map((url, index) => <MediaPreview key={`${url}-${index}`} url={url} alt={`Gallery image ${index + 1}`} onRemove={() => setForm((current) => ({ ...current, galleryImages: current.galleryImages.filter((_, itemIndex) => itemIndex !== index) }))} />)}</div>}
        </section>

        <section className="card-ambient p-5 md:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-headline-md text-headline-md text-text-deep-green">Promotional videos</h3>
              <p className="text-sm text-on-surface-variant mt-1">Upload MP4, WEBM or OGG files. Maximum file size follows the existing server upload limit.</p>
            </div>
            <UploadButton label="Upload Videos" accept="video/mp4,video/webm,video/ogg" multiple headers={headers} apiBase={apiBase} onError={handleUploadError} onUploaded={(files) => setForm((current) => ({ ...current, videos: [...current.videos, ...files.map((file) => file.fileUrl).filter(Boolean)] }))} />
          </div>
          {form.videos.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{form.videos.map((url, index) => <MediaPreview key={`${url}-${index}`} url={url} alt={`Hotel video ${index + 1}`} onRemove={() => setForm((current) => ({ ...current, videos: current.videos.filter((_, itemIndex) => itemIndex !== index) }))} />)}</div>}
        </section>

        <div className="flex justify-end">
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Media Library"}</button>
        </div>
      </form>
    </div>
  );
}

export function HotelProfileWorkspace({ hotel, headers, apiBase, onUpdated, setMessage, setMessageType }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ hotelName: "", location: "", address: "", city: "", district: "", province: "", country: "Sri Lanka", description: "", contactNumber: "", email: "", amenities: "", diningHighlights: "", latitude: "", longitude: "", googleMapUrl: "" });

  useEffect(() => {
    setForm({
      hotelName: hotel?.hotelName || "",
      location: hotel?.location || "",
      address: hotel?.address || "",
      city: hotel?.city || "",
      district: hotel?.district || "",
      province: hotel?.province || "",
      country: hotel?.country || "Sri Lanka",
      description: hotel?.description || "",
      contactNumber: hotel?.contactNumber || "",
      email: hotel?.email || "",
      amenities: toLines(hotel?.amenities),
      diningHighlights: toLines(hotel?.diningHighlights),
      latitude: hotel?.mapLocation?.latitude ?? "",
      longitude: hotel?.mapLocation?.longitude ?? "",
      googleMapUrl: hotel?.mapLocation?.googleMapUrl || "",
    });
  }, [hotel]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        hotelName: form.hotelName.trim(),
        location: form.location.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        province: form.province.trim(),
        country: form.country.trim() || "Sri Lanka",
        description: form.description.trim(),
        contactNumber: form.contactNumber.trim(),
        email: form.email.trim(),
        amenities: fromLines(form.amenities),
        diningHighlights: fromLines(form.diningHighlights),
        mapLocation: { latitude: form.latitude, longitude: form.longitude, googleMapUrl: form.googleMapUrl.trim() },
      };
      const { data } = await api.put(`${apiBase}/api/hotels/my-hotel`, payload, { headers });
      onUpdated?.(data.hotel || { ...hotel, ...payload });
      setMessage("Hotel profile saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save hotel profile.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "text") => (
    <label className="space-y-2">
      <span className="form-label">{label}</span>
      <input type={type} className="form-input" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Public hotel identity</span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">Hotel Profile</h2>
        <p className="text-on-surface-variant mt-2">Update the hotel information guests see across DineFor. Media files are managed from the Media Library.</p>
      </div>

      <section className="card-ambient p-5 md:p-7 space-y-5">
        <h3 className="font-headline-md text-headline-md text-text-deep-green">Hotel information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field("hotelName", "Hotel name")}
          {field("location", "Main location")}
          {field("address", "Address")}
          {field("city", "City")}
          {field("district", "District")}
          {field("province", "Province")}
          {field("country", "Country")}
          {field("contactNumber", "Contact number")}
          {field("email", "Public email", "email")}
        </div>
        <label className="space-y-2 block"><span className="form-label">Hotel description</span><textarea className="form-textarea min-h-[150px]" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
      </section>

      <section className="card-ambient p-5 md:p-7 space-y-5">
        <h3 className="font-headline-md text-headline-md text-text-deep-green">Guest experience</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2"><span className="form-label">Amenities — one per line</span><textarea className="form-textarea min-h-[140px]" value={form.amenities} onChange={(event) => setForm((current) => ({ ...current, amenities: event.target.value }))} /></label>
          <label className="space-y-2"><span className="form-label">Dining highlights — one per line</span><textarea className="form-textarea min-h-[140px]" value={form.diningHighlights} onChange={(event) => setForm((current) => ({ ...current, diningHighlights: event.target.value }))} /></label>
        </div>
      </section>

      <section className="card-ambient p-5 md:p-7 space-y-5">
        <h3 className="font-headline-md text-headline-md text-text-deep-green">Map and directions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{field("latitude", "Latitude", "number")}{field("longitude", "Longitude", "number")}</div>
        {field("googleMapUrl", "Google Maps URL", "url")}
      </section>

      <section className="card-ambient p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline-md text-headline-md text-text-deep-green">Hotel photos and videos</h3>
            <p className="text-on-surface-variant mt-1">Use the Media Library to upload your logo, cover image/video, gallery images and promotional videos.</p>
          </div>
          <a href="/hotel/media" className="btn-outline inline-flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px]">photo_library</span>Open Media Library</a>
        </div>
      </section>

      <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Hotel Profile"}</button></div>
    </form>
  );
}

export function HotelReviewReplyWorkspace({ reviews = [], headers, apiBase, refresh, setMessage, setMessageType }) {
  const [replyByReview, setReplyByReview] = useState({});
  const [savingId, setSavingId] = useState("");

  const submitReply = async (reviewId) => {
    const message = String(replyByReview[reviewId] || "").trim();
    if (!message) {
      setMessage("Please enter a reply before submitting.");
      setMessageType("warning");
      return;
    }
    try {
      setSavingId(reviewId);
      await api.put(`${apiBase}/api/hotel-portal/reviews/${reviewId}/reply`, { message }, { headers });
      setReplyByReview((current) => ({ ...current, [reviewId]: "" }));
      setMessage("Review reply published successfully.");
      setMessageType("success");
      await refresh?.();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to publish review reply.");
      setMessageType("error");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Guest feedback</span>
        <h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">Reviews</h2>
        <p className="text-on-surface-variant mt-2">Read verified feedback and respond professionally from the hotel portal.</p>
      </div>
      {reviews.length ? reviews.map((review) => (
        <article key={review._id} className="card-ambient p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div><h3 className="font-headline-md text-headline-md text-text-deep-green">{review.user?.name || "Guest"}</h3><p className="text-sm text-on-surface-variant">{review.buffet?.title || "Hotel buffet"}</p></div>
            <span className="badge-gold">★ {Number(review.rating || 0).toFixed(1)}</span>
          </div>
          <p className="mt-4 text-on-surface-variant leading-relaxed">{review.comment || review.reviewText || "No written comment."}</p>
          {review.hotelReply?.message && <div className="mt-4 rounded-xl bg-secondary-container/15 border border-secondary/15 p-4"><strong className="text-secondary">Current hotel reply</strong><p className="mt-1 text-on-surface-variant">{review.hotelReply.message}</p></div>}
          <div className="mt-4 flex flex-col md:flex-row gap-3"><textarea className="form-textarea flex-1 min-h-[90px]" value={replyByReview[review._id] || ""} onChange={(e) => setReplyByReview((current) => ({ ...current, [review._id]: e.target.value }))} placeholder={review.hotelReply?.message ? "Update your reply..." : "Write a professional hotel reply..."} /><button type="button" className="btn-primary md:self-end" disabled={savingId === review._id} onClick={() => submitReply(review._id)}>{savingId === review._id ? "Saving..." : review.hotelReply?.message ? "Update Reply" : "Reply"}</button></div>
        </article>
      )) : <div className="card-ambient p-10 text-center"><span className="material-symbols-outlined text-5xl text-outline">rate_review</span><h3 className="font-headline-md text-headline-md text-text-deep-green mt-3">No reviews yet</h3><p className="text-on-surface-variant mt-1">Reviews will appear after completed buffet visits.</p></div>}
    </div>
  );
}

export function HotelSettingsWorkspace({ hotel, headers, apiBase, onUpdated, setMessage, setMessageType }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ contactNumber: "", email: "", cancellationPolicy: "", refundPolicy: "", financeContactName: "", financeContactPhone: "", bankName: "", accountNumber: "", accountHolderName: "", bankBranch: "" });

  useEffect(() => {
    setForm({ contactNumber: hotel?.contactNumber || "", email: hotel?.email || "", cancellationPolicy: hotel?.application?.cancellationPolicy || "", refundPolicy: hotel?.application?.refundPolicy || "", financeContactName: hotel?.application?.financeContactName || "", financeContactPhone: hotel?.application?.financeContactPhone || "", bankName: hotel?.application?.bankName || "", accountNumber: hotel?.application?.accountNumber || "", accountHolderName: hotel?.application?.accountHolderName || "", bankBranch: hotel?.application?.bankBranch || "" });
  }, [hotel]);

  const save = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { contactNumber: form.contactNumber.trim(), email: form.email.trim(), application: { ...(hotel?.application || {}), cancellationPolicy: form.cancellationPolicy.trim(), refundPolicy: form.refundPolicy.trim(), financeContactName: form.financeContactName.trim(), financeContactPhone: form.financeContactPhone.trim(), bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), accountHolderName: form.accountHolderName.trim(), bankBranch: form.bankBranch.trim() } };
      const { data } = await api.put(`${apiBase}/api/hotels/my-hotel`, payload, { headers });
      onUpdated?.(data.hotel || { ...hotel, ...payload });
      setMessage("Hotel settings saved successfully.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save hotel settings.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "text") => <label className="space-y-2"><span className="form-label">{label}</span><input type={type} className="form-input" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>;

  return (
    <form onSubmit={save} className="space-y-6">
      <div><span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Hotel account</span><h2 className="font-headline-lg text-headline-lg text-text-deep-green mt-2">Settings</h2><p className="text-on-surface-variant mt-2">Manage operational contact, cancellation, refund and payout information.</p></div>
      <section className="card-ambient p-5 md:p-7 space-y-5"><h3 className="font-headline-md text-headline-md text-text-deep-green">Contact information</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{field("contactNumber", "Contact number")}{field("email", "Operational email", "email")}</div></section>
      <section className="card-ambient p-5 md:p-7 space-y-5"><h3 className="font-headline-md text-headline-md text-text-deep-green">Guest policies</h3><label className="space-y-2 block"><span className="form-label">Cancellation policy</span><textarea className="form-textarea" value={form.cancellationPolicy} onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })} /></label><label className="space-y-2 block"><span className="form-label">Refund policy</span><textarea className="form-textarea" value={form.refundPolicy} onChange={(e) => setForm({ ...form, refundPolicy: e.target.value })} /></label></section>
      <section className="card-ambient p-5 md:p-7 space-y-5"><h3 className="font-headline-md text-headline-md text-text-deep-green">Finance and payout details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{field("financeContactName", "Finance contact name")}{field("financeContactPhone", "Finance contact phone")}{field("bankName", "Bank name")}{field("bankBranch", "Bank branch")}{field("accountHolderName", "Account holder name")}{field("accountNumber", "Account number")}</div><p className="form-hint">These details remain part of the hotel application/profile and should only be visible to authorized hotel and admin users.</p></section>
      <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button></div>
    </form>
  );
}
