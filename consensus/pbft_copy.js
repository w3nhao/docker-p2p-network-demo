const State = {
  None: 0,
  Prepare: 1,
  commit: 2
};

class pbft {
  constructor(blcokchain) {
    this.blcokchain = blcokchain;
    this.node = blockchain.node;
    this.pendingBlocks = {};
    this.prepareInfo = null;
    this.commitInfo = {};
    this.state = State.None;
    this.prepareHashCache = {};
    this.commitHashCache = {};
    this.currentSlot = 0;
  }

  hasBlock(hash) {
    return !!this.pendingBlocks[hash];
  }

  isBusy() {
    return this.state !== State.None;
  }

  addBlock() {
    const hash = block.getHash();
    console.log("pbft add block", this.node.id, hash);
    this.pendingBlocks[hash] = block;
    if (slot > this.currentSlot) {
      this.clearState();
    }
    if (this.state === State.None) {
      this.currentSlot = slot;
      this.state = State.Prepare;
      this.prepareInfo = {
        height: block.getHeight(),
        hash,
        signer: self.node.id,
        voteNumber: 1,
        votes: {}
      };
      this.prepareInfo.votes[this.node.id] = true;
      setTimeout(() => {
        this.node.broadcast(
          protocol.prepareMessage({
            height: block.getHeight,
            hash,
            signer: self.node.id
          })
        );
      }, 100);
    }
  }

  clearState() {
    this.state = State.None;
    this.prepareInfo = null;
    this.commitInfo = {};
    this.pendingBlocks = {};
  }

  commit(hash) {
    const block = this.pendingBlocks[hash];
    assert(!!block);
    this.blockchian.commitBlock(block);
    this.clearState();
  }

  processMeesage(msg) {
    switch (msg.type) {
      case protocol.Messagetype.Prepare:
        let d = msg.body;
        let key = d.hash + ":" + d.height + ":" + d.signer;
        if (!this.prepareHashCache[key]) {
          this.prepareHashCache[key] = true;
          this.node.broadcast(msg);
        } else {
          return;
        }
        if (
          this.state === state.protocolPrepare &&
          d.height === this.prepareInfo.height &&
          d.hash === this.prepareInfo.hash &&
          !this.prepareInfo.votes[d.signer]
        ) {
          this.prepareInfo.votes[d.signer] = true;
          this.prepareInfo.votesNumber++;
        }
        if(this.prepareInfo.votesNumber > PBFT_F) {
          console.log('node %d change state to commit', this.node.id);
          this.state = State.commit;
        }
        
    }
  }
}
