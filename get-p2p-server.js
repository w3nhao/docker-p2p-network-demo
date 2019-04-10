module.exports = function() {
  const P2PServer = require("./p2pserver");
  const server = new P2PServer();

  server.listen();
  return function() {
    return server;
  };
};
