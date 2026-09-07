import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {homedir} from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1440,height:960}});
const page=await context.newPage(),errors=[],remote=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4178'))remote.push(r.url());});
try{
 await page.goto('http://127.0.0.1:4178/?test=1');await page.waitForFunction(()=>!!window.__colossus);await page.waitForTimeout(1500);
 await page.screenshot({path:'artifacts/title-kaiju.png'});checks.push('Kaiju title renders');
 await page.locator('[data-faction="crawler"]').click();await page.waitForTimeout(500);await page.screenshot({path:'artifacts/title-crawler.png'});
 await page.locator('[data-faction="airship"]').click();await page.waitForTimeout(500);await page.screenshot({path:'artifacts/title-airship.png'});checks.push('All city types preview');
 await page.locator('[data-faction="kaiju"]').click();await page.locator('#begin').click();await page.waitForTimeout(800);
 assert.equal(await page.locator('.topbar').isVisible(),true);await page.locator('[data-building="sawmill"]').click();await page.locator('[data-slot="0"]').click();await page.evaluate(()=>window.__colossus.advance(8));assert.equal(await page.evaluate(()=>window.__colossus.state.buildings[0].type),'sawmill');checks.push('Build through UI completes');
 await page.locator('#destinations-toggle').click();await page.locator('#destinations button').first().click();await page.evaluate(()=>window.__colossus.advance(15));assert.ok(await page.evaluate(()=>window.__colossus.state.stats.gathered>0));checks.push('Travel and gathering through UI');
 await page.locator('#save').click();const savedWood=await page.evaluate(()=>JSON.parse(localStorage.getItem('colossus-wake-save-v1')).resources.wood);assert.ok(savedWood>135);checks.push('Manual local save writes state');
 await page.screenshot({path:'artifacts/city-management.png'});
 await page.locator('[data-view="world"]').click();await page.waitForTimeout(800);await page.screenshot({path:'artifacts/world-map.png'});checks.push('World camera and minimap render');
 // Choose an enemy through the public minimap UI; advance only simulation time.
 const minimap=await page.locator('#minimap').boundingBox();await page.mouse.click(minimap.x+(105+180)/360*minimap.width,minimap.y+(8+180)/360*minimap.height);
 await page.locator('[data-approach="rival1"]').click();await page.evaluate(()=>window.__colossus.advance(22));await page.locator('[data-engage="rival1"]').click();await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'battle');checks.push('Rival selection and battle transition');
 await page.locator('[data-command="approach"]').click();await page.evaluate(()=>window.__colossus.advance(5));await page.locator('#ability').click();await page.waitForTimeout(800);await page.screenshot({path:'artifacts/battle.png'});checks.push('Battle movement and special ability');
 await page.locator('#withdraw').click();assert.equal(await page.evaluate(()=>window.__colossus.state.mode),'expedition');checks.push('Withdraw restores city management');
 await page.locator('#save').click();await page.reload();await page.waitForFunction(()=>!!window.__colossus);await page.locator('#continue').click();assert.ok(await page.evaluate(()=>window.__colossus.state.stats.gathered>0));checks.push('Browser reload and resume preserves progress');
 await page.locator('#pause').click();const before=await page.evaluate(()=>window.__colossus.state.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__colossus.state.time),before);checks.push('UI pause freezes state');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);await page.screenshot({path:'artifacts/mobile-layout.png'});assert.ok(await page.locator('#buildings').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('390px layout has no horizontal overflow');
 assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);checks.push('No remote requests or browser errors');
 await fs.writeFile('artifacts/browser-results.json',JSON.stringify({checks,errors,remote},null,2));console.log(JSON.stringify({checks,errors,remote},null,2));
}catch(e){await page.screenshot({path:'artifacts/browser-failure.png'});console.error(JSON.stringify({checks,errors,remote,failure:e.message},null,2));process.exitCode=1;}finally{await browser.close();}
