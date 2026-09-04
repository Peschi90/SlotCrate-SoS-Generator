module.exports = {
  apps: [
    {
      name: "slotcrate-web",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production"
      },
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      watch: false
    },
    {
      name: "slotcrate-cad-api",
      cwd: "./services/cad-api",
      script: process.env.PYTHON_BIN || "python3",
      args: "-m uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 6294",
      env: {
        PYTHONUNBUFFERED: "1",
        CAD_API_PORT: "6294"
      },
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
      watch: false
    }
  ]
};
