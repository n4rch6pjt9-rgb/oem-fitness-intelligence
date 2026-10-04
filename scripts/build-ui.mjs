import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
try{loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir('public/assets',{recursive:true});
// Only these two public values may enter the browser bundle.
const define=Object.fromEntries(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].map(name=>[`import.meta.env.${name}`,JSON.stringify(process.env[name]??'')]));
await build({entryPoints:['./ui/main.tsx'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'public/assets/example.js',tsconfig:'tsconfig.json',define});
await build({entryPoints:['./ui/vocabulary.ts'],bundle:true,minify:true,format:'esm',target:'es2022',outfile:'public/assets/vocabulary.js'});
