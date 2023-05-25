import { walk } from "std/fs/mod.ts";
import * as path from "std/path/mod.ts";
import * as colors from "colors";
import { render } from "markdown/mod.ts";
import {   ImageMagick,
  IMagickImage,
  initialize,
  MagickFormat, } from 'imagemick'

const input = "./src/posts";
const output = "./src/dist";
const imagesUploadPath = "https://www.adictosaltrabajo.com/wp-content/uploads/";

await init();

async function init() {
  await minimizeImages();

  let posts = [];
  for await (const entry of walk(input)) {
    if (entry.isFile) {
      posts.push(entry.path);
    }
  }

  console.log(colors.blue(`Converting ${posts.length} article/s...`));

  await Promise.all(posts.map((x) => convertPost(x)));
  console.log(colors.bgGreen(colors.black("\n DONE ")) + "\n");
}

async function minimizeImages() {
  await initialize();

  for await (const entry of walk(input)) {
    if (entry.isFile) {
      await ImageMagick.read(entry.path, async (img: IMagickImage) => {
        img.resize(200, 100);

        await img.write(
          MagickFormat.Jpeg,
          (data: Uint8Array) => Deno.writeFile("image-blur.jpg", data),
        );
      });
    }
  }
}

function getMediaUploadPath(src: string) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const formattedMonth = month >= 10 ? month : `0${month}`;
  return imagesUploadPath + year + "/" + formattedMonth + "/" +
    path.basename(src);
}

async function convertPost(postPath: string) {
  try {
    console.log(`• ${postPath}`);
    const content = await Deno.readTextFile(postPath);
    console.log(colors.green(`  - Parsed`));
    const parsedContent = render(content);
    console.log(colors.green(`  - Saved`));
    await savePost(postPath, parsedContent);
  } catch (error) {
    console.log(colors.red(`${error}`));
  }
}

async function savePost(file: string, content: string) {
  const filename = path.basename(file);
  const fileOutput = filename.replace(".md", ".html");
  console.log(fileOutput, filename)
  return Deno.writeTextFile(`${output}/${fileOutput}`, content);
}

function escapeHtml(html: string) {
  const lessThanEscaped = html.replace(/</g, "&lt;");
  return lessThanEscaped.replace(/>/g, "&gt;");
}
