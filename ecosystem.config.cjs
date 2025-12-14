module.exports = {
  apps: [{
    name: 'kimdb',
    script: 'src/api-server.js',
    cwd: '/home/kimjin/Desktop/kim/kimdb',
    env: {
      PORT: 40000,
      NODE_ENV: 'production'
    },
    // 로그 설정
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/kimjin/Desktop/kim/kimdb/logs/error.log',
    out_file: '/home/kimjin/Desktop/kim/kimdb/logs/out.log',
    merge_logs: true,
    // 자동 재시작
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    // 메모리 초과 시 재시작
    max_memory_restart: '500M',
    // 크래시 시 재시작
    exp_backoff_restart_delay: 1000
  }]
};
