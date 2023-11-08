const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server);
require("ejs");
const fs = require("fs");
const minify = require("@node-minify/core");
const clean = {
	"CSS": require("@node-minify/clean-css"),
	"JS": require("@node-minify/terser"),
};

const appName = process.env.REPL_SLUG || "Gemkit";
const gameModes = [];
const path = {
	css: "css/",
	js: "js/",
	icon: "images/icon.png",
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
	console.log("New connection");
});

server.listen(port, () => console.log(`Server listening on port ${port}`));