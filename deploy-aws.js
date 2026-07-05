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
  (cd keenfresh || cd remote-desktop || (echo "Repository not found! Did you clone it into ~/keenfresh?" && exit 1)) &&
  git pull origin main &&
  
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
  // -o StrictHostKeyChecking=no prevents the prompt asking "Are you sure you want to continue connecting?"
  const command = `ssh -i ${pemKey} -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -o ServerAliveCountMax=10 ${server} "${remoteCommands}"`;
  
  execSync(command, { stdio: 'inherit' });
} catch (error) {
  console.error(`\n❌ [ERROR] Deployment failed! Make sure your AWS server is running and the .pem file is correct.`);
}
