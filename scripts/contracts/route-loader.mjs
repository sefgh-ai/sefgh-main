// Module hooks that let plain Node import a Next.js route handler.
// Route files are ESM in a package without "type": "module", and they
// import the extensionless "next/server" specifier.

const srcRoot = new URL("../../src/", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@/data/github-languages") {
    return nextResolve(new URL("data/github-languages.js", srcRoot).href, context);
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
