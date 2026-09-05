const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const www = path.join(root, "www");

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) rimraf(p);
    else fs.unlinkSync(p);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

fs.mkdirSync(www, { recursive: true });
for (const name of fs.readdirSync(www)) {
  const p = path.join(www, name);
  if (fs.statSync(p).isDirectory()) rimraf(p);
  fs.rmSync(p, { recursive: true, force: true });
}

copyFile(path.join(root, "index.html"), path.join(www, "index.html"));
copyDir(path.join(root, "css"), path.join(www, "css"));
copyDir(path.join(root, "js"), path.join(www, "js"));
console.log("www/ synced from index.html, css/, js/");
