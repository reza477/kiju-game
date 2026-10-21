import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/simulation.js';
import * as saddle from '../src/saddle-layout.js';
import * as vertical from '../src/vertical-city.js';
import * as variants from '../src/variants.js';
import {SYSTEMS_BASELINE,BEAST_VARIANTS,systemsTrace,layoutTrace} from './beast-integration-systems-trace.mjs';

// Recorded by executing exact committed modules from SYSTEMS_BASELINE, not
// generated from candidate code. Raw commands/module hashes/full trace hashes:
// artifacts/beast-integration/systems/baseline-v2.json. The first recorder's
// git-output-buffer failure is preserved separately in baseline.json.
const expected={
 flesh:['5d49bd168947ef1b99b8caea0d8fac3ff3259b8f4b069d6804e0b9aa7b90f10e',860,6],
 cyborg:['94665c6e5bb674a0610edf9f8688c41c2250987f26f68ea767d420823e6f0438',860,6],
 standard:['d348820a367d074b804cbdda49d432b3c302ab45dc285b447b871efcddff1f3b',811,5],
 drill:['8efb756e85e7e690f63802819ac2f5d03d18f1f86613a19cb4a7768c4a66f2c7',811,5],
 horizontal:['347ed13e10c34266b06d759af0616a40bdf18683253e3e7aced43ffe5501cd05',811,6],
 vertical:['09ba79d4056df7aa3992d5b4659b410b6949588ccea419bc9f0d9cabfcd1c907',811,6],
};
for(const [faction,variant]of BEAST_VARIANTS)test(`new beast preserves ${variant} construction, travel, combat and in-progress saves from ${SYSTEMS_BASELINE.slice(0,7)}`,()=>{
 const result=systemsTrace(sim,faction,variant);
 assert.deepEqual([result.sha256,result.samples,result.eventCount],expected[variant]);
});
test('new beast preserves all 20 saddle mounts, low flesh growth, half-height cyborg and other variant identities',()=>{
 assert.deepEqual(layoutTrace(saddle,vertical,variants),{sha256:'2c948d1f74012d3ea8b531094fcd2052f2572d452bce07a6b2faa0838e88995d',cases:6});
});
