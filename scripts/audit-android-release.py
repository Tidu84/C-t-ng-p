from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
from PIL import Image, ImageChops
import json, hashlib
root=Path(__file__).resolve().parents[1]
expected=json.loads((root/'release/web-assets.json').read_text(encoding='utf-8'))
with ZipFile(root/'android/app/build/outputs/bundle/release/app-release.aab') as z:
    for name,digest in expected:
        actual=hashlib.sha256(z.read('base/assets/public/'+name)).hexdigest()
        assert actual==digest, 'Web asset stale: '+name
    config=json.loads(z.read('base/assets/capacitor.config.json'))
    assert config['plugins']['SystemBars']['insetsHandling']=='disable'
    assert config['plugins']['SystemBars']['style']=='DARK'
    hashes=json.loads((root/'scripts/android-icon-hashes.json').read_text())
    for filename in hashes['outputs']:
        density=Path(filename).parent.name
        name=Path(filename).name
        matches=[n for n in z.namelist() if n.startswith('base/res/'+density+'-') and n.endswith('/'+name)]
        assert len(matches)==1, 'Missing packaged icon: '+filename
        actual=Image.open(BytesIO(z.read(matches[0]))).convert('RGBA')
        source=Image.open(root/filename).convert('RGBA')
        assert actual.size==source.size and ImageChops.difference(actual,source).getbbox() is None, 'Wrong packaged icon: '+filename
    for name in z.namelist():
        if name.startswith('base/assets/public/') and name.endswith('.js'):
            assert b'PikaJieQi ch' not in z.read(name), 'Engine implementation note remains in UI'
    assert any(n.startswith('META-INF/') and n.endswith('.RSA') for n in z.namelist()), 'AAB is not signed'
print('AAB audit passed: fresh web assets, native insets config, 15 matching launcher icons, no engine note, signed bundle.')
