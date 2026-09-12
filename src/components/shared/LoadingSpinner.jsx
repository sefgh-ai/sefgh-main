/**
 * Reusable loading spinner component
 * @param {Object} props
 * @param {string} [props.size="md"] - Size of the spinner: "sm", "md", "lg"
 * @param {string} [props.className] - Additional CSS classes
 */
export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-12 w-12 border-b-2",
    lg: "h-16 w-16 border-b-4",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-primary ${sizeClasses[size]} ${className}`}
      ></div>
    </div>
  );
}

/**
 * Full page loading spinner
 * @param {Object} props
 * @param {string} [props.message] - Optional loading message
 */
export function PageLoadingSpinner({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <LoadingSpinner size="lg" />
      {message && <p className="text-muted-foreground">{message}</p>}
    </div>
  );
}
