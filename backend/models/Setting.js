const mongoose = require('mongoose');

// Generic key/value store for editable business text (welcome copy, contact, etc.)
const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', SettingSchema);
