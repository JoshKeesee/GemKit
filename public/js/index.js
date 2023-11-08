let loading = false;

const redirect = async e => {
	e.preventDefault();
	if (loading) return;
	loading = true;
	const url = e.target.href;
	const ti = setTimeout(() => window.location.href = url, 5000);
	const data = await fetch(url, {
		method: "POST",
		body: JSON.stringify({ header: false }),
		headers: {
			"Content-Type": "application/json",
		},
	});
	clearTimeout(ti);
	document.body.innerHTML = await data.text();
	document.querySelectorAll("a").forEach(e => e.onclick = redirect);
	const p = (url || "/").replace(window.location.origin, "");
	updateURL(p, true);
	update();
	loading = false;
};

const updateURL = (url, set) => {
	if (set) window.history.pushState({}, "", url);
	const p = url.replaceAll("/", "").replace("signup", "sign up");
	const d = p.replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
	document.title = window.location.pathname == "/join" ? "Play " + appName + "! Enter game code here | " + appName : d ? d + " | " + appName : url.split("?")[0].endsWith("/") ? appName + " - live learning game show" : appName;
}

const validateEmail = e => {
	return String(e)
		.toLowerCase()
		.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

const signupOrLogin = e => {
	if (e.target.classList.contains("disabled")) return;
	const em = document.querySelector("#email");
	if (!validateEmail(em.value)) return;
};

const updateLogin = () => {
	if (window.location.pathname != "/login" && window.location.pathname != "/signup") return;
	const c = document.querySelector("#continue");
	document.querySelector("#email").oninput = e => {
		const em = validateEmail(e.target.value);
		if (em) c.classList.remove("disabled");
		else c.classList.add("disabled");
	};
	c.onclick = signupOrLogin;
};

let gamecode = false;

const checkGamecodeOrUsername = e => {
	const g = document.querySelector("#game-code");
	if (g.value.length == 0) return;
	const f = document.querySelector("#form");
	if (gamecode) {
		const username = g.value;
	} else {
		gamecode = g.value;
		f.style.transform = "scale(0.95)";
		f.style.opacity = 0;
		setTimeout(() => {
			g.value = "";
			g.type = "text";
			g.placeholder = "Name";
			f.style = "";
		}, 500);
	}
};

const updateJoin = () => {
	if (window.location.pathname != "/join") return;
	gamecode = false;
	document.querySelector("#join-game").onclick = checkGamecodeOrUsername;
	document.querySelector("#game-code").onkeyup = e => e.key == "Enter" ? checkGamecodeOrUsername() : "";
};

const update = () => {
	document.querySelectorAll("a").forEach(e => e.onclick = redirect);
	updateLogin();
	updateJoin();
}

window.onload = () => update();
window.onpopstate = () => {
	window.history.replaceState({}, "", document.referrer);
	window.location = document.referrer;
};

updateURL(window.location.pathname, false);