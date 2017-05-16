const npmRun = require('npm-run');
const path = require('path');
const marked = require('marked');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

console.log('Processing posts')
npmRun.exec('./node_modules/.bin/doctoc posts');
console.log('Parsing to hmtl')

function init() {
  const files = fs.readdirSync('./posts');
  console.log(files)
  files.forEach((file) => {
    const content = fs.readFileSync(file);
    parseToHtml(content);
  });
}

function parseToHtml(content) {
  return new Promise((resolve, reject) => {
    resolve(marked.parse(content));
  });
}

init();
