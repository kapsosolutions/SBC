import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api.js';

export default function Scan() {
  const [params] = useSearchParams();
  const phone = params.get('phone') || '';
  const presetPartner = params.get('partner') || '';

  const [status, setStatus] = useState('starting'); // starting | scanning | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const regionId = 'qr-region';

  const redeem = async (partnerRaw) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await api.post('/api/scan/redeem', { phone, partner: partnerRaw });
      setResult(res);
      setStatus('done');
    } catch (e) {
      setError(e.data?.message || e.message);
      setResult(e.data || null);
      setStatus('error');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    setError('');
    setResult(null);
    setStatus('scanning');
    try {
      const html5 = new Html5Qrcode(regionId);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await stopScanner();
          redeem(decodedText);
        },
        () => {}
      );
    } catch (e) {
      setError('Camera error: ' + e.message);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (presetPartner && phone) {
      // Partner id already provided in the link -> redeem directly, no camera.
      redeem(presetPartner);
      return () => { stopScanner(); };
    }
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-white)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="auth-card card" style={{ padding: 16 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

        {status === 'done' && result && (
          <div className="alert alert-ok" style={{ marginBottom: 12 }}>
            ✅ Redeemed at <b>{result.partner}</b>. Used {result.count} / {result.limit}
            {typeof result.remaining === 'number' ? ` (${result.remaining} left)` : ''}.
          </div>
        )}
        {status === 'error' && result?.error === 'limit_reached' && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {result.message}</div>
        )}

        {/* Camera view */}
        <div
          id={regionId}
          style={{ width: '100%', minHeight: 300, borderRadius: 20, overflow: 'hidden', background: 'var(--color-fog)' }}
        />

        {(status === 'done' || status === 'error') && (
          <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={startScanner}>
            Scan again
          </button>
        )}
      </div>
    </div>
  );
}
