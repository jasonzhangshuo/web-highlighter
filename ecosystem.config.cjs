/**
 * PM2 配置文件：后台常驻运行 Web Highlighter 服务
 * 使用：在项目根目录执行 pm2 start ecosystem.config.cjs
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'web-highlighter',
      script: 'server/server.js',
      cwd: path.resolve(__dirname),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      out_file: path.join(__dirname, 'logs', 'out.log'),
      error_file: path.join(__dirname, 'logs', 'error.log'),
      merge_logs: true,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
