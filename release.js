const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// The projects to build
const projects = [
  'flaro-shared',
  'flaro-relay',
  'flaro-desktop',
  'flaro-web'
];

// Helper to increment patch version
function incrementVersion(version) {
  const parts = version.split('.');
  parts[2] = parseInt(parts[2], 10) + 1;
  return parts.join('.');
}

// 1. Read the current version from flaro-desktop
const desktopPackageJsonPath = path.join(__dirname, 'flaro-desktop', 'package.json');
const desktopPkg = JSON.parse(fs.readFileSync(desktopPackageJsonPath, 'utf8'));
const currentVersion = desktopPkg.version;
const newVersion = incrementVersion(currentVersion);

console.log(`[RELEASE] Bumping Flaro from v${currentVersion} to v${newVersion}...`);

// 2. Update package.json for all projects
for (const project of projects) {
  const pkgPath = path.join(__dirname, project, 'package.json');
  if (fs.existsSync(pkgPath)) {
    let content = fs.readFileSync(pkgPath, 'utf8');
    
    // Replace version
    content = content.replace(/"version":\s*"[^"]+"/, `"version": "${newVersion}"`);
    
    // Replace hardcoded echo versions in scripts
    content = content.replace(new RegExp(`v${currentVersion.replace(/\./g, '\\.')}`, 'g'), `v${newVersion}`);

    fs.writeFileSync(pkgPath, content, 'utf8');
    console.log(`[RELEASE] Updated ${project}/package.json`);
  }
}

// 3. Build each project
console.log(`[RELEASE] Building projects...`);
for (const project of projects) {
  console.log(`\n--- Building ${project} ---`);
  const projectDir = path.join(__dirname, project);
  try {
    execSync('npm run build', { cwd: projectDir, stdio: 'inherit' });
  } catch (err) {
    console.error(`[RELEASE] Failed to build ${project}. Aborting.`);
    process.exit(1);
  }
}

// 4. Create release directory
const releaseDir = path.join(__dirname, 'releases', `v${newVersion}`);
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// 5. Copy artifacts to the new versioned release directory
console.log(`\n[RELEASE] Archiving builds to ${releaseDir}...`);

// flaro-desktop (copy dist, package.json, and the built .exe)
const desktopRelease = path.join(releaseDir, 'flaro-desktop');
fs.mkdirSync(desktopRelease, { recursive: true });
execSync(`xcopy /E /I /Y "${path.join(__dirname, 'flaro-desktop', 'dist')}" "${path.join(desktopRelease, 'dist')}\\"`);
fs.copyFileSync(path.join(__dirname, 'flaro-desktop', 'package.json'), path.join(desktopRelease, 'package.json'));

console.log(`\n--- Packing Desktop Executable ---`);
execSync('npm run pack', { cwd: path.join(__dirname, 'flaro-desktop'), stdio: 'inherit' });
const exePath = path.join(__dirname, 'flaro-desktop', 'release', `Flaro ${newVersion}.exe`);
if (fs.existsSync(exePath)) {
  fs.copyFileSync(exePath, path.join(releaseDir, `Flaro v${newVersion}.exe`));
  console.log(`[RELEASE] Copied executable to ${path.join(releaseDir, `Flaro v${newVersion}.exe`)}`);
} else {
  console.log(`[RELEASE] Warning: Could not find executable at ${exePath}`);
}

// flaro-web (copy dist)
const webRelease = path.join(releaseDir, 'flaro-web');
fs.mkdirSync(webRelease, { recursive: true });
execSync(`xcopy /E /I /Y "${path.join(__dirname, 'flaro-web', 'dist')}" "${webRelease}\\"`);

// flaro-relay (copy dist and package.json)
const relayRelease = path.join(releaseDir, 'flaro-relay');
fs.mkdirSync(relayRelease, { recursive: true });
execSync(`xcopy /E /I /Y "${path.join(__dirname, 'flaro-relay', 'dist')}" "${path.join(relayRelease, 'dist')}\\"`);
fs.copyFileSync(path.join(__dirname, 'flaro-relay', 'package.json'), path.join(relayRelease, 'package.json'));

// flaro-shared (copy dist and package.json)
const sharedRelease = path.join(releaseDir, 'flaro-shared');
fs.mkdirSync(sharedRelease, { recursive: true });
execSync(`xcopy /E /I /Y "${path.join(__dirname, 'flaro-shared', 'dist')}" "${path.join(sharedRelease, 'dist')}\\"`);
fs.copyFileSync(path.join(__dirname, 'flaro-shared', 'package.json'), path.join(sharedRelease, 'package.json'));

console.log(`\n[RELEASE] Successfully created release v${newVersion} without deleting older versions!`);
