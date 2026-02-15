/**
 * PM2 配置文件：后台常驻运行 Web Highlighter 服务
 * 使用：在项目根目录执行 pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'web-highlighter',
      script: 'server/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
