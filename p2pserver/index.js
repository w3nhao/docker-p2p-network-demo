const WebSocket = require("ws");
const fs = require("fs");

const MYIP = fs
  .readFileSync("/etc/hosts", "utf8")
  .toString()
  .split(/[\s\n]/)[14]; // 获取内网ip

const SERVICE_IP = "144.34.172.50"; // 这里是公网入口
const LISTENING_PORT = 30000;

const P2PMsg = require("./p2p-messages");
const MSG_TYPES = {
  peerConnect: "PEER_CONNECT", // 收到新节点socket，加入列表
  peerList: "PEER_LIST", // 回应获取列表信号
  getPeers: "GET_PEERS", //
  selfConnect: "ISYOURSELF",
  normal: "NORMAL"
};

class P2PServer {
  constructor() {
    this.peers = [MYIP];
    this.sockets = []; // {ip, socket}
    this.myMessages = [];
  }

  listen() {
    const server = new WebSocket.Server({ port: LISTENING_PORT });
    console.log(`Listening for peers connection on port: ${LISTENING_PORT}`);
    server.on("connection", socket =>
      socket.on("message", message => this.msgHandler(socket, message))
    );

    // 当我们将该类函数当成参数传入时
    // 实际只是传入了函数的引用
    // this.dicovery = P2PServer.prototype.discovery
    // 他没有明确指定具体哪个对象
    // 我们只能手动绑定
    // this.diccovery.bind(this)
    setTimeout(() => this.discovery(), 5000);

    // 重复多次，直到网络稳定
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.discovery(), 3000);
    }
  }

  discovery() {
    let socket = new WebSocket("ws://" + SERVICE_IP + ":" + LISTENING_PORT);

    socket.on("error", () => {
      console.log(
        `an error accur when discoverying server, we will try it again.`
      );
      setTimeout(() => this.discovery(), 5000);
    });
    socket.on("open", () => this.getPeersFrom(socket));
    socket.on("message", message => this.msgHandler(socket, message));
  }

  getPeersFrom(socket) {
    const listReq = new P2PMsg(MYIP, MSG_TYPES.getPeers);
    socket.send(JSON.stringify(listReq));
  }

  msgHandler(socket, message) {
    const msg = JSON.parse(message);
    if (P2PMsg.verifyMsg(msg)) {
      switch (msg.type) {
        case MSG_TYPES.normal:
          this.myMessages.push(msg.data);
          break;
        // 作为响应者
        case MSG_TYPES.getPeers:
          this.copeWithGetListReq(socket, msg.data);
          break;
        case MSG_TYPES.peerConnect:
          this.copeWithConnectReq(socket, msg.data);
          break;
        // 作为连接者
        case MSG_TYPES.peerList:
          this.copeWithReceiveList(socket, msg.data);
          break;
        case MSG_TYPES.selfConnect:
          this.copeWithSelfConnect(socket);
          break;
      }
    }
  }

  connectToPeer(peer) {
    // 发送前查表，看该节点是否已经主动连接我们
    if (!this.sockets.includes(pair => pair.ip === peer)) {
      const socket = new WebSocket("ws://" + peer + ":" + LISTENING_PORT);
      socket.on("open", () => {
        socket.send(JSON.stringify(new P2PMsg(MYIP, MSG_TYPES.peerConnect)));
        this.sockets.push({ ip: peer, socket });
      });
      socket.on("error", () => {
        console.log(`an error accur when to connect ${peer}, drop it.`);
      });
    }
  }

  broadCastToPeers(data) {
    this.sockets.forEach(pair => {
      console.log(`broadcasting to server: ${pair.ip}`);
      pair.socket.send(JSON.stringify(new P2PMsg(data)));
    });
  }

  copeWithGetListReq(socket, reqIP) {
    console.log(`First touch by ${reqIP}`);
    if (reqIP === MYIP) {
      socket.send(
        JSON.stringify(new P2PMsg("placeholder", MSG_TYPES.selfConnect))
      );
      console.log("send out a self wrong error.");
    } else {
      socket.send(JSON.stringify(new P2PMsg(this.peers, MSG_TYPES.peerList)));
      console.log("send out the list");
    }
  }

  copeWithConnectReq(socket, reqIP) {
    // 接收时查表，我们是否已经主动连上该主机
    if (this.sockets.includes(pair => pair.ip === reqIP)) {
      console.log("we have connect to it already");
      socket.close();
    } else {
      if (!this.peers.includes(reqIP)) this.peers.push(reqIP);
      this.sockets.push({ ip: reqIP, socket });
      console.log(`IP: ${reqIP} connectted to us`);
    }
  }

  copeWithReceiveList(socket, peerList) {
    socket.close();
    // 收表时去重，求并集
    this.peers.push(...peerList.filter(p => !this.peers.includes(p)));
    console.log(`now the list : ${this.peers}`);
    this.peers.forEach(peer => {
      if (peer !== MYIP) this.connectToPeer(peer);
    });
  }

  copeWithSelfConnect(socket) {
    console.log("You've connected to myself, we wil try it later");
    socket.close();
    setTimeout(() => this.discovery(), 5000);
  }
}

module.exports = P2PServer;
