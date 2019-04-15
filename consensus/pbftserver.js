const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const url = require('url');

const SECRET = '7H1$!5453CR37';
const CLIENT_SECRET = '7H1$!54C213N753CR37';

const MYIP = '192.168.178.162';
const SERVICE_IP = '172.29.123.78';
const LISTENING_PORT = 30000;

const { MSGTYPES, Protocol } = require('./protocol.js');

class P2PServer {
  constructor(blockchain) {
    this.viewId = 0;
    this.peers = [MYIP, SERVICE_IP];
    this.sockets = {}; // {ip, socket}
    this.clients = {}; // 统计feathers接来的客户端地址与socket，用来回复
    this.workerIDs = {}; // 记录每个服务器的公钥地址
    this.supervisors = {}; // 缓存记录查询到的审查员公钥地址
    this.requestCache = {}; // 缓存客户端发来的request
    this.blockchain = blockchain;
  }

  async listen() {
    const server = new WebSocket.Server({
      port: LISTENING_PORT,
      verifyClient: info => this.verifyNode(info)
    });

    console.log(`Listening for peers connection on port: ${LISTENING_PORT}`);
    server.on('connection', (socket, req) => {
      this.connectSocket(socket, req.connection.remoteAddress.substring(7));
    });

    // after discovery
    this.peers = this.sortPeers(this.peers);

    setTimeout(async () => {
      await Promise.all(
        this.peers
          .filter(peer => peer !== MYIP)
          .map(peer => this.connectToPeer(peer))
      );
    }, 15000);

    setTimeout(() => this.showPeerList(), 20000);
  }

  // ####
  verifyNode(info) {
    const { token, ip, role, pub } = url.parse(info.req.url, true).query;
    if (role === 'server') {
      if (!this.sockets[ip]) {
        if (P2PServer.verify(ip, SECRET, token)) {
          // 列表中可能没有该IP
          if (!this.peers.includes(ip)) {
            this.peers.push(ip);
          }
          this.workerIDs[ip] = pub;
          return true;
        }
      }
    } else if (role === 'client') {
      if (P2PServer.verify(ip, CLIENT_SECRET, token)) {
        this.clients[ip] = null;
        return true;
      }
    }
    return false;
  }

  // ####
  connectSocket(socket, ip) {
    if (Object.keys(this.clients).includes(ip)) {
      this.clients[ip] = socket;
      console.log('clients connected');
    } else {
      this.sockets[ip] = socket;
    }
    socket.on('message', message =>
      this.msgHandler(socket, JSON.parse(message))
    );
  }

  responseToClient(socket, data) {
    socket.send(data + MYIP);
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
            `?role=server&token=${P2PServer.sign(MYIP, SECRET)}&ip=${MYIP}`
        );
        this.connectSocket(await this.waitingForOpen(socket), peer);
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
      this.sockets[ip].send(JSON.stringify(data));
    }
  }

  // ###
  msgHandler(socket, message) {
    switch (message.type) {
      case MSGTYPES.request:
        const { hash, signature, assessments, timestamp } = message;
        Protocol.verifyRequest(hash, signature);
        if (this.peers[viewId] === MYIP) {
          const block = this.blockchain.genBlock(timestamp, assessments);
          this.broadCastToPeers(Protocol.orderedRequestMsg(...block));
          this.blockchain.chain.push(block);
          socket.send(JSON.stringify(block));
        } else {
          this.requestCache[timestamp] = {
            hash,
            signature,
            assessments,
            timestamp
          };
        }
        break;
      case MSGTYPES.orderedRequest:
        break;
      case MSGTYPES.commit:
        break;
      case MSGTYPES.localCommit:
        break;
    }
  }

  // ###添加到Docker版本，用来确认viewID
  sortPeers(peers) {
    return peers.sort(
      (a, b) => parseInt(a.split('.')[3]) - parseInt(b.split('.')[3])
    );
  }

  static sign(data, secret) {
    return CryptoJS.SHA256(`${CryptoJS.HmacMD5(data, secret)}`).toString();
  }

  static verify(data, secret, signature) {
    return P2PServer.sign(data, secret) === signature;
  }
}

module.exports = P2PServer;
