import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extractProduct } from '../src/extract-product.mjs';
const html=await readFile(new URL('../evidence/hs01-source.html',import.meta.url),'utf8');
const url='https://brtw-fitness.en.made-in-china.com/product/CrbYNUaKYTcJ/China-Commercial-Grade-Vertical-Chest-Press-for-Gym-Professionals.html';
const data=extractProduct(html,url);
await mkdir(new URL('../public/examples/',import.meta.url),{recursive:true});
await writeFile(new URL('../public/examples/brtw-hs01.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log('Exemplo HS01 gerado a partir do HTML capturado.');
