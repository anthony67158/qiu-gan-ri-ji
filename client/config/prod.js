module.exports = {
  env: {
    NODE_ENV: '"production"',
    TARO_APP_API_BASE_URL: JSON.stringify(process.env.TARO_APP_API_BASE_URL || '')
  },
  defineConstants: {},
  mini: {},
  h5: {}
}
