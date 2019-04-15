/**
 *
 *
 * @class Block
 */
class Block {
  /**
   * 创建区块实例
   * @param {*} timestamp - 时间戳
   * @param {*} lastHash - 前一区块哈希
   * @param {*} hash - 当前区块哈希
   * @param {*} data - 区块数据
   * @param {*} height - 区块高度
   * @memberof Block
   */
  constructor(timestamp, lastHash, hash, data, height) {
    this.timestamp = timestamp;
    this.lastHash = lastHash;
    this.hash = hash;
    this.data = data;
    this.height = height;
  }

  toString() {
    return `Block -
    Timestamp : ${this.timestamp}
    Last Hash : ${this.lastHash.substring(0, 10)}
    Hash    : ${this.hash.substring(0, 10)}
    height   : ${this.height}
    Data    : ${this.data}`;
  }

  static genesis() {
    return new this('Genesis time', '-----', 'f1r57-h45h', [], 0);
  }

  static mineBlock(lastBlock, data) {
    const hash = Block.hash(timestamp, lastHash, data, height);
    const lastHash = lastBlock.hash;
    const height = lastBlock.height + 1;
    const timestamp = Date.now();
    return new Block(timestamp, lastHash, hash, data, height);
  }

  static hash(timestamp, lastHash, data, height) {
    return SHA256(JSON.stringify(`${timestamp}${lastHash}${data}${height}`)).toString();
  }

  static blockHash(block) {
    const { timestamp, lastHash, data, height } = block;
    return Block.hash(timestamp, lastHash, data, height);
  }
}
module.exports = Block;
