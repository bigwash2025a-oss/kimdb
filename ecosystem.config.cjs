module.exports = {
  apps: [
    {
      name: 'kimdb-73',
      script: 'src/api-server.js',
      cwd: '/home/kim/바탕화면/kim/kimdb',
      env: {
        PORT: 40000,
        REDIS_HOST: '127.0.0.1',
        SERVER_ID: 'srv-73',
        MARIADB_HOST: '192.168.45.73'
      }
    },
    {
      name: 'kimdb-monitor',
      script: 'scripts/cross-check.js',
      cwd: '/home/kim/바탕화면/kim/kimdb'
    },
    {
      name: 'kimdb-dashboard',
      script: 'scripts/monitor-server.js',
      cwd: '/home/kim/바탕화면/kim/kimdb'
    },
    {
      name: 'kimdb-integrity-test',
      script: 'test/integrity-test.js',
      cwd: '/home/kim/바탕화면/kim/kimdb',
      env: {
        TEST_HOURS: 24,
        DOC_COUNT: 1000
      },
      autorestart: false,
      watch: false
    }
  ]
};
