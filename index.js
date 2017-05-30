const npmRun = require("npm-run");
const marked = require("marked");
const fs = require("mz/fs");
const colors = require("colors");
const path = require("path");

const input = "./posts";
const output = "./dist";

async function init() {
  if (await !fs.exists(`./${output}`)) {
    fs.mkdir(`${output}`);
  }

  configMarked();

  try {
    await generateIndexes();
  } catch (error) {
    console.log(`Couldn't generate indexes. Error: ${error}`.red);
  }

  const postsWithGitkeep = await fs.readdir(input);
  const relativePathPosts = postsWithGitkeep.filter(
    post => post !== ".gitkeep"
  );
  const posts = relativePathPosts.map(post => path.resolve(input, post));
  console.log(`Converting ${posts.length} article/s...`.blue);

  let postsPromise = posts.map(convertPost);
  await Promise.all(postsPromise);
  console.log("");
  console.log(" DONE ".black.bgGreen);
  console.log("");
}

function convertPost(postPath) {
  return fs
    .readFile(postPath, "utf-8")
    .then(content => {
      console.log(`• ${path.basename(postPath)}`);
      console.log(`  - Parsed`.green);
      return parseToHtml(content);
    })
    .then(parsedContent => {
      console.log(`  - Saved`.green);
      savePost(postPath, parsedContent);
    })
    .catch(error => console.log(error.red));
}

async function savePost(file, content) {
  const fileOutput = path.resolve(
    __dirname,
    output,
    `${path.basename(file, ".md")}.html`
  );
  return fs.writeFile(fileOutput, content);
}

async function parseToHtml(content) {
  return marked.parse(content);
}

function generateIndexes() {
  return new Promise((resolve, reject) => {
    console.log("Generating indexes...".blue);
    npmRun.exec("./node_modules/.bin/doctoc posts", () => {
      console.log("Indexes generated", "succesfully".green);
      console.log("");
      resolve();
    });
  });
}

function configMarked() {
  const myRenderer = new marked.Renderer();

  myRenderer.link = (href, title, text) => {
    let external = /^https?:\/\/.+$/.test(href);
    let newWindow = external || title === "newWindow";
    let out = `<a href="${href}"`;

    if (newWindow) {
      out += ` target="_blank"`;
    }

    if (title && title !== "newWindow") {
      out += ` title="${title}"`;
    }

    return (out += `>${text}</a>`);
  };

  marked.setOptions({ renderer: myRenderer });
}

init();
