// app进程和renderer进程通信channel定义
const IpcChannel = {
  stopAllTasks: 'stopAllTasks',
  getDouyinRoomData: 'getDouyinRoomData',
  getDouyinRoomDataReply: 'getDouyinRoomDataReply'
}

export default IpcChannel
