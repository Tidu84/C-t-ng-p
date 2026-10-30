package com.cotuongup.game;
public final class NativeEngines {
    static { System.loadLibrary("coup_abjchess"); System.loadLibrary("coup_jqe"); }
    private NativeEngines() {}
    static native String abSearch(String fen,String rootMoves,String net,int timeMs,int depth,long generation);
    static native String jqeSearch(String fen,String rootMoves,String net,int timeMs,int depth,long generation);
    static native void abCancel(long generation);
    static native void jqeCancel(long generation);
    static native void abRelease();
    static native void jqeRelease();
}
