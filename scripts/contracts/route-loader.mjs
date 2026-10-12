// Module hooks that let plain Node import a Next.js route handler.
// Route files are ESM in a package without "type": "module". They import
// the extensionless "next/server" specifier, and other modules through the
// "@/" alias that jsconfig.json maps to src/.

const srcRoot = new URL("../../src/", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const path = specifier.slice(2);
    const file = /\.[a-z]+$/.test(path) ? path : `${path}.js`;
    return nextResolve(new URL(file, srcRoot).href, context);
  }
  if (specifier === "next/server") {
    return nextResolve("next/server.js", context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(srcRoot) && url.endsWith(".js")) {
    return nextLoad(url, { ...context, format: "module" });
  }
  return nextLoad(url, context);
}
