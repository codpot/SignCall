const log = require('fancy-log');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7777 });

const SendMsg = (cmd, msg='') => {
  const clients = wss.clients;
  for (const client of clients) {
    client.send(`${cmd}||${msg}`);
  }
};

const ProcessMsg = (data) => {
  const cmd = data.split('||')[0];
  const msg = data.split('||')[1];
  log(`Received : ${cmd} ${msg}`);
  switch (cmd) {
    case 'STATUS':
      SendMsg('STATUS', msg);
      break;
    case 'MSG':
      SendMsg('MSG', msg);
      break;
  }
};

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    ProcessMsg(data);
  });
});

wss.on('listening', () => {
  log('Leap Motion Client Started!');
});
