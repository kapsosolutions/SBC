import { useEffect, useState } from 'react';
import { api, getToken } from '../../api.js';

const BASE = import.meta.env.VITE_API_BASE || '';

export default function FlowImagesTab() {
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/api/flow-images', 'admin').then(setImages).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const upload = async (key, file) => {
    if (!file) return;
    setBusy(key); setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${BASE}/api/flow-images/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken('admin')}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const remove = async (key) => {
    setBusy(key);
    try {
      await api.del(`/api/flow-images/${key}`, 'admin');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const groups = [...new Set(images.map((i) => i.group))];

  return (
    <div>
      <h1 className="heading-sm">Flow & message images</h1>
      <p className="muted body mt-8">
        Upload headers used in WhatsApp messages and banners shown inside the flow. Banners are
        auto-cropped to 8:1. Changes apply instantly (no republish needed).
      </p>
      {error && <div className="alert alert-error mt-16">{error}</div>}

      {groups.map((g) => (
        <div key={g} className="mt-24">
          <div className="pill pill-black">{g}</div>
          <div className="grid grid-3 mt-16">
            {images.filter((i) => i.group === g).map((img) => (
              <div className="card" key={img.key}>
                <div className="subheading" style={{ fontSize: 18 }}>{img.label}</div>
                <div className="caption">{img.key}</div>
                <div
                  style={{
                    marginTop: 12,
                    aspectRatio: img.key.startsWith('flow_') ? '8/1' : '1/1',
                    background: 'var(--color-fog)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {img.url ? (
                    <img src={img.url} alt={img.key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="caption">No image</span>
                  )}
                </div>
                <div className="row mt-16 wrap">
                  <label className="btn" style={{ cursor: 'pointer' }}>
                    {busy === img.key ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => upload(img.key, e.target.files[0])}
                    />
                  </label>
                  {img.url && (
                    <button className="btn" onClick={() => remove(img.key)} disabled={busy === img.key}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
