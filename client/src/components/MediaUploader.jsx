import React, { useRef, useState } from "react";

function MediaUploader({ onUpload, accept = "image/*", label = "Upload", multiple = false, maxFiles = 10 }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState("");

  // ============================================
  // HANDLERS
  // ============================================
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file count
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

    try {
      const uploadPromises = Array.from(files).map((file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds 10MB limit.`);
        }

        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              fileUrl: reader.result,
              mediaType: file.type.startsWith("video") ? "video" : "image",
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              file: file,
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
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
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

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("video")) return "videocam";
    if (fileType?.startsWith("image")) return "image";
    if (fileType?.includes("pdf")) return "picture_as_pdf";
    return "insert_drive_file";
  };

  // ============================================
  // RENDER
  // ============================================
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

      {error && (
        <div className="p-3 rounded-xl bg-error/10 text-error text-sm">
          <span className="material-symbols-outlined text-[16px] align-middle mr-1">error</span>
          {error}
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle bg-surface-container-low animate-fade-in"
            >
              {/* Preview */}
              {file.mediaType === "image" && file.fileUrl ? (
                <img
                  src={file.fileUrl}
                  alt={file.fileName || "Uploaded file"}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-outline">
                    {getFileIcon(file.fileType)}
                  </span>
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="font-label-sm text-label-sm text-text-deep-green truncate">
                  {file.fileName || "Uploaded file"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-label-xs text-label-sm text-on-surface-variant">
                    {formatFileSize(file.fileSize)}
                  </p>
                  <span className="text-border-subtle">•</span>
                  <p className="font-label-xs text-label-sm text-on-surface-variant">
                    {file.mediaType === "image" ? "Image" : "Video"}
                  </p>
                </div>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-on-surface-variant hover:text-error transition-colors"
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