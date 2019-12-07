const express = require('express');
const log = require('fancy-log');
const fs = require('fs');
const https = require('https');
const morgan = require('morgan');
const path = require('path');
const WebSocket = require('ws');
const app = express();
const port = process.env.PORT || 443;

const server = https.createServer({
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'ssl.crt'), 'utf8'),
  key: fs.readFileSync(path.join(__dirname, 'certs', 'ssl.key'), 'utf8')
}, app);
const wss = new WebSocket.Server({ server });

app.set('trust proxy', true);
app.set('x-powered-by', false);
app.use(morgan('short'));
app.use(express.static(path.join(__dirname, 'public')));

const SendMsg = (to, cmd, msg='') => {
  const clients = wss.clients;
  for (const client of clients) {
    client.send(`${to}||${cmd}||${msg}`);
  }
};

const ProcessMsg = (data) => {
  const from = data.split('||')[0];
  const cmd = data.split('||')[1];
  const msg = data.split('||')[2];
  const another = (from === 'voice') ? 'sign' : 'voice';
  log(`Received from ${from}: ${cmd} ${msg}`);
  switch (cmd) {
    case 'STATUS':
      SendMsg(another, 'STATUS', msg);
      break;
    case 'MSG':
      SendMsg(another, 'MSG', msg);
      break;
    case 'RTC':
      SendMsg(another, 'RTC', msg);
      break;
  }
};

wss.on('connection', (ws) => {
  ws.on('close', () => {
    SendMsg('all', 'CURRENT', wss.clients.size);
  });
  ws.on('message', (data) => {
    ProcessMsg(data);
  });
  SendMsg('all', 'CURRENT', wss.clients.size);
});

wss.on('listening', () => {
  log('WebSocket Server Started!');
});

app.use((req, res, next) => {
  res.status(404).json({ error: '404 Not Found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: '500 Internal Server Error' });
});

server.listen(port, '0.0.0.0', () => {
  log('Web Server Started!');
});
