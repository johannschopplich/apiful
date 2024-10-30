import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'
import { description, github, name, ogImage, ogUrl, releases, twitterImage, version } from './meta'

const url = new URL(ogUrl)

export default defineConfig({
  title: name,
  description,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Johann Schopplich' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: ogUrl }],
    ['meta', { property: 'og:title', content: name }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { name: 'twitter:title', content: name }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: twitterImage }],
    ['meta', { name: 'twitter:site', content: '@jschopplich' }],
    ['meta', { name: 'twitter:creator', content: '@jschopplich' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    // Plausible Analytics
    ['script', { 'src': 'https://plausible.io/js/script.js', 'defer': '', 'data-domain': url.hostname }],
  ],

  themeConfig: {
    nav: [
      {
        text: 'Guide',
        activeMatch: '^/guide/',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Using Extensions', link: '/guide/using-extensions' },
          { text: 'Creating Extensions', link: '/guide/custom-extensions' },
          { text: 'Command Line Interface', link: '/guide/cli' },
        ],
      },
      {
        text: 'Extensions',
        activeMatch: '^/extensions/',
        items: [
          { text: 'ofetch', link: '/extensions/ofetch' },
          { text: 'OpenAPI', link: '/extensions/openapi' },
          { text: 'API Router', link: '/extensions/api-router' },
        ],
      },
      {
        text: 'Reference',
        activeMatch: '^/reference/',
        items: [
          {
            text: 'Methods',
            items: [
              { text: 'createClient', link: '/reference/create-client' },
              { text: 'defineApifulConfig', link: '/reference/define-apiful-config' },
            ],
          },
          {
            text: 'Types',
            items: [
              { text: 'ApiClient', link: '/reference/api-client' },
              { text: 'HandlerExtensionBuilder', link: '/reference/handler-extension-builder' },
              { text: 'MethodsExtensionBuilder', link: '/reference/methods-extension-builder' },
            ],
          },
        ],
      },
      {
        text: 'Utilities',
        activeMatch: '^/utilities/',
        items: [
          { text: 'HTTP Status Codes', link: '/utilities/http-status-codes' },
          { text: 'HTTP Status Phrases', link: '/utilities/http-status-phrases' },
          { text: 'Types from JSON', link: '/utilities/types-from-json' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Release Notes ',
            link: releases,
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': sidebarGuide(),
      '/extensions/': sidebarGuide(),
      '/reference/': referenceGuide(),
      '/utilities/': utilitiesGuide(),
    },

    socialLinks: [
      { icon: 'github', link: github },
    ],

    footer: {
      message: 'Released under the <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a>.',
      copyright: 'Copyright © 2024-PRESENT <a href="https://github.com/johannschopplich" target="_blank">Johann Schopplich</a>.',
    },

    search: {
      provider: 'local',
    },
  },
})

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Using Extensions', link: '/guide/using-extensions' },
        { text: 'Creating Extensions', link: '/guide/custom-extensions' },
        { text: 'Command Line Interface', link: '/guide/cli' },
      ],
    },
    {
      text: 'Built-in Extensions',
      items: [
        { text: 'ofetch', link: '/extensions/ofetch' },
        { text: 'OpenAPI', link: '/extensions/openapi' },
        { text: 'API Router', link: '/extensions/api-router' },
      ],
    },
    { text: 'Utilities', link: '/utilities' },
  ]
}

function referenceGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Methods',
      items: [
        { text: 'createClient', link: '/reference/create-client' },
        { text: 'defineApifulConfig', link: '/reference/define-apiful-config' },
      ],
    },
    {
      text: 'Types',
      items: [
        { text: 'ApiClient', link: '/reference/api-client' },
        { text: 'HandlerExtensionBuilder', link: '/reference/handler-extension-builder' },
        { text: 'MethodsExtensionBuilder', link: '/reference/methods-extension-builder' },
      ],
    },
  ]
}

function utilitiesGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Utilities',
      items: [
        { text: 'Overview', link: '/utilities' },
        { text: 'HTTP Status Codes', link: '/utilities/http-status-codes' },
        { text: 'HTTP Status Phrases', link: '/utilities/http-status-phrases' },
        { text: 'Types from JSON', link: '/utilities/types-from-json' },
      ],
    },
  ]
}
