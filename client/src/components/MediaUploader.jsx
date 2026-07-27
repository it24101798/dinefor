import React, { useRef, useState } from "react";
import api from "../services/api";

function MediaUploader({
  onUpload,
  accept = "image/*,video/mp4,video/webm,video/ogg",
  label = "Upload",
  multiple = false,
  maxFiles = 8,
  maxSizeMb = 100,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const uploadSingle = async (file) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new Error(`File "${file.name}" exceeds the ${maxSizeMb}MB limit.`);
    }

    const formData = new FormData();
    formData.append("media", file);

    const response = await api.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
      },
    });

    return {
      ...response.data,
      fileName: response.data.originalName || file.name,
      fileSize: response.data.size || file.size,
      fileType: file.type,
    };
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (!multiple && files.length > 1) {
      setError("Please select only one file.");
      return;
    }
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);

    try {
      const results = [];
      for (const file of files) results.push(await uploadSingle(file));

      setUploadedFiles((current) => (multiple ? [...current, ...results] : results));
      if (onUpload) onUpload(multiple ? results : results[0]);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => setUploadedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const formatFileSize = (bytes = 0) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileChange} multiple={multiple} className="hidden" />
      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-outline w-full flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[18px]">{uploading ? "progress_activity" : "upload"}</span>
        {uploading ? `Uploading${progress ? ` ${progress}%` : "..."}` : label}
      </button>

      {error && <div className="p-3 rounded-xl bg-error/10 text-error text-sm">{error}</div>}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div key={`${file.fileUrl}-${index}`} className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface-container-low">
              {file.mediaType === "video" ? (
                <video src={file.fileUrl} className="w-14 h-14 rounded-lg object-cover" muted />
              ) : (
                <img src={file.fileUrl} alt={file.fileName || "Uploaded media"} className="w-14 h-14 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-label-sm text-text-deep-green truncate">{file.fileName || "Uploaded media"}</p>
                <p className="text-xs text-on-surface-variant">{file.mediaType} · {formatFileSize(file.fileSize)}</p>
              </div>
              <button type="button" onClick={() => removeFile(index)} aria-label="Remove preview" className="text-on-surface-variant hover:text-error">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaUploader;
