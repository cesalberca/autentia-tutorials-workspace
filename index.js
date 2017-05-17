const npmRun = require('npm-run');
const marked = require('marked');
const fs = require('mz/fs');
const colors = require('colors');
const { basename, resolve } = require('path');

const path = './posts';
const output = './dist'

async function init() {
  try {
    console.log('Generating indexes...'.blue);
    await generateIndexes();
    console.log('Indexes generated', 'succesfully'.green);
  } catch (error) {
    console.log(`Couldn't generate indexes`);
  }

  const files = await fs.readdir(path);
  console.log(`Converting ${files.length} article/s`.bold);

  files.forEach(async (file) => {
    console.log(`• ${file}`);

    try {
      const content = await fs.readFile(resolve(path, file), 'utf-8');
      const parsedContent = await parseToHtml(content);
      console.log(`\t - Parsed`.green);

      if (await !fs.exists(`./${output}`)) {
        fs.mkdir(`${output}`);
      }

      const fileOutput = resolve(__dirname, output, `${basename(file, '.md')}.html`);
      fs.writeFile(fileOutput, parsedContent)
      .then(() => {
        console.log(`\t - Saved`.green);
      })
      .catch((e) => {
        console.log(`\tCouldn't write ${file} to disk`.red);
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
