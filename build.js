const fs = require('fs');
const path = require('path');

function build() {
  const rootDir = __dirname;
  const envPath = path.join(rootDir, '.env');
  const srcPath = path.join(rootDir, 'extension', 'background.src.js');
  const destPath = path.join(rootDir, 'extension', 'background.js');

  console.log('--- Extension Build Starting ---');

  // 1. Parse .env file
  const env = {};
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from: ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIdx = trimmed.indexOf('=');
      if (equalIdx === -1) continue;

      const key = trimmed.substring(0, equalIdx).trim();
      let val = trimmed.substring(equalIdx + 1).trim();

      // Strip quotes if any
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val;
    }
  } else {
    console.warn('Warning: .env file not found. Placeholders will not be replaced.');
  }

  // 2. Read background.src.js
  if (!fs.existsSync(srcPath)) {
    console.error(`Error: Source file not found at ${srcPath}`);
    process.exit(1);
  }

  let code = fs.readFileSync(srcPath, 'utf8');

  // 3. Replace environment variables
  // Standard pattern: process.env.KEY or process.env['KEY'] or process.env["KEY"]
  let replacementsCount = 0;
  
  // First, handle explicit variables from .env
  for (const [key, value] of Object.entries(env)) {
    const regexes = [
      new RegExp(`process\\.env\\.${key}\\b`, 'g'),
      new RegExp(`process\\.env\\[['"]${key}['"]\\]`, 'g')
    ];

    for (const regex of regexes) {
      if (regex.test(code)) {
        code = code.replace(regex, JSON.stringify(value));
        replacementsCount++;
      }
    }
  }

  // Also replace any remaining process.env.* reference that wasn't matched (with undefined or warning)
  const remainingEnvMatches = code.match(/process\.env\.[A-Za-z0-9_]+/g);
  if (remainingEnvMatches) {
    for (const match of remainingEnvMatches) {
      console.warn(`Warning: Environment variable reference "${match}" has no matching key in .env. Replacing with undefined.`);
      code = code.replace(new RegExp(match.replace('.', '\\.'), 'g'), 'undefined');
    }
  }

  // 4. Write compiled output to background.js
  fs.writeFileSync(destPath, code, 'utf8');
  console.log(`Successfully built background.js with ${replacementsCount} environment variable replacements.`);
  console.log('--- Extension Build Complete ---');
}

build();
