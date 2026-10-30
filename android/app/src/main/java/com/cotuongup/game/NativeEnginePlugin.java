package com.cotuongup.game;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.*;
import java.security.MessageDigest;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONObject;

@CapacitorPlugin(name="NativeEngine")
public class NativeEnginePlugin extends Plugin {
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    private final AtomicLong generation=new AtomicLong();
    private volatile String lastEngine="";
    private String copiedNetwork="";
    private long cancelSearch() {
        long id=generation.incrementAndGet();
        try { NativeEngines.abCancel(id); NativeEngines.jqeCancel(id); } catch(UnsatisfiedLinkError ignored) {}
        return id;
    }
    @PluginMethod public void cancel(PluginCall call) { cancelSearch();call.resolve(); }
    @PluginMethod public void availability(PluginCall call) {
        JSObject result=new JSObject();
        try { NativeEngines.abCancel(generation.get());result.put("available",true); }
        catch(UnsatisfiedLinkError error){result.put("available",false);}
        call.resolve(result);
    }
    private String network(String engine) throws Exception {
        String name=engine.equals("abjchess")?"abjchess-20261010.nnue":"it014.jqn";
        File directory=new File(getContext().getFilesDir(),"native-engines");
        if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("Cannot prepare engine directory");
        File target=new File(directory,name);
        if(copiedNetwork.equals(name)&&target.isFile())return target.getAbsolutePath();
        JSONObject manifest;
        try(InputStream input=getContext().getAssets().open("native-engines/manifest.json")){
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] data=new byte[4096];int count;while((count=input.read(data))!=-1)bytes.write(data,0,count);manifest=new JSONObject(bytes.toString("UTF-8"));
        }
        String expected=manifest.getJSONObject(engine).getString("sha256");
        if(!target.isFile()||!digest(target).equals(expected)){
            File temp=new File(directory,name+".tmp");
            try(InputStream input=getContext().getAssets().open("native-engines/"+name);OutputStream output=new FileOutputStream(temp)){
                byte[] buffer=new byte[65536];int count;while((count=input.read(buffer))!=-1)output.write(buffer,0,count);
            }
            if(!digest(temp).equals(expected))throw new IOException("Engine network checksum mismatch");
            if(!temp.renameTo(target))throw new IOException("Cannot install engine network");
        }
        copiedNetwork=name;return target.getAbsolutePath();
    }
    private String digest(File file)throws Exception{
        MessageDigest md=MessageDigest.getInstance("SHA-256");
        try(InputStream input=new FileInputStream(file)){byte[] bytes=new byte[65536];int count;while((count=input.read(bytes))!=-1)md.update(bytes,0,count);}
        StringBuilder result=new StringBuilder();for(byte value:md.digest())result.append(String.format("%02x",value&255));return result.toString();
    }
    @PluginMethod public void search(PluginCall call) {
        String engine=call.getString("engine","");
        if(!engine.equals("abjchess")&&!engine.equals("jqe")){call.reject("Unsupported engine");return;}
        if(!BuildConfig.DEBUG&&!PremiumEntitlements.active(getContext())){call.reject("A verified subscription is required","SUBSCRIPTION_REQUIRED");return;}
        String fen=call.getString("fen","");String roots=call.getString("rootMoves","");
        if(fen.isEmpty()||fen.length()>1024||roots.isEmpty()||roots.length()>2048){call.reject("Invalid public position");return;}
        int time=Math.max(100,Math.min(15000,call.getInt("timeMs",5000)));
        int depth=Math.max(1,Math.min(128,call.getInt("depth",64)));
        long id=cancelSearch();
        executor.execute(()->{
            try{
                if(generation.get()!=id){call.resolve(new JSObject().put("cancelled",true));return;}
                if(!lastEngine.equals(engine)){
                    if(engine.equals("abjchess"))NativeEngines.jqeRelease();else NativeEngines.abRelease();
                    lastEngine=engine;
                }
                String path=network(engine);
                if(generation.get()!=id){call.resolve(new JSObject().put("cancelled",true));return;}
                String json=engine.equals("abjchess")?NativeEngines.abSearch(fen,roots,path,time,depth,id):NativeEngines.jqeSearch(fen,roots,path,time,depth,id);
                if(json==null||generation.get()!=id){call.resolve(new JSObject().put("cancelled",true));return;}
                JSObject result=JSObject.fromJSONObject(new JSONObject(json));result.put("engine",engine+"-android");
                android.util.Log.i("CoupEngine",engine+" depth="+result.optInt("depth")+" nodes="+result.optLong("nodes")+" timeMs="+result.optInt("elapsedMs"));
                call.resolve(result);
            }catch(Exception|UnsatisfiedLinkError error){call.reject("Engine could not complete the search: "+error.getMessage(),"ENGINE_UNAVAILABLE");}
        });
    }
    @Override protected void handleOnPause(){cancelSearch();}
    @Override protected void handleOnDestroy(){cancelSearch();executor.shutdown();}
}
