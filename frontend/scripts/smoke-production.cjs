"use strict";
const {spawn}=require("node:child_process");
const path=require("node:path");
const port=3197;
const proc=spawn(path.resolve(__dirname,"../node_modules/.bin/next"),["start","-p",String(port)],{
  cwd:path.resolve(__dirname,".."),stdio:"ignore",detached:true
});
async function route(url,label){
  for(let n=0;n<40;n++){
    if(proc.exitCode!==null)throw new Error("Next server exited before smoke test.");
    try {
      const resp=await fetch("http://127.0.0.1:"+port+url);
      const html=await resp.text();
      if(resp.ok && html.toLowerCase().includes(label.toLowerCase()))return;
      if(n===39)throw new Error(url+" returned invalid page");
    }catch(err){if(n===39)throw err;}
    await new Promise(resolve=>setTimeout(resolve,350));
  }
}
(async()=>{
  try{
    await route("/","MindCare");
    await route("/analysis","Model Analysis");
    await route("/research","Dataset, Methodology");
    console.log("Production SSR routes PASSED.");
  }finally{try{process.kill(-proc.pid,"SIGTERM");}catch{}}
})().catch(error=>{console.error(error);process.exitCode=1;});
