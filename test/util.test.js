const p2p = require('../consensus/pbftserver');
const { KeyPair, ChainUtil } = require('../consensus/chain-utils');
const SHA256 = require('crypto-js/sha256');
const CryptoJS = require('crypto-js');
describe('test utils', () => {
  let ip;
  beforeAll(() => {
    ip = ['12.32.32.44', '12.33.44.67', '123.232.44.55'];
    obj = {
      si: 'ssj',
      ss: 'asas'
    };
  });

  it('test signature', () => {
    // console.log(p2p.sortPeers(ip));
    // console.log(CryptoJS.HmacMD5('something', 'XHSHS').toString());
    console.log(new KeyPair().getPub());
  });

  it('test hash', () => {
    expect(ChainUtil.hash(obj.si, obj.ss)).toEqual(
      SHA256(JSON.stringify(`${obj.si}${obj.ss}`)).toString()
    );
  });
});
