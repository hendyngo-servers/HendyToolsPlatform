/**
 * Cloudflare Pages Function - Catch-all API Router
 * Handles /api/* endpoints directly on Cloudflare Pages Edge
 */

interface PagesContext {
  request: Request;
  env: Record<string, any>;
  params: {
    route?: string[];
  };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request, params } = context;
  const url = new URL(request.url);
  const routePath = Array.isArray(params.route) ? params.route.join('/') : (params.route || '');

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // GET /api/health
  if (routePath === 'health' || routePath === '') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'Hendy Tools Cloudflare Pages Function',
        platform: 'cloudflare-pages',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers }
    );
  }

  // GET /api/releases
  if (routePath === 'releases') {
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'Cloudflare Pages Edge',
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      route: routePath,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers }
  );
}
