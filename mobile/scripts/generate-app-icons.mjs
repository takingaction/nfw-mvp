#!/usr/bin/env node
/**
 * Generates the app icon set from the NFW "NW" monogram (web repo: app/icon.png, 500×500,
 * aubergine on transparent). Recolours the mark to white and composes:
 *
 *   assets/icon.png                     1024²  white mark on aubergine (iOS + fallback)
 *   assets/splash-icon.png              1024²  white mark on transparent (splash, aubergine bg via app.json)
 *   assets/android-icon-foreground.png  1024²  white mark inside the adaptive-icon safe zone
 *   assets/android-icon-background.png  1024²  solid aubergine
 *   assets/android-icon-monochrome.png  1024²  white mark (themed icons)
 *   assets/favicon.png                    48²  from icon.png
 *
 * Uses `sharp` from the web repo's node_modules, so run from the repo root:
 *
 *   node mobile/scripts/generate-app-icons.mjs
 *
 * Re-run after swapping the source mark (ideally with a ≥1024² or vector master from brand).
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, "..");
const repoRoot = resolve(mobileRoot, "..");
const require = createRequire(resolve(repoRoot, "package.json"));
const sharp = require("sharp");

const AUBERGINE = "#3E145F";
const SIZE = 1024;
const SOURCE = process.argv[2] ? resolve(process.argv[2]) : resolve(repoRoot, "app/icon.png");
const out = (name) => resolve(mobileRoot, "assets", name);

/** Crop the source to its visible content and recolour every opaque pixel white. */
async function whiteMark() {
  const trimmed = await sharp(SOURCE).ensureAlpha().trim().png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const alpha = await sharp(trimmed).extractChannel("alpha").toBuffer();
  return sharp({ create: { width, height, channels: 3, background: "#FFFFFF" } })
    .joinChannel(alpha)
    .png()
    .toBuffer();
}

/** Fit the mark inside a `box`×`box` square and centre it on a `SIZE`² canvas. */
async function compose(mark, box, background) {
  const fitted = await sharp(mark).resize(box, box, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background } })
    .composite([{ input: fitted, gravity: "centre" }])
    .png();
}

const mark = await whiteMark();
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// iOS icon: Apple masks the corners; keep the mark at ~62% so it clears the mask comfortably.
await (await compose(mark, 640, AUBERGINE)).flatten({ background: AUBERGINE }).toFile(out("icon.png"));

// Splash: transparent, generous size — app.json scales it to imageWidth on an aubergine background.
await (await compose(mark, 820, transparent)).toFile(out("splash-icon.png"));

// Android adaptive: the safe zone is the central 66% (≈676px). Stay inside it.
await (await compose(mark, 560, transparent)).toFile(out("android-icon-foreground.png"));
await (await compose(mark, 560, transparent)).toFile(out("android-icon-monochrome.png"));
await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: AUBERGINE } })
  .png()
  .toFile(out("android-icon-background.png"));

// Favicon (web target only).
await sharp(out("icon.png")).resize(48, 48).png().toFile(out("favicon.png"));

console.log(`Generated icon set from ${SOURCE}`);
