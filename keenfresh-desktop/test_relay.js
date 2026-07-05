const { io } = require('socket.io-client');

const RELAY = 'wss://relay.keenfresh.com';
const pin = '123456';

console.log('Connecting Desktop...');
const desktop = io(RELAY, { auth: { clientType: 'desktop' } });

desktop.on('connect', () => {
    console.log('Desktop connected, joining room...');
    desktop.emit('join-room', { pin, clientType: 'desktop', hostname: 'TestPC' });
});

desktop.on('room-joined', (data) => {
    console.log('Desktop joined room:', data);
    
    console.log('Connecting Mobile...');
    const mobile = io(RELAY, { transports: ['websocket', 'polling'] });
    mobile.on('connect', () => {
        console.log('Mobile connected, joining room...');
        mobile.emit('join-room', { pin, clientType: 'mobile', deviceName: 'iPhone' });
    });
    
    mobile.on('connection-pending', (data) => {
        console.log('Mobile received connection-pending:', data);
    });
    
    mobile.on('connection-accepted', () => {
        console.log('Mobile connection accepted!');
        mobile.emit('finalize-join');
    });
    
    mobile.on('room-joined', (data) => {
        console.log('Mobile joined room fully:', data);
        process.exit(0);
    });
});

desktop.on('connection-request', (data) => {
    console.log('Desktop received connection-request:', data);
    desktop.emit('connection-accepted', { targetClientId: data.clientId });
});
