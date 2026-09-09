const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ROOT = 'sbc';

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} opts { folder, publicId, overwrite }
 */
function uploadBuffer(buffer, opts = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      folder: opts.folder || ROOT,
      resource_type: 'image',
    };
    if (opts.publicId) options.public_id = opts.publicId;
    if (opts.overwrite) options.overwrite = true;
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

function destroy(publicId) {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, uploadBuffer, destroy, ROOT };
