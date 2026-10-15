exec(open(r'D:\HeroDefense\plans\reports\map-inspection-temp\summarize.py',encoding='utf-8-sig').read())
s=open(p+'/script-literal-decoded.txt',encoding='utf-8').read()
def repl(m):
 raw=bytes.fromhex(m[1]).decode('ascii');vals=a.get(raw,{}).get('Ubertip','');entries=next(csv.reader([vals])) if vals else []
 idx=int(m[2],16) if m[2].startswith('$') else int(m[2]);return json.dumps(entries[idx],ensure_ascii=False) if idx<len(entries) else m[0]
s=re.sub(r'BlzGetAbilityExtendedTooltip\(\$([0-9A-F]+),((?:\$[0-9A-F]+)|\d+)\)',repl,s)
open(p+'/script-table-decoded.txt','w',encoding='utf-8').write(s)
