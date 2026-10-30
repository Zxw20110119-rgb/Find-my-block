const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
test('Pages export keeps all resources under the repository subpath and exports notices without the removed login module',()=>{
  const root=path.join(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'fmb-pages-'));
  try{
    execFileSync(process.execPath,[path.join(root,'scripts/export-pages.mjs'),output]);
    const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
    for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)){
      const url=match[1];if(/^(?:https?:|data:)/.test(url))continue;
      assert.ok(!url.startsWith('/'),'Root-relative resource '+url);assert.ok(fs.existsSync(path.join(output,url)),'Missing '+url);
    }
    assert.ok(html.indexOf('features.js')<html.indexOf('notices.js'));
    assert.doesNotMatch(html,/account.js|googleButton|github-account-transport/);
    assert.ok(fs.existsSync(path.join(output,'notices-snapshot.json')));
    assert.match(fs.readFileSync(path.join(output,'privacy.html'),'utf8'),/href="\.\/"/);
    assert.ok(fs.existsSync(path.join(output,'.nojekyll')));
  }finally{fs.rmSync(output,{recursive:true,force:true});}
});
