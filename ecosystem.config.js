module.exports = {
    apps: [
        {
            name: 'badminton',
            script: 'npm',
            args: 'start',
            cwd: '/root/www/badminton',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: '/var/log/pm2/badminton-error.log',
            out_file: '/var/log/pm2/badminton-out.log',
            merge_logs: true,
        },
    ],
};
