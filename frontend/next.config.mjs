/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3002';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`
      }
    ]
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  }
};

export default nextConfig;
