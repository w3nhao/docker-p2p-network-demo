const p2p = require('../consensus/pbftserver');

describe('test utils', () => {
  let ip;
  beforeAll(() => {
    ip = ['12.32.32.44', '12.33.44.67', '123.232.44.55'];
  });

  it('test signature', () => {
    console.log(p2p.sortPeers(ip));
  });
});
