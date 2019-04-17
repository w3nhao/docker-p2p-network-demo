const P2PServer = require('./consensus/pbftserver');
const Blockchain = require('./consensus/blockchain');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
app.use(bodyParser.json());

const supervisor = [
  '04baf629b829f55636e7daf3b399b1b749c6e38379a515c5c673caf78765b9c9080b4a80fd36e8d1324480aceae1815b837e8e27804d79d01f98f7f5a027976bac'
];
const blockchain = new Blockchain();
const server = new P2PServer(blockchain, supervisors);

app.get('/peers', (req, res) => {
  res.json(server.peers);
});

app.get('/sockets', (req, res) => {
  res.json(server.sockets.map(pair => pair.ip));
});

server.listen();
app.listen(4000, () => console.log(`Listening on port 4000`));
