export default {
  pages: [
    'pages/pre-match-intel/index',
    'pages/record/index',
    'pages/result/index',
    'pages/opponents/index',
    'pages/opponent-detail/index',
    'pages/insight/index',
    'pages/history/index'
  ],
  window: {
    navigationBarTitleText: '球感日记',
    navigationBarBackgroundColor: '#0B0F14',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0B0F14',
    backgroundTextStyle: 'dark'
  },
  tabBar: {
    color: '#9AA4B2',
    selectedColor: '#C7FF33',
    backgroundColor: '#0B0F14',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/pre-match-intel/index',
        text: '赛前',
        iconPath: 'assets/tabbar/history.png',
        selectedIconPath: 'assets/tabbar/history-active.png'
      },
      {
        pagePath: 'pages/record/index',
        text: '记录',
        iconPath: 'assets/tabbar/record.png',
        selectedIconPath: 'assets/tabbar/record-active.png'
      },
      {
        pagePath: 'pages/opponents/index',
        text: '对手',
        iconPath: 'assets/tabbar/opponents.png',
        selectedIconPath: 'assets/tabbar/opponents-active.png'
      },
      {
        pagePath: 'pages/insight/index',
        text: '复盘',
        iconPath: 'assets/tabbar/insight.png',
        selectedIconPath: 'assets/tabbar/insight-active.png'
      }
    ]
  }
}
