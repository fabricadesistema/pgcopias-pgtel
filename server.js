const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const chatWSS = new WebSocket.Server({ noServer: true });
const logsWSS = new WebSocket.Server({ noServer: true });
const estoqueWSS = new WebSocket.Server({ noServer: true });

let estoqueGlobal = [];

function broadcast(wss, data) {
  const json = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

chatWSS.on('connection', socket => {
  socket.on('message', msg => {
    const data = JSON.parse(msg);
    broadcast(chatWSS, data);
    broadcast(logsWSS, { log: `[CHAT] ${data.username}: ${data.message}` });
  });
});

estoqueWSS.on('connection', socket => {
  socket.send(JSON.stringify({ tipo: 'estoque-inicial', estoque: estoqueGlobal }));
  socket.on('message', msg => {
    const data = JSON.parse(msg);
    if (data.tipo === 'atualizar-estoque') {
      estoqueGlobal = data.estoque;
      broadcast(estoqueWSS, { tipo: 'estoque-atualizado', estoque: estoqueGlobal });
      broadcast(logsWSS, { log: `[ESTOQUE] ${data.acao}` });
    }
  });
});

logsWSS.on('connection', () => {});

server.on('upgrade', (request, socket, head) => {
  const { url } = request;
  if (url === '/chat') {
    chatWSS.handleUpgrade(request, socket, head, ws => chatWSS.emit('connection', ws, request));
  } else if (url === '/logs') {
    logsWSS.handleUpgrade(request, socket, head, ws => logsWSS.emit('connection', ws, request));
  } else if (url === '/estoque') {
    estoqueWSS.handleUpgrade(request, socket, head, ws => estoqueWSS.emit('connection', ws, request));
  } else {
    socket.destroy();
  }
});

server.listen(3000, () => {
  console.log('🟢 Servidor rodando na porta 3000');
});
