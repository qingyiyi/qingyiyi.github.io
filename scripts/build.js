import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const srcDir = path.join(root, "src");
const site = JSON.parse(await fs.readFile(path.join(srcDir, "site.config.json"), "utf8"));
const articles = JSON.parse(await fs.readFile(path.join(srcDir, "articles.json"), "utf8"));
const assetMap = new Map();

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(value) {
  return cheerio.load(`<div>${value}</div>`).text().replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return stripHtml(value).replace(/\s+/g, "").toLowerCase();
}

function normalizeHref(value) {
  const href = String(value || "").trim();
  const markdownLink = href.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/i);
  return markdownLink ? markdownLink[1] : href;
}

function unwrapPlainSpans($, rootContent) {
  rootContent.find("span").each((_, el) => {
    const node = $(el);
    if (!node.attr("class") && !node.attr("id") && !node.attr("style")) node.replaceWith(node.html() || "");
  });
}

function pageLayout({ title, description, body, canonical = "" }) {
  const pageTitle = title === site.title ? site.title : `${title} | ${site.title}`;
  const canonicalUrl = new URL(canonical || "./", site.siteUrl).href;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description || site.description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav-wrap" aria-label="主导航">
      <a class="brand" href="index.html">
        <img src="${site.logo}" alt="" width="38" height="38">
        <span>${escapeHtml(site.title)}</span>
      </a>
      <div class="nav-links">
        <a href="index.html#articles">文章</a>
        <a href="index.html#topics">主题</a>
        ${site.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}
      </div>
    </nav>
  </header>
  <main class="main">
${body}
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <span>${escapeHtml(site.title)} · ${escapeHtml(site.subtitle)}</span>
      <a href="${escapeHtml(site.siteUrl)}">${escapeHtml(site.siteUrl)}</a>
    </div>
  </footer>
</body>
</html>
`;
}

function categoryCounts() {
  const counts = new Map();
  for (const article of articles) {
    counts.set(article.category, (counts.get(article.category) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"));
}

function tagList() {
  const set = new Set();
  for (const article of articles) {
    for (const tag of article.tags) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function renderIndex() {
  const categories = categoryCounts();
  const body = `    <section class="hero">
      <div class="hero-intro">
        <p class="eyebrow">静态技术博客</p>
        <h1>${escapeHtml(site.subtitle)}</h1>
        <p class="hero-text">${escapeHtml(site.description)}</p>
        <div class="hero-actions">
          <a class="button primary" href="#articles">阅读文章</a>
          <a class="button" href="${escapeHtml(site.siteUrl)}">访问站点</a>
        </div>
      </div>
      <aside class="profile-card" aria-label="作者信息">
        <div class="profile-top">
          <img class="avatar" src="${site.avatar}" alt="${escapeHtml(site.author)}">
          <div>
            <h2>${escapeHtml(site.author)}</h2>
            <p>HPC · 并行计算 · AI</p>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat"><strong>${articles.length}</strong><span>文章</span></div>
          <div class="stat"><strong>${categories.length}</strong><span>主题</span></div>
        </div>
      </aside>
    </section>
    <section id="topics" aria-labelledby="topics-title">
      <div class="section-head">
        <div>
          <h2 id="topics-title">主题</h2>
          <p>按研究和工程方向快速定位笔记。</p>
        </div>
      </div>
      <div class="tag-cloud">
        ${categories.map(([name, count]) => `<span class="tag">${escapeHtml(name)} · ${count}</span>`).join("")}
        ${tagList().map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
    </section>
    <section id="articles" aria-labelledby="articles-title">
      <div class="section-head">
        <div>
          <h2 id="articles-title">最新文章</h2>
          <p>保留原始 URL，重新生成更轻量的静态页面。</p>
        </div>
      </div>
      <div class="article-grid">
        ${articles.map((article) => `<article class="article-card">
          <div class="article-meta"><span>${escapeHtml(article.category)}</span><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time></div>
          <h3><a href="${escapeHtml(article.output)}">${escapeHtml(article.title)}</a></h3>
          <p>${escapeHtml(article.summary)}</p>
          <div class="tag-cloud">${article.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          <a class="read-more" href="${escapeHtml(article.output)}">阅读全文</a>
        </article>`).join("")}
      </div>
    </section>`;
  return pageLayout({ title: site.title, description: site.description, body });
}

function extractArticleContent(article) {
  const sourcePath = path.join(root, article.source);
  return fs.readFile(sourcePath, "utf8").then((html) => {
    const $ = cheerio.load(html, { decodeEntities: false });
    $("script, style, link").remove();
    let content = $("#write").first();
    if (!content.length) content = $(".blog-content .detail").first();
    if (!content.length) content = $(".blog-content").first();
    if (!content.length) content = $("body").first();

    const cloned = cheerio.load(`<div class="article-content">${content.html() || ""}</div>`, { decodeEntities: false });
    const rootContent = cloned(".article-content");
    rootContent.find("h1, h2, h3").each((_, el) => {
      const text = cloned(el).text().replace(/\s+/g, " ").trim();
      if (normalizeText(text) === normalizeText(article.title) || text === "青翼") cloned(el).remove();
    });
    const firstHeading = rootContent.children("h1").first();
    if (firstHeading.length && normalizeText(firstHeading.text()) === normalizeText(article.title)) firstHeading.remove();
    rootContent.find(".md-toc").remove();
    rootContent.find("[contenteditable], [spellcheck], [tabindex], [cid], [mdtype], [data-math-tag-before], [data-math-tag-after], [data-math-labels]").each((_, el) => {
      const node = cloned(el);
      for (const attr of Object.keys(el.attribs || {})) {
        if (["contenteditable", "spellcheck", "tabindex", "cid", "mdtype", "data-math-tag-before", "data-math-tag-after", "data-math-labels"].includes(attr)) {
          node.removeAttr(attr);
        }
      }
    });
    unwrapPlainSpans(cloned, rootContent);
    rootContent.find("script[type='math/tex'], script[type=\"math/tex\"]").remove();
    rootContent.find("pre textarea, .CodeMirror-measure, .CodeMirror-gutters, .CodeMirror-scrollbar-filler, .CodeMirror-gutter-filler").remove();
    rootContent.find(".CodeMirror-code").each((_, el) => {
      const lines = cloned(el).find("pre.CodeMirror-line").toArray().map((line) => cloned(line).text().replace(/\u00a0/g, " ").trimEnd());
      const code = (lines.length ? lines.join("\n") : cloned(el).text()).replace(/\n{3,}/g, "\n\n").trim();
      cloned(el).closest("pre").replaceWith(`<pre><code>${escapeHtml(code)}</code></pre>`);
    });
    rootContent.find("[class]").each((_, el) => {
      const node = cloned(el);
      const keep = ["MathJax"];
      const className = node.attr("class") || "";
      if (!keep.some((item) => className.includes(item))) node.removeAttr("class");
    });
    rootContent.find("[style]").each((_, el) => {
      const node = cloned(el);
      if (!node.is("mjx-container, svg")) node.removeAttr("style");
    });
    unwrapPlainSpans(cloned, rootContent);
    return rootContent.html() || "";
  });
}

function findImagePath(src) {
  if (!src || /^(https?:|data:|#)/i.test(src)) return null;
  const cleaned = src.replaceAll("\\", "/").replace(/^\.?\//, "").replace(/^\.?\/?/, "");
  const imageIndex = cleaned.indexOf("image/");
  if (imageIndex === -1) return null;
  return cleaned.slice(imageIndex);
}

async function convertImage(relativePath) {
  const normalized = normalizeSlash(relativePath);
  if (assetMap.has(normalized)) return assetMap.get(normalized);
  const source = path.join(root, normalized);
  const ext = path.extname(normalized).toLowerCase();
  let output = normalized;
  try {
    await fs.access(source);
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      output = normalized.replace(/\.(jpe?g|png)$/i, ".webp");
      const target = path.join(distDir, output);
      await ensureDir(path.dirname(target));
      const pipeline = sharp(source).rotate();
      const meta = await pipeline.metadata();
      const resizeWidth = normalized.includes("background") ? 1920 : Math.min(meta.width || 1600, 1600);
      await pipeline.resize({ width: resizeWidth, withoutEnlargement: true }).webp({ quality: normalized.includes("background") ? 72 : 78 }).toFile(target);
    } else {
      const target = path.join(distDir, normalized);
      await ensureDir(path.dirname(target));
      await fs.copyFile(source, target);
    }
  } catch {
    output = null;
  }
  assetMap.set(normalized, output);
  return output;
}

async function rewriteArticleAssets(html) {
  const $ = cheerio.load(`<main>${html}</main>`, { decodeEntities: false });
  const imgNodes = $("img").toArray();
  for (const img of imgNodes) {
    const node = $(img);
    node.attr("loading", "lazy");
    node.attr("decoding", "async");
    node.removeAttr("width");
    node.removeAttr("height");
    node.removeAttr("referrerpolicy");
    const imagePath = findImagePath(node.attr("src"));
    if (!imagePath) continue;
    const outputPath = await convertImage(imagePath);
    if (!outputPath) {
      const alt = node.attr("alt") || imagePath;
      node.replaceWith(`<span class="missing-image">图片缺失：${escapeHtml(alt)}</span>`);
      continue;
    }
    node.attr("src", outputPath);
  }
  $("a[href]").each((_, el) => {
    const node = $(el);
    const href = normalizeHref(node.attr("href"));
    if (!href) return;
    node.attr("href", href);
    if (/^(https?:|ftp:)/i.test(href)) {
      node.attr("target", "_blank");
      node.attr("rel", "noopener");
    }
  });
  return $("main").html() || "";
}

function renderArticle(article, content, previous, next) {
  const body = `    <article class="article-shell">
      <header class="article-header">
        <a href="index.html#articles">返回文章列表</a>
        <h1>${escapeHtml(article.title)}</h1>
        <p><time datetime="${escapeHtml(article.date)}">${escapeHtml(article.date)}</time> · ${escapeHtml(article.category)}</p>
        <div class="tag-cloud">${article.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      </header>
      <div class="article-content">
${content}
      </div>
      <nav class="article-nav" aria-label="文章导航">
        ${previous ? `<a href="${escapeHtml(previous.output)}">上一篇：${escapeHtml(previous.title)}</a>` : "<span></span>"}
        ${next ? `<a href="${escapeHtml(next.output)}">下一篇：${escapeHtml(next.title)}</a>` : "<span></span>"}
      </nav>
    </article>`;
  return pageLayout({ title: article.title, description: stripHtml(article.summary), canonical: article.output, body });
}

async function copyBaseAssets() {
  await ensureDir(path.join(distDir, "assets"));
  await fs.copyFile(path.join(srcDir, "styles/site.css"), path.join(distDir, "assets/site.css"));
  await convertImage("image/head.jpg");
  await convertImage("image/log.png");
}

async function writeFile(relativePath, content) {
  const target = path.join(distDir, relativePath);
  await ensureDir(path.dirname(target));
  await fs.writeFile(target, content);
}

async function build() {
  await fs.rm(distDir, { recursive: true, force: true });
  await ensureDir(distDir);
  await copyBaseAssets();
  await writeFile("index.html", renderIndex());

  for (let index = 0; index < articles.length; index += 1) {
    const article = articles[index];
    const previous = articles[index + 1];
    const next = articles[index - 1];
    const rawContent = await extractArticleContent(article);
    const content = await rewriteArticleAssets(rawContent);
    await writeFile(article.output, renderArticle(article, content, previous, next));
  }

  await writeFile("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.siteUrl.replace(/\/$/, "")}/sitemap.xml\n`);
  await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site.siteUrl}</loc></url>
${articles.map((article) => `  <url><loc>${new URL(article.output, site.siteUrl).href}</loc></url>`).join("\n")}
</urlset>
`);

  console.log(`Built ${articles.length + 1} pages in ${path.relative(root, distDir)}`);
}

await build();
