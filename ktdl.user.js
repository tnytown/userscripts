// ==UserScript==
// @name        ktdl
// @namespace   tny
// @match       https://kaf.canvas.umn.edu/*
// @match       https://mediaspace.umn.edu/media/*
// @match       https://media.pdx.edu/*
// @grant       GM.getValue
// @version     0.0.6
// @author      tny
// ==/UserScript==

// Polyfill for unsafeWindow
window.unsafeWindow || (
	unsafeWindow = (function() {
		var el = document.createElement('p');
		el.setAttribute('onclick', 'return window;');
		return el.onclick();
	}())
);

unsafeWindow.kWidget.addReadyCallback((id) => {
  let kp = document.getElementById(id);
  kp.kBind("mediaReady", () => ready(kp).catch((e) => console.error(e)));
});

async function modPlayer(ifp) {
  if (ifp.getElementById("ktdl-menu")) return;

  let kp = ifp.querySelector("#kplayer");
  let srcs = ifp
    .querySelector("#kplayer")
    .getSources()
    .filter((x) => x.mimeType === "video/mp4")
    .map((x) => ({
      id: x.assetid,
      size: parseInt(x.sizebytes),
      src: x.src,
      res: `${x.width}x${x.height}`,
    }));

  let ctr = ifp.createElement("div");
  ctr.id = "ktdl-menu";
  ctr.classList.add("dropup", "comp", "pull-right", "display-high");

  let desc = ifp.createElement("button");
  desc.classList.add("btn");
  desc.setAttribute("title", "Download Video");
  desc.setAttribute("aria-label", "Download Video");
  desc.setAttribute("aria-haspopup", "true");
  desc.setAttribute("data-show-tooltip", "true");
  desc.setAttribute("tabindex", "2");
  desc.innerHTML = `<i class="icon-download"></i>`;
  ctr.appendChild(desc);

  let opts = ifp.createElement("ul");
  opts.classList.add("dropdown-menu");
  opts.setAttribute("aria-expanded", "false");
  opts.setAttribute("role", "menu");
  opts.setAttribute("aria-labelledby", "Download Video");

  // Toggle menu on click
  desc.addEventListener("click", () => {
    opts.classList.toggle("open");
  });

  for (const { id: fid, size, src, res } of srcs) {
    let opt = ifp.createElement("li");
    let link = ifp.createElement("a");
    link.setAttribute("role", "menuitemcheckbox");
    link.setAttribute("aria-checked", "false");
    link.setAttribute("tabindex", "2.01");

    let m = src.match("/p/([0-9]+).*/entryId/([^/]+)");
    if (!m || m.length < 3) continue;
    let [, pid, eid] = m;

    let scheme = await GM.getValue("scheme", "");
    link.href = `${scheme}https://cfvod.kaltura.com/pd/p/${pid}/sp/${pid}00/serveFlavor/entryId/${eid}/flavorId/${fid}/fileName/${fid}_${res}.mp4`;
    link.innerText = `${res} (${(size / 1024 / 1024).toFixed(2)}M)`;

    opt.appendChild(link);
    opts.appendChild(opt);
  }
  ctr.appendChild(opts);

  ifp.querySelector(".controlsContainer").appendChild(ctr);
}

async function ready(outerPlayer) {
  let ifps = Array.from(outerPlayer.querySelectorAll("iframe#kplayer_ifp"));
  for (let ifp of ifps) await modPlayer(ifp.contentDocument);
}
