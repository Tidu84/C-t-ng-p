#include "bridge_common.h"
#include "bitboard.h"
#include "engine.h"
#include "misc.h"
#include "position.h"
#include "search.h"
using namespace Stockfish;
namespace { std::mutex searchMutex,stateMutex; std::shared_ptr<Engine> instance; std::atomic<long long> generation{0}; std::once_flag init; std::string loadedPath; }
extern "C" JNIEXPORT void JNICALL Java_com_cotuongup_game_NativeEngines_abCancel(JNIEnv*,jclass,jlong id) {
    generation.store(id); std::lock_guard lock(stateMutex); if(instance)instance->stop();
}
extern "C" JNIEXPORT void JNICALL Java_com_cotuongup_game_NativeEngines_abRelease(JNIEnv*,jclass) {
    std::lock_guard searchLock(searchMutex);std::lock_guard lock(stateMutex);instance.reset();loadedPath.clear();
}
extern "C" JNIEXPORT jstring JNICALL Java_com_cotuongup_game_NativeEngines_abSearch(JNIEnv* env,jclass,jstring fen,jstring roots,jstring net,jint timeMs,jint depth,jlong id) {
    try {
        std::lock_guard searchLock(searchMutex);
        if(generation.load()!=id)return nullptr;
        std::call_once(init,[]{ Bitboards::init(); Position::init(); });
        const auto network=stringFromJava(env,net);std::shared_ptr<Engine> engine;
        {std::lock_guard lock(stateMutex); if(!instance)instance=std::make_shared<Engine>();engine=instance;}
        engine->set_on_update_no_moves([](const Engine::InfoShort&){});
        engine->set_on_iter([](const Engine::InfoIter&){});
        engine->set_on_verify_networks([](std::string_view){});
        if(loadedPath!=network){engine->load_big_network(network);engine->verify_networks();loadedPath=network;}
        if(generation.load()!=id)return nullptr;
        std::string best;int reachedDepth=0;uint64_t nodes=0;
        engine->set_on_bestmove([&](std::string_view m,std::string_view){best=std::string(m);});
        engine->set_on_update_full([&](const Engine::InfoFull& info){reachedDepth=info.depth;nodes=info.nodes;});
        engine->set_position(stringFromJava(env,fen),{});
        Search::LimitsType limits;limits.movetime=std::max(100,std::min(15000,int(timeMs)));
        limits.depth=std::max(1,std::min(128,int(depth))); limits.startTime=now();
        limits.searchmoves=splitMoves(stringFromJava(env,roots));
        const auto start=std::chrono::steady_clock::now();
        engine->go(limits);if(generation.load()!=id)engine->stop();engine->wait_for_search_finished();
        engine->set_on_bestmove([](std::string_view,std::string_view){});
        engine->set_on_update_full([](const Engine::InfoFull&){});
        if(generation.load()!=id)return nullptr;
        int elapsed=std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-start).count();
        return engineResult(env,best,reachedDepth,nodes,elapsed);
    } catch(const std::exception& e){return engineError(env,e);}
}
