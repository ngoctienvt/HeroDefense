import os,re,csv,json,struct
p=os.path.dirname(__file__)
def ini(name):
 sections={};cur=None
 for no,line in enumerate(open(p+'/'+name,encoding='utf-8'),1):
  line=line.strip()
  if re.fullmatch(r'\[.*\]',line):cur=line[1:-1];sections[cur]={'line':no}
  elif cur and '=' in line:
   k,v=line.split('=',1);sections[cur][k]=v
 return sections
u=ini('units_CampaignUnitStrings.txt');a=ini('units_CampaignAbilityStrings.txt');s=open(p+'/war3map.j',encoding='utf-8').read()
roster=[]
for m in re.finditer(r'call pK\(\$([A-F0-9]+),(\d+),(\d+),(\d+)',s):
 raw=bytes.fromhex(m[1]).decode('ascii');roster.append({'id':raw,'index':int(m[2]),'group':int(m[3]),'element':int(m[4]),'script_line':s[:m.start()].count('\n')+1,'strings':u.get(raw,{})})
print('ROSTER',len(roster))
for x in roster[:10]+roster[-3:]:print(json.dumps(x,ensure_ascii=False))
for raw in ['emWS','kc7n','A027']:
 sec=a.get(raw,{})
 print('ABILITY HIDDEN',raw,'line',sec.get('line'),'keys',list(sec))
 for key,val in sec.items():
  if isinstance(val,str) and key in ['Ubertip','Researchubertip','Unubertip']:
   entries=next(csv.reader([val]));print(key,'entries',len(entries))
   if raw!='A027':
    for idx,v in enumerate(entries):
     if len(v)>100 or any(w in v.lower() for w in ['save','load','lưu','đợt','nhiệm','ải','boss','phút','giây','vòng']):print(idx,v[:1800])
open(p+'/roster-evidence.json','w',encoding='utf-8').write(json.dumps(roster,ensure_ascii=False,indent=2))
for x in re.finditer(r'\bnative\b[^\n]*|Preload[^\n]*|InitGameCache[^\n]*|GetStored[^\n]*|StoreInteger[^\n]*|BlzSendSyncData[^\n]*|DzAPI[^\n]*|EXExecute[^\n]*|http[^\n]*',s):print('DEPENDENCY',s[:x.start()].count('\n')+1,x[0][:300])
for name in ['units_UnitData.slk','units_ItemData.slk','units_AbilityData.slk']:
 text=open(p+'/'+name,encoding='utf-8').read();print('SLK',name,re.search(r'B;[^\n]+',text)[0])
