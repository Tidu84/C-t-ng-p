from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import shutil
root=Path(__file__).resolve().parents[1]
cpp=root/'android/app/src/main/cpp'
target=root/'android/app/src/main/assets/native-engines/source.zip'
def write(archive,name,data):
    entry=ZipInfo(name,date_time=(2026,10,30,0,0,0))
    entry.compress_type=ZIP_DEFLATED
    archive.writestr(entry,data)

# Only open-source engine C++ and its port recipe; never application Java/UI or secrets.
with ZipFile(target,'w',ZIP_DEFLATED) as archive:
    for file in sorted(cpp.rglob('*')):
        if file.is_file():
            write(archive,'cpp/'+file.relative_to(cpp).as_posix(),file.read_bytes())
    write(archive,'native-engines.json',(root/'android/native-engines.json').read_bytes())
    write(archive,'README.txt',(cpp/'README.android.txt').read_bytes())
shutil.copy2(target,root/'public/engines/native/source.zip')
