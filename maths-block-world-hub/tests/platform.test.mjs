import test from 'node:test';
import assert from 'node:assert/strict';
import { validIdentity } from '../lib/platform.ts';

const config={ok:true,schoolYear:'2026-27',classes:['1A','1B','1C','1D'],studentNoMin:1,studentNoMax:33};
void test('student identity follows the configured class and number range',()=>{
  assert.equal(validIdentity(config,'1A',1),true);
  assert.equal(validIdentity(config,'1D',33),true);
  assert.equal(validIdentity(config,'1E',1),false);
  assert.equal(validIdentity(config,'1A',34),false);
  assert.equal(validIdentity(config,'1A',1.5),false);
});
