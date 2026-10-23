'use strict';
const fs=require('node:fs'),path=require('node:path');
function applyStudioV17(source){
 const steps=JSON.parse(fs.readFileSync(path.join(__dirname,'studio_v17_patches.json'),'utf8'));
 for(const {label,before,after} of steps){
  const i=source.indexOf(before);
  if(i<0||i!==source.lastIndexOf(before))throw Error('Studio Paniko V1.7: patch missing or duplicated: '+label);
  source=source.replace(before,after);
 }
 if(!source.includes('id="qpl-v17-design"')){
  const css=fs.readFileSync(path.join(__dirname,'studio_v17.css'),'utf8');
  source=source.replace('</head>','<style id="qpl-v17-design">\n'+css+'\n</style></head>');
 }
 source=source.replace(/<title>Quiz Panic Live[^<]*<\/title>/,'<title>Quiz Panic Live — Studio Paniko · V1.7</title>');
 console.log('Quiz Panic V1.7: redesigned home, editor, 12 silhouettes, 8640 looks');
 return source;
}
module.exports={applyStudioV17};
