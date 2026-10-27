"""Catalog authored master images without changing their pixels."""
import argparse
import hashlib
import json
import logging
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'assets/monster-source'

def read(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,d): p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()

def refresh():
    rows=[]
    for path in sorted((BASE/'masters').glob('*/metadata.json')):
        row=read(path)
        if (path.parent/'master.png').exists():
            row['path']=(path.parent/'master.png').relative_to(ROOT).as_posix()
        rows.append(row)
    save(BASE/'masters/index.json',{'schema':'monster-master-reference-index.v1','date':'2026-10-27','scope':'master images only','assets':rows})
    return rows

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    adopt=sub.add_parser('adopt');adopt.add_argument('--id',required=True);adopt.add_argument('--source',type=Path,required=True)
    review=sub.add_parser('review');review.add_argument('--id',required=True);review.add_argument('--note',required=True);review.add_argument('--status',choices=['accepted-reference','needs-edit'],required=True)
    sub.add_parser('refresh')
    args=parser.parse_args()
    logging.basicConfig(filename=BASE/'master-generation.log',level=logging.INFO,format='%(asctime)s %(message)s')
    if args.command!='refresh':
        directory=(BASE/'masters'/args.id).resolve()
        if directory.parent != (BASE/'masters').resolve():raise ValueError('Invalid asset ID')
        meta_path=directory/'metadata.json';meta=read(meta_path)
        if args.command=='adopt':
            if not args.source.is_file():raise FileNotFoundError(args.source)
            with Image.open(args.source) as opened:
                if opened.mode!='RGBA':raise ValueError('Expected native RGBA master')
                alpha=opened.getchannel('A');extrema=alpha.getextrema();bounds=alpha.getbbox();size=list(opened.size)
                if extrema[0]!=0 or not bounds:raise ValueError('Image needs real transparent background and visible subject')
            archive=BASE/'master-archive'/args.id/'generated';archive.mkdir(parents=True,exist_ok=True)
            version=len(list(archive.glob('master-*.png')))+1;raw=archive/f'master-{version:02d}.png'
            shutil.copy2(args.source,raw);shutil.copy2(raw,directory/'master.png')
            assert digest(raw)==digest(directory/'master.png')
            save(raw.with_suffix('.json'),{**meta,'sourceToolFile':str(args.source),'sha256':digest(raw),'dimensions':size})
            meta.update(status='generated-review-pending',raw=raw.relative_to(ROOT).as_posix(),sha256=digest(raw),dimensions=size,alphaExtrema=list(extrema),alphaBounds=bounds,sourceToolFile=str(args.source))
            logging.info('adopt id=%s version=%s size=%s sha256=%s',args.id,version,size,meta['sha256'])
        else:
            if digest(directory/'master.png')!=meta['sha256']:raise ValueError('Master changed after cataloging')
            meta.update(status=args.status,visualReview=args.note)
            logging.info('review id=%s status=%s note=%s',args.id,args.status,args.note)
        save(meta_path,meta)
    rows=refresh()
    print(json.dumps({'cataloged':sum('path' in r for r in rows),'accepted':sum(r['status']=='accepted-reference' for r in rows),'pending':sum(r['status']=='pending' for r in rows)},ensure_ascii=False))

if __name__=='__main__':main()
