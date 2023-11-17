require("ejs");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server);
const db = require("@jkeesee/json-db");
db.condense();
const fs = require("fs");
const { resolve } = require("path");
const minify = require("@node-minify/core");
const bcrypt = require("bcrypt");
const clean = {
	"CSS": require("@node-minify/clean-css"),
	"JS": require("@node-minify/terser"),
};
const pages = [];

const User = {
	create(id, email, password, other) {
		this.id = id;
		this.email = email;
		this.password = password ? bcrypt.hashSync(password, 10) : null;
		Object.keys(other).forEach(k => this[k] = other[k]);
	},
	get(id) {
		const users = db.get("users") || {};
		return users[id];
	},
	checkEmail(u, e) { return u.email == e },
	checkPassword(u, p) { return bcrypt.compareSync(p, u.password) },
	forgotPassword() {},
};


function* getFiles(dir) {
	const dirents = fs.readdirSync(dir, { withFileTypes: true });
	for (const dirent of dirents) {
		const res = resolve(dir, dirent.name);
		if (dirent.isDirectory()) yield* getFiles(res);
		else yield res;
	}
}

for (const file of getFiles("./public/pages")) !file.includes("templates") ? pages.push(file.split("pages/")[1].replace(".ejs", "")) : "";

const appName = process.env.REPL_SLUG || "Gemkit";
const gameModes = ["classic"];
const path = {
	css: "css/",
	js: "js/",
	icon: "/../images/icon.png",
};

const generateGamecode = () => {
	const chars = "0123456789";
	let code = "";
	for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
	return code;
};

const gc = generateGamecode();
console.log(gc)

const rooms = {
	[gc]: {
		host: null,
		players: {},
		gamecode: gc,
		gameMode: gameModes[0],
		started: false,
		ended: false,
	},
};

app.set("views", "./public/pages");
app.set("view engine", "ejs");
app.use(express.static("./public"));
app.use(bodyParser.json());
app.use(cookieParser());
app.use((req, res, next) => {
	const id = req.cookies["id"];
	if (id) req.user = User.get(id);
	else req.user = null;
	next();
});

const render = (req, res) => {
	let p = "index", f = req.params.folder;
	if (req.params.path != "undefined" && req.params.path != "" && req.params.path) p = req.params.path;
	if (f != "undefined" && f != "" && f) p = f + "/" + p;
	try {
		res.sendFile(p);
	} catch (e) {
		const gameurls = ["player", "game", "play"];
		const accounturls = ["email", "password"];
		const meurls = ["me", "kits", "assignments", "classes"];
		const userurls = meurls.concat(["creative", "rewards"]);
		const darkurls = ["creative", "rewards", "rewards/locker", "rewards/season-ticket", "rewards/shop"];
		if (userurls.includes(p) && !req.user) return res.status(201).redirect("/login");
		if (gameurls.includes(p) && req.body.header) return res.status(201).redirect("/join");
		if (!userurls.includes(p) && !gameurls.includes(p) && p != "join" && p != "error" && f != "rewards" && req.user) return res.status(201).redirect("/me");
		if (accounturls.includes(p)) {
			const data = {};
			const users = db.get("users") || {};
			data.exists = !Object.keys(users).some(k => {
				const u = users[k];
				if (User.checkEmail(u, req.body.email)) return true;
				return false;
			});
			if (p == accounturls[0]) {
				const em = req.body.email;
				if (!em) return res.json({ error: "Email is required." });
				let id = Object.keys(users).length;
				if (data.exists) users[id] = User.create(id, em, null, { newUser: true });
				else id = Object.keys(users).find(k => User.checkEmail(users[k], em));
				data.user = users[id];
			} else if (p == accounturls[1]) {
				const pa = req.body.password;
				if (!pa) return res.json({ error: "Password is required." });
				const em = req.body.email;
				if (!em) return res.json({ error: "Email is required." });
				const id = Object.keys(users).find(k => User.checkEmail(users[k], em));
				if (!id) return res.json({ error: "Email not found." });
				const user = User.get(id);
				if (user.newUser) {
					user.password = bcrypt.hashSync(pa, 10);
					user.newUser = false;
				} else if (!User.checkPassword(user, pa)) return res.json({ error: "Password is incorrect." });
				data.user = user;
				res.cookie("id", user.id, { maxAge: 9999999999999, expires: new Date(Date.now() + 9999999999999) });
			}
			db.set({ users });
			return res.json(data);
		}
		const account = req.user || false;
		if (account) delete account.password;
		if (pages.includes(p)) res.render(p, {
			icon: path.icon,
			appName,
			gameModes,
			header: req.body.header || true,
			navbar: meurls.includes(p) || p.includes("rewards"),
			account,
			status: "green",
			url: p,
			dark: darkurls.includes(p),
		});
		else res.status(201).redirect("/error");
	}
};

app.get("/", render);
app.post("/", render);
app.get("/:path", render);
app.post("/:path", render);
app.get("/:folder/:path", render);
app.post("/:folder/:path", render);

const compile = (dir, output, type) => {
	let compressed = "";
	const p = "./public/" + dir;
	const filenames = fs.readdirSync(p);
	filenames.forEach(f => {
		const c = fs.readFileSync(p + f, "utf8");
		compressed += c;
	});
	fs.writeFileSync("./public/" + output, compressed);
	minify({
		compressor: clean[type],
		input: "./public/" + output,
		output: "./public/" + output,
		callback: () => console.log(type + " minified (public/" + output + ")"),
	});
};

compile(path.css, "min.css", "CSS");
compile(path.js, "min.js", "JS");

io.on("connection", socket => {
	const user = { room: null, name: null, host: false };
	
	socket.on("hostGame", (data, cb) => {
		if (user.room) return;
		const gamecode = generateGamecode();
		user.host = true;
		user.room = gamecode;
		socket.join(gamecode);
		rooms[gamecode] = {
			host: socket.id,
			players: {},
			gamecode,
			gameMode: data.mode || gameModes[0],
			started: false,
			ended: false,
		};
		console.log(rooms[gamecode]);
		cb(rooms[gamecode]);
	});

	socket.on("joinGame", (data, cb) => {
		const name = data.name;
		if (!name || !user.room) return;
		user.name = name;
		socket.join(user.room);
		rooms[user.room].players[socket.id] = user;
		socket.to(rooms[user.room].host).emit("playerJoin", {
			name: user.name,
			id: socket.id,
		});
		cb(rooms[user.room]);
	});

	socket.on("checkGamecode", (data, cb) => {
		const gamecode = data.gamecode;
		if (!rooms[gamecode]?.ended) {
			user.room = gamecode;
			cb(rooms[gamecode]);
		} else {
			user.room = user.name = null;
			cb(false);
		}
	});
});

server.listen(port, () => console.log(`Server listening on port ${port}`));