const npmRun = require('npm-run');
const marked = require('marked');
const fs = require('mz/fs');
const colors = require('colors');
const { basename, resolve } = require('path');

async function init() {
  const path = './posts';
  const files = await fs.readdir(path);
  console.log(`Converting ${files.length} article/s`.bold);
  console.log('Generating indexes...'.blue);
  await generateIndexes();
  console.log('Indexes generated', 'succesfully'.green);

  files.forEach(async (file) => {

    try {
      const content = await fs.readFile(resolve(path, file), 'utf-8');
      const parsedContent = await parseToHtml(content);
      console.log(`Parsed file ${file}`);

      if (await !fs.exists('./dist')) {
        fs.mkdir('./dist');
      }

      const fileOutput = resolve(__dirname, 'dist', `${basename(file, '.md')}.html`);
      fs.writeFile(fileOutput, parsedContent)
      .then(() => {
        console.log(`Parsed file ${file}`);
      })
      .catch((e) => {
        console.log(`Couldn't write ${file} to disk`);
      });

    } catch (error) {
      console.error(error);
    }
  });
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
