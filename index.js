const P2PServer = require('./consensus/pbftserver');
const Blockchain = require('./consensus/blockchain');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
app.use(bodyParser.json());

const blockchain = new Blockchain();
const server = new P2PServer(blockchain);

app.get('/peers', (req, res) => {
  res.json(server.peers);
});

app.get('/sockets', (req, res) => {
  res.json(server.sockets.map(pair => pair.ip));
});

server.listen();
app.listen(4000, () => console.log(`Listening on port 4000`));
