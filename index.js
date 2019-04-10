const P2PServer = require('./p2pserver');
const bodyParser = require('body-parser');
const express = require('express');

const app = express();
const server = new P2PServer();

app.use(bodyParser.json());
app.listen(4000, () => console.log(`Listening on port 4000`));
server.listen();

app.get('/peers', (req, res) => {
    res.json(server.peers);
});

app.get('/sockets', (req,res) => {
    res.json(server.sockets.map(pair => pair.ip));
});


