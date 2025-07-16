// Template Next.js Configuration for MDX Support
// DO NOT USE until @next/mdx and remark packages are installed
// Requires: npm install @next/mdx@^15.0.0 remark@^15.0.0 rehype@^13.0.0 remark-gfm@^4.0.0

import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure page extensions to include MDX
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  
  // Disable experimental mdxRs for full plugin compatibility
  experimental: {
    mdxRs: false
  },
  
  // Other Next.js configuration
  reactStrictMode: true,
  
  // Environment variables that should be available to the client
  env: {
    // Add any public environment variables here
  },

  // Configure redirects if needed
  async redirects() {
    return []
  },

  // Configure rewrites if needed  
  async rewrites() {
    return []
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Custom webpack configuration if needed
    return config
  },
}

const withMDX = createMDX({
  // Add markdown plugins here
  options: {
    remarkPlugins: [
      // GitHub Flavored Markdown support
      remarkGfm,
      // Add more remark plugins as needed
    ],
    rehypePlugins: [
      // Add rehype plugins as needed for HTML processing
      // e.g., syntax highlighting, link processing, etc.
    ],
  },
})

// Combine MDX and Next.js config
export default withMDX(nextConfig)