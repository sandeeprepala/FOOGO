const WebSocket = require('ws');

const agentId = process.argv[2] || '1';
const url = `ws://localhost:3016/agent/${agentId}`;

console.log(`Connecting WebSocket client as agent ${agentId} -> ${url}`);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('WS open');
});

ws.on('message', (msg) => {
  console.log('WS message raw:', msg.toString());
  try {
    const parsed = JSON.parse(msg.toString());
    console.log('WS message parsed:', JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log('WS message (non-json)');
  }
  ws.close();
  process.exit(0);
});

ws.on('close', () => {
  console.log('WS closed');
});

ws.on('error', (err) => {
  console.error('WS error:', err && err.message);
  process.exit(1);
});

// Timeout if no message within 30s
setTimeout(() => {
  console.error('WS timeout waiting for nearby_order');
  process.exit(2);
}, 30000);
