/**
 * Collects system and runtime analytics metadata when analytics is enabled.
 * This data is automatically added to the request without user configuration.
 * All values are converted to strings to match Requesty backend requirements.
 */

let cachedSystemInfo: Record<string, string> | null = null

export function collectAnalyticsMetadata(): Record<string, string> {
    const analytics: Record<string, string> = {}

    // Use cached system info (doesn't change during runtime)
    if (cachedSystemInfo) {
        Object.assign(analytics, cachedSystemInfo)
    } else {
        cachedSystemInfo = collectSystemInfo()
        Object.assign(analytics, cachedSystemInfo)
    }

    // Always collect call context (changes per call)
    const callContext = collectCallContext()
    Object.assign(analytics, callContext)

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
        systemInfo['requesty.provider.name'] = '@requesty/ai-sdk'
        systemInfo['requesty.provider.version'] = '2.0.0'

        // Check if OpenTelemetry is active
        try {
            // biome-ignore lint: Dynamic require for optional dependency
            const { trace } = require('@opentelemetry/api')
            const activeSpan = trace.getActiveSpan()
            systemInfo['telemetry.enabled'] = String(
                activeSpan?.isRecording() || false,
            )
        } catch {
            systemInfo['telemetry.enabled'] = 'false'
        }

        return systemInfo
    } catch (error) {
        // If anything fails, return empty object
        return {}
    }
}

function collectCallContext(): Record<string, string> {
    const callContext: Record<string, string> = {}

    try {
        const stack = new Error().stack
        if (stack) {
            const lines = stack.split('\n')
            // Find first line that's not in this file or provider files
            for (let i = 2; i < Math.min(lines.length, 10); i++) {
                const line = lines[i]
                if (
                    line &&
                    !line.includes('collect-analytics') &&
                    !line.includes('requesty-chat-language-model') &&
                    !line.includes('requesty-completion-language-model') &&
                    !line.includes('node_modules')
                ) {
                    // Extract function name if available
                    const functionMatch = line.match(/at\s+(\w+)/)
                    if (functionMatch?.[1]) {
                        callContext['call.function'] = functionMatch[1]
                    }

                    // Extract file path
                    const fileMatch = line.match(/\((.+):(\d+):(\d+)\)/)
                    if (fileMatch?.[1]) {
                        const filePath = fileMatch[1]
                        // Get just the filename, not full path
                        const fileName = filePath.split('/').pop() || filePath
                        callContext['call.file'] = fileName
                        callContext['call.line'] = fileMatch[2]
                    }
                    break
                }
            }
        }
    } catch {
        // Stack trace parsing failed, skip
    }

    return callContext
}
