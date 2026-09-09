const axios = require('axios');

/**
 * Insert Cloudinary URL transforms (resize/crop/quality/format) so we fetch
 * a small, correctly-sized image before base64 encoding. This is how the
 * 8:1 flow banner is produced (w_1000,h_125,c_fill) without local sharp.
 */
function withCloudinaryTransform(url, opts = {}) {
  if (!url || !url.includes('/upload/')) return url;
  const parts = [];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  parts.push(`c_${opts.crop || 'fill'}`);
  parts.push(`q_${opts.quality || 70}`);
  parts.push(`f_${opts.format || 'jpg'}`);
  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

/**
 * Fetch a URL and return RAW base64 (no data: prefix), ready for a Flow
 * JSON Image.src.
 */
async function urlToBase64(url, opts = {}) {
  if (!url) return '';
  const fetchUrl = withCloudinaryTransform(url, opts);
  const resp = await axios.get(fetchUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: 10 * 1024 * 1024,
  });
  return Buffer.from(resp.data).toString('base64');
}

module.exports = { withCloudinaryTransform, urlToBase64 };
