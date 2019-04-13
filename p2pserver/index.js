const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const url = require('url');
const nslookup = require('nslookup');
const fs = require('fs');

const SECRET = '7H1$!5453CR37';

const SERVICE_NAME = 'simplep2p';

// 从docker分配的节点host文件中获取内网ip
const MYIP = fs
  .readFileSync('/etc/hosts', 'utf8')
  .toString()
  .split(/[\s\n]/)[14];

const LISTENING_PORT = 30000;

const P2PMsg = require('./p2p-messages');

class P2PServer {
  constructor() {
    this.peers = [];
    this.sockets = {}; // {ip, socket}
    this.myMessages = [];
  }

  listen() {
    const server = new WebSocket.Server({
      port: LISTENING_PORT,
      verifyClient: info => this.verifyClient(info)
    });
    console.log(`Listening for peers connection on port: ${LISTENING_PORT}`);
    server.on('connection', (socket, req) => {
      this.connectSocket(socket, req.connection.remoteAddress.substring(7));
      console.log(
        `${req.connection.remoteAddress.substring(7)} connected to us`
      );
    });

    setTimeout(async () => this.discovery(SERVICE_NAME), 5000);
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

  async discovery(serviceName) {
    try {
      const peerList = await this.getPeersFrom(serviceName);
      this.peers.push(...peerList.filter(p => p !== MYIP));
    } catch (err) {
      console.log(err + ' ,try discovery again');
      setTimeout(async () => this.discovery(SERVICE_NAME), 5000);
    }

    // 设置间隔时间以免碰撞，并发连接列表上的peer
    const interval = P2PServer.randNum(1, 20);
    setTimeout(async () => {
      await Promise.all(
        this.peers
          .filter(peer => peer !== MYIP)
          .map(peer => this.connectToPeer(peer))
      );
    }, 1000 * interval);

    setTimeout(() => this.showPeerList(), 60000);
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

  async getPeersFrom(serviceName) {
    return await new Promise((resolve, reject) => {
      nslookup('tasks.' + serviceName + '_web')
        .server('127.0.0.11')
        .end((err, addrs) => {
          resolve(addrs);
          reject(err);
        });
    });
  }

  async connectToPeer(peer) {
    if (!this.sockets[peer]) {
      try {
        const socket = new WebSocket(
          `ws://${peer}:${LISTENING_PORT}` +
            `?token=${P2PServer.signAsServer(MYIP)}&ip=${MYIP}`
        );
        const openedSocket = await this.waitingForOpen(socket);
        this.connectSocket(openedSocket, peer);
        console.log(`connection accept by ${peer}`);
      } catch (err) {
        console.log(err);
      }
    } else {
      console.log(`we\'ve connected with ${peer}`);
    }
  }

  connectSocket(socket, clientIP) {
    if (!this.sockets[clientIP]) {
      this.sockets[clientIP] = socket;
      socket.on('message', message => console.log(JSON.stringify(message)));
    } else {
      console.log(`collision with ${clientIP} happened`);
      // 等待两方稳定下来，开始退避随机连接
      setTimeout(() => this.fixCollision(clientIP), 5000);
    }
  }

  fixCollision(peer) {
    this.sockets[peer] = null;
    console.log(`reset socket with ${peer}`);
    const interval = P2PServer.randNum(1, 20);
    setTimeout(() => this.connectToPeer(peer), 3000 * interval);
  }

  showPeerList() {
    const sockets = [];
    for (let ip in this.sockets) {
      if (this.sockets[ip]) sockets.push(ip);
    }
    console.log(`now the list : ${JSON.stringify(this.peers)}`);
    console.log(`now the sockets: ${JSON.stringify(sockets)}`);
  }

  broadCastToPeers(data) {
    for (let ip in this.sockets) {
      sockets[ip].send(JSON.stringify(new P2PMsg(data)));
    }
  }

  static randNum(mini, maxi) {
    let min = Math.ceil(mini);
    let max = Math.floor(maxi);
    return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
  }

  static signAsServer(data) {
    return CryptoJS.SHA256(`${CryptoJS.HmacMD5(data, SECRET)}`).toString();
  }

  static checkSignature(data, signature) {
    return P2PServer.signAsServer(data) === signature;
  }
}

module.exports = P2PServer;
