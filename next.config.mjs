import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Private IPv4 origins for LAN development, including HMR connections.
  allowedDevOrigins: [
    '192.168.*.*',
    '10.*.*.*',
    ...Array.from({ length: 16 }, (_, index) => `172.${index + 16}.*.*`),
  ],
}

export default withPayload(nextConfig)
