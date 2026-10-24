// Actual MagicMirror² configuration. Keep the mirror's centre free for reflection.
// Hailo is a separate background service and is deliberately absent from modules.
const port = Number(process.env.PORT || 3000);
const timezone = process.env.TIMEZONE || 'America/Toronto';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid MagicMirror port');
new Intl.DateTimeFormat('en', { timeZone: timezone }).format();

module.exports = {
  address: process.env.HOST || '127.0.0.1',
  port,
  basePath: '/',
  ipWhitelist: ['127.0.0.1', '::ffff:127.0.0.1', '::1'],
  trustedProxies: [],
  language: 'en',
  locale: 'en-CA',
  timeFormat: 24,
  units: 'metric',
  logLevel: ['INFO', 'WARN', 'ERROR'],
  customCss: 'config/custom.css',
  modules: [{
    module: 'clock',
    position: 'top_left',
    config: {
      timezone,
      timeFormat: 24,
      displayType: 'digital',
      displaySeconds: false,
      showDate: true,
      showTime: true,
      dateFormat: 'dddd, MMMM D',
      showSunTimes: false,
      showMoonTimes: false
    }
  }, {
    module: 'newsfeed',
    position: 'bottom_bar',
    config: {
      // The standard MagicMirror news source; fetched directly without a proxy.
      feeds: [{
        title: 'New York Times',
        url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
        useCorsProxy: false
      }],
      showAsList: false,
      showSourceTitle: true,
      showPublishDate: false,
      showDescription: false,
      showTitleAsUrl: false,
      wrapTitle: true,
      updateInterval: 15000,
      reloadInterval: 5 * 60 * 1000,
      animationSpeed: 500,
      maxNewsItems: 10
    }
  }]
};
