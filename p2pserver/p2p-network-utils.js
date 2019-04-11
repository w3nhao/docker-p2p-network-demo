const CryptoJS = require('crypto-js');
const uuidV1 = require('uuid/v1');
// const { SECRET } = require('../config/default.json');
const SECRET = "7H1$!5453CR37";

class NetworkUtils {
  static id() {
    return uuidV1();
  }

  static signAsServer(digest) {
    return CryptoJS.HmacMD5(JSON.stringify(digest), SECRET);
  }

  static checkSignature(digest, signature) {
    return JSON.stringify(CryptoJS.HmacMD5(JSON.stringify(digest), SECRET)) === JSON.stringify(signature);
  }

  static hash(data) {
    return CryptoJS.SHA256(JSON.stringify(data)).toString();
  }

  static verifyUtils(info) {
    
  }
}

module.exports = NetworkUtils;
