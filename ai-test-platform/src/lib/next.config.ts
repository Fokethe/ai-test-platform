import type { NextConfig } from "next";  
  
const nextConfig: NextConfig = {  
  typescript: {  
    ignoreBuildErrors: true,  
  },  
  images: {  
    domains: ['localhost'],  
    formats: ['image/webp', 'image/avif'],  
    remotePatterns: [  
      {  
        protocol: 'https',  
        hostname: '**',  
      },  
    ],  
    minimumCacheTTL: 60,  
    unoptimized: false,  
  },  
};  
  
export default nextConfig; 
