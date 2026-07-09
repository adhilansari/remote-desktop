import { io } from 'socket.io-client';

async function run() {
  const relayUrl = 'https://relay.keenfresh.com';

  // 1. Register or login to get token
  const email = `test_${Date.now()}@test.com`;
  const pass = 'password123';
  
  console.log(`Registering ${email}...`);
  const regRes = await fetch(`${relayUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  const regData = await regRes.json();
  const token = regData.token;
  console.log('Token:', token);

  // 2. Connect as Desktop
  console.log('Connecting as desktop...');
  const socket = io(relayUrl, {
    auth: { clientType: 'desktop', token },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Desktop connected, emitting join-room...');
    socket.emit('join-room', {
      pin: 'TEST-1234',
      clientType: 'desktop',
      hostname: 'Test Desktop'
    });
  });

  socket.on('room-error', (err) => console.log('ROOM ERROR:', err));
  socket.on('room-joined', (data) => console.log('ROOM JOINED:', data));


  // Wait a moment for join to complete
  await new Promise(r => setTimeout(r, 2000));

  // 3. Fetch /api/desktops using the token
  console.log('Fetching /api/desktops...');
  const fetchRes = await fetch(`${relayUrl}/api/desktops`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await fetchRes.json();
  console.log('Desktops:', data);
  
  socket.disconnect();
}

run().catch(console.error);
