// ==UserScript==
// @name        ktdl
// @namespace   tny
// @match       https://kaf.canvas.umn.edu/*
// @match       https://mediaspace.umn.edu/media/*
// @grant       none
// @version     0.0.4
// @author      tny
// ==/UserScript==

const STYLES = `
#ktdl-menu {
  background-color: #ffc107;
  position: fixed;
  padding: 0.25em;
  border-radius: 0 0 0.5em 0;
}


#ktdl-menu > ul {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
}


#ktdl-menu:hover > ul {
  display: block;
}
`;

window.kWidget.addReadyCallback((id) => {
	let kp = document.getElementById(id);
	kp.kBind("mediaReady", () => ready(kp));
});

function modPlayer(ifp) {
	if(ifp.getElementById("ktdl-menu")) return;

	let styles = ifp.createElement("style");
	styles.innerText = STYLES;
	ifp.head.appendChild(styles);

	let kp = ifp.querySelector("#kplayer");
	let srcs = ifp.querySelector("#kplayer").getSources().filter(x => x.mimeType === "video/mp4").map(x => ({
		id: x.assetid,
		size: parseInt(x.sizebytes),
		src: x.src,
		res: `${x.width}x${x.height}`,
	}));

	let ctr = ifp.createElement("div");
	ctr.id = "ktdl-menu";

	let desc = ifp.createElement("span");
	desc.innerText = "download";
	ctr.appendChild(desc);

	let opts = ifp.createElement("ul");
	for(const {id: fid, size, src, res} of srcs) {
		let opt = ifp.createElement("li");
		let link = ifp.createElement("a");

		let m = src.match('/p/([0-9]+).*/entryId/([^/]+)');
		if(!m || m.length < 3) continue;
		let [, pid, eid] = m;

		link.href = `https://cfvod.kaltura.com/pd/p/${pid}/sp/${pid}00/serveFlavor/entryId/${eid}/flavorId/${fid}/fileName/${fid}_${res}.mp4`;
		link.innerText = `${res} (${(size / 1024 / 1024).toFixed(2)}M)`;

		opt.appendChild(link);
		opts.appendChild(opt);
	}
	ctr.appendChild(opts);

	ifp.querySelector(".videoHolder").appendChild(ctr);
}

function ready(outerPlayer) {
	let ifps = Array.from(outerPlayer.querySelectorAll("iframe#kplayer_ifp"));
	for(let ifp of ifps) modPlayer(ifp.contentDocument);
}
