package com.cotuongup.game;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.*;
import java.util.concurrent.*;
import java.net.*;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

@CapacitorPlugin(name="PremiumBilling")
public class PremiumBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billing;
    private final ExecutorService verifier=Executors.newSingleThreadExecutor();
    private JSObject status(){return new JSObject().put("active",BuildConfig.DEBUG||PremiumEntitlements.active(getContext())).put("testMode",BuildConfig.DEBUG).put("configured",PremiumEntitlements.configured());}
    private void emit(){notifyListeners("entitlementChanged",status());}
    private void connect(PluginCall call,Runnable action){
        getActivity().runOnUiThread(()->{
            if(billing==null)billing=BillingClient.newBuilder(getContext()).setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection().build();
            if(billing.isReady()){action.run();return;}
            billing.startConnection(new BillingClientStateListener(){
                public void onBillingSetupFinished(BillingResult result){if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)action.run();else call.reject("Google Play chưa sẵn sàng","BILLING_UNAVAILABLE");}
                public void onBillingServiceDisconnected(){}
            });
        });
    }
    @PluginMethod public void getStatus(PluginCall call){call.resolve(status());}
    @PluginMethod public void catalog(PluginCall call){
        if(!PremiumEntitlements.configured()){call.resolve(status().put("plans",new JSArray()));return;}
        connect(call,()->queryProduct(call,product->{
            JSArray plans=new JSArray();
            if(product.getSubscriptionOfferDetails()!=null)for(ProductDetails.SubscriptionOfferDetails offer:product.getSubscriptionOfferDetails()){
                if(offer.getOfferId()!=null)continue;
                List<ProductDetails.PricingPhase> phases=offer.getPricingPhases().getPricingPhaseList();
                if(phases.isEmpty())continue;
                ProductDetails.PricingPhase phase=phases.get(phases.size()-1);
                String period=phase.getBillingPeriod();if(!period.equals("P1M")&&!period.equals("P1Y"))continue;
                plans.put(new JSObject().put("basePlanId",offer.getBasePlanId()).put("period",period).put("price",phase.getFormattedPrice()));
            }
            call.resolve(status().put("plans",plans));
        }));
    }
    private interface ProductReady {void run(ProductDetails product);}
    private void queryProduct(PluginCall call,ProductReady action){
        QueryProductDetailsParams.Product request=QueryProductDetailsParams.Product.newBuilder().setProductId(BuildConfig.PREMIUM_PRODUCT_ID).setProductType(BillingClient.ProductType.SUBS).build();
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(request)).build(),(result,products)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK||products.getProductDetailsList().isEmpty()){
                call.reject("Gói thuê bao chưa được mở trên Google Play","PRODUCT_UNAVAILABLE");return;
            }
            action.run(products.getProductDetailsList().get(0));
        });
    }
    @PluginMethod public void purchase(PluginCall call){
        if(!PremiumEntitlements.configured()){call.reject("Thuê bao chưa sẵn sàng","BILLING_NOT_CONFIGURED");return;}
        String basePlan=call.getString("basePlanId","");
        connect(call,()->queryProduct(call,product->{
            ProductDetails.SubscriptionOfferDetails selected=null;
            if(product.getSubscriptionOfferDetails()!=null)for(ProductDetails.SubscriptionOfferDetails offer:product.getSubscriptionOfferDetails()){
                if(offer.getBasePlanId().equals(basePlan)&&offer.getOfferId()==null){selected=offer;break;}
            }
            if(selected==null){call.reject("Không tìm thấy gói thuê bao","PRODUCT_UNAVAILABLE");return;}
            BillingFlowParams.ProductDetailsParams item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(selected.getOfferToken()).build();
            getActivity().runOnUiThread(()->{
                BillingResult result=billing.launchBillingFlow(getActivity(),BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build());
                if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)call.resolve(new JSObject().put("started",true));
                else call.reject("Không thể mở Google Play thanh toán","BILLING_UNAVAILABLE");
            });
        }));
    }
    @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases){
        if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){notifyListeners("purchaseCancelled",new JSObject());return;}
        if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&purchases!=null)process(purchases,null);
        else if(result.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED)refresh(null);
        else notifyListeners("purchaseError",new JSObject().put("message","Google Play chưa hoàn tất giao dịch. Anh thử khôi phục giao dịch."));
    }
    @PluginMethod public void restore(PluginCall call){connect(call,()->refresh(call));}
    private void refresh(PluginCall call){
        if(billing==null||!billing.isReady()){if(call!=null)call.reject("Google Play chưa sẵn sàng");return;}
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(result,purchases)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){if(call!=null)call.reject("Không thể kiểm tra thuê bao");return;}
            process(purchases,call);
        });
    }
    private void process(List<Purchase> purchases,PluginCall call){
        Purchase candidate=null;boolean pending=false;
        for(Purchase purchase:purchases)if(purchase.getProducts().contains(BuildConfig.PREMIUM_PRODUCT_ID)){
            if(purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED&&!purchase.isSuspended()){candidate=purchase;break;}
            if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING)pending=true;
        }
        if(candidate==null){
            PremiumEntitlements.clear(getContext());emit();
            if(call!=null)call.resolve(status().put("pending",pending));
            if(pending)notifyListeners("purchasePending",new JSObject());return;
        }
        final String purchaseToken=candidate.getPurchaseToken();
        verifier.execute(()->{
            HttpsURLConnection connection=null;
            try{
                if(!PremiumEntitlements.configured())throw new IOException("Thuê bao chưa sẵn sàng");
                URL url=new URL(BuildConfig.PREMIUM_VERIFY_URL);
                connection=(HttpsURLConnection)url.openConnection();
                connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
                connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
                byte[] payload=new JSONObject().put("purchaseToken",purchaseToken).put("packageName",getContext().getPackageName()).toString().getBytes(StandardCharsets.UTF_8);
                try(OutputStream output=connection.getOutputStream()){output.write(payload);}
                int code=connection.getResponseCode();
                if(code==403||code==404){PremiumEntitlements.clear(getContext());emit();if(call!=null)call.resolve(status());return;}
                if(code!=200)throw new IOException("Không thể xác minh thuê bao. Anh thử khôi phục giao dịch.");
                ByteArrayOutputStream body=new ByteArrayOutputStream();
                try(InputStream input=connection.getInputStream()){
                    byte[] buffer=new byte[4096];int count;while((count=input.read(buffer))!=-1){if(body.size()+count>65536)throw new IOException("Invalid response");body.write(buffer,0,count);}
                }finally{connection.disconnect();}
                PremiumEntitlements.save(getContext(),new JSONObject(body.toString("UTF-8")).getString("entitlement"));
                emit();if(call!=null)call.resolve(status());
            }catch(Exception error){if(call!=null)call.reject("Không thể xác minh thuê bao. Anh thử khôi phục giao dịch.","VERIFICATION_UNAVAILABLE");else notifyListeners("purchaseError",new JSObject().put("message","Đang chờ xác minh. Anh thử khôi phục giao dịch."));}finally{if(connection!=null)connection.disconnect();}
        });
    }
    @Override protected void handleOnResume(){if(PremiumEntitlements.configured()&&billing!=null&&billing.isReady())refresh(null);}
    @Override protected void handleOnDestroy(){if(billing!=null)billing.endConnection();verifier.shutdown();}
}
