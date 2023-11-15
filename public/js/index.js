let loading = false, socket, email;

const redirect = async e => {
	if (typeof e == "object") e.preventDefault();
	if (loading) return;
	const url = typeof e != "object" ? e : e.target.href ? e.target.href : e.target.parentElement.href;
	if (window.location.href == url) return;
	loading = true;
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
	const p = url.replaceAll("/", " ").replace("signup", "sign up");
	const d = p.replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
	document.title = window.location.pathname == "/me" || window.location.pathname == "/kits" ? "Dashboard | " + appName : window.location.pathname == "/join" ? "Play " + appName + "! - Enter game code here | " + appName : d && p != " " ? d + " | " + appName : url.split("?")[0].endsWith("/") ? appName + " - live learning game show" : appName;
}

const validateEmail = e => {
	return String(e)
		.toLowerCase()
		.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

const login = async e => {
	if (document.querySelector("#continue").classList.contains("disabled")) return;
	const password = document.querySelector("#password").value;
	if (!validateEmail(email) || !password) return;
	const data = await fetch("/password", {
		method: "POST",
		body: JSON.stringify({ email, password }),
		headers: {
			"Content-Type": "application/json",
		},
	});
	const ac = await data.json();
	if (ac.error) return alert(ac.error);
	redirect("/me");
};

const signupOrLogin = async e => {
	if (document.querySelector("#continue").classList.contains("disabled")) return;
	const em = document.querySelector("#email");
	if (!validateEmail(em.value)) return;
	email = em.value;
	const data = await fetch("/email", {
		method: "POST",
		body: JSON.stringify({ email }),
		headers: {
			"Content-Type": "application/json",
		},
	});
	const ac = await data.json();
	if (ac.error) return alert(ac.error);
	em.id = "password";
	em.type = "password";
	em.placeholder = "Password";
	em.value = "";
	const c = document.querySelector("#continue");
	const p = document.querySelector("#password");
	p.oninput = () => {
		if (p.value.length) c.classList.remove("disabled");
		else c.classList.add("disabled");
	};
	p.onkeyup = e => (e.key == "Enter") ? login() : "";
	c.onclick = login;
	c.innerText = window.location.pathname == "/signup" ? "Sign Up" : "Login";
	c.classList.add("disabled");
	document.querySelector("h3").innerText = "Enter Your Password...";
	document.querySelector("#google-cont").remove();
};

const updateLogin = () => {
	if (window.location.pathname != "/login" && window.location.pathname != "/signup") return;
	const c = document.querySelector("#continue");
	const em = document.querySelector("#email");
	em.oninput = e => {
		const em = validateEmail(e.target.value);
		if (em) c.classList.remove("disabled");
		else c.classList.add("disabled");
	};
	em.onkeyup = e => (e.key == "Enter") ? signupOrLogin() : "";
	c.onclick = signupOrLogin;
};

let gamecode = false;

const setupCanvas = d => {
	const ctx = d.getContext("2d");
	const colors = {
		erase: "#52b757",
		draw: "#1d2d35",
		default: "#ffffff",
	};
	const c0 = document.querySelector("#color-0"), c1 = document.querySelector("#color-1"), pe = document.querySelector("#pen"), ma = document.querySelector("#marker"), er = document.querySelector("#eraser");
	c0.querySelector(".color").style.background = colors.draw;
	c1.querySelector(".color").style.background = colors.default;
	const pen = { x: 0, y: 0, click: false, curr: colors.draw, w: 10, h: 10 };
	const pctx = document.querySelector("#pen-c").getContext("2d");
	d.width = screen.width;
	d.height = screen.height;
	pctx.canvas.width = screen.width;
	pctx.canvas.height = screen.height;
	window.onresize = () => {
		d.width = screen.width;
		d.height = screen.height;
	};
	c0.onclick = () => {
		c0.classList.add("toggled");
		c1.classList.remove("toggled");
		if (pen.curr == colors.erase) {
			pen.w = pen.h = 10;
			er.classList.remove("toggled");
			pe.classList.add("toggled");
		}
		pen.curr = colors.draw;
	};
	c1.onclick = () => {
		c1.classList.add("toggled");
		c0.classList.remove("toggled");
		if (pen.curr == colors.erase) {
			pen.w = pen.h = 10;
			er.classList.remove("toggled");
			pe.classList.add("toggled");
		}
		pen.curr = colors.default;
	};
	pe.onclick = () => {
		pe.classList.add("toggled");
		ma.classList.remove("toggled");
		er.classList.remove("toggled");
		pen.w = pen.h = 10;
		if (pen.curr == colors.erase) {
			pen.curr = colors.draw;
			c0.classList.add("toggled");
		}
	};
	ma.onclick = () => {
		ma.classList.add("toggled");
		pe.classList.remove("toggled");
		er.classList.remove("toggled");
		pen.w = pen.h = 15;
		if (pen.curr == colors.erase) {
			pen.curr = colors.draw;
			c0.classList.add("toggled");
		}
	};
	er.onclick = () => {
		er.classList.add("toggled");
		pe.classList.remove("toggled");
		ma.classList.remove("toggled");
		c0.classList.remove("toggled");
		c1.classList.remove("toggled");
		pen.w = pen.h = 18;
		pen.curr = colors.erase;
	};
	let a, b;
	const handleMouseMove = e => {
		if (b) b = structuredClone(pen);
		pen.x = e.touches ? e.touches[0].clientX : e.clientX;
		pen.y = e.touches ? e.touches[0].clientY : e.clientY;
		pctx.clearRect(0, 0, pctx.canvas.width, pctx.canvas.height);
		pctx.beginPath();
		pctx.fillStyle = pen.curr;
		pctx.arc(pen.x, pen.y, pen.w, 0, 2 * Math.PI);
		pctx.fill();
		pctx.closePath();
		if (pen.y > window.innerHeight - 95) return pen.click = b = false;
		a = pen;
		if (!pen.click) return;
		if (!b) b = structuredClone(pen);
		ctx.beginPath();
		ctx.strokeStyle = a.curr;
		ctx.lineWidth = a.w * 2;
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(b.x, b.y);
		ctx.stroke();
		ctx.closePath();
		ctx.beginPath();
		ctx.fillStyle = a.curr;
		ctx.arc(a.x, a.y, a.w, 0, 2 * Math.PI);
		ctx.fill();
		ctx.closePath();
	};
	d.onmousemove = d.ontouchmove = handleMouseMove;
	d.onmousedown = d.ontouchstart = () => {
		pen.click = true;
		ctx.beginPath();
		ctx.fillStyle = pen.curr;
		ctx.arc(pen.x, pen.y, pen.w, 0, 2 * Math.PI);
		ctx.fill();
		ctx.closePath();
	};
	d.onmouseup = d.ontouchend = () => {
		pen.click = b = false;
		ctx.beginPath();
		ctx.fillStyle = pen.curr;
		ctx.arc(pen.x, pen.y, pen.w, 0, 2 * Math.PI);
		ctx.fill();
		ctx.closePath();
	};
};

const checkGamecodeOrUsername = () => {
	const g = document.querySelector("#game-code");
	if (g.value.length == 0) return;
	const f = document.querySelector("#form");
	if (gamecode) {
		const name = g.value;
		if (socket) socket.emit("joinGame", { name }, room => {
			f.style.transform = "scale(0.95)";
			f.style.opacity = 0;
			setTimeout(async () => {
				const data = await fetch("/player", {
					method: "POST",
					body: JSON.stringify({ header: false }),
					headers: {
						"Content-Type": "application/json",
					},
				});
				document.body.innerHTML = await data.text();
				const c = document.querySelector("#cont");
				c.onclick = e => {
					c.style.display = "none";
					document.querySelector("#draw-dock").style.display = "flex";
					const d = document.querySelector("#draw");
					setupCanvas(d);
				};
			}, 500);
		});
	} else {
		if (socket) socket.emit("checkGamecode", { gamecode: g.value }, val => {
			if (!val) return;
			gamecode = g.value;
			f.style.transform = "scale(0.95)";
			f.style.opacity = 0;
			setTimeout(() => {
				g.blur();
				g.value = "";
				g.type = "text";
				g.placeholder = "Your Name";
				f.style = "";
			}, 500);
		});
	}
};

const updateJoin = () => {
	if (window.location.pathname != "/join") return document.querySelector("meta[name='theme-color']").setAttribute("content", "#000000");
	socket = io();
	gamecode = false;
	document.querySelector("#join-game").onclick = () => checkGamecodeOrUsername();
	document.querySelector("#game-code").onkeyup = e => e.key == "Enter" ? checkGamecodeOrUsername() : "";
	document.querySelector("meta[name='theme-color']").setAttribute("content", "#4252af");
	const q = window.location.search;
	const params = new URLSearchParams(q);
	const gc = params.get("gc");
	if (gc) {
		document.querySelector("#game-code").value = gc;
		checkGamecodeOrUsername();
	}
};

const update = () => {
	document.querySelectorAll("a").forEach(e => e.onclick = redirect);
	document.querySelectorAll("#menu svg").forEach(e => e.onclick = toggleMenu);
	document.querySelectorAll("#close-menu").forEach(e => e.onclick = toggleMenu);
	document.querySelectorAll(".menu-bg").forEach(e => e.onclick = toggleMenu);
	updateLogin();
	updateJoin();
};

const toggleMenu = () => {
	const m = document.querySelector("#nav.menu");
	m.classList.toggle("toggled");
};

window.onload = () => update();
window.onpopstate = () => {
	redirect(document.referrer);
};

updateURL(window.location.pathname, false);