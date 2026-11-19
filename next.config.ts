import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Prevent clickjacking
                    { key: 'X-Frame-Options', value: 'DENY' },
                    // Prevent MIME-type sniffing
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    // Control referrer information
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    // Restrict browser features
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    // Enforce HTTPS (only effective in production behind HTTPS)
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    // Basic XSS protection for older browsers
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                ],
            },
            {
                // Self-contained tools shown inside our own pages (the study
                // planner at /study-planner). Same-site framing only; listed
                // after the rule above, so this value wins for these paths.
                source: '/embed/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
                ],
            },
        ];
    },
};

export default nextConfig;
