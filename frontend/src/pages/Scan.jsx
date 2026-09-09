import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { api } from '../api.js';

export default function Scan() {
  const [params] = useSearchParams();
  const phone = params.get('phone') || '';
  const presetPartner = params.get('partner') || '';

  const [status, setStatus] = useState('idle'); // idle | scanning | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualPhone, setManualPhone] = useState(phone);
  const scannerRef = useRef(null);
  const regionId = 'qr-region';

  const redeem = async (partnerRaw, ph) => {
    try {
      const res = await api.post('/api/scan/redeem', { phone: ph, partner: partnerRaw });
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
    setError(''); setResult(null); setStatus('scanning');
    const ph = manualPhone.trim();
    if (!ph) { setError('Enter your WhatsApp number first.'); setStatus('idle'); return; }
    try {
      const html5 = new Html5Qrcode(regionId);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
          await stopScanner();
          redeem(decodedText, ph);
        },
        () => {}
      );
    } catch (e) {
      setError('Camera error: ' + e.message);
      setStatus('error');
    }
  };

  // If partner is preset in URL (e.g. scanned via camera app), redeem directly once phone known.
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="logo"><span className="logo-mark">S</span><span>Use Card</span></div>
        <h1 className="heading-sm mt-16">Scan partner QR</h1>
        <p className="muted body mt-8">Point your camera at the partner’s QR code to redeem an offer.</p>

        {error && <div className="alert alert-error mt-16">{error}</div>}

        {status === 'done' && result && (
          <div className="alert alert-ok mt-16">
            ✅ Redeemed at <b>{result.partner}</b>. Used {result.count} / {result.limit}
            {typeof result.remaining === 'number' ? ` (${result.remaining} left)` : ''}.
          </div>
        )}
        {status === 'error' && result?.error === 'limit_reached' && (
          <div className="alert alert-error mt-16">⚠️ {result.message}</div>
        )}

        <div className="field mt-16">
          <label className="label">Your WhatsApp Number</label>
          <input
            className="input"
            value={manualPhone}
            onChange={(e) => setManualPhone(e.target.value)}
            placeholder="919000000000"
            disabled={status === 'scanning'}
          />
        </div>

        <div id={regionId} style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }} />

        {status !== 'scanning' ? (
          <>
            <button className="btn btn-primary btn-block mt-16" onClick={startScanner}>
              Open scanner
            </button>
            {presetPartner && (
              <button
                className="btn btn-block mt-8"
                onClick={() => redeem(presetPartner, manualPhone.trim())}
                disabled={!manualPhone.trim()}
              >
                Redeem this partner
              </button>
            )}
          </>
        ) : (
          <button className="btn btn-block mt-16" onClick={() => { stopScanner(); setStatus('idle'); }}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
