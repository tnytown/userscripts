// ==UserScript==
// @name        WASM
// @match       *://*/*
// @grant       none
// @require     https://cdn.jsdelivr.net/gh/tnytown/webassemblyjs@fb5ab3b/packages/webassemblyjs/dist/index.min.js
// @run-at      document-start
// @version     1.0
// @author      tnytown
// ==/UserScript==

WebAssembly.compileStreaming = async (resp) => {
  return WebAssembly.compile(await resp.arrayBuffer())
}

unsafeWindow.WebAssembly = WebAssembly
