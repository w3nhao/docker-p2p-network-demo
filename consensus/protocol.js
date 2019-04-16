const ChainUtil = require('./chain-utils');

const MSGTYPES = {
  request: 1,
  orderedRequest: 2,
  response: 3,
  commit: 4,
  localCommit: 5,
};

class Protocol {
  static requestMsg(hash, signature, publicKey, assessments, timestamp) {
    return {
      type: MSGTYPES.request,
      hash,
      signature,
      publicKey,
      assessments,
      timestamp
    };
  }

  static orderedRequestMsg(
    blockHash,
    hash,
    signature,
    publicKey,
    assessments,
    timestamp
  ) {
    return {
      type: MSGTYPES.orderedRequest,
      blockHash,
      hash,
      signature,
      publicKey,
      assessments,
      timestamp
    };
  }

  static responseMsg(hash, lastHash, height, timestamp) {
    return { type: MSGTYPES.response, hash, lastHash, height, timestamp };
  }

  static commitMsg(data) {
    return { type: MSGTYPES.commit, data };
  }
  static localCommitMsg(data) {
    return { type: MSGTYPES.localCommit, data };
  }
  
  static verifyRequest(hash, signature, publicKey, assessments, timestamp) {
    
    // 校验签名
    // 再校对数据完整性
  }

  static verifyOrderedRequest(
    blockCache,
    blockHash,
    hash,
    signature,
    publicKey,
    assessments,
    timestamp
  ) {
    // 先查询历史缓存表
    // 对照本地哈希与主节点哈希
    // 没有本地请求，先生成区块，推入历史缓存表
    // 对照本地哈希与主节点哈系
  }

  static verifyCommit() {}

  static verifyLocalCommit() {}
}

module.exports = { MSGTYPES, Protocol };
