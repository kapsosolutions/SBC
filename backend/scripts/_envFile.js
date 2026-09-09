const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');

function setKeys(pairs) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  for (const [key, value] of Object.entries(pairs)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(content)) content = content.replace(re, line);
    else content += (content.endsWith('\n') ? '' : '\n') + line + '\n';
  }
  fs.writeFileSync(ENV_PATH, content);
}

module.exports = { setKeys, ENV_PATH };
