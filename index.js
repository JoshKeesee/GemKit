const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server);
require("ejs");
const db = require("@jkeesee/json-db");
db.condense();
const fs = require("fs");
const minify = require("@node-minify/core");
const clean = {
	"CSS": require("@node-minify/clean-css"),
	"JS": require("@node-minify/terser"),
};

const appName = process.env.REPL_SLUG || "Gemkit";
const gameModes = ["classic"];
const path = {
	css: "css/",
	js: "js/",
	icon: "images/icon.png",
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

const render = (req, res) => {
	let p = "index";
	if (req.params.path != "undefined" && req.params.path != "" && req.params.path) p = req.params.path;
	try {
		res.sendFile(p);
	} catch (e) {
		try {
			res.render(p, {
				icon: path.icon,
				appName,
				gameModes,
				header: req.body.header || true,
		 });
		} catch (e) {
			p = "error";
			res.render(p, {
				icon: path.icon,
				appName,
				gameModes,
				header: false,
			});
		}
	}
};

app.get("/", render);
app.post("/", render);
app.get("/:path", render);
app.post("/:path", render);

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
		callback: () => console.log(type + " Minified"),
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