const npmRun = require('npm-run');
const marked = require('marked');
const fs = require('mz/fs');
const colors = require('colors');
const path = require('path');

const input = 'posts';
const output = 'dist';

init();

async function init() {
  await createOutputDirIfNeeded();
  configMarked();

  const postsWithGitkeep = await fs.readdir(input);
  const relativePathPosts = postsWithGitkeep.filter(
    post => post !== '.gitkeep'
  );
  const posts = relativePathPosts.map(post => path.resolve(input, post));
  console.log(`Converting ${posts.length} article/s...`.blue);

  let postsPromise = posts.map(convertPost);
  await Promise.all(postsPromise);
  console.log('\n DONE '.black.bgGreen + '\n');
}

async function createOutputDirIfNeeded() {
  const doesDirExist = await fs.exists(path.resolve(__dirname, output));

  if (!await fs.exists(path.resolve(__dirname, output))) {
    await fs.mkdir(path.resolve(__dirname, output));
    return await fs.writeFile(path.resolve(__dirname, output, '.gitkeep'), '');
  }
}

function configMarked() {
  const myRenderer = new marked.Renderer();

  myRenderer.link = (href, title, text) => {
    let external = /^https?:\/\/.+$/.test(href);
    let newWindow = external || title === 'newWindow';
    let out = `<a href="${href}"`;

    if (newWindow) {
      out += ` target="_blank"`;
    }

    if (title && title !== 'newWindow') {
      out += ` title="${title}"`;
    }

    return (out += `>${text}</a>`);
  };

  marked.setOptions({ renderer: myRenderer });
}

function convertPost(postPath) {
  return fs
    .readFile(postPath, 'utf-8')
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
    `${path.basename(file, '.md')}.html`
  );
  return fs.writeFile(fileOutput, content);
}

async function parseToHtml(content) {
  return marked.parse(content);
}
