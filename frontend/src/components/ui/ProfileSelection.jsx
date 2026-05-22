import React, { useState } from 'react';
import { Camera } from 'lucide-react';

/**
 * ProfileSelection
 * Lets an admin pick a profile photo for a student / user.
 * Props:
 *   onCapture(file) — called with the selected File object
 *   label          — optional button label
 */
const ProfileSelection = ({ onCapture, label = "Upload Photo" }) => {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onCapture?.(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Preview circle */}
      <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/10 bg-white/[0.05]">
        {preview ? (
          <img src={preview} alt="Profile preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/30">
            <Camera className="h-8 w-8" />
          </div>
        )}
      </div>

      {/* File input */}
      <label className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white">
        {label}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default ProfileSelection;
