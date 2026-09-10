import { useEffect, useState } from 'react';

export default function ImageUpload({ file, onChange, aspect = '1/1', hint = 'PNG or JPG, 1:1 ratio' }) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="uploader-wrap">
      <label className="uploader" style={{ aspectRatio: aspect }}>
        {preview ? (
          <img src={preview} alt="preview" className="uploader-preview" />
        ) : (
          <div className="uploader-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="uploader-title">Click to upload</div>
            <div className="uploader-hint">{hint}</div>
          </div>
        )}
        <input type="file" accept="image/*" hidden onChange={(e) => onChange(e.target.files[0])} />
      </label>
      {file && (
        <div className="uploader-actions">
          <span className="caption" style={{ wordBreak: 'break-all' }}>{file.name}</span>
          <button type="button" className="btn" onClick={() => onChange(null)}>Remove</button>
        </div>
      )}
    </div>
  );
}
