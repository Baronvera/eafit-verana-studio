/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@vas/shared'],
  async rewrites() {
    // En K8s, el Ingress ya rutea /api → vas-api. No necesitamos rewrite.
    // En dev local, Next.js hace proxy al API local.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Si la URL pública es HTTPS (producción), usamos el servicio interno de K8s
    const isProduction = apiUrl.startsWith('https://');
    const backendUrl = isProduction
      ? (process.env.INTERNAL_API_URL || 'http://vas-api:3000')
      : apiUrl;

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
