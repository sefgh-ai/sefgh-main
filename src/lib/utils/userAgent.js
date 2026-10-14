/**
 * A plain description of the device a browser runs on, from its user agent
 * string: what kind of device, which system and which browser. Used by the
 * Sessions tab to describe this device. It is a best guess from text the
 * browser reports, never a claim about any other device.
 *
 * @param {string} ua - navigator.userAgent
 * @returns {{kind: 'phone'|'tablet'|'computer', system: string, browser: string}}
 */
export function describeUserAgent(ua) {
  const text = typeof ua === "string" ? ua : "";

  let system = "Unknown system";
  if (/iPad/.test(text)) system = "iPadOS";
  else if (/iPhone|iPod/.test(text)) system = "iOS";
  else if (/Android/.test(text)) system = "Android";
  else if (/CrOS/.test(text)) system = "ChromeOS";
  else if (/Windows/.test(text)) system = "Windows";
  else if (/Mac OS X|Macintosh/.test(text)) system = "macOS";
  else if (/Linux/.test(text)) system = "Linux";

  let kind = "computer";
  if (/iPad|Tablet/.test(text) || (/Android/.test(text) && !/Mobile/.test(text))) kind = "tablet";
  else if (/Mobi|iPhone|iPod/.test(text)) kind = "phone";

  // Order matters: Edge and Opera also say "Chrome", and Chrome says "Safari".
  const browsers = [
    ["Edge", /Edg(?:e|A|iOS)?\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Samsung Internet", /SamsungBrowser\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
    ["Safari", /Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari\//],
  ];
  let browser = "Unknown browser";
  for (const [name, pattern] of browsers) {
    const match = text.match(pattern);
    if (match) {
      browser = `${name} ${match[1]}`;
      break;
    }
  }
  return { kind, system, browser };
}
