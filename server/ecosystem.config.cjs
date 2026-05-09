module.exports = {
  apps: [
    {
      name: "swetty-backend",
      script: "index.js",
      cwd: "/var/www/swetty/server",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
      },
    },
  ],
};
