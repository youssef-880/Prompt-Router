const fs   = require('fs');
const path = require('path');

function build() {
  const root    = __dirname;
  const envPath = path.join(root, '.env');
  const srcPath = path.join(root, 'extension', 'background.src.js');
  const outPath = path.join(root, 'extension', 'background.js');

  console.log('--- AI Gateway Council Build Starting ---');

  // 1. Parse .env
  const env = {};
  if (fs.existsSync(envPath)) {
    console.log(`Reading: ${envPath}`);
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let   val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } else {
    console.warn('Warning: .env not found — no build-time key injection.');
  }

  // 2. Read source
  if (!fs.existsSync(srcPath)) {
    console.error(`Error: ${srcPath} not found`);
    process.exit(1);
  }
  let code = fs.readFileSync(srcPath, 'utf8');

  // 3. Replace any process.env.KEY references still present
  let count = 0;
  for (const [key, value] of Object.entries(env)) {
    for (const regex of [
      new RegExp(`process\\.env\\.${key}\\b`, 'g'),
      new RegExp(`process\\.env\\[['"]${key}['"]\\]`, 'g')
    ]) {
      const before = code;
      code = code.replace(regex, JSON.stringify(value));
      if (code !== before) count++;
    }
  }

  // Replace any unresolved process.env.* with undefined (and warn)
  const unresolved = code.match(/process\.env\.[A-Za-z0-9_]+/g);
  if (unresolved) {
    for (const ref of [...new Set(unresolved)]) {
      console.warn(`Warning: ${ref} has no .env entry — replacing with undefined`);
      code = code.replaceAll(ref, 'undefined');
    }
  }

  // 4. Write output
  fs.writeFileSync(outPath, code, 'utf8');
  console.log(`Built: ${outPath}  (${count} substitution(s))`);
  console.log('--- Build Complete ---');
}

build();
