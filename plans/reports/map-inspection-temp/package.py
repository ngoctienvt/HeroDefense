exec(open(r'D:\HeroDefense\plans\reports\map-inspection-temp\inspect.py',encoding='utf-8-sig').read())
import re,hashlib,shutil
src=os.path.dirname(__file__);dst=r'D:\HeroDefense\plans\261012-1846-thien-dao-web-coop\research\map-evidence';os.makedirs(dst,exist_ok=True)
files=['war3map.j','war3map.w3i','war3map.w3e','war3map.w3a','war3map.doo','war3map.wpm','units_UnitData.slk','units_UnitBalance.slk','units_UnitAbilities.slk','units_UnitUI.slk','units_ItemData.slk','units_AbilityData.slk','units_CampaignUnitStrings.txt','units_CampaignAbilityStrings.txt','units_ItemStrings.txt','roster-evidence.json','ability-modifications.json','script-table-decoded.txt','war3mapSkin.txt','war3mapMisc.txt']
manifest=[]
for file in files:
 shutil.copyfile(src+'/'+file,dst+'/'+file)
 name=file.replace('units_','units\\')
 hit=next((x for x in ht if x[0]==hashname(name,1) and x[1]==hashname(name,2) and x[4]<bn),None)
 if hit:
  off,comp,size,flags=bt[hit[4]];manifest.append({'archive_path':name,'block_index':hit[4],'archive_absolute_byte_offset':(base+off)&0xffffffff,'stored_bytes':comp,'unpacked_bytes':size,'flags':hex(flags),'sha256_unpacked':hashlib.sha256(open(src+'/'+file,'rb').read()).hexdigest()})
open(dst+'/archive-manifest.json','w').write(json.dumps(manifest,indent=2))
s=open(src+'/war3map.j',encoding='utf-8').read();refs=sorted(set(re.findall(r'"([^"\n]*\.(?:blp|mdx|mdl|toc|fdf|wav|mp3|tga))"',s,re.I)))
open(dst+'/script-asset-reference-candidates.json','w',encoding='utf-8').write(json.dumps(refs,ensure_ascii=False,indent=2))
print('EVIDENCE',len(files),'files; asset literal candidates',len(refs));print(json.dumps(manifest[:5],indent=2))
