const { spawn } = require('child_process');
const path = require('path');

console.log('==================================================');
console.log('🚀 STARTING KEENFRESH GLOBAL ARCHITECTURE LOCALLY 🚀');
console.log('==================================================\n');

function startService(name, dir, command, args, color) {
  console.log(`\x1b[${color}m[${name}]\x1b[0m Starting...`);
  const proc = spawn(command, args, {
    cwd: path.join(__dirname, dir),
    shell: true
  });

  proc.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`\x1b[${color}m[${name}]\x1b[0m ${output}`);
    
    if (output.includes('Connected to local signaling server')) {
      console.log(`\n✅ \x1b[32mSUCCESS:\x1b[0m Local Relay Server and Desktop App are Online!`);
      console.log(`\n🎉 \x1b[1m\x1b[32mALL SYSTEMS ARE OPERATIONAL!\x1b[0m 🎉`);
      console.log(`👉 The Electron Window should now be visible on your screen.`);
      console.log(`👉 Scan the QR Code with your phone to take control!\n`);
    }
  });

  proc.stderr.on('data', (data) => {
    process.stderr.write(`\x1b[31m[${name} ERROR]\x1b[0m ${data.toString()}`);
  });

  return proc;
}

// KeenFresh Desktop now runs the Relay and Web Static Hosting internally to bypass the Windows Firewall!
const desktop = startService('DESKTOP', 'keenfresh-desktop', 'npm', ['start'], '32');

process.on('SIGINT', () => {
  console.log('\nShutting down all KeenFresh services...');
  process.exit();
});
