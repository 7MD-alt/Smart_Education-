import { useState, useRef } from "react";
import axiosClient from "../../api/axiosClient";

/**
 * Manages file attachment state for the NOVAA input bar.
 * Handles the hidden <input type="file"> ref, upload to the backend,
 * and clearing the attached file.
 */
export function useFileUpload() {
  const [attachedFile,  setAttachedFile]  = useState(null);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected later
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setFileUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await axiosClient.post("chat/upload/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAttachedFile(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Could not read this file.");
    } finally {
      setFileUploading(false);
    }
  };

  const clearFile = () => setAttachedFile(null);

  return { attachedFile, fileUploading, fileInputRef, handleFileSelect, clearFile };
}
