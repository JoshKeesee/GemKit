const express = require("express");
const app = express();
const server = require("http").createServer(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server);
require("ejs");

const appName = process.env.REPL_SLUG || "GemKit";
const path = {
	css: "css/",
	js: "js/",
	icon: "icon.png",
};

app.set("views", "./public/pages");
app.set("view engine", "ejs");
app.use(express.static("./public"));

app.get("/", (req, res) => {
	const p = "index";
	res.render(p, {
		css: path.css + p + ".css",
		js: path.js + p + ".js",
		icon: path.icon,
		appName,
	});
});

io.on("connection", socket => {
	console.log("New connection");
});

server.listen(port, () => console.log(`Server listening on port ${port}`));