import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {assertDisplayBendHemisphere} from './beast-integration-display.mjs';

const fixture=overrides=>({key:'frontRight',direction:new T.Vector3(0,-1,0),frameDelta:new T.Quaternion(),neutralPole:[0,-.35,-1],bend:new T.Vector3(0,0,-1),strikeWeight:0,label:'synthetic anatomical pose',...overrides});

test('neutral bend remains strict while an attacking elbow may open outward',()=>{
 assert.ok(assertDisplayBendHemisphere(fixture())>0);
 const lateral=new T.Vector3(1,0,.2);
 assert.throws(()=>assertDisplayBendHemisphere(fixture({bend:lateral})),/neutral anatomical/);
 assert.ok(assertDisplayBendHemisphere(fixture({bend:lateral,strikeWeight:1}))>0);
 assert.throws(()=>assertDisplayBendHemisphere(fixture({bend:lateral.clone().negate(),strikeWeight:1})),/strike hemisphere/);
 assert.throws(()=>assertDisplayBendHemisphere(fixture({key:'rearRight',bend:lateral,strikeWeight:1})),/neutral anatomical/);
});

test('bend hemisphere follows the anatomical frame and rejects reversed geometry',()=>{
 const frameDelta=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.8);
 const direction=new T.Vector3(0,-1,0).applyQuaternion(frameDelta),bend=new T.Vector3(1,0,.2).applyQuaternion(frameDelta);
 assert.ok(assertDisplayBendHemisphere(fixture({frameDelta,direction,bend,strikeWeight:.5}))>0);
 assert.throws(()=>assertDisplayBendHemisphere(fixture({frameDelta,direction,bend:bend.clone().negate(),strikeWeight:.5})),/strike hemisphere/);
});
