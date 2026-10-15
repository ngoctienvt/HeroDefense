import struct,sys,zlib,bz2,os,json
path=r'D:\HeroDefense\ThienDao v2.1.w3x'
f=open(path,'rb'); base=25088
f.seek(base); h=f.read(32); print('header',struct.unpack('<4sIIHHIIII',h))
_,hs,ars,ver,shift,hoff,boff,hn,bn=struct.unpack('<4sIIHHIIII',h)
crypt=[0]*0x500; seed=0x100001
for i in range(0x100):
 for j in range(5):
  seed=(seed*125+3)%0x2aaaab; a=(seed&0xffff)<<16
  seed=(seed*125+3)%0x2aaaab; crypt[i+j*256]=a|(seed&0xffff)
def hashname(name,kind):
 s1=0x7fed7fed;s2=0xeeeeeeee
 for c in name.replace('/','\\').upper().encode('ascii'):
  s1=(crypt[kind*256+c]^(s1+s2))&0xffffffff;s2=(c+s1+s2+(s2<<5)+3)&0xffffffff
 return s1
def decrypt(data,key):
 s=0xeeeeeeee;out=bytearray(); tail=len(data)%4
 for val, in struct.iter_unpack('<I',data[:len(data)-tail if tail else len(data)]):
  s=(s+crypt[0x400+(key&255)])&0xffffffff; v=val^((key+s)&0xffffffff)
  key=(((~key<<21)+0x11111111)|(key>>11))&0xffffffff
  s=(v+s+(s<<5)+3)&0xffffffff;out.extend(struct.pack('<I',v))
 if tail:out.extend(data[-tail:])
 return bytes(out)
f.seek(base+hoff); ht=list(struct.iter_unpack('<IIHHI',decrypt(f.read(hn*16),hashname('(hash table)',3))))
f.seek((base+boff)&0xffffffff); bt=list(struct.iter_unpack('<IIII',decrypt(f.read(bn*16),hashname('(block table)',3))))
print('tables',hn,bn,'sector',512<<shift)
def decomp(data,expect):
 if len(data)>=expect:return data
 mask=data[0];data=data[1:]
 if mask&0x10:data=bz2.decompress(data);mask &= ~0x10
 if mask&2:data=zlib.decompress(data);mask &= ~2
 if mask:raise ValueError('compression '+hex(mask))
 return data
def read(name):
 a=hashname(name,1);b=hashname(name,2);hit=next((x for x in ht if x[0]==a and x[1]==b and x[4]<bn),None)
 if not hit:raise KeyError(name)
 off,comp,size,flags=bt[hit[4]]
 f.seek(base+off);data=f.read(comp);key=hashname(name.replace('/','\\').split('\\')[-1],3)
 if flags&0x20000:key=((key+off)^size)&0xffffffff
 if flags&0x1000000:
  if flags&0x10000:data=decrypt(data,key)
  return decomp(data,size) if flags&0x200 else data
 ss=512<<shift; count=(size+ss-1)//ss
 if flags&0x200:
  table=data[:4*(count+1)]
  if flags&0x10000:table=decrypt(table,(key-1)&0xffffffff)
  ends=struct.unpack('<'+'I'*(count+1),table);out=bytearray()
  for i in range(count):
   chunk=data[ends[i]:ends[i+1]]
   if flags&0x10000:chunk=decrypt(chunk,(key+i)&0xffffffff)
   out.extend(decomp(chunk,min(ss,size-i*ss)))
  return bytes(out)
 if flags&0x10000:
  return b''.join(decrypt(data[i*ss:(i+1)*ss],(key+i)&0xffffffff) for i in range(count))[:size]
 return data[:size]
root=os.path.dirname(__file__)
known=['(listfile)','war3map.j','scripts\\war3map.j','war3map.lua','war3map.w3i','war3map.wts','war3map.w3e','war3map.w3u','war3map.w3t','war3map.w3a','war3map.w3b','war3map.w3d','war3map.w3h','war3map.w3q','war3map.imp','war3map.doo','war3mapUnits.doo']
for name in known:
 try:
  data=read(name); print('FILE',name,len(data),'block',next(x[4] for x in ht if x[0]==hashname(name,1) and x[1]==hashname(name,2)))
  safe=name.replace('\\','_').replace('/','_');open(os.path.join(root,safe),'wb').write(data)
 except Exception as e:print('ERR',name,str(e))

