/**
 * Collects system and runtime analytics metadata when analytics is enabled.
 * This data is automatically added to the request without user configuration.
 */

let cachedAnalytics: Record<string, unknown> | null = null

export function collectAnalyticsMetadata(): Record<string, unknown> {
    // Cache the metadata since it doesn't change during runtime
    if (cachedAnalytics) {
        return cachedAnalytics
    }

    const analytics: Record<string, unknown> = {}

    try {
        // Node.js runtime info
        if (typeof process !== 'undefined') {
            analytics['process.runtime.name'] = 'nodejs'
            analytics['process.runtime.version'] = process.version
            analytics['process.pid'] = process.pid
            analytics['host.arch'] = process.arch
            analytics['host.platform'] = process.platform

            // Process owner
            if (process.env.USER) {
                analytics['process.owner'] = process.env.USER
            } else if (process.env.USERNAME) {
                analytics['process.owner'] = process.env.USERNAME
            }

            // Environment
            if (process.env.NODE_ENV) {
                analytics['deployment.environment'] = process.env.NODE_ENV
            }

            // Hostname
            try {
                // biome-ignore lint: Dynamic require for optional dependency
                const os = require('os')
                analytics['host.name'] = os.hostname()
            } catch {
                // os module not available (edge runtime)
            }

            // Detect deployment platform
            if (process.env.VERCEL) {
                analytics['deployment.platform'] = 'vercel'
                if (process.env.VERCEL_ENV) {
                    analytics['deployment.environment'] =
                        process.env.VERCEL_ENV
                }
            } else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
                analytics['deployment.platform'] = 'aws-lambda'
                if (process.env.AWS_REGION) {
                    analytics['deployment.region'] = process.env.AWS_REGION
                }
            } else if (process.env.KUBERNETES_SERVICE_HOST) {
                analytics['deployment.platform'] = 'kubernetes'
            } else if (process.env.RAILWAY_ENVIRONMENT) {
                analytics['deployment.platform'] = 'railway'
                analytics['deployment.environment'] =
                    process.env.RAILWAY_ENVIRONMENT
            } else if (process.env.RENDER) {
                analytics['deployment.platform'] = 'render'
            }
        }

        // AI SDK version
        try {
            // biome-ignore lint: Dynamic require for optional dependency
            const aiPackage = require('ai/package.json')
            analytics['ai.sdk.name'] = 'vercel-ai-sdk'
            analytics['ai.sdk.version'] = aiPackage.version
        } catch {
            // AI SDK package.json not accessible
        }

        // Requesty provider version
        analytics['requesty.provider.name'] = '@requesty/ai-sdk'
        analytics['requesty.provider.version'] = '2.0.0'

        // Check if OpenTelemetry is active
        try {
            // biome-ignore lint: Dynamic require for optional dependency
            const { trace } = require('@opentelemetry/api')
            const activeSpan = trace.getActiveSpan()
            analytics['telemetry.enabled'] =
                activeSpan?.isRecording() || false
        } catch {
            analytics['telemetry.enabled'] = false
        }

        cachedAnalytics = analytics
        return analytics
    } catch (error) {
        // If anything fails, return empty object
        return {}
    }
}
