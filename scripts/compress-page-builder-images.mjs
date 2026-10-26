#!/usr/bin/env node
/**
 * Re-compress existing images in the `page-builder` storage bucket.
 *
 * Three modes, run in this order:
 *
 *   node scripts/compress-page-builder-images.mjs            # dry run (default)
 *   node scripts/compress-page-builder-images.mjs --apply    # upload the reviewed plan
 *   node scripts/compress-page-builder-images.mjs --restore  # undo: re-upload originals
 *
 * Dry run: lists every object in the bucket, downloads each raster image into
 * .image-compression/<run>/originals/, writes a compressed copy to
 * .image-compression/<run>/compressed/, and writes plan.json, report.md and
 * compare.html (side-by-side previews of the heaviest images). Nothing in
 * Supabase changes.
 *
 * Apply: uploads only the files in the newest run's plan.json, to the SAME
 * path with the SAME content type, so no URL stored in page_sections or
 * anywhere else changes. Before each upload it checks the remote object is
 * still the one that was backed up (same size + last_modified); if someone
 * replaced it in the meantime, it is skipped.
 *
 * Restore: re-uploads every original recorded in the newest run's
 * apply-log.json, byte for byte.
 *
 * Options:
 *   --run=<dir name>     use a specific run under .image-compression/ instead of the newest
 *   --max=<px>           longest edge after resize (default 2000)
 *   --min-saving=<0-1>   only replace when at least this fraction smaller (default 0.15)
 *   --bucket=<name>      default page-builder
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config({ path: ".env.local" });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const BUCKET = args.bucket || "page-builder";
const MAX_EDGE = Number(args.max || 2000);
const MIN_SAVING = Number(args["min-saving"] || 0.15);
const ROOT = path.resolve(".image-compression");
const CACHE_CONTROL = "31536000"; // object paths are unique per upload, safe to cache for a year
const RASTER = new Set(["image/jpeg", "image/png", "image/webp"]);

let supabase;

const fmt = (b) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${(b / 1024).toFixed(0)} KB`;

/** Recursively list every object in the bucket. */
async function listAll(prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(full))); // folder
      else out.push({ path: full, size: item.metadata?.size ?? 0, mimetype: item.metadata?.mimetype, updated_at: item.updated_at });
    }
    if (data.length < 1000) break;
  }
  return out;
}

/** Same format in, same format out: the stored content type and URL must not change. */
export async function compress(buf, mimetype, maxEdge = MAX_EDGE) {
  const img = sharp(buf, { failOn: "none" }).rotate(); // bake in EXIF orientation, drop metadata
  const meta = await img.metadata();
  const resized = img.resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });
  let out;
  if (mimetype === "image/jpeg") out = await resized.jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();
  else if (mimetype === "image/webp") out = await resized.webp({ quality: 80, effort: 6 }).toBuffer();
  else if (mimetype === "image/png") out = await resized.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10, dither: 1 }).toBuffer();
  else return null;
  const after = await sharp(out).metadata();
  return { buf: out, before: { w: meta.width, h: meta.height }, after: { w: after.width, h: after.height } };
}

async function newestRun() {
  if (args.run) return path.join(ROOT, args.run);
  const dirs = (await fs.readdir(ROOT).catch(() => [])).filter((d) => /^\d{4}-/.test(d)).sort();
  if (!dirs.length) throw new Error("No dry run found in .image-compression/. Run without --apply first.");
  return path.join(ROOT, dirs.at(-1));
}

async function dryRun() {
  const run = path.join(ROOT, new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(run, { recursive: true });
  console.log(`Listing ${BUCKET}…`);
  const objects = await listAll();
  const plan = [];
  const skipped = [];
  let i = 0;
  for (const o of objects) {
    i++;
    if (!RASTER.has(o.mimetype)) { skipped.push({ ...o, reason: `type ${o.mimetype}` }); continue; }
    const { data, error } = await supabase.storage.from(BUCKET).download(o.path);
    if (error) { skipped.push({ ...o, reason: `download: ${error.message}` }); continue; }
    const orig = Buffer.from(await data.arrayBuffer());
    const origFile = path.join(run, "originals", o.path);
    await fs.mkdir(path.dirname(origFile), { recursive: true });
    await fs.writeFile(origFile, orig);
    let res;
    try { res = await compress(orig, o.mimetype); } catch (e) { skipped.push({ ...o, reason: `sharp: ${e.message}` }); continue; }
    const saving = 1 - res.buf.length / orig.length;
    if (saving < MIN_SAVING) { skipped.push({ ...o, reason: `only ${(saving * 100).toFixed(0)}% smaller` }); continue; }
    const outFile = path.join(run, "compressed", o.path);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, res.buf);
    plan.push({ path: o.path, mimetype: o.mimetype, updated_at: o.updated_at, before: orig.length, after: res.buf.length, dims_before: res.before, dims_after: res.after });
    process.stdout.write(`\r${i}/${objects.length} processed, ${plan.length} to replace`);
  }
  console.log();
  plan.sort((a, b) => b.before - a.before);
  await fs.writeFile(path.join(run, "plan.json"), JSON.stringify({ bucket: BUCKET, maxEdge: MAX_EDGE, plan, skipped }, null, 2));

  const tb = plan.reduce((s, p) => s + p.before, 0);
  const ta = plan.reduce((s, p) => s + p.after, 0);
  const lines = [
    `# ${BUCKET} compression dry run`, "",
    `Objects listed: ${objects.length}; to replace: ${plan.length}; skipped: ${skipped.length}`,
    `Bytes for replaced files: ${fmt(tb)} -> ${fmt(ta)} (${((1 - ta / tb) * 100).toFixed(0)}% smaller)`, "",
    "| File | Before | After | Dimensions |", "|---|---|---|---|",
    ...plan.map((p) => `| ${p.path} | ${fmt(p.before)} | ${fmt(p.after)} | ${p.dims_before.w}x${p.dims_before.h} -> ${p.dims_after.w}x${p.dims_after.h} |`),
  ];
  await fs.writeFile(path.join(run, "report.md"), lines.join("\n"));

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const cards = plan.slice(0, 15).map((p) => `
    <section><h2>${esc(p.path)}</h2>
      <div class="pair">
        <figure><img src="originals/${esc(p.path)}"><figcaption>Original · ${fmt(p.before)} · ${p.dims_before.w}×${p.dims_before.h}</figcaption></figure>
        <figure><img src="compressed/${esc(p.path)}"><figcaption>Compressed · ${fmt(p.after)} · ${p.dims_after.w}×${p.dims_after.h}</figcaption></figure>
      </div></section>`).join("");
  await fs.writeFile(path.join(run, "compare.html"), `<!doctype html><meta charset="utf-8"><title>Image compression review</title>
<style>body{font:14px system-ui;margin:24px;background:#f6f5f2;color:#222}section{margin:0 0 40px}h2{font-size:13px;font-weight:600;word-break:break-all}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}img{width:100%;display:block;background:#ddd}figcaption{padding:6px 0;color:#555}</style>
<h1>Top ${Math.min(15, plan.length)} by original size</h1><p>Open both at full size (right-click → open image) to compare detail.</p>${cards}`);

  console.log(`Replace ${plan.length} files: ${fmt(tb)} -> ${fmt(ta)}`);
  console.log(`Review: ${path.relative(process.cwd(), run)}/compare.html and report.md`);
  console.log("Then run again with --apply. Nothing in Supabase has changed.");
}

async function apply() {
  const run = await newestRun();
  const { plan } = JSON.parse(await fs.readFile(path.join(run, "plan.json"), "utf8"));
  const current = new Map((await listAll()).map((o) => [o.path, o]));
  const log = [];
  for (const p of plan) {
    const now = current.get(p.path);
    if (!now) { log.push({ path: p.path, status: "skipped", reason: "no longer exists" }); continue; }
    if (now.size !== p.before || now.updated_at !== p.updated_at) {
      log.push({ path: p.path, status: "skipped", reason: "changed since dry run" }); continue;
    }
    const body = await fs.readFile(path.join(run, "compressed", p.path));
    const { error } = await supabase.storage.from(BUCKET).upload(p.path, body, { upsert: true, contentType: p.mimetype, cacheControl: CACHE_CONTROL });
    log.push({ path: p.path, mimetype: p.mimetype, status: error ? "error" : "replaced", reason: error?.message });
    console.log(`${error ? "ERROR" : "ok   "} ${p.path}${error ? ` (${error.message})` : ` ${fmt(p.before)} -> ${fmt(p.after)}`}`);
  }
  await fs.writeFile(path.join(run, "apply-log.json"), JSON.stringify(log, null, 2));
  const n = log.filter((l) => l.status === "replaced").length;
  console.log(`Replaced ${n}/${plan.length}. Log: ${path.relative(process.cwd(), run)}/apply-log.json`);
}

async function restore() {
  const run = await newestRun();
  const log = JSON.parse(await fs.readFile(path.join(run, "apply-log.json"), "utf8"));
  for (const l of log.filter((x) => x.status === "replaced")) {
    const body = await fs.readFile(path.join(run, "originals", l.path));
    const { error } = await supabase.storage.from(BUCKET).upload(l.path, body, { upsert: true, contentType: l.mimetype, cacheControl: "3600" });
    console.log(`${error ? "ERROR" : "restored"} ${l.path}${error ? ` (${error.message})` : ""}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local)");
    process.exit(1);
  }
  supabase = createClient(url, key, { auth: { persistSession: false } });
  const mode = args.apply ? apply : args.restore ? restore : dryRun;
  mode().catch((e) => { console.error(e); process.exit(1); });
}
