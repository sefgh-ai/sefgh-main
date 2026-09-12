/**
 * Shared component library — centralized exports.
 *
 * Note: this barrel has no "use client" directive but re-exports client
 * components, so importing one symbol pulls the rest into the client bundle.
 * Prefer deep imports (e.g. "@/components/shared/LoadingState") in new code.
 */

// Loading states
export { LoadingState, PageLoadingState, InlineLoadingState } from "./LoadingState";
export { LoadingSpinner, PageLoadingSpinner } from "./LoadingSpinner";

// Empty states
export { EmptyState, CompactEmptyState } from "./EmptyState";

// Cards
export { RepoCard, StatCard, FeatureCard, InfoCard } from "./CardComponents";

// Dialogs
export { ConfirmDialog } from "./ConfirmDialog";

// Error boundary
export { default as ErrorBoundary } from "./ErrorBoundary";
