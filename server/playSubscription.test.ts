import assert from 'node:assert/strict';
import { test } from 'node:test';
import {generateKeyPairSync,verify} from 'node:crypto';
import {subscriptionExpiry,signEntitlement} from './playSubscription';
const now=1700000000000,expiry=now+86400000*40;
const purchase=(state:string,product='ai_premium',end=expiry)=>({subscriptionState:state,lineItems:[{productId:product,expiryTime:new Date(end).toISOString()}]});
test('only currently paid or grace-period subscriptions grant access',()=>{
  for(const state of ['ACTIVE','IN_GRACE_PERIOD','CANCELED'])assert.equal(subscriptionExpiry(purchase('SUBSCRIPTION_STATE_'+state),'ai_premium',now),expiry);
  for(const state of ['PENDING','ON_HOLD','PAUSED','EXPIRED','PENDING_PURCHASE_CANCELED'])assert.equal(subscriptionExpiry(purchase('SUBSCRIPTION_STATE_'+state),'ai_premium',now),null);
  assert.equal(subscriptionExpiry(purchase('SUBSCRIPTION_STATE_ACTIVE','other'),'ai_premium',now),null);
  assert.equal(subscriptionExpiry(purchase('SUBSCRIPTION_STATE_ACTIVE','ai_premium',now),'ai_premium',now),null);
});
test('entitlement is signed, bound to package/product and bounded to 24 hours or paid expiry',()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const pem=privateKey.export({type:'pkcs8',format:'pem'}).toString();
  const jwt=signEntitlement(pem,'com.cotuongup.game','ai_premium','private-purchase-token',expiry,now);
  const [header,body,signature]=jwt.split('.');const claims=JSON.parse(Buffer.from(body,'base64url').toString());
  assert.equal(claims.aud,'com.cotuongup.game');assert.equal(claims.productId,'ai_premium');assert.equal(claims.exp-claims.iat,86400);
  assert.ok(verify('RSA-SHA256',Buffer.from(`${header}.${body}`),publicKey,Buffer.from(signature,'base64url')));
  assert.ok(!jwt.includes('private-purchase-token'));
  const short=signEntitlement(pem,'com.cotuongup.game','ai_premium','token',now+60000,now);
  assert.equal(JSON.parse(Buffer.from(short.split('.')[1],'base64url').toString()).exp,Math.floor((now+60000)/1000));
  assert.ok(!verify('RSA-SHA256',Buffer.from(`${header}.${body}x`),publicKey,Buffer.from(signature,'base64url')));
});
