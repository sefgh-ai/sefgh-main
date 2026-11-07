// A README's relative links point into its repository, not at SEFGH. Shown
// on SEFGH they would resolve against this origin and 404 (bug register
// R-228), so they are rewritten to the repository on GitHub. `HEAD` is the
// repository's default branch on both hosts, so no extra lookup is needed.
import { defaultUrlTransform } from "react-markdown";

const ABSOLUTE = /^[a-z][a-z\d+.-]*:|^\/\//i;

/**
 * Returns a react-markdown `urlTransform` for a README of `fullName`
 * ("owner/repo"), or undefined when the name is not usable.
 */
export function readmeUrlTransform(fullName) {
  if (typeof fullName !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(fullName)) return undefined;
  const page = `https://github.com/${fullName}/blob/HEAD/`;
  const raw = `https://raw.githubusercontent.com/${fullName}/HEAD/`;
  return (value, key) => resolveReadmeUrl(value, key === "src" ? raw : page);
}

/** Resolves one README URL against `base`; keeps absolute URLs and in-page anchors. */
export function resolveReadmeUrl(value, base) {
  const url = String(value ?? "").trim();
  // defaultUrlTransform drops unsafe schemes such as javascript:.
  if (!url || url.startsWith("#") || ABSOLUTE.test(url)) return defaultUrlTransform(url);
  try {
    // A leading slash means the repository root, not the GitHub root.
    return new URL(url.replace(/^\/+/, ""), base).href;
  } catch {
    return defaultUrlTransform(url);
  }
}
