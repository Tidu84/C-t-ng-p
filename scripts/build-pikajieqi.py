"""Build the vendored GPL PikaJieQi port with Emscripten 3.1.64; no NNUE/pthreads/SIMD."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--emsdk', type=Path, default=root.parent / 'engine-lab/emsdk')
parser.add_argument('--debug', action='store_true')
parser.add_argument('--package-only', action='store_true', help='Refresh source/license metadata for existing binaries')
args = parser.parse_args()
sdk = args.emsdk.resolve()
source = root / 'vendor/pikajieqi'
out = root / 'public/engines/pikajieqi'
out.mkdir(parents=True, exist_ok=True)
sources = '''benchmark bitboard evaluate main material misc movegen movepick position psqt
search thread timeman tt uci ucioption tune nnue/evaluate_nnue
nnue/features/half_ka_v2_hm compression/zip'''.split()
env = dict(os.environ, EM_CONFIG=str(sdk / '.emscripten'), PYTHONUTF8='1')
command = [sys.executable, str(sdk / 'upstream/emscripten/em++.py')]
command += [str(source / 'src' / (name + '.cpp')) for name in sources]
command += ['-I' + str(source / 'src'), '-std=c++20', '-O3', '-DNDEBUG', '-DIS_64BIT',
            '-DNO_PREFETCH', '-fno-exceptions', '-sWASM=1', '-sMODULARIZE=1',
            '-sEXPORT_NAME=PikaJieQi', '-sENVIRONMENT=worker,node',
            '-sEXPORTED_FUNCTIONS=_pikajieqi_initialize,_pikajieqi_command,_malloc,_free',
            '-sEXPORTED_RUNTIME_METHODS=cwrap', '-sINITIAL_MEMORY=64MB',
            '-sMAXIMUM_MEMORY=256MB', '-sMEMORY_GROWTH_GEOMETRIC_STEP=0', '-sALLOW_MEMORY_GROWTH=1', '-sSTACK_SIZE=3MB',
            '-sNO_EXIT_RUNTIME=1', '-o', str(out / 'pikajieqi.js')]
if args.debug:
    command += ['-g2', '-sASSERTIONS=2']
if not args.package_only:
    subprocess.run(command, env=env, check=True, cwd=root)
shutil.copyfile(source / 'Copying.txt', out / 'COPYING.txt')
shutil.copyfile(source / 'AUTHORS', out / 'AUTHORS.txt')
# Corresponding source, modifications and exact build recipe travel with the binary.
with zipfile.ZipFile(out / 'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_file():
            archive.write(file, 'vendor/pikajieqi/' + file.relative_to(source).as_posix())
    archive.write(__file__, 'scripts/build-pikajieqi.py')
    archive.write(out / 'worker.js', 'public/engines/pikajieqi/worker.js')
metadata = {'engine': 'PikaJieQi', 'upstream': 'https://github.com/brianhliou/pikafish-jieqi-wasm',
            'commit': 'bcc83f88ee18760e60903d1a3aaa61ef6f70f2c9', 'port': 'single-worker-v1',
            'compiler': 'Emscripten 3.1.64', 'threads': 1, 'hashMb': 16,
            'initialMemoryMb': 64, 'maximumMemoryMb': 256, 'nnue': False,
            'license': 'GPL-3.0-or-later', 'files': {}}
for name in ['pikajieqi.js', 'pikajieqi.wasm', 'source.zip']:
    data = (out / name).read_bytes()
    metadata['files'][name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
(out / 'version.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
print(json.dumps(metadata, indent=2))
