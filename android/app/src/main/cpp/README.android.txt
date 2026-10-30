Android engine source and port recipe, 2026-10-30
AB-JChess upstream https://github.com/lxsgx23/AB-JChess commit 135844bb1c7da753149a71a661c5b4738a00561f, GPLv3+ (COPYING.txt).
jqe upstream https://github.com/devinokeefe/jieqi commit 331a6e612a038c4a04cf980f7b9482910fd50078, MIT (LICENSE).
Port only: Android posix_memalign, ARM64 FPCR flush-to-zero, AB -fno-char8_t. No chess algorithm changes.
Build native libraries: NDK28.2.13676358, CMake3.22.1, C++20. Configure CMakeLists.txt with Android toolchain, ANDROID_ABI=arm64-v8a or x86_64, ANDROID_PLATFORM=android-24, ANDROID_STL=c++_shared. Then cmake --build.
The exact engine sources and JNI C++ adapters are under cpp/. No application Java, application UI source, signing keys or billing secrets are included.
Networks are separate APK assets/native-engines; sizes and SHA256 in native-engines.json.
