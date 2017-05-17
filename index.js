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

  await convertPosts(posts);
  console.log(' DONE '.black.bgGreen);
  console.log('');
}

function convertPosts(posts) {
  return new Promise((resolve, reject) => {
    posts.forEach(async (post) => {
      try {
        console.log(`• ${post}`);

        const content = await fs.readFile(path.resolve(input, post), 'utf-8');
        const parsedContent = await parseToHtml(content);
        console.log(`  - Parsed`.green);

        await writePost(post, parsedContent);
        console.log(`  - Saved`.green);
        console.log('');
        resolve();
      } catch (error) {
        reject(error.red);
      }
    });
  });
}

async function writePost(file, content) {
  const fileOutput = path.resolve(__dirname, output, `${path.basename(file, '.md')}.html`);
  return fs.writeFile(fileOutput, content);
}

function parseToHtml(content) {
  return new Promise((resolve, reject) => {
    resolve(marked.parse(content));
  });
}

function generateIndexes() {
  return new Promise((resolve, reject) => {
    npmRun.exec('./node_modules/.bin/doctoc posts', () => {
      resolve();
    });
  });
}

init();
