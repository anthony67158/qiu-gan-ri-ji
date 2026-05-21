module.exports = {
  env: {
    NODE_ENV: '"development"',
    TARO_APP_API_BASE_URL: JSON.stringify(process.env.TARO_APP_API_BASE_URL || 'http://10.88.231.142:3003')
  },
  defineConstants: {},
  mini: {},
  h5: {}
}
