const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const url = require('url');

const CLIENT_SECRET = '7H1$!54C213N753CR37';
const { MSGTYPES, Protocol } = require('../consensus/protocol');
const MYIP = '192.168.178.160';
const SERVICE_IP = '172.29.123.78';

class Client {
  constructor() {
    this.servers = [MYIP, SERVICE_IP];
    this.sockets = {};
  }

  // TODO 没有考虑节点离开网络的情况
  connectSocket(socket, serverIP) {
    this.sockets[serverIP];
    socket.on('message', message => this.msgHandler(JSON.parse(message)));
  }

  async connectToPeer(peer) {
    if (!this.sockets[peer]) {
      try {
        const socket = new WebSocket(
          `ws://${peer}:${LISTENING_PORT}` +
            `?role=clients&token=${Client.sign(MYIP, CLIENT_SECRET)}&ip=${MYIP}`
        );
        this.connectSocket(await this.waitingForOpen(socket), peer);
      } catch (err) {
        console.log(err);
      }
    }
  }

  broadCastToServers(data) {
    for (let ip in this.sockets) {
      this.sockets[ip].send(JSON.stringify(data));
    }
  }

  static sortServers(servers) {
    return servers.sort(
      (a, b) => parseInt(a.split('.')[3]) - parseInt(b.split('.')[3])
    );
  }

  static sign(data, secret) {
    return CryptoJS.SHA256(`${CryptoJS.HmacMD5(data, secret)}`).toString();
  }
}
