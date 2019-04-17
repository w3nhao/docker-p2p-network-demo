const Block = require('./block');

class Blockchain {
  constructor() {
    this.chain = [Block.genesis()];
    this.chainCache = [Block.genesis()];
    this.requestTable = {};
  }

  addBlock(timestamp, data) {
    const block = Block.mineBlock(
      this.chainCache[this.chainCache.length - 1],
      timestamp,
      data
    );
    this.chainCache.push(block);
    this.requestTable[timestamp] = block;
    return block;
  }

  cleanCache() {
    for (let i = 1; i < this.chainCache.length; i++) {
      this.chain.push(this.chainCache[i]);
      delete this.requestTable[this.chainCache[i].timestamp];
    }
    const leadingBlock = this.chainCache[this.chainCache.length - 1];
    this.chainCache = [leadingBlock];
    console.log(`Now the chain height is ${this.chain.length}`);
  }

  isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
      return false;

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const lastblock = chain[i - 1];

      if (
        block.lastHash !== lastblock.hash ||
        block.hash !== Block.blockHash(block)
      ) {
        return false;
      }
    }

    return true;
  }

  replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      //eslint-disable-next-line no-console
      console.log('Received chain is  not longer than the current chain.');
      return;
    } else if (!this.isValidChain(newChain)) {
      //eslint-disable-next-line no-console
      console.log('The received chain is not valid.');
      return;
    }

    //eslint-disable-next-line no-console
    console.log('Replacing blockchain with new chain.');
    this.chain = newChain;
  }
}

module.exports = Blockchain;
