const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const { KeyPair } = require('../consensus/chain-utils');
const url = require('url');
const events = require('events');
const _ = require('lodash');

const SECRET = '7H1$!5453CR37';
const CLIENT_SECRET = '7H1$!54C213N753CR37';

const MYIP = '192.168.178.163';
const SERVICE_IP = '192.168.178.1';
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
    this.keys = new KeyPair();
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
      this.replicaIDs[ip] = pub;
      return true;
    }
    if (role === 'client') {
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
            `?role=server&token=${P2PServer.sign(MYIP, SECRET)}&ip=${MYIP}` +
            `&pub=${this.keys.getPub()}`
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
    if (Protocol.verifyRequest(this.supervisors, request)) {
      if (this.peers[this.viewId] === MYIP) {
        this.copeWithRequestAsPrimary(socket, request);
      } else {
        this.copeWithRequestAsReplicas(request);
      }
    } else {
      socket.send('This is an invalid request');
    }
  }

  copeWithRequestAsPrimary(socket, request) {
    const { timestamp, assessments } = request;
    const clientIp = this.findIp(socket);
    console.log(`client${clientIp}`);
    const block = this.blockchain.addBlock(timestamp, assessments);
    this.broadCastToPeers(
      Protocol.orderedRequestMsg(block.hash, request, clientIp)
    );
    this.sendTo(socket, Protocol.responseMsg(block.hash, timestamp));
    console.log(`A new block generate ${JSON.stringify(block)}`);
  }

  async copeWithRequestAsReplicas(request) {
    const { timestamp, assessments } = request;
    if (!this.blockchain.requestTable[timestamp]) {
      this.blockchain.addBlock(timestamp, assessments);
      // 若主节点网络延迟，或不响应的举动
      try {
        if (!(await this.waitForOrderedRequest(500))) {
          this.sendTo(
            this.sockets[this.viewId],
            Protcol.confirmRequest(request)
          );
          if (!(await this.waitForOrderedRequest(500))) {
            this.broadCastToPeers('IHATEPRIMARY');
          }
        }
      } catch (err) {
        console.log(err);
      }
    }
    // else 若由于网络延迟或其他问题，OR比R先到达,什么都不做
  }

  async waitForOrderedRequest(ms) {
    return await Promise.race([
      new Promise(resolve =>
        pbft.on('receivedOrderedRquest', () => resolve(true))
      ),
      new Promise(reject => setTimeout(() => reject(false), ms))
    ]);
  }

  copeWithOrderedRequest(socket, message) {
    const incomingIp = this.findIp(socket);
    if (incomingIp === this.peers[this.viewId]) {
      const { blockHash, request, clientIp } = message;
      console.log(`client received ${clientIp}`);
      const { timestamp } = request;
      pbft.emit('receivedOrderedRquest');
      if (
        Protocol.verifyOrderedRequest(
          this.supervisors,
          this.blockchain,
          blockHash,
          request
        )
      ) {
        this.sendTo(
          this.clients[clientIp],
          Protocol.responseMsg(
            this.blockchain.requestTable[timestamp].hash,
            timestamp
          )
        );
      } else {
        this.broadCastToPeers('IHATEPRIMARY');
      }
    } else {
      console.log(`Node ${incomingIp} misbehaving`);
    }
  }

  msgHandler(socket, message) {
    switch (message.type) {
      case MSGTYPES.request:
        console.log(
          `A new request arrived ${JSON.stringify(message.request.timestamp)}`
        );
        this.copeWithRequest(socket, message);
        break;
      case MSGTYPES.orderedRequest:
        this.copeWithOrderedRequest(socket, message);
        break;
      case MSGTYPES.confirmRequest:
        this.copeWithRequest(socket, message);
        break;
      case MSGTYPES.commit:
        break;
      case MSGTYPES.localCommit:
        break;
      default:
        const ip = this.findIp(socket);
        if (ip === this.peers[viewId]) this.broadCastToPeers('IHATEPRIMARY');
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
