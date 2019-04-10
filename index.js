// const P2PServer = require('./p2pserver');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
const getP2pServer = require('./get-p2p-server');

const server = getP2pServer()();

app.use(bodyParser.json());
app.listen(4000, () => console.log(`Listening on port 4000`));

app.get('/peers', (req, res) => {
    res.json(server.peers);
});

app.get('/sockets', (req,res) => {
    res.json(server.sockets.map(pair => pair.ip));
});


