目标：无错误情况的Zyzzyva算法

1. 请求 block 内的部分信息由客户端client以request形式发送到服务器群
```
request = {
   data,
   timestamp,
   signature    // 目前可以不添加 
 };
```
2. 随机指定的主节点用request的内容生成区块并且将orderRequest发送给每个副本
 ```
 block = {
   data: request.data,
   timestamp: request.timestamp,
   lastHahs,
   hash,
   height
 }

 orderedRequest = {
   data: request.data,
   timestamp: request.timestamp,
   blockchain
 }
 ```
3. 每个副本将```request.data```以及```request.timestamp```拿来生成区块。并且验证整个区块链是否一致。
4. 成功验证后每个副本发送回复给客户端client
```
response = {
    acknowlege,
    blockchain,   // 一致同意，可以删除，或替换成本次生成的新区块
    height
}
```
5. 客户端client检查每个副本发回的blockchain或新生成区块是否一致
6. 若全部回应都一致，则已完成

书本评论：

1. 全部回应一致，所有副本状态必统一
2. 完成状态统一需要三个通信回合
