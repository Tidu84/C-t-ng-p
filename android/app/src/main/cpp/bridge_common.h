#pragma once
#include <jni.h>
#include <atomic>
#include <chrono>
#include <memory>
#include <mutex>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>
inline std::string stringFromJava(JNIEnv* env, jstring input) {
    if (!input) throw std::invalid_argument("Missing engine argument");
    const char* p=env->GetStringUTFChars(input,nullptr);
    std::string result(p); env->ReleaseStringUTFChars(input,p); return result;
}
inline std::vector<std::string> splitMoves(const std::string& text) {
    std::istringstream input(text); std::vector<std::string> result; std::string move;
    while(input>>move) { if(move.size()!=4 || move[0]<'a' || move[0]>'i' || move[2]<'a' || move[2]>'i' || move[1]<'0' || move[1]>'9' || move[3]<'0' || move[3]>'9') throw std::invalid_argument("Invalid root move"); result.push_back(move); }
    if(result.empty() || result.size()>256) throw std::invalid_argument("Invalid root move list");
    return result;
}
inline jstring engineResult(JNIEnv* env,const std::string& move,int depth,uint64_t nodes,int ms,int score=0) {
    if(move.size()!=4 || move[0]<'a' || move[0]>'i' || move[2]<'a' || move[2]>'i' || move[1]<'0' || move[1]>'9' || move[3]<'0' || move[3]>'9') throw std::runtime_error("Engine produced no move");
    for(char c:move) if(!((c>='a'&&c<='i')||(c>='0'&&c<='9'))) throw std::runtime_error("Malformed engine move");
    std::ostringstream out;out<<"{\"move\":\""<<move<<"\",\"depth\":"<<depth<<",\"nodes\":"<<nodes<<",\"elapsedMs\":"<<ms<<",\"score\":"<<score<<"}";
    return env->NewStringUTF(out.str().c_str());
}
inline jstring engineError(JNIEnv* env,const std::exception& error) {
    env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),error.what());return nullptr;
}
