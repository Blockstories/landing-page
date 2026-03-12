import '@astrojs/internal-helpers/path';
import '@astrojs/internal-helpers/remote';
import 'piccolore';
import { p as NOOP_MIDDLEWARE_HEADER, q as decodeKey } from './chunks/astro/server__vZ8gHRi.mjs';
import 'clsx';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/luca/Coding/Blockstories/landing-page/frontend/","cacheDir":"file:///Users/luca/Coding/Blockstories/landing-page/frontend/node_modules/.astro/","outDir":"file:///Users/luca/Coding/Blockstories/landing-page/dist/","srcDir":"file:///Users/luca/Coding/Blockstories/landing-page/frontend/src/","publicDir":"file:///Users/luca/Coding/Blockstories/landing-page/public/","buildClientDir":"file:///Users/luca/Coding/Blockstories/landing-page/dist/client/","buildServerDir":"file:///Users/luca/Coding/Blockstories/landing-page/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"../node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/articles","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/articles\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"articles","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/articles.ts","pathname":"/api/articles","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":":root{--bg:#FFFFFF;--surface:#F9FAFB;--surface-warm:#F3F4F6;--surface-dark:#122B42;--border:#E5E7EB;--border-light:#F3F4F6;--text-1:#030712;--text-2:#374151;--text-3:#6B7280;--accent:#5A8A86;--accent-light:rgba(90,138,134,.06);--accent-hover:#4A7672;--green:#12B76A;--red:#D02727;--ink-faint:#9CA3AF;--serif:\"Instrument Serif\",Georgia,serif;--display:\"Playfair Display\",serif;--body:\"Source Serif 4\",serif;--sans:\"DM Sans\",-apple-system,sans-serif;--mono:\"JetBrains Mono\",monospace;--max-w:1200px;--ease:.25s ease;--sp-xs:8px;--sp-s:16px;--sp-m:24px;--sp-l:36px;--sp-xl:56px;--sp-2xl:80px}*{margin:0;padding:0;box-sizing:border-box}html{font-size:16px;-webkit-font-smoothing:antialiased}body{font-family:var(--sans);background:var(--bg);color:var(--text-1);line-height:1.6}a{color:inherit;text-decoration:none}img{display:block;width:100%;height:100%;object-fit:cover}.wrap{max-width:var(--max-w);margin:0 auto;padding:0 var(--sp-l)}.masthead{position:sticky;top:0;z-index:100;background:#fffffff5;backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.masthead-top{display:flex;align-items:center;justify-content:space-between;height:56px}.logo{display:flex;align-items:center}.logo svg{height:22px;width:auto}.masthead-right{display:flex;align-items:center;gap:28px}.clocks{display:flex;gap:20px;align-items:center}.ck{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:.5rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}.ck-time{color:var(--text-2);font-weight:500}.ck-dot{width:3px;height:3px;border-radius:50%;background:var(--green);flex-shrink:0}.nav{display:flex;align-items:center;gap:24px;list-style:none}.nav a{font-size:.75rem;font-weight:500;color:var(--text-2);letter-spacing:.05em;text-transform:uppercase;transition:color var(--ease)}.nav a:hover{color:var(--text-1)}.nav a.active{color:var(--text-1);border-bottom:2px solid var(--text-1);padding-bottom:2px}.nav-cta{padding:7px 18px!important;background:var(--text-1)!important;color:var(--bg)!important;border-radius:3px}.nav-cta:hover{opacity:.85}.foot{border-top:1px solid var(--border);padding:24px 0}.foot-inner{display:flex;justify-content:space-between;align-items:center}.foot-left{font-size:.72rem;color:var(--text-3)}.foot-links{display:flex;gap:22px;list-style:none}.foot-links a{font-size:.65rem;font-family:var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);transition:color var(--ease)}.foot-links a:hover{color:var(--text-1)}.reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}.reveal.visible{opacity:1;transform:translateY(0)}@keyframes pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 5px #5a8a8600}}@keyframes pulse-dark{0%,to{box-shadow:0 0 #0000004d}50%{box-shadow:0 0 0 5px #0000}}@keyframes live-pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 6px #5a8a8600}}@keyframes tl-pulse{0%,to{box-shadow:0 0 #5a8a8659}50%{box-shadow:0 0 0 8px #5a8a8600}}@media(max-width:1024px){.clocks{display:none}}@media(max-width:640px){.wrap{padding:0 20px}.nav{display:none}}\n"},{"type":"external","src":"/_astro/briefings.6ZEkLV-I.css"}],"routeData":{"route":"/briefings","isIndex":false,"type":"page","pattern":"^\\/briefings\\/?$","segments":[[{"content":"briefings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/briefings.astro","pathname":"/briefings","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":":root{--bg:#FFFFFF;--surface:#F9FAFB;--surface-warm:#F3F4F6;--surface-dark:#122B42;--border:#E5E7EB;--border-light:#F3F4F6;--text-1:#030712;--text-2:#374151;--text-3:#6B7280;--accent:#5A8A86;--accent-light:rgba(90,138,134,.06);--accent-hover:#4A7672;--green:#12B76A;--red:#D02727;--ink-faint:#9CA3AF;--serif:\"Instrument Serif\",Georgia,serif;--display:\"Playfair Display\",serif;--body:\"Source Serif 4\",serif;--sans:\"DM Sans\",-apple-system,sans-serif;--mono:\"JetBrains Mono\",monospace;--max-w:1200px;--ease:.25s ease;--sp-xs:8px;--sp-s:16px;--sp-m:24px;--sp-l:36px;--sp-xl:56px;--sp-2xl:80px}*{margin:0;padding:0;box-sizing:border-box}html{font-size:16px;-webkit-font-smoothing:antialiased}body{font-family:var(--sans);background:var(--bg);color:var(--text-1);line-height:1.6}a{color:inherit;text-decoration:none}img{display:block;width:100%;height:100%;object-fit:cover}.wrap{max-width:var(--max-w);margin:0 auto;padding:0 var(--sp-l)}.masthead{position:sticky;top:0;z-index:100;background:#fffffff5;backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.masthead-top{display:flex;align-items:center;justify-content:space-between;height:56px}.logo{display:flex;align-items:center}.logo svg{height:22px;width:auto}.masthead-right{display:flex;align-items:center;gap:28px}.clocks{display:flex;gap:20px;align-items:center}.ck{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:.5rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}.ck-time{color:var(--text-2);font-weight:500}.ck-dot{width:3px;height:3px;border-radius:50%;background:var(--green);flex-shrink:0}.nav{display:flex;align-items:center;gap:24px;list-style:none}.nav a{font-size:.75rem;font-weight:500;color:var(--text-2);letter-spacing:.05em;text-transform:uppercase;transition:color var(--ease)}.nav a:hover{color:var(--text-1)}.nav a.active{color:var(--text-1);border-bottom:2px solid var(--text-1);padding-bottom:2px}.nav-cta{padding:7px 18px!important;background:var(--text-1)!important;color:var(--bg)!important;border-radius:3px}.nav-cta:hover{opacity:.85}.foot{border-top:1px solid var(--border);padding:24px 0}.foot-inner{display:flex;justify-content:space-between;align-items:center}.foot-left{font-size:.72rem;color:var(--text-3)}.foot-links{display:flex;gap:22px;list-style:none}.foot-links a{font-size:.65rem;font-family:var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);transition:color var(--ease)}.foot-links a:hover{color:var(--text-1)}.reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}.reveal.visible{opacity:1;transform:translateY(0)}@keyframes pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 5px #5a8a8600}}@keyframes pulse-dark{0%,to{box-shadow:0 0 #0000004d}50%{box-shadow:0 0 0 5px #0000}}@keyframes live-pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 6px #5a8a8600}}@keyframes tl-pulse{0%,to{box-shadow:0 0 #5a8a8659}50%{box-shadow:0 0 0 8px #5a8a8600}}@media(max-width:1024px){.clocks{display:none}}@media(max-width:640px){.wrap{padding:0 20px}.nav{display:none}}\n"},{"type":"external","src":"/_astro/news.Dccqew8z.css"}],"routeData":{"route":"/news","isIndex":false,"type":"page","pattern":"^\\/news\\/?$","segments":[[{"content":"news","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/news.astro","pathname":"/news","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":":root{--bg:#FFFFFF;--surface:#F9FAFB;--surface-warm:#F3F4F6;--surface-dark:#122B42;--border:#E5E7EB;--border-light:#F3F4F6;--text-1:#030712;--text-2:#374151;--text-3:#6B7280;--accent:#5A8A86;--accent-light:rgba(90,138,134,.06);--accent-hover:#4A7672;--green:#12B76A;--red:#D02727;--ink-faint:#9CA3AF;--serif:\"Instrument Serif\",Georgia,serif;--display:\"Playfair Display\",serif;--body:\"Source Serif 4\",serif;--sans:\"DM Sans\",-apple-system,sans-serif;--mono:\"JetBrains Mono\",monospace;--max-w:1200px;--ease:.25s ease;--sp-xs:8px;--sp-s:16px;--sp-m:24px;--sp-l:36px;--sp-xl:56px;--sp-2xl:80px}*{margin:0;padding:0;box-sizing:border-box}html{font-size:16px;-webkit-font-smoothing:antialiased}body{font-family:var(--sans);background:var(--bg);color:var(--text-1);line-height:1.6}a{color:inherit;text-decoration:none}img{display:block;width:100%;height:100%;object-fit:cover}.wrap{max-width:var(--max-w);margin:0 auto;padding:0 var(--sp-l)}.masthead{position:sticky;top:0;z-index:100;background:#fffffff5;backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.masthead-top{display:flex;align-items:center;justify-content:space-between;height:56px}.logo{display:flex;align-items:center}.logo svg{height:22px;width:auto}.masthead-right{display:flex;align-items:center;gap:28px}.clocks{display:flex;gap:20px;align-items:center}.ck{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:.5rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3)}.ck-time{color:var(--text-2);font-weight:500}.ck-dot{width:3px;height:3px;border-radius:50%;background:var(--green);flex-shrink:0}.nav{display:flex;align-items:center;gap:24px;list-style:none}.nav a{font-size:.75rem;font-weight:500;color:var(--text-2);letter-spacing:.05em;text-transform:uppercase;transition:color var(--ease)}.nav a:hover{color:var(--text-1)}.nav a.active{color:var(--text-1);border-bottom:2px solid var(--text-1);padding-bottom:2px}.nav-cta{padding:7px 18px!important;background:var(--text-1)!important;color:var(--bg)!important;border-radius:3px}.nav-cta:hover{opacity:.85}.foot{border-top:1px solid var(--border);padding:24px 0}.foot-inner{display:flex;justify-content:space-between;align-items:center}.foot-left{font-size:.72rem;color:var(--text-3)}.foot-links{display:flex;gap:22px;list-style:none}.foot-links a{font-size:.65rem;font-family:var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--text-3);transition:color var(--ease)}.foot-links a:hover{color:var(--text-1)}.reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease}.reveal.visible{opacity:1;transform:translateY(0)}@keyframes pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 5px #5a8a8600}}@keyframes pulse-dark{0%,to{box-shadow:0 0 #0000004d}50%{box-shadow:0 0 0 5px #0000}}@keyframes live-pulse{0%,to{box-shadow:0 0 #5a8a8666}50%{box-shadow:0 0 0 6px #5a8a8600}}@keyframes tl-pulse{0%,to{box-shadow:0 0 #5a8a8659}50%{box-shadow:0 0 0 8px #5a8a8600}}@media(max-width:1024px){.clocks{display:none}}@media(max-width:640px){.wrap{padding:0 20px}.nav{display:none}}\n"},{"type":"external","src":"/_astro/index.zWlPRqBe.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"site":"https://blockstories.com","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/briefings.astro",{"propagation":"none","containsHead":true}],["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/news.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/api/articles@_@ts":"pages/api/articles.astro.mjs","\u0000@astro-page:src/pages/briefings@_@astro":"pages/briefings.astro.mjs","\u0000@astro-page:src/pages/news@_@astro":"pages/news.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:../node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_JkpSo-ka.mjs","/Users/luca/Coding/Blockstories/landing-page/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CNlV3V31.mjs","/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/briefings.astro?astro&type=script&index=0&lang.ts":"_astro/briefings.astro_astro_type_script_index_0_lang.B--btd87.js","/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/news.astro?astro&type=script&index=0&lang.ts":"_astro/news.astro_astro_type_script_index_0_lang.CF69TFe3.js","/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/index.astro?astro&type=script&index=0&lang.ts":"_astro/index.astro_astro_type_script_index_0_lang.Bj46W0C1.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/briefings.astro?astro&type=script&index=0&lang.ts","const a=document.getElementById(\"contentTabs\");if(a){const t=document.querySelector(\".feat\"),s=document.querySelectorAll(\"[data-type]\"),c=document.querySelectorAll(\"[data-section]\"),r=null,i=document.querySelector(\".inline-cta\"),d=document.querySelector(\".authors-sec\");a.querySelectorAll(\".tab\").forEach(o=>{o.addEventListener(\"click\",()=>{a.querySelectorAll(\".tab\").forEach(e=>e.classList.remove(\"on\")),o.classList.add(\"on\");const l=o.dataset.f;l===\"all\"?t.style.display=\"\":t.style.display=t.dataset.type===l?\"\":\"none\",s.forEach(e=>{l===\"all\"?e.style.display=\"\":e.style.display=e.dataset.type===l?\"\":\"none\"}),c.forEach(e=>{l===\"all\"?e.style.display=\"\":e.style.display=e.dataset.section===l?\"\":\"none\"}),[r,i,d].forEach(e=>{e&&(e.style.display=l===\"all\"?\"\":\"none\")})})})}const n=new IntersectionObserver(t=>{t.forEach(s=>{s.isIntersecting&&(s.target.classList.add(\"visible\"),n.unobserve(s.target))})},{threshold:.1,rootMargin:\"0px 0px -40px 0px\"});document.querySelectorAll(\".reveal\").forEach(t=>n.observe(t));"],["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/news.astro?astro&type=script&index=0&lang.ts","(function(){var e=document.getElementById(\"tlViewport\"),t=document.getElementById(\"tlTrack\"),r=document.getElementById(\"tlLeft\"),o=document.getElementById(\"tlRight\");if(!e||!t||!r||!o)return;var l=6,a=t.querySelectorAll(\".timeline-event\"),c=a.length,i=t.querySelector(\".timeline-spine\");function s(){var n=e.offsetWidth,u=n/l;if(t.style.gridTemplateColumns=\"repeat(\"+c+\",\"+u+\"px)\",i){var m=(c-1)*u;i.style.width=m+\"px\",i.style.right=\"auto\"}var g=t.scrollWidth-n;e.scrollLeft=g,d()}function d(){var n=t.scrollWidth-e.offsetWidth;r.classList.toggle(\"hide\",e.scrollLeft<=1),o.classList.toggle(\"hide\",e.scrollLeft>=n-1)}r.addEventListener(\"click\",function(){var n=e.offsetWidth/l;e.scrollBy({left:-n,behavior:\"smooth\"})}),o.addEventListener(\"click\",function(){var n=e.offsetWidth/l;e.scrollBy({left:n,behavior:\"smooth\"})}),e.addEventListener(\"scroll\",d),s(),window.addEventListener(\"resize\",s)})();function v(){const e={hour:\"2-digit\",minute:\"2-digit\",hour12:!1};[[\"ck-fra\",\"Europe/Berlin\",\"de-DE\"],[\"ck-lon\",\"Europe/London\",\"en-GB\"],[\"ck-zur\",\"Europe/Zurich\",\"de-CH\"],[\"ck-nyc\",\"America/New_York\",\"en-US\"],[\"ck-sin\",\"Asia/Singapore\",\"en-SG\"]].forEach(([r,o,l])=>{const a=document.getElementById(r);a&&(a.textContent=new Date().toLocaleTimeString(l,{...e,timeZone:o}))})}v();setInterval(v,3e4);(function(){const e=document.getElementById(\"dateline\");if(e){const t=new Date,r=[\"Sunday\",\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\",\"Saturday\"],o=[\"January\",\"February\",\"March\",\"April\",\"May\",\"June\",\"July\",\"August\",\"September\",\"October\",\"November\",\"December\"];e.textContent=r[t.getDay()]+\", \"+o[t.getMonth()]+\" \"+t.getDate()+\", \"+t.getFullYear()}})();document.getElementById(\"newsTabs\");const f=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.classList.add(\"visible\"),f.unobserve(t.target))})},{threshold:.1,rootMargin:\"0px 0px -40px 0px\"});document.querySelectorAll(\".reveal\").forEach(e=>f.observe(e));"],["/Users/luca/Coding/Blockstories/landing-page/frontend/src/pages/index.astro?astro&type=script&index=0&lang.ts","function d(){const t={hour:\"2-digit\",minute:\"2-digit\",hour12:!1};[[\"ck-fra\",\"Europe/Berlin\",\"de-DE\"],[\"ck-lon\",\"Europe/London\",\"en-GB\"],[\"ck-zur\",\"Europe/Zurich\",\"de-CH\"],[\"ck-nyc\",\"America/New_York\",\"en-US\"],[\"ck-sin\",\"Asia/Singapore\",\"en-SG\"]].forEach(([l,e,c])=>{const o=document.getElementById(l);o&&(o.textContent=new Date().toLocaleTimeString(c,{...t,timeZone:e}))})}d();setInterval(d,3e4);const r=document.getElementById(\"flowTabs\");if(r){const t=document.querySelectorAll(\".flow-list .fi\");r.querySelectorAll(\".tab\").forEach(s=>{s.addEventListener(\"click\",()=>{r.querySelectorAll(\".tab\").forEach(e=>e.classList.remove(\"on\")),s.classList.add(\"on\");const l=s.dataset.f;t.forEach(e=>{const c=(e.dataset.cat||\"\").split(\" \"),o=e.classList.contains(\"own\");l===\"latest\"?e.style.display=o?\"none\":\"\":l===\"blockstories\"?e.style.display=o?\"\":\"none\":e.style.display=c.includes(l)&&!o?\"\":\"none\"})})}),r.querySelector('.tab[data-f=\"latest\"]').click()}document.querySelectorAll(\".ed-tab\").forEach(t=>{t.addEventListener(\"click\",()=>{document.querySelectorAll(\".ed-tab\").forEach(o=>o.classList.remove(\"on\")),t.classList.add(\"on\");const s=t.dataset.filter,l=t.closest(\".ed-sec\"),e=l.querySelector(\".ed-feat\"),c=l.querySelectorAll(\".edc\");s===\"all\"?(e.style.display=\"\",c.forEach(o=>o.style.display=\"\")):(e.style.display=e.dataset.type===s?\"\":\"none\",c.forEach(o=>{o.style.display=o.dataset.type===s?\"\":\"none\"}))})});const n=document.getElementById(\"evScroll\"),a=document.getElementById(\"evArrow\");n&&a&&(a.addEventListener(\"click\",()=>{n.scrollBy({left:280,behavior:\"smooth\"})}),n.addEventListener(\"scroll\",()=>{const t=n.scrollLeft+n.clientWidth>=n.scrollWidth-40;a.classList.toggle(\"hide\",t)}));const i=document.getElementById(\"briefingTabs\");if(i){const t=document.querySelectorAll(\".briefing-card[data-briefing]\");i.querySelectorAll(\".tab\").forEach(s=>{s.addEventListener(\"click\",()=>{i.querySelectorAll(\".tab\").forEach(e=>e.classList.remove(\"on\")),s.classList.add(\"on\");const l=s.dataset.briefing;t.forEach(e=>{e.style.display=e.dataset.briefing===l?\"\":\"none\"})})})}const f=new IntersectionObserver(t=>{t.forEach(s=>{s.isIntersecting&&(s.target.classList.add(\"visible\"),f.unobserve(s.target))})},{threshold:.1,rootMargin:\"0px 0px -40px 0px\"});document.querySelectorAll(\".reveal\").forEach(t=>f.observe(t));"]],"assets":["/_astro/briefings.6ZEkLV-I.css","/_astro/news.Dccqew8z.css","/_astro/index.zWlPRqBe.css"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"GufUUXjEGFljQM+qfQBU6awd/kNSdoO4d+03brNya34="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
