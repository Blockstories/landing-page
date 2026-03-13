import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_ZgtJIzHI.mjs';
import { manifest } from './manifest_C7L7KGHX.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/articles.astro.mjs');
const _page2 = () => import('./pages/briefings.astro.mjs');
const _page3 = () => import('./pages/news.astro.mjs');
const _page4 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["../node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/articles.ts", _page1],
    ["src/pages/briefings.astro", _page2],
    ["src/pages/news.astro", _page3],
    ["src/pages/index.astro", _page4]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "23a97e3f-cbca-433a-8e15-30df133b13a4",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
