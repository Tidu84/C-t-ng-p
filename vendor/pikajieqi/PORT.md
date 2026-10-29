# Single Worker web port — 2026-10-28

Upstream: https://github.com/brianhliou/pikafish-jieqi-wasm
Commit: bcc83f88ee18760e60903d1a3aaa61ef6f70f2c9
License: GPL-3.0-or-later; retain Copying.txt and AUTHORS.

Changes for Cờ Úp Việt Nam:
- thread.cpp: execute search synchronously on the owning JavaScript Web Worker;
  remove OS thread startup, sleeping and joining; restrict ThreadPool to one.
- tt.cpp: clear the transposition table directly on the same worker.
- ucioption.cpp: restrict Threads to 1.
- evaluate.cpp: skip unused NNUE loading/allocation when USE_NNUEEVAL is off.
- Classical evaluation, move generation and Jieqi rules remain upstream.

Build with `python scripts/build-pikajieqi.py --emsdk /path/to/emsdk` from the app root.
Compiler version: Emscripten 3.1.64. Use `emsdk install 3.1.64` then
`emsdk activate 3.1.64`. No SIMD, SharedArrayBuffer, pthreads or NNUE file required.
Cancellation terminates the hosting Web Worker. Browser adapter caps thinking time
and validates returned moves against the app's rules and public move history.

The generated source.zip includes this tree and the build recipe. Keep it, the
license and AUTHORS available alongside the distributed engine binary.
