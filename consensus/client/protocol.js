const { ChainUtil } = require('./chain-utils');

const MSGTYPES = {
  request: 1,
  orderedRequest: 2,
  response: 3,
  commit: 4,
  localCommit: 5,
  viewId: 6
};

class Protocol {
  static requestMsg(data) {
    return { type: MSGTYPES.request, data };
  }
  static orderedRequestMsg(data) {
    return { type: MSGTYPES.orderedRequest, data };
  }
  static responseMsg(data) {
    return { type: MSGTYPES.response, data };
  }
  static commitMsg(data) {
    return { type: MSGTYPES.commit, data };
  }
  static localCommitMsg(data) {
    return { type: MSGTYPES.localCommit, data };
  }
  static viewIdMsg(data) {
    return { type: MSGTYPES.viewId, data };
  }
  static verifyRequest() {}

  static verifyPreprepare() {}

  static verifyPrepare() {}

  static verifyCommit() {}
}

module.exports = { MSGTYPES, Protocol };
