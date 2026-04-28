<div align="center">

# 青翼的 Blog

高性能计算、系统实践与 AI 学习笔记

[![Website](https://img.shields.io/badge/Website-qingyiyi.github.io-0f766e?style=for-the-badge)](https://qingyiyi.github.io/)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-24292f?style=for-the-badge&logo=github)](https://github.com/qingyiyi/qingyiyi.github.io/actions)
[![Static Site](https://img.shields.io/badge/Static-HTML%20%2B%20CSS%20%2B%20Node-2563eb?style=for-the-badge)](https://qingyiyi.github.io/)

**访问地址：<https://qingyiyi.github.io/>**

</div>

## 简介

这是一个面向技术学习和科研积累的静态博客，内容覆盖 HPC、并行计算、GPU 编程、系统基础、机器学习和工程实践。站点源码托管在 GitHub，构建产物通过 GitHub Pages 发布。

当前版本已从手写静态页面重构为“源码 + 构建生成”的结构：保留原有文章链接，同时优化页面样式、图片体积和国内访问时容易卡住的外部依赖。

## 文章目录

| 文章 | 主题 | 日期 |
| --- | --- | --- |
| [机器学习 quick access](https://qingyiyi.github.io/blog_9.html) | 机器学习 | 2024-11-08 |
| [大二小学期：搭建一个网购平台](https://qingyiyi.github.io/blog_8.html) | 工程实践 | 2024-11-08 |
| [OpenMP 教程](https://qingyiyi.github.io/blog_7.html) | 并行计算 | 2024-11-08 |
| [简单 CPU 设计](https://qingyiyi.github.io/blog_6.html) | 体系结构 | 2022-12-13 |
| [MPI 并行程序设计](https://qingyiyi.github.io/blog_5.html) | 并行计算 | 2022-10-16 |
| [CUDA 小小入门](https://qingyiyi.github.io/blog_4.html) | GPU 计算 | 2022-09-26 |
| [汇编从入门到拆炸弹](https://qingyiyi.github.io/blog_3.html) | 系统基础 | 2022-09-17 |
| [纯小白如何在 Win11 环境下运行 MPI 程序](https://qingyiyi.github.io/blog_2.html) | 并行计算 | 2022-07-13 |
| [如何制作 LAPACK 库的 DLL 链接文件](https://qingyiyi.github.io/blog_1.html) | 工程实践 | 2022-05-14 |

## 技术栈

- 静态页面：HTML、CSS
- 构建脚本：Node.js
- 内容抽取：Cheerio
- 图片优化：Sharp，生成 WebP
- 部署：GitHub Actions + GitHub Pages

## 项目结构

```text
.
├── src/
│   ├── articles.json        # 文章元数据
│   ├── site.config.json     # 站点配置
│   ├── legacy/              # 旧文章 HTML 源内容
│   └── styles/site.css      # 新站点样式
├── scripts/
│   ├── build.js             # 构建 dist
│   └── check.js             # 发布产物检查
├── image/                   # 原始图片资源
├── dist/                    # 构建输出，不提交
└── .github/workflows/       # GitHub Pages 自动部署
```

## 本地开发

```bash
npm install
npm run build
npm run check
npm run dev
```

`npm run build` 会从 `src/legacy/` 抽取文章正文，生成统一模板页面，并把图片转换为更轻量的 WebP。公开链接仍保持为：

```text
/
/blog_1.html
/blog_2.html
...
/blog_9.html
```

## 部署

仓库已提供 GitHub Actions workflow。推送到 `main` 后会自动：

1. 安装依赖
2. 构建 `dist/`
3. 运行发布检查
4. 将 `dist/` 部署到 GitHub Pages

首次使用时，需要在 GitHub 仓库设置中选择：

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

## 优化记录

- 移除了公开页面中的写博客、登录、注销入口。
- 发布产物不再包含 `editor.md-master`。
- 移除了 `fonts.loli.net`、`cdn.bootcdn.net` 等外部依赖。
- 旧背景大图不再作为首屏资源加载。
- 图片按需转为 WebP，并为正文图片添加懒加载。

