const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projects = [
  '.',
  'keenfresh-shared',
  'keenfresh-relay',
  'keenfresh-desktop',
  'keenfresh-web'
];

// Helper to increment patch version
function incrementVersion(version) {
  const parts = version.split('.');
  parts[2] = parseInt(parts[2], 10) + 1;
  return parts.join('.');
}

// 1. Read the current version from keenfresh-desktop
const desktopPackageJsonPath = path.join(__dirname, 'keenfresh-desktop', 'package.json');
const desktopPkg = JSON.parse(fs.readFileSync(desktopPackageJsonPath, 'utf8'));
const currentVersion = desktopPkg.version;
const newVersion = incrementVersion(currentVersion);

console.log(`[RELEASE] Bumping keenfresh from v${currentVersion} to v${newVersion}...`);

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

console.log(`\n[RELEASE] Syncing package-lock.json...`);
execSync('npm install --package-lock-only --ignore-scripts', { stdio: 'inherit' });

// 3. Commit, Tag, and Push to trigger GitHub Actions
console.log(`\n[RELEASE] Automating Git Commit and Tagging...`);
try {
  // Add changes
  execSync('git add .', { stdio: 'inherit' });
  
  // Commit changes
  execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' });
  
  // Create Tag
  execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
  
  // Push changes and tags to GitHub
  console.log(`\n[RELEASE] Pushing to GitHub to trigger Automated Build Action...`);
  execSync('git push origin main', { stdio: 'inherit' });
  execSync('git push origin --tags', { stdio: 'inherit' });

  console.log(`\n🎉 [SUCCESS] Successfully bumped to v${newVersion} and pushed to GitHub!`);
  console.log(`👉 GitHub Actions is now compiling your .exe and publishing it to your Releases page automatically!`);
} catch (err) {
  console.error(`\n❌ [ERROR] Failed during Git automation. Please check your Git status.`);
}
