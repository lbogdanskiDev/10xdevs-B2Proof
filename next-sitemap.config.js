/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://example.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  // Optional: Add additional paths or exclude paths
  // exclude: ['/admin/*', '/api/*'],
  // additionalPaths: async (config) => [...],
};
