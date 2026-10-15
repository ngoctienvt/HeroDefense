"""Publish the complete reviewed roster together; retain previous runtime assets."""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
PUBLIC = PROJECT / 'apps/client/public/assets'
roster = json.loads((ROOT / 'roster.json').read_text(encoding='utf-8'))
heroes = roster['heroes']
reports = []
for hero in heroes:
    folder = ROOT / hero['id'] / 'web'
    manifest = json.loads((folder / 'atlas.json').read_text(encoding='utf-8'))
    qa = json.loads((folder / 'qa.json').read_text(encoding='utf-8'))
    if len(manifest['frames']) != 36 or len(manifest['animations']) != 12:
        raise ValueError(f"Incomplete character {hero['id']}")
    if qa['warnings']:
        raise ValueError(f"Review source warnings before publishing {hero['id']}: {qa['warnings']}")
    if manifest['meta']['size'] != {'w':1536,'h':1536} or manifest['meta']['anchor'] != [128,224]:
        raise ValueError('Runtime layout mismatch')
    for key, clip in manifest['animations'].items():
        expected = 1 if key.endswith('.idle') else 4
        if len(clip['frames']) != expected or any(name not in manifest['frames'] for name in clip['frames']):
            raise ValueError(f'Incomplete animation {key}')
    reports.append({'id':hero['id'],'name':hero['name'],'frames':36,'clips':12,
        'atlasBytes':(folder/'atlas.webp').stat().st_size,'sha256':hashlib.sha256((folder/'atlas.webp').read_bytes()).hexdigest()})
previous = ROOT / 'previous-runtime'
previous.mkdir(exist_ok=True)
for hero in heroes:
    folder = ROOT / hero['id'] / 'web'
    for source, target in [('atlas.webp',f"hero-stylized-{hero['id']}.webp"),('atlas.json',f"hero-stylized-{hero['id']}.json"),('portrait.webp',f"hero-portrait-{hero['id']}.webp")]:
        existing = PUBLIC / target
        if existing.exists() and not (previous/target).exists(): shutil.copy2(existing,previous/target)
        if source == 'atlas.json':
            data=json.loads((folder/source).read_text(encoding='utf-8'))
            data['meta']['image']=f"hero-stylized-{hero['id']}.webp"
            existing.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        else: shutil.copy2(folder/source,existing)
summary={'art_source':'host_image','route':'host-image_gen','model':None,'estimateUsd':None,
    'heroes':reports,'heroCount':20,'frameCount':720,'clipCount':240,'idle':'still',
    'limits':['Generated anatomy/acting need user visual review.','Four keyframes per moving action.','No game/test/build executed.']}
(ROOT/'package.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with zipfile.ZipFile(ROOT/'linh-huyen-web-sprites.zip','w',zipfile.ZIP_DEFLATED) as package:
    package.write(ROOT/'package.json','package.json')
    package.write(ROOT/'roster.json','roster.json')
    for hero in heroes:
        folder=ROOT/hero['id']/'web'
        for name in ('atlas.webp','atlas.json','portrait.webp','qa.json','previews/walk.webp','previews/attack.webp'):
            package.write(folder/name,f"{hero['id']}/{name}")
print(json.dumps({'published':20,'frames':720,'clips':240,'bytes':sum(h['atlasBytes'] for h in reports)}))
