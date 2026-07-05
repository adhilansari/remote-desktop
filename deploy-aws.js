const { execSync } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('🚀 AUTOMATICALLY DEPLOYING TO AWS EC2 🚀');
console.log('==================================================\n');

const pemKey = 'keenfresh-key.pem';
const server = 'ubuntu@13.207.194.101';

// The exact commands to run on the AWS server
const remoteCommands = `
  echo "--- Pulling latest code from GitHub ---" &&
  cd ~ &&
  (test -d keenfresh/.git || test -d remote-desktop/.git || (echo "Cloning repository..." && rm -rf keenfresh remote-desktop && git clone https://github.com/adhilansari/remote-desktop.git keenfresh)) &&
  { cd keenfresh || cd remote-desktop; } &&
  git fetch && git reset --hard origin/main &&
  
  echo "\n--- Building KeenFresh Shared ---" &&
  cd keenfresh-shared &&
  npm install &&
  npm run build &&
  cd .. &&
  
  echo "\n--- Building KeenFresh Relay ---" &&
  cd keenfresh-relay &&
  npm install &&
  npm run build &&
  
  echo "\n--- Restarting Server in Cluster Mode ---" &&
  (pm2 delete keenfresh-relay || true) &&
  pm2 start dist/index.js --name keenfresh-relay -i max &&
  
  echo "\n✅ DEPLOYMENT COMPLETE! ✅"
`;

try {
  console.log(`Connecting to ${server}...`);
  const { spawn } = require('child_process');
  
  const child = spawn('ssh', [
    '-i', pemKey,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=60',
    '-o', 'ServerAliveCountMax=10',
    server,
    'bash'
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  
  child.stdin.write(remoteCommands);
  child.stdin.end();

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ [ERROR] Deployment failed with exit code ${code}`);
    }
  });

} catch (error) {
  console.error(`\n❌ [ERROR] Deployment failed! Make sure your AWS server is running and the .pem file is correct.`);
}
