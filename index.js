const npmRun = require('npm-run');
const path = require('path');
const marked = require('marked');
const fs = require('fs');
const Promise = require('bluebird');
Promise.promisifyAll(fs);

console.log('Processing posts')
npmRun.exec('./node_modules/.bin/doctoc posts');

console.log('Parsing to hmtl')

async function init() {
  const files = await fs.readdir('./posts');
  files.forEach(file => {
    const content = await fs.readFile(file);
    console.log(content);
  });
}

function parseToHtml(content) {
  return new Promise((resolve, reject) => {
    resolve(marked.parse(content));
  });
}

init();
