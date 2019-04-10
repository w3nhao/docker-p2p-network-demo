const NetworkUtils = require("./p2p-network-utils");

// const MSG_TYPES = {
//   peerConnect: "PEER_CONNECT", // 收到新节点socket，加入列表
//   peerLeave: "PEER_LEAVE",
//   peerList: "PEER_LIST", // 回应获取列表信号
//   getPeers: "GET_PEERS", //
//   selfConnect: "ISYOURSELF",
//   normal: "NORMAL"
// };
class P2PMSG {
  constructor(data, type) {
    this.type = type ? type : "NORMAL";
    this.data = data;
    this.digest = NetworkUtils.hash(this.data);
    this.signature = NetworkUtils.signAsServer(this.digest);
  }

  static verifyMsg(msg) {
    if (msg.signature) {
      if (msg.digest === NetworkUtils.hash(msg.data)) {
        if (NetworkUtils.checkSignature(msg.digest, msg.signature)) {
          return true;
        }
      }
    }
    console.log(`You've receive an invalid message, message details : ${msg}`);
    return false;
  }
}

module.exports = P2PMSG;
