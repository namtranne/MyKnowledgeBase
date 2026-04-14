const { themes } = require('prism-react-renderer');

module.exports = async function createConfigAsync() {
  const remarkMath = (await import('remark-math')).default;
  const rehypeKatex = (await import('rehype-katex')).default;

  /** @type {import('@docusaurus/types').Config} */
  return {
    title: 'Knowledge Base',
    tagline: 'Personal technical notes & deep-dive guides',

    url: 'https://github.aus.thenational.com',
    baseUrl: '/pages/p016614/DOC/',

    organizationName: 'p016614',
    projectName: 'DOC',
    deploymentBranch: 'gh-pages',

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    stylesheets: [
      {
        href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css',
        type: 'text/css',
        integrity: 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+',
        crossorigin: 'anonymous',
      },
    ],

    i18n: {
      defaultLocale: 'en',
      locales: ['en'],
    },

    themes: [
      [
        '@easyops-cn/docusaurus-search-local',
        {
          hashed: true,
          indexBlog: false,
          docsRouteBasePath: '/docs',
          highlightSearchTermsOnTargetPage: true,
          searchBarShortcutHint: false,
        },
      ],
    ],

    themeConfig: {
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      navbar: {
        title: '⚡ Knowledge Base',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '📚 Docs',
          },
          {
            to: '/dsa-roadmap',
            label: '🏋️ DSA Roadmap',
            position: 'left',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Quick Links',
            items: [
              { label: 'Home', to: '/' },
              { label: 'All Docs', to: '/docs/intro' },
            ],
          },
          {
            title: 'Learning Paths',
            items: [
              { label: 'Kafka', to: '/docs/Technical-Knowledge/Kafka/' },
              { label: 'AWS', to: '/docs/Technical-Knowledge/AWS/' },
              { label: 'DSA Training', to: '/dsa-roadmap' },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Personal Knowledge Base — Built with caffeine & curiosity.`,
      },
      prism: {
        theme: themes.dracula,
        darkTheme: themes.dracula,
        additionalLanguages: ['java', 'python', 'bash', 'json', 'yaml', 'properties'],
      },
    },

    presets: [
      [
        'classic',
        {
          docs: {
            sidebarPath: require.resolve('./sidebars.js'),
            showLastUpdateAuthor: true,
            showLastUpdateTime: true,
            remarkPlugins: [remarkMath],
            rehypePlugins: [rehypeKatex],
          },
          blog: false,
          theme: {
            customCss: require.resolve('./src/css/custom.css'),
          },
        },
      ],
    ],

    plugins: [],
  };
};
