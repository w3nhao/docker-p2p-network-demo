const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const url = require('url');
const events = require('events');
const _ = require('lodash');

const SECRET = '7H1$!5453CR37';
const CLIENT_SECRET = '7H1$!54C213N753CR37';

const MYIP = '192.168.178.162';
const SERVICE_IP = '172.29.123.78';
const LISTENING_PORT = 30000;

const { MSGTYPES, Protocol } = require('./protocol.js');

const pbft = new events.EventEmitter();

class P2PServer {
  constructor(blockchain, supervisors) {
    this.viewId = 0;
    this.peers = [MYIP, SERVICE_IP];
    this.sockets = {}; // {ip, socket}
    this.clients = {}; // 统计feathers接来的客户端地址与socket
    this.replicaIDs = {}; // 记录每个服务器的公钥地址
    this.supervisors = supervisors; // 缓存记录查询到的审查员公钥地址
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
    if (
      role === 'server' &&
      !this.sockets[ip] &&
      P2PServer.verify(ip, SECRET, token)
    ) {
      // 列表中可能没有该IP
      if (!this.peers.includes(ip)) {
        this.peers.push(ip);
      }
      this.relicaIDs[ip] = pub;
      return true;
    } else if (
      role === 'client' &&
      P2PServer.verify(ip, CLIENT_SECRET, token)
    ) {
      this.clients[ip] = null;
      return true;
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

  findIp(socket) {
    const serverIp = _.findKey(this.sockets, socket);
    const clientIp = _.findKey(this.clients, socket);
    if (serverIp) return serverIp;
    else if (clientIp) return clientIp;
    else return console.log("This socket didn't exist");
  }

  copeWithRequest(socket, message) {
    const { request } = message;
    const { timestamp, assessments } = request;
    if (Protocol.verifyRequest(this.supervisors, request)) {
      if (this.peers[viewId] === MYIP) {
        this.copeWithRequestAsPrimary(socket, timestamp, assessments);
      } else {
        this.copeWithRequestAsReplicas(socket, timestamp, assessments);
      }
    } else {
      socket.send('This is an invalid request');
    }
  }

  copeWithRequestAsPrimary(socket, timestamp, assessments) {
    const clientIp = this.findIp(socket);
    const block = this.blockchain.addBlock(timestamp, assessments);
    this.broadCastToPeers(
      Protocol.orderedRequestMsg(block.hash, request, clientIp)
    );
    this.sendTo(socket, Protocol.responseMsg(block.hash, timestamp));
    console.log(`A new block generate ${JSON.stringify(block)}`);
  }

  async copeWithRequestAsReplicas(timestamp, assessments) {
    if (!this.blockchain.requestCache[timestamp]) {
      this.blockchain.addBlock(timestamp, assessments);
      console.log(`A new request arrived ${request}`);
      // 超时1次后的处理为正解。
      // 后续如何拒绝拜占庭客户端的请求？
      try {
        await waitForOrderedRequest();
      } catch (err) {
        console.log(err);
        // TODO 发送R给主节点COMFIRM-R，继续等待
        // 超时2次，广播IHATEPRIMARY
      }
    }
    // 由于网络延迟或其他问题，OR比R先到达,什么都不做
  }

  async waitForOrderedRequest() {
    return await Promise.race([
      new Promise(resolve => {
        pbft.on('receivedOrderedRquest', () => {
          resolve('ok');
        });
      }),
      new Promise(reject => {
        setTimeout(() => reject(null), 500);
      })
    ]);
  }

  copeWithOrderedRequest(socket, message) {
    const incomingIp = this.findIp(socket);
    if (incomingIp === this.peers[viewId]) {
      const { blockHash, request, clientIp } = message;
      pbft.emit('receivedOrderedRquest');
      if (
        Protocol.verifyOrderedRequest(
          this.supervisors,
          this.blockchain,
          blockHash,
          request
        )
      ) {
        this.sendToClient(
          this.clients[clientIp],
          Protocol.responseMsg(block.hash, block.timestamp)
        );
      } else {
        this.broadCastToPeers('IHATEPRIMARY');
      }
    } else {
      console.log(`Node ${incomingIp} misbehaving`);
    }
  }
  // ###
  msgHandler(socket, message) {
    switch (message.type) {
      case MSGTYPES.request:
        this.copeWithRequest(socket, request);
        break;
      case MSGTYPES.orderedRequest:
        this.copeWithOrderedRequest(socket, message);
        break;
      case MSGTYPES.commit:
        break;
      case MSGTYPES.localCommit:
        break;
      default:
        const ip = this.findIp();
        console.log(`Receive an unknown message from ${ip}`);
    }
  }

  sendTo(socket, message) {
    socket.send(JSON.stringify(message));
  }

  // ###添加到Docker版本，用来确认viewID
  sortPeers(peers) {
    return peers.sort(
      (a, b) => parseInt(a.split('.')[3]) - parseInt(b.split('.')[3])
    );
  }

  static sign(data, secret) {
    return CryptoJS.HmacMD5(data, secret).toString();
  }

  static verify(data, secret, signature) {
    return P2PServer.sign(data, secret) === signature;
  }
}

module.exports = P2PServer;
