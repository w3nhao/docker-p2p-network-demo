const utils = require("../p2pserver/p2p-network-utils");

const p2pmsg = require("../p2pserver/p2p-messages");

describe("test utils", () => {
  let msg, arra7;
  beforeAll(() => {
    msg = new p2pmsg("12.34.12.34", "GET_PEERS");
    arra7 = [{ ip: 3333, socket: "sasasa" }];
  });

  it("test hash", () => {
    expect(utils.hash(msg.data)).toEqual(msg.digest);
  });

  it("test encrypt content", () => {
    expect(utils.signAsServer(msg.digest)).toEqual(msg.signature);
  });

  it("test encrypt", () => {
    expect(utils.checkSignature(msg.digest, msg.signature)).toBe(true);
  });

  it("test verify", () => {
    expect(p2pmsg.verifyMsg(msg)).toBe(true);
  });

  it("test function", () => {
    expect(arra7.includes(pair => pair.ip === 3333)).toBe(true);
    expect(arra7.some(pair => pair.ip === 3333)).toBe(true);
    expect(arra7.find(pair => pair.ip === 3333)).toBe(true);
  });
});
