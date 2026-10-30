import express, { type Express } from 'express';
import { GoogleAuth } from 'google-auth-library';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const allowedStates=new Set(['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_IN_GRACE_PERIOD','SUBSCRIPTION_STATE_CANCELED']);
export function subscriptionExpiry(purchase:any,productId:string,now=Date.now()):number|null{
  if(!purchase||!allowedStates.has(purchase.subscriptionState)||!Array.isArray(purchase.lineItems))return null;
  const expiry=Math.max(0,...purchase.lineItems.filter((item:any)=>item.productId===productId).map((item:any)=>Date.parse(item.expiryTime)));
  return Number.isFinite(expiry)&&expiry>now?expiry:null;
}
export function signEntitlement(privatePem:string,packageName:string,productId:string,token:string,expiry:number,now=Date.now()){
  const key=createPrivateKey(privatePem);
  if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength||0)<2048)throw new Error('RSA key must be at least 2048 bits');
  const claims={iss:'coup-play-verifier',aud:packageName,productId,iat:Math.floor(now/1000),exp:Math.floor(Math.min(expiry,now+86400000)/1000),tokenDigest:createHash('sha256').update(token).digest('hex')};
  const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const body=Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${body}.${sign('RSA-SHA256',Buffer.from(`${header}.${body}`),key).toString('base64url')}`;
}
export function installPlaySubscription(app:Express){
  const attempts=new Map<string,{at:number;count:number}>();
  app.post('/api/play/verify',express.json({limit:'4kb'}),async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const now=Date.now(),ip=req.ip||'unknown';let rate=attempts.get(ip);
    if(!rate||now-rate.at>60000){rate={at:now,count:0};if(attempts.size>10000)attempts.clear();attempts.set(ip,rate);}
    if(++rate.count>30){res.status(429).json({error:'Please retry later'});return;}
    const packageName=process.env.PLAY_PACKAGE_NAME||'com.cotuongup.game';
    const productId=process.env.PLAY_PREMIUM_PRODUCT_ID||'ai_premium';
    const token=req.body?.purchaseToken;
    if(req.body?.packageName!==packageName||typeof token!=='string'||token.length<10||token.length>2048){res.status(400).json({error:'Invalid purchase'});return;}
    if(!process.env.PLAY_ENTITLEMENT_PRIVATE_KEY_FILE){res.status(503).json({error:'Verification not configured'});return;}
    try{
      const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/androidpublisher']});
      const client=await auth.getClient();const access=await client.getAccessToken();
      if(!access.token)throw new Error('No access token');
      const headers={Authorization:`Bearer ${access.token}`,'Content-Type':'application/json'};
      const base=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases`;
      const response=await fetch(`${base}/subscriptionsv2/tokens/${encodeURIComponent(token)}`,{headers,signal:AbortSignal.timeout(12000)});
      if(response.status===404){res.status(403).json({error:'Subscription not active'});return;}
      if(!response.ok)throw new Error('Play verification unavailable');
      const purchase=await response.json();const expiry=subscriptionExpiry(purchase,productId,now);
      if(!expiry){res.status(403).json({error:'Subscription not active'});return;}
      if(purchase.acknowledgementState==='ACKNOWLEDGEMENT_STATE_PENDING'){
        const ack=await fetch(`${base}/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,{method:'POST',headers,body:'{}',signal:AbortSignal.timeout(12000)});
        if(!ack.ok)throw new Error('Purchase acknowledgement unavailable');
      }
      const privatePem=readFileSync(process.env.PLAY_ENTITLEMENT_PRIVATE_KEY_FILE,'utf8');
      res.json({entitlement:signEntitlement(privatePem,packageName,productId,token,expiry,now)});
    }catch{res.status(503).json({error:'Verification temporarily unavailable'});}
  });
}
