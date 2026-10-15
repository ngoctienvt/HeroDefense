exec(open(r'D:\HeroDefense\plans\reports\map-inspection-temp\inspect.py',encoding='utf-8-sig').read())
import re
p=os.path.dirname(__file__)
s=open(p+'/war3map.j',encoding='utf-8').read()
kv={}
for m in re.finditer(r'call SaveStr\(kYb8,\s*(StringHash\("(?:[^"\\]|\\.)*"\)|-?\d+)\s*,\s*0\s*,\s*("(?:[^"\\]|\\.)*")\)',s):kv[m[1].strip()]=m[2]
s=re.sub(r'LoadStr\(kYb8,\s*(StringHash\("(?:[^"\\]|\\.)*"\)|-?\d+)\s*,\s*0\)',lambda m:kv.get(m[1].strip(),m[0]),s)
for _ in range(50):
 t=re.sub(r'"((?:[^"\\]|\\.)*)"\s*\+\s*"((?:[^"\\]|\\.)*)"',lambda m:'"'+m[1]+m[2]+'"',s)
 if s==t:break
 s=t
open(p+'/script-literal-decoded.txt','w',encoding='utf-8').write(s)
print('character replacements',len(kv))
names=['units\\UnitData.slk','units\\UnitBalance.slk','units\\UnitAbilities.slk','units\\UnitUI.slk','units\\ItemData.slk','units\\AbilityData.slk','units\\HumanUnitStrings.txt','units\\HumanUnitFunc.txt','units\\ItemStrings.txt','units\\ItemFunc.txt','units\\AbilityStrings.txt','units\\AbilityFunc.txt','war3mapSkin.txt','war3mapMisc.txt','war3mapExtra.txt','UI\\TriggerStrings.txt','war3map.wpm','war3map.w3r']
for name in names:
 try:
  data=read(name);safe=name.replace('\\','_');open(p+'/'+safe,'wb').write(data);print('EXTRA',name,len(data))
 except Exception as e:print('MISS',name,str(e))
print('nonnull hash entries',sum(x[4]<bn for x in ht),'active blocks',sum(bool(x[3]&0x80000000) for x in bt))
