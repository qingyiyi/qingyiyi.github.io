import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const articles = JSON.parse(await fs.readFile(path.join(root, "src/articles.json"), "utf8"));
const forbidden = ["blog_edit.html", "blog_login.html", "fonts.loli.net", "cdn.bootcdn.net", "editor.md-master", "referrerpolicy="];

async function read(relativePath) {
  return fs.readFile(path.join(dist, relativePath), "utf8");
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(dist, relativePath));
    return true;
  } catch {
    return false;
  }
}

const failures = [];

if (!(await exists("index.html"))) failures.push("dist/index.html is missing");
for (const article of articles) {
  if (!(await exists(article.output))) failures.push(`dist/${article.output} is missing`);
}

for (const file of ["index.html", ...articles.map((article) => article.output)]) {
  if (!(await exists(file))) continue;
  const content = await read(file);
  for (const pattern of forbidden) {
    if (content.includes(pattern)) failures.push(`${file} contains forbidden pattern: ${pattern}`);
  }

  const $ = cheerio.load(content);
  for (const el of $("[src], [href]").toArray()) {
    const attr = el.attribs.src ? "src" : "href";
    const value = el.attribs[attr] || "";
    if (/\]\(https?:\/\//i.test(value)) failures.push(`${file} has malformed ${attr}: ${value}`);
    if (/^(https?:|ftp:|mailto:|#)/i.test(value)) continue;
    const cleanValue = value.split("#")[0].split("?")[0];
    if (!cleanValue || cleanValue.startsWith("/")) continue;
    if (!(await exists(cleanValue))) failures.push(`${file} references missing local asset: ${value}`);
  }
}

const index = await read("index.html");
for (const article of articles) {
  if (!index.includes(`href="${article.output}"`)) failures.push(`index.html does not link to ${article.output}`);
}

if (await exists("editor.md-master")) failures.push("dist/editor.md-master should not be published");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Check passed: ${articles.length} article pages plus index.`);
