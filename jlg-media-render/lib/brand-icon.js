'use strict';
const zlib=require('node:zlib');
const SIZE=[180,192,512];
function dist(px,py,ax,ay,bx,by){let dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-ax-t*dx,py-ay-t*dy)}
function tri(px,py,a,b,c){const cross=(x,y,u,v)=>x*v-y*u;let s1=cross(b[0]-a[0],b[1]-a[1],px-a[0],py-a[1]),s2=cross(c[0]-b[0],c[1]-b[1],px-b[0],py-b[1]),s3=cross(a[0]-c[0],a[1]-c[1],px-c[0],py-c[1]);return(s1>=0&&s2>=0&&s3>=0)||(s1<=0&&s2<=0&&s3<=0)}
function pixel(x,y){
 // Values normalized to [0,1] to retain visual balance at every screen size.
 let q=Math.max(Math.abs(x-.5),Math.abs(y-.5)),radius=.20;
 let cornerX=Math.max(Math.abs(x-.5)-(.5-radius),0),cornerY=Math.max(Math.abs(y-.5)-(.5-radius),0);
 if(Math.hypot(cornerX,cornerY)>radius)return [0,0,0,0];
 const navy=[6,25,43,255],white=[252,255,255,255],teal=[3,212,204,255];
 // "J" geometry, drawn with rounded strokes rather than a small-font glyph.
 const j=[
  [.66,.29,.58,.64,.065],
  [.58,.64,.51,.70,.068],
  [.51,.70,.35,.70,.065],
  [.35,.70,.25,.61,.058],
  [.34,.28,.68,.28,.062]
 ];
 if(j.some(a=>dist(x,y,a[0],a[1],a[2],a[3])<a[4]/2))return white;
 // Three newspaper lines on the right hand side.
 if([[.64,.44,.79,.44],[.62,.52,.79,.52],[.60,.60,.79,.60]].some(a=>dist(x,y,...a)<.018))return white;
 // Teal corner is an unmistakable tab of the folded newspaper.
 if(tri(x,y,[.74,.17],[.86,.31],[.74,.32]))return teal;
 // Minimal curved underline motif; slight upward bow.
 let arc=.79-.045*(1-Math.pow((x-.51)/.34,2));
 if(x>.17&&x<.85&&Math.abs(y-arc)<.011)return teal;
 return navy;
}
let crcTable=null;
function crc(buf){if(!crcTable){crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?(0xedb88320^(c>>>1)):c>>>1;return c>>>0})}let c=0xffffffff;for(const v of buf)c=crcTable[(c^v)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),b=Buffer.concat([t,data]);n.writeUInt32BE(data.length);const c=Buffer.alloc(4);c.writeUInt32BE(crc(b));return Buffer.concat([n,b,c])}
const cache=new Map();
function png(size){
 if(!SIZE.includes(size))throw Error('Unsupported icon size');
 if(cache.has(size))return cache.get(size);
 const rows=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++){let off=y*(size*4+1);rows[off]=0;for(let x=0;x<size;x++){
  const color=pixel((x+.5)/size,(y+.5)/size),i=off+1+x*4;
  rows[i]=color[0];rows[i+1]=color[1];rows[i+2]=color[2];rows[i+3]=color[3];
 }}
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 const buf=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 cache.set(size,buf);return buf;
}
module.exports={png,pixel,SIZE};
