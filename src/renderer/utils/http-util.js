import axios from 'axios'
import {getGatewayExchangeServerPort} from '../../helper'
// import request from 'request'

export default {
  get: function (url, headers) {
    const config = {
      url: url,
      method: 'get',
      headers: headers
    }
    return axios.request(config)
  },
  post: function (url, data, headers) {
    const config = {
      url: url,
      method: 'post',
      data: data,
      headers: headers
    }
    return axios.request(config)
  },
  postExchange: function (exchangeData) {
    const config = {
      url: `http://localhost:${getGatewayExchangeServerPort()}/gateway/exchange`,
      method: 'post',
      data: exchangeData,
      headers: {
        'Content-Type': 'application/json'
      }
    }
    return axios.request(config)
  },
  options: function (url, headers) {
    const config = {
      url: url,
      method: 'options',
      headers: headers
    }
    return axios.request(config)
  }
}
