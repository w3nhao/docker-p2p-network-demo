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
  getPeers: "GET_PEERS" //
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
    server.on("connection", async socket =>
      this.handlerConnectedSocket(socket)
    );

    // 当我们将该类函数当成参数传入时
    // 实际只是传入了函数的引用
    // this.dicovery = P2PServer.prototype.discovery
    // 他没有明确指定具体哪个对象
    // 我们只能手动绑定
    // this.diccovery.bind(this)
    // 重复多次，直到网络稳定
    for (let i = 1; i < 4; i++) {
      setTimeout(async () => this.discovery(), 20000 * i);
    }
  }

  async handlerConnectedSocket(socket) {
    try {
      let msg = await this.getIncomingMsg(socket);

      if (msg.type === MSG_TYPES.getPeers) {
        this.copeWithListReq(socket, msg.data);
      } else if (msg.type === MSG_TYPES.peerConnect) {
        this.copeWithConnectReq(socket, msg.data);
      } else {
        this.myMessages.push(msg);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async getIncomingMsg(socket) {
    return await new Promise((resolve, reject) => {
      socket.onmessage = evt => {
        const msg = JSON.parse(evt.data);
        if (P2PMsg.verifyMsg(msg)) {
          resolve(msg);
        } else {
          reject(new Error(`receive an invalid message: ${evt.data}`));
        }
      };
    });
  }

  copeWithListReq(socket, reqIP) {
    console.log(`A get list request from ${reqIP}`);
    if (reqIP === MYIP) {
      socket.send(JSON.stringify(new P2PMsg("You've connected to yourself")));
      console.log("send out a self wrong error.");
    } else {
      socket.send(JSON.stringify(new P2PMsg(this.peers, MSG_TYPES.peerList)));
      console.log("send out the list");
    }
  }

  copeWithConnectReq(socket, reqIP) {
    // 接收时查表，我们是否已经主动连上该主机
    if (this.sockets.some(pair => pair.ip === reqIP)) {
      socket.close();
      throw Error(`we have connect to ${reqIp} already`);
    } else {
      this.sockets.push({ ip: reqIP, socket });
      if (!this.peers.includes(reqIP)) this.peers.push(reqIP);
      console.log(`IP: ${reqIP} connectted to us`);
    }
  }

  async discovery() {
    let socket = new WebSocket("ws://" + SERVICE_IP + ":" + LISTENING_PORT);
    try {
      let openedSocket = await this.waitingForOpen(socket); // 等待socket打开
      let result = await this.getPeersFrom(openedSocket); // 等待收到peerList
      // 收到之后关掉
      openedSocket.close();
      this.copeWithGetPeersResult(result);
    } catch (err) {
      console.log(err + " ,try discovery again");
      setTimeout(async () => this.discovery(), 5000);
    }

    // 成功收取后，并发连接列表上的peer
    return await Promise.all(
      this.peers
        .filter(peer => peer !== MYIP)
        .map(peer => this.connectToPeer(peer))
    );
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

  async getPeersFrom(socket) {
    const listReq = new P2PMsg(MYIP, MSG_TYPES.getPeers);
    socket.send(JSON.stringify(listReq));
    return await this.getIncomingMsg(socket);
  }

  copeWithGetPeersResult(result) {
    if (result.type === MSG_TYPES.peerList) {
      // 收表时去重，求并集
      this.peers.push(...result.data.filter(p => !this.peers.includes(p)));
      console.log(`now the list : ${this.peers}`);
      console.log(`now the sockets: ${this.sockets.map(pair => pair.ip)}`);
    } else {
      throw Error(`err#4 met error when getting list: ${result}`);
    }
  }

  async connectToPeer(peer) {
    // 发送前查表，看该节点是否已经主动连接我们
    if (!this.sockets.some(pair => pair.ip === peer)) {
      const socket = new WebSocket("ws://" + peer + ":" + LISTENING_PORT);
      try {
        let openedSocket = await this.waitingForOpen(socket);
        // 异步容错：几乎同时发起连接，若比对方落后，则关闭连接
        if (!this.sockets.some(pair => pair.ip === peer)) {
          openedSocket.send(
            JSON.stringify(new P2PMsg(MYIP, MSG_TYPES.peerConnect))
          );
          this.sockets.push({ ip: peer, socket });
          console.log(`successfully connect to ${peer}`);
        } else {
          throw new Error(`${peer} connected to us already.`);
        }
      } catch (err) {
        console.log(err);
        socket.close();
      }
    }
  }

  broadCastToPeers(data) {
    this.sockets.forEach(pair => {
      console.log(`broadcasting to server: ${pair.ip}`);
      pair.socket.send(JSON.stringify(new P2PMsg(data)));
    });
  }
}

module.exports = P2PServer;
