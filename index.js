import 'colors'
import npmRun from 'npm-run'
import { marked } from 'marked'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import imagemin from 'imagemin'
import imageminJpegtran from 'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import imageminGifsicle from 'imagemin-gifsicle'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const input = 'posts'
const output = 'dist'
const imagesUploadPath = 'https://www.adictosaltrabajo.com/wp-content/uploads/'

init()

async function init() {
  configMarked()
  await generateIndexes()
  await minimizeImages()
  await minimizeGifs()

  const postsWithGitkeep = await fs.readdir(input)
  const relativePathPosts = postsWithGitkeep.filter(post => post !== '.gitkeep')
  const posts = relativePathPosts.map(post => path.resolve(input, post))
  console.log(`Converting ${posts.length} article/s...`.blue)

  let postsPromise = posts.map(convertPost)
  await Promise.all(postsPromise)
  console.log('\n DONE '.black.bgGreen + '\n')
}

function configMarked() {
  const myRenderer = new marked.Renderer()

  generateAnchors(myRenderer)

  myRenderer.link = (href, title, text) => {
    const external = /^https?:\/\/.+$/.test(href)
    const newWindow = external || title === 'newWindow'
    let out = `<a href="${href}"`

    if (newWindow) {
      out += ` target="_blank"`
    }

    if (title && title !== 'newWindow') {
      out += ` title="${title}"`
    }

    return (out += `>${text}</a>`)
  }

  myRenderer.code = (code, language) => {
    return `<pre><code class="lang-${language}">${escapeHtml(code.trim())}</code></pre>`
  }

  myRenderer.codespan = code => {
    return `<strong>${code}</strong>`
  }

  myRenderer.image = (href, title, text) => {
    let out = `<img `

    if (title) {
      out += ` title="${title}" `
    }

    const src = getMediaUploadPath(href)
    out += `src="${src}" alt="${text}">`
    return out
  }

  marked.setOptions({ renderer: myRenderer, mangle: false,headerIds: false })
}

function generateAnchors(renderer) {
  renderer.heading = (text, level) => {
    const escapedText = encodeURIComponent(text.toLowerCase()).replace(/%20/g, '+')

    return `
          <h${level}>
            <a name="${escapedText}" href="#${escapedText}"></a>
            ${text}
          </h${level}>`
  }
}

function getMediaUploadPath(src) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const formattedMonth = month >= 10 ? month : `0${month}`
  return imagesUploadPath + year + '/' + formattedMonth + '/' + path.basename(src)
}

function convertPost(postPath) {
  return fs
    .readFile(postPath, 'utf-8')
    .then(content => {
      console.log(`• ${path.basename(postPath)}`)
      console.log(`  - Parsed`.green)
      return parseToHtml(content)
    })
    .then(parsedContent => {
      console.log(`  - Saved`.green)
      savePost(postPath, parsedContent)
    })
    .catch(error => console.log(error.red))
}

async function savePost(file, content) {
  const fileOutput = path.resolve(__dirname, output, `${path.basename(file, '.md')}.html`)
  return fs.writeFile(fileOutput, content)
}

async function parseToHtml(content) {
  return marked.parse(content)
}

function generateIndexes() {
  return new Promise(resolve => {
    console.log('Generating indexes...'.blue)
    npmRun.exec('./node_modules/.bin/doctoc --title "## Índice" posts', () => {
      console.log('Indexes generated', 'succesfully'.green + '\n')
      resolve()
    })
  })
}

function minimizeImages() {
  console.log('Minimizing images...'.blue)
  return imagemin(['./imgs/**/*.{jpg,png}'], './dist/imgs', {
    plugins: [imageminJpegtran(), imageminPngquant({ quality: '65-80' })],
  }).then(images => {
    console.log(`Minimized ${images.length} images` + ' succesfully'.green + '\n')
    return
  })
}

function minimizeGifs() {
  console.log('Minimizing gifs...'.blue)
  return imagemin(['./imgs/**/*.gif'], './dist/imgs', {
    optimizationLevel: 3,
    use: [imageminGifsicle()],
  }).then(images => {
    console.log(`Minimized ${images.length} images` + ' succesfully'.green + '\n')
  })
}

function escapeHtml(html) {
  const lessThanEscaped = html.replace(/</g, '&lt;')
  return lessThanEscaped.replace(/>/g, '&gt;')
}
