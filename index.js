const npmRun = require('npm-run');
const marked = require('marked');
const fs = require('mz/fs');
const colors = require('colors');
const path = require('path');

const input = './posts';
const output = './dist'

async function init() {
  if (await !fs.exists(`./${output}`)) {
    fs.mkdir(`${output}`);
  }

  try {
    console.log('Generating indexes...'.blue);
    await generateIndexes();
    console.log('Indexes generated', 'succesfully'.green);
    console.log('');
  } catch (error) {
    console.log(`Couldn't generate indexes`);
  }

  const posts = await fs.readdir(input);
  console.log(`Converting ${posts.length} article/s...`.blue);

  let postsPromise = posts.map(convertPost);
  await Promise.all(postsPromise);
  console.log(' DONE '.black.bgGreen);
  console.log('');
}

function convertPost(post) {
  return new Promise((resolve, reject) => {

    fs.readFile(path.resolve(input, post), 'utf-8')
    .then(content => {
      console.log(`• ${post}`);
      console.log(`  - Parsed`.green);
      return parseToHtml(content)
    })
    .then(parsedContent => {
      console.log(`  - Saved`.green);
      console.log('');
      saveParsedPost(post, parsedContent)
      resolve()
    });
  });
}

async function saveParsedPost(file, content) {
  const fileOutput = path.resolve(__dirname, output, `${path.basename(file, '.md')}.html`);
  return fs.writeFile(fileOutput, content);
}

async function parseToHtml(content) {
  return marked.parse(content);
}

function generateIndexes() {
  return new Promise((resolve, reject) => {
    npmRun.exec('./node_modules/.bin/doctoc posts', () => {
      resolve();
    });
  });
}

function makeLinksTargetBlank() {
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

    return out += `>${text}</a>`;
  };
}

init();
