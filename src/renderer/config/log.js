function getStringMessage (message) {
  if (!message) {
    return ''
  } else if (message instanceof Object) {
    return message.toString()
  } else if (message instanceof Array) {
    return message.join(',')
  } else {
    return message
  }
}
const LogPrefix = 'LVR'
const Log = {
  debug (message) {
    console.log(LogPrefix + '-debug: ' + getStringMessage(message))
  },
  info (message) {
    console.log(LogPrefix + '-info: ' + getStringMessage(message))
  },
  warn (message) {
    console.log(LogPrefix + '-warn: ' + getStringMessage(message))
  },
  error (message) {
    console.log(LogPrefix + '-error: ' + getStringMessage(message))
  }
}
export default Log
