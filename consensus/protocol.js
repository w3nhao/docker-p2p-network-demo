const ChainUtil = require('./chain-utils');
const axios = require('axios');

const MSGTYPES = {
  request: 1,
  orderedRequest: 2,
  response: 3,
  commit: 4,
  localCommit: 5,
  iHatePrimary: 6
};

class Protocol {
  /**
   *
   *
   * @static
   * @param {*} hash assessments, publicKey, timestamp的哈希
   * @param {*} signature 审查员的签名
   * @param {*} publicKey 审查员的公钥地址
   * @param {*} assessments 打包的评价内容
   * @param {*} timestamp 审查员发起的时间戳
   * @returns
   * @memberof Protocol
   */
  static requestMsg(hash, signature, publicKey, assessments, timestamp) {
    return {
      type: MSGTYPES.request,
      request: {
        hash,
        signature,
        publicKey,
        assessments,
        timestamp
      }
    };
  }

  /**
   *
   *
   * @static
   * @param {*} blockHash 本地生成的区块哈希
   * @param {*} request 客户端提交的请求
   * @param {*} clientIp 客户端的ip地址
   * @returns
   * @memberof Protocol
   */
  static orderedRequestMsg(blockHash, request, clientIp) {
    return {
      type: MSGTYPES.orderedRequest,
      blockHash,
      request,
      clientIp
    };
  }

  static responseMsg(hash, timestamp) {
    return { type: MSGTYPES.response, hash, timestamp };
  }

  static commitMsg(data) {
    return { type: MSGTYPES.commit, data };
  }
  static localCommitMsg(data) {
    return { type: MSGTYPES.localCommit, data };
  }

  static verifyRequest(supervisors, request) {
    const { hash, signature, publicKey, assessments, timestamp } = request;
    if (!supervisors[publicKey]) {
      // axios需要单独单元测试
      // 联网查询，axios get，入口是自己的公网入口，为免无法接入，最好从内网service接入
      // 若有，推入supervisors
      // 若无，return false;
    }
    if (!ChainUtil.verifySignature(publicKey, signature, hash)) {
      return false;
    }
    if (hash !== ChainUtil.hash(publicKey, assessments, timestamp)) {
      return false;
    }
    return true;
  }

  static verifyOrderedRequest(
    supervisors,
    blockchain,
    requestCache,
    blockHash,
    request
  ) {
    const { assessments, timestamp } = request;
    if (requestCache[timestamp]) {
      return requestCache[timestamp].hash === blockHash ? true : false;
    } else {
      if (Protocol.verifyRequest(supervisors, request)) {
        const block = blockchain.genBlock(timestamp, assessments);
        requestCache[timestamp] = block;
        if (block.hash === blockHash) {
          return true;
        } else {
          return false; // IHATEPRIMARY
        }
      } else {
        // 最恶劣的情况：主节点送来的request无法通过验证
        // 主节点false，该采取什么行动？ => 发送带有自身签名的IHATEPRIMARY
        return false;
      }
    }
  }

  static verifyCommit() {}

  static verifyLocalCommit() {}

  static iHatePrimary() {}

  static checkRole(publicKey) {
    // TODO
  }
}

module.exports = { MSGTYPES, Protocol };
