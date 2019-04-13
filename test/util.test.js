const p2p = require('../p2pserver');

describe("test utils", () => {
  let ip;
  beforeAll(() => {
    ip = "12.32.32.44"
  });

  it('test signature', () => {
    expect(p2p.checkSignature(ip, p2p.signAsServer(ip))).toBe(true);
  })
  
});
