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
      this.connectSocket(socket);
      console.log(req.connection.remoteAddress);
    });

    // 将查询发起时间分散
    const waitingTime = () => {
      let min = Math.ceil(1);
      let max = Math.floor(20);
      return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
    };
    setTimeout(async () => this.discovery(SERVICE_NAME), 1000 * waitingTime);
  }

  verifyClient(info) {
    const token = url.parse(info.req.url, true).query.token;
    const clientIP = url.parse(info.req.url, true).query.ip;
    if (!this.sockets[clientIP]) {
      if (P2PServer.checkSignature(clientIP, token)) {
        // 列表中可能没有该IP
        if (!this.peers.includes(clientIP)) this.peers.push(clientIP);
        info.req.clientIP = clientIP;
        return true;
      }
    }
    return false;
  }

  connectSocket(socket) {
    const clientIP = socket.upgradeReq.clientIP;
    this.sockets[clientIP] = socket;
    socket.on('message', message => console.log(JSON.stringify(message)));
  }

  async discovery(serviceName) {
    try {
      const peerList = await this.getPeersFrom(serviceName);
      this.peers.push(...peerList.filter(p => p !== MYIP));
    } catch (err) {
      console.log(err + ' ,try discovery again');
      setTimeout(async () => this.discovery(SERVICE_NAME), 5000);
    }

    // 成功收取后，并发连接列表上的peer
    await Promise.all(
      this.peers
        .filter(peer => peer !== MYIP)
        .map(peer => this.connectToPeer(peer))
    );

    this.showPeerList();
  }

  async waitingForOpen(socket) {
    return await new Promise((resolve, reject) => {
      socket.onopen = () => {
        resolve(socket);
      };
      socket.onerror = () => {
        reject(new Error(`err#1 fail to waiting for socket open`));
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
      sockets[ip].send(JSON.stringify(new P2PMsg(data)));
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
