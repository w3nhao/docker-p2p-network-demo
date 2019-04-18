// const axios = require('axios');
const { ChainUtil } = require('./chain-utils');

const MSGTYPES = {
  request: 1,
  orderedRequest: 2,
  confirmRequest: 3,
  response: 4,
  commit: 5,
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

  /**
   *
   *
   * @static
   * @param {*} request 从客户端收到的requst
   * @returns
   * @memberof Protocol
   */
  static confirmRequest(request) {
    return {
      type: MSGTYPES.confirmRequest,
      request
    };
  }

  /**
   *
   *
   * @static
   * @param {*} block 本节点生成的block
   * @returns
   * @memberof Protocol
   */
  static responseMsg(block) {
    const { timestamp, lastHash, hash, height } = block;
    return { type: MSGTYPES.response, timestamp, lastHash, hash, height };
  }

  /**
   *
   *
   * @static
   * @param {*} height 检查点高度
   * @returns
   * @memberof Protocol
   */
  static commitMsg(height) {
    return { type: MSGTYPES.commit, height };
  }

  /**
   *
   *
   * @static
   * @param {*} supervisors 审查员缓存表
   * @param {*} request 客户端请求内容
   * @returns
   * @memberof Protocol
   */
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

  static verifyOrderedRequest(supervisors, blockchain, blockHash, request) {
    const { assessments, timestamp } = request;
    if (blockchain.requestTable[timestamp]) {
      return blockchain.requestTable[timestamp].hash === blockHash
        ? true
        : false;
    } else {
      if (Protocol.verifyRequest(supervisors, request)) {
        const block = blockchain.addBlock(timestamp, assessments);
        blockchain.requestTable[timestamp] = block;
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

  static iHatePrimary() {}

  static checkRole(publicKey) {
    // TODO
  }
}

module.exports = { MSGTYPES, Protocol };
