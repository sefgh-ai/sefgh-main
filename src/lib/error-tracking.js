/**
 * Error tracking utility for monitoring and logging application errors
 * Can be integrated with services like Sentry, LogRocket, etc.
 */

/**
 * Log error to monitoring service
 * @param {string} errorName - Descriptive error name
 * @param {Error} error - Error object
 * @param {Object} context - Additional context data
 */
export function logError(errorName, error, context = {}) {
  // Console logging for development - compact format
  if (process.env.NODE_ENV === 'development') {
    console.error(`🔴 [${errorName}]`, error.message, context)
  } else {
    // Full details in production for debugging
    console.error(`[${errorName}]`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })
  }

  // TODO: Integrate with error tracking service
  // Example: Sentry.captureException(error, { tags: { errorName }, extra: context })
  
  // For production, send to backend logging endpoint
  if (process.env.NODE_ENV === 'production') {
    try {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: errorName,
          message: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          url: typeof window !== 'undefined' ? window.location.href : 'server',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
        })
      }).catch(() => {
        // Silently fail - don't break the app if error logging fails
      })
    } catch (err) {
      // Silently fail
    }
  }
}

/**
 * Log warning to monitoring service
 * @param {string} warningName - Descriptive warning name
 * @param {string} message - Warning message
 * @param {Object} context - Additional context data
 */
export function logWarning(warningName, message, context = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`⚠️ [${warningName}]`, message, context)
  } else {
    console.warn(`[${warningName}]`, { message, context })
  }
  
  // TODO: Send to monitoring service for production
}

/**
 * Log info event to monitoring service
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 */
export function logEvent(eventName, data = {}) {
  if (process.env.NODE_ENV === 'development') {
    console.info(`ℹ️ [${eventName}]`, data)
  }
  
  // TODO: Send to analytics service
  // Example: analytics.track(eventName, data)
}
