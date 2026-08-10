/**
 * pm2 process definitions for the EC2 box.
 *
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save && pm2 startup     # survive reboots
 *
 * Two processes, both bound to loopback only — nginx is the sole public
 * listener (see deploy/nginx.conf.template).
 *
 * Env vars are NOT defined here. Both apps read their own .env file from
 * their working directory, which keeps secrets out of a file that is
 * committed to the repository. PORT is the exception: it decides which
 * loopback port nginx proxies to, so it belongs with the process definition
 * rather than the secrets.
 */
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/srv/github-extension/server',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      // The API holds SSE connections and WebSocket upgrades, so a second
      // instance would only serve clients that happen to land on it — except
      // that Redis pub/sub already fans events across instances. Kept at 1
      // here because the box is small; raising it works if you need it.
      instances: 1,
      max_memory_restart: '500M',
      // Restarting in a tight loop hides the real error and burns the API
      // rate limit on retried GitHub calls.
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 5000,
      error_file: '/var/log/github-extension/api.error.log',
      out_file: '/var/log/github-extension/api.out.log',
      time: true,
    },
    {
      name: 'web',
      cwd: '/srv/github-extension/client',
      // `next start` via the local binary rather than `npm start`, so pm2
      // supervises Next directly instead of an npm wrapper it can't signal.
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      max_memory_restart: '500M',
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 5000,
      error_file: '/var/log/github-extension/web.error.log',
      out_file: '/var/log/github-extension/web.out.log',
      time: true,
    },
  ],
};
