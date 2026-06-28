import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withSentryConfig(nextConfig, {
  org: 'vestaai',
  project: 'vestaai-nextjs',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring-tunnel',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
