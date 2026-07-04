module.exports = {
  apps: [
    {
      name: 'creatools-api',
      script: 'pnpm',
      args: 'run start',
      cwd: '/var/www/Tik-Tools-Deploy-1/artifacts/api-server',
      env: {
        NODE_ENV: 'production',
        PORT: '8080'
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
