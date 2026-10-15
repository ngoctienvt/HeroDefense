exec(open(r'D:\HeroDefense\plans\reports\map-inspection-temp\inspect.py',encoding='utf-8-sig').read())
import re
p=os.path.dirname(__file__)
for race in ['Human','Orc','Undead','NightElf','Neutral','Campaign']:
 for kind in ['UnitStrings','AbilityStrings','UpgradeStrings']:
  name='units\\'+race+kind+'.txt'
  try:
   data=read(name)
   if data:open(p+'/'+name.replace('\\','_'),'wb').write(data);print('TEXT',name,len(data))
  except Exception:pass
b=open(p+'/war3map.w3e','rb').read();o=9;n=struct.unpack_from('<I',b,o+4)[0];o+=8+4*n;n=struct.unpack_from('<I',b,o)[0];o+=4+4*n
print('TERRAIN',struct.unpack_from('<IIff',b,o),'dimensions_offset',o)
b=open(p+'/war3map.w3a','rb').read();o=0
readi=lambda:None
version=struct.unpack_from('<I',b,o)[0];o+=4
print('ABILITY_VERSION',version)
records=[]
for table in range(2):
 count=struct.unpack_from('<I',b,o)[0];o+=4;print('ABILITY_TABLE',table,count)
 for _ in range(count):
  old=b[o:o+4].decode('ascii');new=b[o+4:o+8].decode('ascii');o+=8
  mods=struct.unpack_from('<I',b,o)[0];o+=4
  for j in range(mods):
   field=b[o:o+4].decode('ascii');typ,level,ptr=struct.unpack_from('<III',b,o+4);o+=16
   if typ==3:
    end=b.index(0,o);val=b[o:end].decode('utf-8',errors='replace');o=end+1
   elif typ==0:val=struct.unpack_from('<i',b,o)[0];o+=4
   else:val=struct.unpack_from('<f',b,o)[0];o+=4
   o+=4;records.append(dict(id=new if new!='\0\0\0\0' else old,field=field,level=level,value=val))
print('ABILITY_PARSED',o,len(b),'mods',len(records))
open(p+'/ability-modifications.json','w',encoding='utf-8').write(json.dumps(records,ensure_ascii=False,indent=2))
for x in records:
 if x['field'] in ['aub1','auu1','atp1']:print('ABILITY_STRING',x)
