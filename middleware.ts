export function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Skip API routes, static assets, and files with extensions
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.includes('.')
  ) {
    return; // Allow the request to proceed normally
  }

  // Rewrite page requests to our serverless SSR endpoint
  const rewriteUrl = new URL('/api/ssr', request.url);
  
  // We perform an internal rewrite by setting the 'x-middleware-rewrite' header on a standard Response
  return new Response(null, {
    headers: {
      'x-middleware-rewrite': rewriteUrl.toString(),
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - favicon.ico (favicon file)
     * - assets (Vite assets)
     */
    '/((?!api|assets|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};
