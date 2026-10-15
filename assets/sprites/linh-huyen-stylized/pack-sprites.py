"""Register generated action families and export web atlases without changing gameplay."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path.home() / '.codex/skills/generate2dsprite/scripts'))
from forge_matte import despill, key_still, matte_qa

ROOT = Path(__file__).resolve().parent
DIRS = ('south', 'west', 'north', 'east')
CELL, ANCHOR = 256, (128, 224)
TIMES = {'idle': [1000], 'walk': [150, 150, 150, 150], 'attack': [150, 100, 100, 150]}


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def split_source(path: Path, rows: int, cols: int):
    raw = Image.open(path).convert('RGBA')
    if raw.getextrema()[3][0] < 255:
        image, matte = raw, {'mode': 'native-alpha'}
    else:
        image, matte = key_still(raw, quality='soft', key='magenta')
        cleaned, matte['despill'] = despill(image, 'edge', radius=1, key=matte['key'])
        image = Image.fromarray(cleaned)
        matte['afterDespill'] = matte_qa(cleaned, matte['key'])
    pixels = np.asarray(image).copy()
    # Ownership keeps weapon tips crossing an invisible cell boundary intact.
    labels, count = ndimage.label(pixels[:, :, 3] > 24, np.ones((3, 3)))
    areas = np.bincount(labels.ravel())
    boxes = ndimage.find_objects(labels)
    w, h = image.size
    principal = {}
    for component in np.argsort(areas[1:])[::-1] + 1:
        if areas[component] < 1000:
            break
        ys, xs = boxes[component - 1]
        x, y = (xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2
        slot = min(rows - 1, int(y / h * rows)) * cols + min(cols - 1, int(x / w * cols))
        principal.setdefault(slot, int(component))
    if len(principal) != rows * cols:
        raise ValueError(f'{path}: expected {rows * cols} distinct figures, found {len(principal)}')
    centers = {}
    for slot, component in principal.items():
        ys, xs = boxes[component - 1]
        centers[slot] = ((xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2)
    owner = np.full(count + 1, -1, dtype=np.int16)
    for component in range(1, count + 1):
        if areas[component] < 5:
            continue
        ys, xs = boxes[component - 1]
        x, y = (xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2
        owner[component] = min(centers, key=lambda n: (centers[n][0] - x)**2 + (centers[n][1] - y)**2)
    owners = owner[labels]
    _, near = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    owners = np.where((labels == 0) & (pixels[:, :, 3] > 0), owners[near[0], near[1]], owners)
    frames, warnings = [], []
    for slot in range(rows * cols):
        data = pixels.copy(); data[owners != slot] = 0; data[data[:, :, 3] < 5] = 0
        figure = Image.fromarray(data); bbox = figure.getbbox()
        if bbox is None:
            raise ValueError(f'{path}/{slot}: empty frame')
        if min(bbox[0], bbox[1], w - bbox[2], h - bbox[3]) < 2:
            warnings.append({'id': 'source_outer_edge', 'value': min(bbox[0], bbox[1], w - bbox[2], h - bbox[3]), 'threshold': 2, 'file': str(path), 'slot': slot})
        x0, y0, x1, y1 = bbox
        # Median torso x and central support line ignore a long weapon beside the body.
        torso = data[round(y0 + (y1-y0)*.25):round(y0 + (y1-y0)*.65), :, 3] > 96
        xx = np.nonzero(torso)[1]
        root_x = float(np.median(xx))
        core = data[:, max(0, round(root_x-(x1-x0)*.12)):min(w, round(root_x+(x1-x0)*.12)), 3] > 96
        yy = np.nonzero(core)[0]
        support = float(np.quantile(np.nonzero(data[:, :, 3] > 96)[0], .997))
        head = float(np.quantile(yy, .005))
        frames.append({'image': figure.crop(bbox), 'bbox': bbox, 'rootX': root_x, 'support': support, 'bodyHeight': support-head})
    return frames, {'size': [w, h], 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'matte': matte, 'warnings': warnings}


def pack(hero_id: str):
    folder = ROOT / hero_id
    destination = folder / 'web'
    if destination.exists():
        raise ValueError(f'{destination} exists; preserve published bundle')
    families, reports = {}, {}
    for action, rows, cols in [('idle', 2, 2), ('walk', 4, 4), ('attack', 4, 4)]:
        filename = 'master.png' if action == 'idle' else action + '.png'
        families[action], reports[action] = split_source(folder / 'source' / filename, rows, cols)
    # Master sets anatomy height. Sheet canvas density differs, so compensate by family.
    master_body = float(np.median([f['bodyHeight'] for f in families['idle']]))
    scales = {action: 166 / float(np.median([f['bodyHeight'] for f in (frames if action == 'idle' else frames[::4])])) for action, frames in families.items()}
    registered = []
    for d, direction in enumerate(DIRS):
        for action in ('idle', 'walk', 'attack'):
            items = [families['idle'][d]] if action == 'idle' else families[action][d*4:d*4+4]
            # One root per direction/action family: preserves limb and torso motion.
            source = reports[action]['size']; cols = 2 if action == 'idle' else 4
            row = d//2 if action == 'idle' else d
            local_roots = [f['rootX'] - ((d%2 if action == 'idle' else i) * source[0]/cols) for i, f in enumerate(items)]
            root_x = float(np.median(local_roots))
            support = float(np.median([f['support'] for f in items]))
            for i, frame in enumerate(items):
                col = d%2 if action == 'idle' else i
                registered.append({**frame, 'direction': direction, 'action': action, 'phase': i,
                    'scale': scales[action], 'sourceAnchor': (col*source[0]/cols+root_x, support)})
    # Uniform reduction for the whole character if any weapon envelope needs more room.
    shrink = 1.0
    for f in registered:
        x0,y0,x1,y1=f['bbox']; ax,ay=f['sourceAnchor']; s=f['scale']
        for extent, room in [(ax-x0,ANCHOR[0]-8),(x1-ax,CELL-ANCHOR[0]-8),(ay-y0,ANCHOR[1]-8),(y1-ay,CELL-ANCHOR[1]-8)]:
            if extent>0: shrink=min(shrink,room/(extent*s))
    atlas = Image.new('RGBA', (CELL*6, CELL*6))
    rectangles, animations, previews = {}, {}, {}
    warnings = [warn for report in reports.values() for warn in report['warnings']]
    for index, f in enumerate(registered):
        scale=f['scale']*shrink; source=f['image']; size=tuple(max(1,round(v*scale)) for v in source.size)
        sprite=source.convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA')
        x0,y0,_,_=f['bbox']; ax,ay=f['sourceAnchor']; offset=(round(ANCHOR[0]+(x0-ax)*scale),round(ANCHOR[1]+(y0-ay)*scale))
        if min(offset)<0 or offset[0]+size[0]>CELL or offset[1]+size[1]>CELL: raise ValueError(f'{hero_id}: clipped output {index}')
        cell=Image.new('RGBA',(CELL,CELL));cell.alpha_composite(sprite,offset)
        key=f"{f['direction']}.{f['action']}.{f['phase']}";x=index%6*CELL;y=index//6*CELL
        atlas.alpha_composite(cell,(x,y));rectangles[key]={'frame':{'x':x,'y':y,'w':CELL,'h':CELL},'duration':TIMES[f['action']][f['phase']]}
        clip=f"{f['direction']}.{f['action']}";animations.setdefault(clip,{'frames':[],'durationsMs':TIMES[f['action']],'loop':f['action']!='attack'})['frames'].append(key)
        previews.setdefault(clip,[]).append(cell)
    staging=folder/'web-staging';staging.mkdir();(staging/'previews').mkdir()
    atlas.save(staging/'atlas.png');atlas.save(staging/'atlas.webp',lossless=True,method=6)
    portrait=families['idle'][0]['image']
    portrait=portrait.crop((0,0,portrait.width,round(portrait.height*.65)))
    portrait.thumbnail((512,512),Image.Resampling.LANCZOS)
    portrait_canvas=Image.new('RGBA',(512,512));portrait_canvas.alpha_composite(portrait,((512-portrait.width)//2,(512-portrait.height)//2))
    portrait_canvas.save(staging/'portrait.webp',lossless=True,method=6)
    manifest={'frames':rectangles,'animations':animations,'meta':{'image':'atlas.webp','size':{'w':CELL*6,'h':CELL*6},'cellSize':CELL,'anchor':list(ANCHOR),'alpha':'straight','sampling':'linear','idle':'still','art_source':'host_image','route':'host-image_gen','model':None,'estimateUsd':None}}
    save_json(staging/'atlas.json',manifest)
    board=Image.new('RGB',(CELL*9,CELL*4),'#384c45')
    for i,f in enumerate(registered):board.paste(previews[f"{f['direction']}.{f['action']}"][f['phase']],((i%9)*CELL,(i//9)*CELL),previews[f"{f['direction']}.{f['action']}"][f['phase']])
    board.save(staging/'review.png')
    light=Image.new('RGB',board.size,'#e4dcc7')
    for i,f in enumerate(registered):
        frame=previews[f"{f['direction']}.{f['action']}"][f['phase']]
        light.paste(frame,((i%9)*CELL,(i//9)*CELL),frame)
    light.save(staging/'review-light.png')
    for action in ('walk','attack'):
        sequence=[]
        for phase in range(4):
            panel=Image.new('RGB',(CELL*4,CELL),'#384c45')
            for d,direction in enumerate(DIRS):panel.paste(previews[f'{direction}.{action}'][phase],(d*CELL,0),previews[f'{direction}.{action}'][phase])
            sequence.append(panel)
        sequence[0].save(staging/'previews'/f'{action}.webp',save_all=True,append_images=sequence[1:],duration=TIMES[action],loop=0,lossless=True)
    save_json(staging/'qa.json',{'frames':36,'clips':12,'idleFramesPerDirection':1,'sourceReports':reports,'masterBodyHeight':master_body,'familyScales':scales,'uniformEnvelopeReduction':shrink,'warnings':warnings,'limits':['Generated acting and identity need visual motion review.','Four keyframes per action are intentionally sparse.','No game/test/build execution.']})
    staging.rename(destination)
    print(json.dumps({'hero':hero_id,'frames':36,'clips':12,'warnings':warnings,'atlas':str(destination/'atlas.webp')}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--hero',required=True);args=parser.parse_args()
    roster=json.loads((ROOT/'roster.json').read_text(encoding='utf-8'))
    if args.hero not in {h['id'] for h in roster['heroes']}:raise ValueError('Hero outside requested roster')
    pack(args.hero)
