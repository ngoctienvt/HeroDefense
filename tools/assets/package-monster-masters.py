"""Verify and package the selected still references; never alter master pixels."""
import hashlib
import html
import importlib.util
import json
import math
import zipfile
from collections import Counter
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

spec = importlib.util.spec_from_file_location('master_catalog', Path(__file__).with_name('catalog-monster-masters.py'))
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)
refresh, read, save, digest = catalog.refresh, catalog.read, catalog.save, catalog.digest

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/monster-source/masters'
PLAN = ROOT / 'plans/261027-1118-monster-3d-master-references'
FAMILIES = {'human': 'Người / hình người', 'winged': 'Chim / có cánh',
            'quadruped': 'Thú bốn chân', 'serpent': 'Rắn bò'}


def main():
    roster = read(PLAN / 'roster-proposal.json')['assets']
    rows = refresh()
    assert len(rows) == 38 and {r['id'] for r in rows} == {r['id'] for r in roster}
    results = []
    for row in rows:
        directory = BASE / row['id']
        master = directory / 'master.png'
        assert digest(master) == row['sha256'], row['id']
        original = ROOT / row.get('raw', row.get('source', ''))
        assert original.is_file() and digest(original) == row['sha256'], row['id']
        with Image.open(master) as opened:
            assert opened.mode == 'RGBA'
            alpha = opened.getchannel('A')
            minimum, maximum = alpha.getextrema()
            assert minimum == 0 and maximum > 127, row['id']
            solid = alpha.point(lambda a: 255 if a > 127 else 0)
            width, height = opened.size
            edges = sum(v > 127 for v in alpha.crop((0, 0, width, 1)).tobytes())
            edges += sum(v > 127 for v in alpha.crop((0, height-1, width, height)).tobytes())
            edges += sum(v > 127 for v in alpha.crop((0, 1, 1, height-1)).tobytes())
            edges += sum(v > 127 for v in alpha.crop((width-1, 1, width, height-1)).tobytes())
            assert solid.getbbox() and edges == 0, row['id']
        row['qa'] = {'solidPixelsOnImageEdge': edges, 'nativeMasterUnmodified': True,
                     'transparentBackground': True}
        save(directory / 'metadata.json', {k: v for k, v in row.items() if k != 'path'})
        results.append({'id': row['id'], 'sha256': row['sha256'], 'solidEdgePixels': edges})
    rows = refresh()
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
    cards = []
    for family, label in FAMILIES.items():
        selected = sorted((r for r in rows if r['family'] == family), key=lambda r: (r['role'] != 'boss', r['id']))
        for theme, color in [('light', '#eeeae3'), ('dark', '#252b36')]:
            poster = Image.new('RGB', (1280, 52 + math.ceil(len(selected)/4)*330), color)
            draw = ImageDraw.Draw(poster)
            textcolor = '#222222' if theme == 'light' else '#ffffff'
            draw.text((16, 12), f'{label} — {len(selected)} master', fill=textcolor, font=font)
            for n, row in enumerate(selected):
                with Image.open(BASE/row['id']/'master.png') as im:
                    # Preview crop only; source/master PNG bytes remain unchanged.
                    bbox = im.getchannel('A').point(lambda a: 255 if a > 4 else 0).getbbox()
                    thumb = im.crop(bbox)
                    thumb.thumbnail((300, 268), Image.Resampling.LANCZOS)
                    x, y = (n%4)*320, 52+(n//4)*330
                    poster.paste(thumb, (x+(320-thumb.width)//2, y+(268-thumb.height)//2), thumb)
                draw.text((x+10, y+272), row['name'], fill=textcolor, font=small)
                draw.text((x+10, y+296), row['id']+' / '+row['role'], fill=textcolor, font=small)
            poster.save(BASE/f'gallery-{family}-{theme}.jpg', quality=92)
        cards.append(f'<h2>{html.escape(label)}</h2><section>')
        for row in selected:
            ident = html.escape(row['id'], quote=True)
            cards.append(f'<article data-role="{row["role"]}"><a href="{ident}/master.png"><img loading="lazy" src="{ident}/master.png" alt="{html.escape(row["name"], quote=True)}"></a><h3>{html.escape(row["name"])}</h3><p>{ident} · {row["role"]}</p><p>{html.escape(row["brief"])}</p><a href="{ident}/metadata.json">Metadata</a> · <a href="{ident}/prompt.txt">Prompt</a></article>')
        cards.append('</section>')
    page = '''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>38 monster master references</title><style>body{margin:24px;background:#eeeae3;color:#20242c;font:16px system-ui}body.dark{background:#252b36;color:white}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{border:1px solid #8886;border-radius:12px;padding:16px}img{width:100%;height:300px;object-fit:contain}a{color:#2873bb}.dark a{color:#8cc9ff}button{padding:10px;margin-right:8px}p{line-height:1.5}h3{margin-bottom:4px}</style><h1>38 master stylized — reference dựng 3D</h1><p>20 quái · 18 boss. 33 ảnh mới, 5 ảnh tái dùng. Bấm ảnh để mở PNG gốc. Một góc nhìn mỗi cá thể; mặt sau và chi tiết khuất chưa được xác định. Đây là ảnh reference, không phải model/rig/animation.</p><button onclick="document.body.classList.toggle('dark')">Đổi nền sáng/tối</button><button onclick="filter('all')">Tất cả</button><button onclick="filter('boss')">Boss</button><button onclick="filter('mob')">Quái</button>'''
    page += ''.join(cards) + "<script>function filter(role){document.querySelectorAll('article').forEach(a=>a.hidden=role!=='all'&&a.dataset.role!==role)}</script></html>"
    (BASE/'index.html').write_text(page, encoding='utf-8')
    report = {'masters': len(rows), 'families': dict(Counter(r['family'] for r in rows)),
              'roles': dict(Counter(r['role'] for r in rows)),
              'statuses': dict(Counter(r['status'] for r in rows)), 'checks': results}
    save(PLAN/'master-delivery-qa.json', report)
    assert report['statuses'] == {'accepted-reference': 38}, report['statuses']
    archive = ROOT/'assets/monster-source/master-references-20261027.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path in sorted(BASE.rglob('*')):
            if path.is_file(): bundle.write(path, path.relative_to(BASE))
        bundle.writestr('README.txt', '38 stylized master image references: 20 mobs, 18 bosses. Open index.html locally. One PNG per creature with metadata and prompt. 33 newly generated, 5 retained stills. Hidden/back details unspecified. Original sources and rejected/previous versions remain in the project archive, outside this active-only delivery. No 3D work included. accepted-reference denotes agent visual QA, not final human art approval. Source/reference paths in metadata are project-relative provenance paths; active image paths are <id>/master.png.\n')
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        for row in rows:
            assert hashlib.sha256(bundle.read(row['id']+'/master.png')).hexdigest() == row['sha256']
    save(PLAN/'delivery-package.json', {'path': archive.relative_to(ROOT).as_posix(),
                                      'sha256': digest(archive), 'bytes': archive.stat().st_size})
    print(json.dumps({k: v for k, v in report.items() if k != 'checks'}))


if __name__ == '__main__': main()
