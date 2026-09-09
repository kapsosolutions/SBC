const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const QRCode = require('qrcode');
const { uploadBuffer } = require('../config/cloudinary');

// SBC card — front side only. Moonli palette: lime #b8ff65 atmospheric block,
// black type, white surface. Credit-card-ish ratio (scaled up for print clarity).
const CARD_W = 1012;
const CARD_H = 638;

const LIME = '#b8ff65';
const BLACK = '#000000';
const WHITE = '#ffffff';
const SMOKE = '#757575';

const PLAN_LABEL = {
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
};

async function fetchImage(url) {
  try {
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return await loadImage(Buffer.from(r.data));
  } catch {
    return null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Render the SBC card front and upload to Cloudinary.
 * @param {object} student  Student mongoose doc/obj
 * @returns {Promise<{url,publicId}>}
 */
async function generateAndUploadCard(student) {
  const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const cardId = student.cardId || 'SBC-000000';

  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d');

  // --- Base white card with rounded corners ---
  ctx.fillStyle = WHITE;
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 48);
  ctx.fill();

  // --- Top lime atmospheric block (header) ---
  ctx.save();
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 48);
  ctx.clip();
  ctx.fillStyle = LIME;
  ctx.fillRect(0, 0, CARD_W, 210);
  ctx.restore();

  // Brand
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 46px "DejaVu Sans", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Student Benefit Card', 56, 100);

  ctx.font = '500 26px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText('SBC • Member Card', 56, 148);

  // Plan badge (top-right, black pill)
  const plan = PLAN_LABEL[student.plan] || 'MEMBER';
  ctx.font = 'bold 26px "DejaVu Sans", Arial, sans-serif';
  const pw = ctx.measureText(plan).width + 48;
  ctx.fillStyle = BLACK;
  roundRect(ctx, CARD_W - 56 - pw, 60, pw, 56, 28);
  ctx.fill();
  ctx.fillStyle = LIME;
  ctx.textAlign = 'center';
  ctx.fillText(plan, CARD_W - 56 - pw / 2, 98);

  // --- Photo (rounded) on the left ---
  const photoX = 56;
  const photoY = 270;
  const photoW = 240;
  const photoH = 300;
  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, 30);
  ctx.clip();
  const photo = student.photoUrl ? await fetchImage(student.photoUrl) : null;
  if (photo) {
    ctx.drawImage(photo, photoX, photoY, photoW, photoH);
  } else {
    ctx.fillStyle = '#f3f3f3';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = BLACK;
    ctx.font = 'bold 120px "DejaVu Sans", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((student.name || 'S').slice(0, 1).toUpperCase(), photoX + photoW / 2, photoY + photoH / 2 + 44);
  }
  ctx.restore();
  // photo border
  ctx.strokeStyle = '#e2e2e2';
  ctx.lineWidth = 2;
  roundRect(ctx, photoX, photoY, photoW, photoH, 30);
  ctx.stroke();

  // --- Text details ---
  const tx = photoX + photoW + 40;
  ctx.textAlign = 'left';

  ctx.fillStyle = SMOKE;
  ctx.font = '500 22px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText('NAME', tx, photoY + 30);
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 40px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText((student.name || '').toUpperCase().slice(0, 24), tx, photoY + 76);

  ctx.fillStyle = SMOKE;
  ctx.font = '500 22px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText('SCHOOL / INSTITUTE', tx, photoY + 128);
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 28px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText((student.school || '').slice(0, 30), tx, photoY + 166);

  ctx.fillStyle = SMOKE;
  ctx.font = '500 22px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText('CARD ID', tx, photoY + 218);
  ctx.fillStyle = BLACK;
  ctx.font = 'bold 30px "DejaVu Sans", Arial, sans-serif';
  ctx.fillText(cardId, tx, photoY + 256);

  // --- QR code (bottom-right) ---
  const qrData = `${siteUrl}/verify?id=${encodeURIComponent(cardId)}`;
  try {
    const qrBuf = await QRCode.toBuffer(qrData, { width: 300, margin: 1 });
    const qrImg = await loadImage(qrBuf);
    const qrSize = 150;
    const qrX = CARD_W - 56 - qrSize;
    const qrY = CARD_H - 56 - qrSize;
    ctx.fillStyle = WHITE;
    roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
    ctx.fill();
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    /* ignore qr errors */
  }

  const pngBuffer = canvas.toBuffer('image/png');
  const publicId = `members/${student.phone}/card`;
  const result = await uploadBuffer(pngBuffer, {
    folder: 'sbc',
    publicId,
    overwrite: true,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

module.exports = { generateAndUploadCard, CARD_W, CARD_H };
