const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const url = require('url');

const SECRET = '7H1$!5453CR37';

const MYIP = '192.168.178.160';
const SERVICE_IP = '172.29.123.78';
const LISTENING_PORT = 30000;

class P2PServer {
  constructor() {
    this.peers = [MYIP, SERVICE_IP];
    this.sockets = {}; // {ip, socket}
    this.myMessages = [];
  }

  async listen() {
    const server = new WebSocket.Server({
      port: LISTENING_PORT,
      verifyClient: info => this.verifyClient(info)
    });
    console.log(`Listening for peers connection on port: ${LISTENING_PORT}`);
    server.on('connection', (socket, req) => {
      this.connectSocket(socket, req.connection.remoteAddress.substring(7));
    });
    setTimeout(async () => {
      await Promise.all(
        this.peers
          .filter(peer => peer !== MYIP)
          .map(peer => this.connectToPeer(peer))
      );
    }, 15000);
    setTimeout(() => this.showPeerList(), 20000);
  }

  verifyClient(info) {
    const token = url.parse(info.req.url, true).query.token;
    const clientIP = url.parse(info.req.url, true).query.ip;
    if (!this.sockets[clientIP]) {
      if (P2PServer.checkSignature(clientIP, token)) {
        // 列表中可能没有该IP
        if (!this.peers.includes(clientIP)) this.peers.push(clientIP);
        return true;
      }
    }
    return false;
  }

  connectSocket(socket, clientIP) {
    this.sockets[clientIP] = socket;
    socket.on('message', message => console.log(JSON.stringify(message)));
  }

  async waitingForOpen(socket) {
    return await new Promise((resolve, reject) => {
      socket.onopen = () => {
        resolve(socket);
      };
      socket.onerror = event => {
        reject('connection fail:' + event.message);
      };
    });
  }

  async connectToPeer(peer) {
    if (!this.sockets[peer]) {
      try {
        const socket = new WebSocket(
          `ws://${peer}:${LISTENING_PORT}` +
            `?token=${P2PServer.signAsServer(MYIP)}&ip=${MYIP}`
        );
        // TODO 把连接好的socket行为
        this.sockets[peer] = await this.waitingForOpen(socket);
        console.log(`successfully connect to ${peer}`);
      } catch (err) {
        console.log(err);
      }
    }
  }

  showPeerList() {
    console.log(`now the list : ${JSON.stringify(this.peers)}`);
    console.log(
      `now the sockets: ${JSON.stringify(Object.keys(this.sockets))}`
    );
  }

  broadCastToPeers(data) {
    for (let ip in this.sockets) {
    }
  }

  static signAsServer(data) {
    return CryptoJS.SHA256(`${CryptoJS.HmacMD5(data, SECRET)}`).toString();
  }

  static checkSignature(data, signature) {
    return P2PServer.signAsServer(data) === signature;
  }
}

module.exports = P2PServer;
