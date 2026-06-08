import cron from 'node-cron';

/**
 * Self-pings the server to keep it awake on hosting platforms like Render.
 * It pings the server every 10 minutes to prevent the free tier from sleeping.
 */
export const startKeepAliveJob = () => {
    const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || process.env.CLIENT_URL;

    if (!url) {
        console.warn('⚠️ [KeepAlive] None of APP_URL, RENDER_EXTERNAL_URL, or CLIENT_URL is set in environment variables.');
        console.warn('⚠️ [KeepAlive] Self-ping job will not run. Please set one of these to enable self-pinging.');
        return;
    }

    const ping = async () => {
        try {
            console.log(`[KeepAlive] Pinging server at: ${url}/api/health`);
            const response = await fetch(`${url}/api/health`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`[KeepAlive] Self-ping successful:`, data);
            } else {
                console.error(`[KeepAlive] Self-ping returned non-OK status: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('[KeepAlive] Self-ping failed with error:', error.message);
        }
    };

    // Run once immediately on startup
    ping();

    // Ping every 10 minutes (cron: */10 * * * *)
    cron.schedule('*/10 * * * *', ping);

    console.log(`✅ Keep-alive self-ping job registered (interval: every 10 minutes to ${url})`);
};
