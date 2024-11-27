import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/vite-plugin-public-typescript/',
  title: 'vite-plugin-public-typescript',
  description: 'Inject Typescript Into Html',
  locales: {
    root: {
      label: 'English',
      description: 'Inject Typescript Into Html',
      themeConfig: {
        nav: [
          {
            text: 'Examples',
            link: 'https://github.com/hemengke1997/vite-plugin-public-typescript/tree/master/playground',
          },
        ],
        sidebar: [
          {
            text: 'Guides',
            items: [
              {
                text: 'Introduction',
                link: '/guides/introduction',
              },
              {
                text: 'Getting Started',
                link: '/guides/getting-started',
              },
              {
                text: 'SSR',
                link: '/guides/ssr',
              },
              {
                text: 'Manifest File',
                link: '/guides/manifest',
              },
              {
                text: 'Browser Compatibility',
                link: '/guides/compatibility',
              },
            ],
          },
          {
            text: 'Reference',
            items: [
              {
                text: 'publicTypescript',
                link: '/reference/public-typescript',
              },
              {
                text: 'injectScripts',
                link: '/reference/inject-scripts',
              },
              {
                text: 'injectScriptsToHtml',
                link: '/reference/inject-scripts-to-html',
              },
            ],
          },
        ],
      },
    },
    zh: {
      label: '简体中文',
      description: '将 Typescript 注入到 Html 中',
      themeConfig: {
        nav: [
          {
            text: '示例',
            link: 'https://github.com/hemengke1997/vite-plugin-public-typescript/tree/master/playground',
          },
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              {
                text: '介绍',
                link: '/zh/guides/introduction',
              },
              {
                text: '开始使用',
                link: '/zh/guides/getting-started',
              },
              {
                text: '服务端渲染',
                link: '/zh/guides/ssr',
              },
              {
                text: 'manifest文件',
                link: '/zh/guides/manifest',
              },
              {
                text: '浏览器兼容',
                link: '/zh/guides/compatibility',
              },
            ],
          },
          {
            text: '参考',
            items: [
              {
                text: 'publicTypescript',
                link: '/zh/reference/public-typescript',
              },
              {
                text: 'injectScripts',
                link: '/zh/reference/inject-scripts',
              },
              {
                text: 'injectScriptsToHtml',
                link: '/zh/reference/inject-scripts-to-html',
              },
            ],
          },
        ],
      },
    },
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/hemengke1997/vite-plugin-public-typescript' }],
    search: {
      provider: 'local',
    },
    logo: '/logo.svg',
  },
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/vite-plugin-public-typescript/logo.svg' }]],
})
