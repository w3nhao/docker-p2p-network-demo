PBFT步骤：
1. 实现服务器能传递消息
2. 服务器查询publicKey后应有一个缓存表: supervisors{}



### 逻辑：
#### 连接层：
1. 连接时区分server与client，并登记各个server的publicKey
   
   补充：验证环节之后需要加强
2. peers列表收到之后进行排序，用于确定每次发起请求的view id
