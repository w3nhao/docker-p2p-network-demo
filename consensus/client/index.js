const events = require('events');
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');

const CLIENT_SECRET = '7H1$!54C213N753CR37';
const { MSGTYPES, Protocol } = require('./protocol');
const MYIP = '192.168.178.162';
const SERVICE_IP = '172.29.123.78';
const LISTENING_PORT = 30000;

const responseColletions = new events.EventEmitter();

class Client {
  constructor() {
    this.servers = [MYIP, SERVICE_IP];
    this.sockets = {};
  }

  // TODO 没有考虑节点离开网络的情况
  connectSocket(socket, serverIP) {
    this.sockets[serverIP] = socket;
  }

  async waitingForOpen(socket) {
    return await new Promise((resolve, reject) => {
      socket.onopen = () => {
        console.log('made it!');
        resolve(socket);
      };
      socket.onerror = event => {
        reject('connection fail:' + event.message);
      };
    });
  }

  async connectToServer(server) {
    if (!this.sockets[server]) {
      try {
        const socket = new WebSocket(
          `ws://${server}:${LISTENING_PORT}` +
            `?role=client&token=${Client.sign(MYIP, CLIENT_SECRET)}&ip=${MYIP}`
        );
        this.connectSocket(await this.waitingForOpen(socket), server);
      } catch (err) {
        console.log(err);
      }
    }
  }

  async broadcastAndWaitForReply(data) {
    try {
      let result = await Promise.all(
        Object.values(this.sockets).map(socket =>
          this.sendAndWaitForResponse(socket, data, 1000)
        )
      );

      console.log(JSON.stringify(this.countMsgs(result)));
    } catch (err) {
      console.log(err);
    }
  }

  static sign(data, secret) {
    return CryptoJS.SHA256(`${CryptoJS.HmacMD5(data, secret)}`).toString();
  }

  async sendAndWaitForResponse(socket, data, ms) {
    try {
      return await Promise.race([
        new Promise(resolve => {
          socket.onmessage = event => {
            resolve(event.data);
          };
          socket.send(data);
        }),
        new Promise(resolve => {
          setTimeout(() => resolve(null), ms);
        })
      ]);
    } catch (err) {
      console.log(err);
    }
  }

  countMsgs(messages) {
    return messages.reduce((count, msg) => {
      msg in count ? count[msg]++ : (count[msg] = 1);
      return count;
    }, {});
  }

  verifyResult() {

  }

  // msgHandler(message) {
  //   switch (message.type) {
  //     case MSGTYPES.localCommit:
  //       break;
  //     case MSGTYPES.response:
  //       this.collectResponse(message.data);
  //       break;
  //   }
  // }

  broadcastToServers(data) {
    for (let ip in this.sockets) {
      try {
        this.sockets[ip].send(JSON.stringify(data));
      } catch (err) {
        console.log(err);
      }
    }
  }

  async waitForResponse(socket) {
    try {
      return await new Promise((resolve, reject) => {
        socket.onmessage = event => {
          resolve(event.data);
        };

        setTimeout(reject(new Error('timeout to wait for reply')), 10000);
      });
    } catch (err) {
      console.log(err);
    }
  }
}

client = new Client();

module.exports = client;
