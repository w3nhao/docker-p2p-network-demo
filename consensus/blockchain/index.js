const Block = require('./block');

class Blockchain {
  constructor() {
    this.chain = [Block.genesis()];
    this.chainCache = [Block.genesis()];
    this.commitCache = [];
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

  commitBlock(height, peers, commitIP) {
    if (
      !this.commitCache.length ||
      this.commitCache[this.commitCache.length - 1].height < height
    ) {
      const count = {};
      const agreeNum = 1;
      count[commitIP] = true;
      peers.forEach(ip => {
        if (ip !== commitIP) count[ip] = false;
      });
      this.commitCache.push({ height, agreeNum, count });
    } else {
      for (let i = 0; i < this.commitCache.length - 1; i++) {
        if (this.commitCache[i].height === height) {
          if (!this.commitCache[i].count[commitIP]) {
            this.commitCache[i].count[commitIP] = true;
            this.commitCache[i].agreeNum++;
          }
          if (
            this.commitCache[i].agreeNum >= Math.ceil((2 / 3) * peers.length)
          ) {
            const restCommits = [];
            for (let i = commitPos + 1; i < this.commitCache.length - 1; i++) {
              restCommits.push(this.commitCache[i]);
            }
            this.commitCache = restCommits;
            this.cleanBlockCache(height);
          }
          break;
        }
      }
    }
  }

  cleanBlockCache(height) {
    if (height <= this.chainCache[this.chainCache.length - 1].height) {
      const restBlocks = [];
      for (let i = 1; i < this.chainCache.length - 1; i++) {
        if (this.chainCache[i].height <= height) {
          this.chain.push(this.chainCache[i]);
          delete this.requestTable[this.chainCache[i].timestamp];
          if ((this.chainCache[i].height = height)) {
            restBlocks.push(this.chainCache[i]);
          }
        } else {
          restBlocks.push(this.chainCache[i]);
        }
      }
      this.chainCache = restBlocks;
    }

    const leadingBlock = this.chainCache[this.chainCache.length - 1];
    this.chainCache = [leadingBlock];
    console.log(`Now the chain height is ${this.chain.length}`);
  }

  // 入网同步
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
