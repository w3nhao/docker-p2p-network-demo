// 主要目标：实现无错误情况的Zyzzyva算法
// 1.请求 block 内的部分信息以request形式发送到服务器
// request = {
//   data,
//   timestamp,
//   signature     目前可以不添加 
// };
// 2.用request的内容挖一个block并且将orderRequest发送出去
block = {
  data: request.data,
  timestamp: request.timestamp,
  lastHahs,
  hash,
  height
}

orderedRequest = {
  data: request.data,
  timestamp: request.timestamp,
  blockchain,


}

const P2PServer = require('../p2pserver');

const State = {
  None: 0,
  Prepare: 1,
  commit: 2
};

class PBFTServer extends P2PServer {
  constructor() {
    super();
  }
}
