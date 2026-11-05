import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('dist',{recursive:true});for(const file of ['index.html','styles.css','favicon.svg','service-worker.js','manifest.webmanifest']) copyFileSync(file,`dist/${file}`);
