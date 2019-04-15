const EC = require('elliptic').ec;
const SHA256 = require('crypto-js/sha256');
const ec = new EC('secp256k1');

class ChainUtil {
  static genKeyPair() {
    return ec.genKeyPair();
  }

  static importPrivateKey(priv) {
    return ec.keyFromPrivate(priv, 'hex');
  }

  static hash(data) {
    return SHA256(JSON.stringify(data)).toString();
  }

  static verifySignature(account, signature, dataHash) {
    return ec.keyFromPublic(account, 'hex').verify(dataHash, signature);
  }

  static verifyCommentSignatrue(comment) {}
}



module.exports = ChainUtil;
