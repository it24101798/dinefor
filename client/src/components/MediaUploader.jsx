import React, { useRef, useState } from "react";

function MediaUploader({ onUpload, accept = "image/*", label = "Upload", multiple = false }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              fileUrl: reader.result,
              mediaType: file.type.startsWith("video") ? "video" : "image",
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(uploadPromises);

      if (multiple) {
        setUploadedFiles((prev) => [...prev, ...results]);
        if (onUpload) onUpload(results);
      } else {
        const result = results[0];
        setUploadedFiles([result]);
        if (onUpload) onUpload(result);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          multiple={multiple}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-outline w-full flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">
            {uploading ? "progress_activity" : "upload"}
          </span>
          {uploading ? "Uploading..." : label}
        </button>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface-container-low"
            >
              {file.mediaType === "image" ? (
                <img
                  src={file.fileUrl}
                  alt={file.fileName || "Uploaded file"}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-outline">videocam</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-label-sm text-label-sm text-text-deep-green truncate">
                  {file.fileName || "Uploaded file"}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {formatFileSize(file.fileSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-error hover:text-error/80 transition-colors"
              >
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