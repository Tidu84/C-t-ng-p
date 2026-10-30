package com.cotuongup.game;

import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONObject;
import java.io.*;
import java.util.concurrent.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NativeEngineTest {
    private String network(String name) throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        File target=new File(context.getFilesDir(),name);
        if(!target.exists())try(InputStream in=context.getAssets().open("native-engines/"+name);OutputStream out=new FileOutputStream(target)){
            byte[] data=new byte[65536];int n;while((n=in.read(data))!=-1)out.write(data,0,n);
        }
        return target.getAbsolutePath();
    }
    private String search(boolean ab,String fen,String roots,long id,int ms) throws Exception {
        if(ab){NativeEngines.abCancel(id);return NativeEngines.abSearch(fen,roots,network("abjchess-20261010.nnue"),ms,64,id);}
        NativeEngines.jqeCancel(id);return NativeEngines.jqeSearch(fen,roots,network("it014.jqn"),ms,64,id);
    }
    @Test public void bothEnginesRespectPublicRootsAndJieqiRiver() throws Exception {
        String start="xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX w R2A2C2P5N2B2r2a2c2p5n2b2 0 1";
        for(boolean ab:new boolean[]{true,false}){
            JSONObject result=new JSONObject(search(ab,start,"a3a4",1,200));
            assertEquals("a3a4",result.getString("move"));
            assertTrue(result.getLong("nodes")>0);
            // Revealed advisor and elephant can cross the river, unlike ordinary Xiangqi.
            assertEquals("c4d5",new JSONObject(search(ab,"4k4/9/9/9/9/2A1P4/9/9/9/4K4 w - 0 1","c4d5",2,200)).getString("move"));
            assertEquals("c4e6",new JSONObject(search(ab,"4k4/9/9/9/9/2B1P4/9/9/9/4K4 w - 0 1","c4e6",3,200)).getString("move"));
            if(ab)NativeEngines.abRelease();else NativeEngines.jqeRelease();
        }
    }
    @Test public void capacitorBridgeCallsBothNativeEngines() throws Exception {
        try(androidx.test.core.app.ActivityScenario<MainActivity> scenario=androidx.test.core.app.ActivityScenario.launch(MainActivity.class)){
            scenario.onActivity(a->a.getBridge().getWebView().loadUrl("https://localhost/engine-probe.html"));
            String fen="xxxxkxxxx/9/1x5x1/x1x1x1x1x/9/9/X1X1X1X1X/1X5X1/9/XXXXKXXXX w R2A2C2P5N2B2r2a2c2p5n2b2 0 1";
            for(String engine:new String[]{"abjchess","jqe"}){
                String script="window.__engineProbe=null; (async()=>{try{const s=await Capacitor.Plugins.PremiumBilling.getStatus();const r=await Capacitor.Plugins.NativeEngine.search({engine:'"+engine+"',fen:'"+fen+"',rootMoves:'a3a4',timeMs:200,depth:64});window.__engineProbe={active:s.active,engine:r.engine,move:r.move};}catch(e){window.__engineProbe={error:String(e)};}})();";
                // Wait until the Capacitor web bundle has loaded, without assuming fixed startup time.
                boolean ready=false;
                for(int i=0;i<120&&!ready;i++){
                    java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>();
                    CountDownLatch latch=new CountDownLatch(1);
                    scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript("!!(document.title === 'Engine bridge test' && window.Capacitor && Capacitor.Plugins)",v->{value.set(v);latch.countDown();}));
                    latch.await(5,TimeUnit.SECONDS);ready="true".equals(value.get());if(!ready)Thread.sleep(250);
                }
                assertTrue("Capacitor bridge must load",ready);
                scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,null));
                String result=null;
                for(int i=0;i<160&&result==null;i++){
                    java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>();
                    CountDownLatch latch=new CountDownLatch(1);
                    scenario.onActivity(a->a.getBridge().getWebView().evaluateJavascript("window.__engineProbe || null",v->{value.set(v);latch.countDown();}));
                    latch.await(5,TimeUnit.SECONDS);if(value.get()!=null&&!"null".equals(value.get()))result=value.get();else Thread.sleep(250);
                }
                assertNotNull("Bridge result",result);JSONObject json=new JSONObject(result);
                assertFalse(result,json.has("error"));assertTrue(json.getBoolean("active"));
                assertEquals(engine+"-android",json.getString("engine"));assertEquals("a3a4",json.getString("move"));
            }
        }
    }
    @Test public void staleGenerationIsDiscarded() throws Exception {
        NativeEngines.abCancel(20);NativeEngines.jqeCancel(20);
        assertNull(NativeEngines.abSearch("unused","a3a4","unused",100,1,19));
        assertNull(NativeEngines.jqeSearch("unused","a3a4","unused",100,1,19));
    }
    @Test public void productionWithoutBillingConfigurationStaysLocked(){
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        if(!PremiumEntitlements.configured())assertFalse(PremiumEntitlements.active(context));
    }
}
