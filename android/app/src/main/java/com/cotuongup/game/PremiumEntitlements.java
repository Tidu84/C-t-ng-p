package com.cotuongup.game;

import android.content.Context;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import org.json.JSONObject;

final class PremiumEntitlements {
    private static final String PREFS="verified_subscription";
    static boolean configured(){return BuildConfig.PREMIUM_VERIFY_URL.startsWith("https://")&&!BuildConfig.PREMIUM_PUBLIC_KEY.isEmpty();}
    static synchronized boolean active(Context context){
        if(!configured())return false;
        String token=context.getSharedPreferences(PREFS,0).getString("token","");
        try {validate(context,token);return true;}catch(Exception ignored){return false;}
    }
    static void validate(Context context,String token)throws Exception{
        String[] parts=token.split("\\.");if(parts.length!=3)throw new Exception("Malformed entitlement");
        JSONObject header=new JSONObject(new String(Base64.decode(parts[0],Base64.URL_SAFE|Base64.NO_WRAP),StandardCharsets.UTF_8));
        if(!"RS256".equals(header.optString("alg")))throw new Exception("Unsupported signature");
        byte[] key=Base64.decode(BuildConfig.PREMIUM_PUBLIC_KEY,Base64.DEFAULT);
        Signature verifier=Signature.getInstance("SHA256withRSA");
        verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(key)));
        verifier.update((parts[0]+"."+parts[1]).getBytes(StandardCharsets.US_ASCII));
        if(!verifier.verify(Base64.decode(parts[2],Base64.URL_SAFE|Base64.NO_WRAP)))throw new Exception("Invalid signature");
        JSONObject claims=new JSONObject(new String(Base64.decode(parts[1],Base64.URL_SAFE|Base64.NO_WRAP),StandardCharsets.UTF_8));
        long now=System.currentTimeMillis()/1000,issued=claims.getLong("iat"),expires=claims.getLong("exp");
        if(!context.getPackageName().equals(claims.optString("aud"))||!BuildConfig.PREMIUM_PRODUCT_ID.equals(claims.optString("productId"))||!"coup-play-verifier".equals(claims.optString("iss"))||now<issued-300||now>=expires||expires-issued>86400)throw new Exception("Expired or invalid entitlement");
    }
    static synchronized void save(Context context,String token)throws Exception{validate(context,token);context.getSharedPreferences(PREFS,0).edit().putString("token",token).apply();}
    static synchronized void clear(Context context){context.getSharedPreferences(PREFS,0).edit().clear().apply();}
}
