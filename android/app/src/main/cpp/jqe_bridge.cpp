#include "bridge_common.h"
#include "position.h"
#include "search.h"
#include "nnue.h"
using namespace jq;
namespace {std::mutex searchMutex,stateMutex;std::shared_ptr<Searcher> instance;std::atomic<long long> generation{0};std::once_flag init;std::string loadedPath;}
extern "C" JNIEXPORT void JNICALL Java_com_cotuongup_game_NativeEngines_jqeCancel(JNIEnv*,jclass,jlong id){
    generation.store(id);std::lock_guard lock(stateMutex);if(instance)instance->stop();
}
extern "C" JNIEXPORT void JNICALL Java_com_cotuongup_game_NativeEngines_jqeRelease(JNIEnv*,jclass){
    std::lock_guard searchLock(searchMutex);std::lock_guard lock(stateMutex);instance.reset();
}
extern "C" JNIEXPORT jstring JNICALL Java_com_cotuongup_game_NativeEngines_jqeSearch(JNIEnv* env,jclass,jstring fen,jstring roots,jstring net,jint timeMs,jint depth,jlong id){
    try {
        std::lock_guard searchLock(searchMutex);if(generation.load()!=id)return nullptr;
        std::call_once(init,[]{init_tables();search::init();});
        const auto network=stringFromJava(env,net);std::string error;
        if(loadedPath!=network){if(!nnue::load(network,&error))throw std::runtime_error(error);loadedPath=network;}
        std::shared_ptr<Searcher> engine;{std::lock_guard lock(stateMutex);if(!instance)instance=std::make_shared<Searcher>(1,16);engine=instance;}
        Position position;if(!position.set_fen(stringFromJava(env,fen),&error))throw std::runtime_error(error);
        Limits limits;limits.movetime=std::max(100,std::min(15000,int(timeMs)));limits.depth=std::max(1,std::min(128,int(depth)));
        for(const auto& move:splitMoves(stringFromJava(env,roots)))limits.searchMoves.push_back(parse_move_coords(move));
        engine->prepare();if(generation.load()!=id)return nullptr;
        const auto result=engine->go(position,limits,[](const std::string&){},false);
        if(generation.load()!=id)return nullptr;
        return engineResult(env,move_str(result.best),result.depth,result.nodes,result.timeMs,result.score);
    }catch(const std::exception& e){return engineError(env,e);}
}
