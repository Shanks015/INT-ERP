import ActivityLog from '../models/ActivityLog.js';

/**
 * Middleware to log user activities
 * @param {string} action - The action being performed (create, update, delete, etc.)
 * @param {string} module - The module being accessed
 */
export const logActivity = (action, module) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json;

        // Override res.json to capture response
        res.json = function (data) {
            // Only log successful operations (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
                // Extract target ID and name from response
                let targetId = null;
                let targetName = null;

                if (data.data) {
                    targetId = data.data._id || data.data.id;
                    targetName = data.data.name || data.data.title ||
                        data.data.university || data.data.scholarName ||
                        data.data.studentName || data.data.articleTopic;
                }

                // Log activity asynchronously (don't block response)
                setImmediate(() => {
                    ActivityLog.logActivity({
                        user: req.user._id,
                        userName: req.user.name,
                        action,
                        module,
                        targetId: targetId ? String(targetId) : null,
                        targetName,
                        details: {
                            // Don't log sensitive data
                            message: data.message,
                            count: data.data?.length || (data.pagination?.total)
                        },
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('user-agent'),
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode
                    });
                });
            }

            // Call original json method
            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Log authentication events (login, logout)
 */
export const logAuth = (action) => {
    return async (req, res, next) => {
        const originalJson = res.json;

        res.json = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = data.user?._id || data.data?._id || req.user?._id;
                const userName = data.user?.name || data.data?.name || req.user?.name;

                if (userId && userName) {
                    setImmediate(() => {
                        ActivityLog.logActivity({
                            user: userId,
                            userName,
                            action,
                            module: 'auth',
                            ipAddress: req.ip || req.connection.remoteAddress,
                            userAgent: req.get('user-agent'),
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode
                        });
                    });
                }
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

export default { logActivity, logAuth };
