/**
 * Collects system and runtime analytics metadata when analytics is enabled.
 * This data is automatically added to the request without user configuration.
 * All values are converted to strings to match Requesty backend requirements.
 */

let cachedSystemInfo: Record<string, string> | null = null

export function collectAnalyticsMetadata(
    headers?: Record<string, string | undefined>,
): Record<string, string> {
    const analytics: Record<string, string> = {}

    // Use cached system info (doesn't change during runtime)
    if (cachedSystemInfo) {
        Object.assign(analytics, cachedSystemInfo)
    } else {
        cachedSystemInfo = collectSystemInfo()
        Object.assign(analytics, cachedSystemInfo)
    }

    // Collect per-request runtime info
    const runtimeInfo = collectRuntimeInfo(headers)
    Object.assign(analytics, runtimeInfo)

    return analytics
}

function collectSystemInfo(): Record<string, string> {
    const systemInfo: Record<string, string> = {}

    try {
        // Node.js runtime info
        if (typeof process !== 'undefined') {
            systemInfo['process.runtime.name'] = 'nodejs'
            systemInfo['process.runtime.version'] = process.version
            systemInfo['process.pid'] = String(process.pid)
            systemInfo['host.arch'] = process.arch
            systemInfo['host.platform'] = process.platform

            // Process owner
            if (process.env.USER) {
                systemInfo['process.owner'] = process.env.USER
            } else if (process.env.USERNAME) {
                systemInfo['process.owner'] = process.env.USERNAME
            }

            // Environment
            if (process.env.NODE_ENV) {
                systemInfo['deployment.environment'] = process.env.NODE_ENV
            }

            // Hostname
            try {
                // biome-ignore lint: Dynamic require for optional dependency
                const os = require('os')
                systemInfo['host.name'] = os.hostname()
            } catch {
                // os module not available (edge runtime)
            }

            // Detect deployment platform
            if (process.env.VERCEL) {
                systemInfo['deployment.platform'] = 'vercel'
                if (process.env.VERCEL_ENV) {
                    systemInfo['deployment.environment'] =
                        process.env.VERCEL_ENV
                }
            } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
                systemInfo['deployment.platform'] = 'aws-lambda'
                if (process.env.AWS_REGION) {
                    systemInfo['deployment.region'] = process.env.AWS_REGION
                }
            } else if (process.env.KUBERNETES_SERVICE_HOST) {
                systemInfo['deployment.platform'] = 'kubernetes'
            } else if (process.env.RAILWAY_ENVIRONMENT) {
                systemInfo['deployment.platform'] = 'railway'
                systemInfo['deployment.environment'] =
                    process.env.RAILWAY_ENVIRONMENT
            } else if (process.env.RENDER) {
                systemInfo['deployment.platform'] = 'render'
            }
        }

        // AI SDK version
        try {
            // biome-ignore lint: Dynamic require for optional dependency
            const aiPackage = require('ai/package.json')
            systemInfo['ai.sdk.name'] = 'vercel-ai-sdk'
            systemInfo['ai.sdk.version'] = aiPackage.version
        } catch {
            // AI SDK package.json not accessible
        }

        // Requesty provider version
        try {
            // biome-ignore lint: Dynamic require for optional dependency
            const requestyPackage = require('../package.json')
            systemInfo['requesty.provider.name'] = requestyPackage.name
            systemInfo['requesty.provider.version'] = requestyPackage.version
        } catch {
            // Fallback if package.json not accessible
            systemInfo['requesty.provider.name'] = '@requesty/ai-sdk'
        }

        return systemInfo
    } catch (error) {
        // If anything fails, return empty object
        return {}
    }
}

function collectRuntimeInfo(
    headers?: Record<string, string | undefined>,
): Record<string, string> {
    const runtimeInfo: Record<string, string> = {}

    try {
        if (typeof process !== 'undefined') {
            // Memory usage (in MB)
            const mem = process.memoryUsage()
            runtimeInfo['memory.heapUsed'] = (mem.heapUsed / 1024 / 1024).toFixed(
                2,
            )
            runtimeInfo['memory.heapTotal'] = (
                mem.heapTotal /
                1024 /
                1024
            ).toFixed(2)
            runtimeInfo['memory.rss'] = (mem.rss / 1024 / 1024).toFixed(2)

            // Process uptime (in seconds)
            runtimeInfo['process.uptime'] = process.uptime().toFixed(2)
        }

        // Extract user-agent from headers
        if (headers) {
            const userAgent =
                headers['user-agent'] ||
                headers['User-Agent'] ||
                headers['USER-AGENT']
            if (userAgent) {
                runtimeInfo['request.userAgent'] = userAgent
            }
        }
    } catch {
        // Failed to collect runtime info
    }

    return runtimeInfo
}
