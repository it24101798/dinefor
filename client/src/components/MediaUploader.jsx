import { useRef, useState } from "react";
import api from "../services/api";

function MediaUploader({
  onUpload,
  multiple = false,
  accept = "image/*,video/*",
  label = "Upload media",
  helper = "Drag and drop files here, or click to browse.",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const getAuthHeaders = () => {
    const storedUser = JSON.parse(localStorage.getItem("dineforUser") || "null");
    return storedUser?.token ? { Authorization: `Bearer ${storedUser.token}` } : null;
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      setMessage("Please login before uploading.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const formData = new FormData();
      files.forEach((file) => formData.append("media", file));

      const endpoint = multiple ? "/uploads/multiple" : "/uploads";
      const res = await api.post(endpoint, formData, {
        headers: authHeaders,
      });

      if (multiple) {
        const uploadedFiles = res.data?.files || [];
        uploadedFiles.forEach((file) => onUpload?.(file));
        setMessage(`${uploadedFiles.length} file(s) uploaded successfully ✅`);
      } else {
        onUpload?.(res.data);
        setMessage("File uploaded successfully ✅");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Upload failed. Check backend terminal.");
    } finally {
      setUploading(false);
      setIsDragging(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    uploadFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`upload-dropzone media-studio-dropzone ${isDragging ? "dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => uploadFiles(event.target.files)}
      />

      <div className="upload-icon">{uploading ? "⏳" : "⬆️"}</div>
      <strong>{uploading ? "Uploading..." : label}</strong>
      <span>{helper}</span>
      <small>{multiple ? "Multiple files allowed" : "Single file only"}</small>

      {message && (
        <p className={message.toLowerCase().includes("failed") || message.toLowerCase().includes("login") ? "error-text" : "success-text"}>
          {message}
        </p>
      )}
    </div>
  );
}

export default MediaUploader;
