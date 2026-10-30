"""Resize the approved existing artwork; no redesign or external downloads."""
from pathlib import Path
from PIL import Image
import hashlib, json
root = Path(__file__).resolve().parents[1]
source = root / 'public/pwa-512x512.png'
image = Image.open(source).convert('RGBA')
outputs = {}
for density, scale in [('mdpi',1),('hdpi',1.5),('xhdpi',2),('xxhdpi',3),('xxxhdpi',4)]:
    folder = root / f'android/app/src/main/res/mipmap-{density}'
    folder.mkdir(parents=True, exist_ok=True)
    legacy = image.resize((round(48*scale), round(48*scale)), Image.Resampling.LANCZOS)
    for name in ['ic_launcher.png','ic_launcher_round.png']:
        legacy.save(folder/name)
    side = round(108*scale)
    foreground = Image.new('RGBA', (side,side), (0,0,0,0))
    artwork = image.resize((round(66*scale),round(66*scale)), Image.Resampling.LANCZOS)
    foreground.alpha_composite(artwork, ((side-artwork.width)//2,(side-artwork.height)//2))
    foreground.save(folder/'ic_launcher_foreground.png')
    for name in ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']:
        path = folder/name
        outputs[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
(root/'scripts/android-icon-hashes.json').write_text(json.dumps({'source':hashlib.sha256(source.read_bytes()).hexdigest(),'outputs':outputs},indent=2)+'\n',encoding='utf-8')
print('Android launcher/adaptive icons regenerated from public/pwa-512x512.png')
