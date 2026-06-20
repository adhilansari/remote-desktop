const { execSync } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('📦 BUILDING KEENFRESH GLOBAL ARCHITECTURE 📦');
console.log('==================================================\n');

function buildService(name, dir, command) {
  console.log(`\x1b[36m[${name}]\x1b[0m Starting build in ${dir}...`);
  try {
    execSync(command, {
      cwd: path.join(__dirname, dir),
      stdio: 'inherit'
    });
    console.log(`✅ \x1b[32m[${name}]\x1b[0m Build successful!\n`);
  } catch (error) {
    console.error(`❌ \x1b[31m[${name}]\x1b[0m Build failed!`);
    process.exit(1);
  }
}

// 1. Build KeenFresh Shared (must be first as others depend on it)
buildService('SHARED', 'keenfresh-shared', 'npm run build');

// 2. Build KeenFresh Relay
buildService('RELAY', 'keenfresh-relay', 'npm run build');

// 3. Build KeenFresh Web (React/Vite)
buildService('WEB', 'keenfresh-web', 'npm run build');

// 4. Build KeenFresh Desktop
buildService('DESKTOP', 'keenfresh-desktop', 'npm run build');

console.log(`\n🎉 \x1b[1m\x1b[32mALL PROJECTS BUILT SUCCESSFULLY!\x1b[0m 🎉`);
console.log(`👉 You can now run \`node start-all.js\` to launch the production-ready local system.\n`);
