/* ใบขอแลกคาบ พพ.1-1 → files. One A4 page per leave day, laid out to match the
   form the school actually uses (positions measured from a real, signed copy).
     FORMDOC.model()   pages + field values, shared by both writers
     FORMDOC.draw()    one page onto a canvas (screen preview, print, PDF)
     FORMDOC.pdf()     canvases → PDF bytes (page images; lossless when the
                       browser has CompressionStream, JPEG otherwise)
     FORMDOC.docx()    editable Word file (pure: no DOM, also runs in node)
   No external library. */
(function(root){
  'use strict';
  var MONTH=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  var MON=['มค','กพ','มีค','เมย','พค','มิย','กค','สค','กย','ตค','พย','ธค'];
  var PW=595.32, PH=841.92, L=85, R=542, LH=18.1;
  var TX=[69,97.3,130,162.4,204,240.7,277.5,315.7,350.5,385,415.6,501,567];     // swap-table column edges (pt)
  var AX=[85,309,545];                                                          // approval-table column edges
  var SCHOOL='พิษณุโลกพิทยาคม';
  function bd(iso){ var p=String(iso||'').slice(0,10).split('-'); return {d:+p[2], m:+p[1], y:+p[0]+543}; }
  function dTag(iso){ if(!iso) return ''; var b=bd(iso); return b.d+MON[b.m-1]+String(b.y).slice(-2); }
  function firstName(n){ var t=['ว่าที่ร้อยตรีหญิง','ว่าที่ร้อยตรี','ว่าที่ ร.ต.','นางสาว','นาง','นาย','ดร.'], s=String(n||'').trim();
    for(var i=0;i<t.length;i++) if(s.indexOf(t[i])===0){ s=s.slice(t[i].length).trim(); break; } return s.split(/\s+/)[0]||s; }
  function fill(v, n){ return v ? String(v) : Array((n||16)+1).join('.'); }

  /* ---------- shared model ---------- */
  function model(entries, f){
    var by={}, order=[];
    entries.forEach(function(e){ var d=String(e.date_absent).slice(0,10); if(!by[d]){ by[d]=[]; order.push(d); } by[d].push(e); });
    order.sort();
    var pages=order.map(function(d){
      var rows=by[d].slice().sort(function(a,b){ return (+a.per_give)-(+b.per_give); }).map(function(e,i){
        var sub=(e.kind==='สอนแทน' || !e.date_back);
        return [(i+1)+'.', dTag(e.date_absent), String(e.per_give), String(e.group_give||''), e.subject_give||'', e.room_give||'',
                sub?'-':dTag(e.date_back), sub?'-':String(e.per_back), sub?'':(e.y_sub||''), sub?'':(e.room_back||e.y_room||''), firstName(e.y_name), ''];
      });
      return {date:d, rows:rows};
    });
    if(!pages.length) pages=[{date:f.docDate||'', rows:[], blank:true}];
    return {pages:pages, f:f};
  }
  function headLine(f){ var b=bd(f.docDate); return 'วันที่.....'+b.d+'.......เดือน......'+MONTH[b.m-1]+'.......พ.ศ......'+b.y+'.....'; }
  function bodyText(f, date, blank){
    var b=blank?null:bd(date);
    return 'เนื่องด้วยข้าพเจ้า......'+fill(f.reqName,30)+'......ตำแหน่ง......'+fill(f.pos,12)+'......สังกัดกลุ่มสาระการเรียนรู้.......'+fill(f.dept,16)+
      '...........มีความจำเป็น...'+fill(f.reason,60)+'... จึงขอแลกเปลี่ยนคาบสอนและมอบหมายงานอื่น ๆ ในวันที่....'+(b?b.d:'......')+'.....เดือน...'+(b?MONTH[b.m-1]:'..............')+
      '......พ.ศ....'+(b?b.y:'........')+'..... ระหว่างเวลา....'+fill(f.t1,8)+'.......น. ถึง .....'+fill(f.t2,8)+'......น. ดังนี้';
  }
  function dutyLines(f){
    return [['โฮมรูม ชั้น ม...'+fill(f.hrClass,4)+'.../...'+fill(f.hrRoom,3)+'...', f.hr, f.hrTo], ['เวรประจำวัน', f.du, f.duTo], ['การประชุม', f.mt, f.mtTo]]
      .map(function(x){ return {label:x[0], has:!!x[1], text:'มี มอบหมายให้'+(x[1]&&x[2]?'......'+x[2]+'......':'....................................................')+'ผู้รับมอบ...................'}; });
  }
  function headDate(f){ var b=bd(f.docDate); return '.........../....'+MONTH[b.m-1]+'....../....'+b.y+'.........'; }

  /* ---------- canvas ---------- */
  var seg=null; try{ if(typeof Intl!=='undefined' && Intl.Segmenter) seg=new Intl.Segmenter('th',{granularity:'word'}); }catch(_){}
  function tokens(s){ if(seg){ var o=[]; var it=seg.segment(s)[Symbol.iterator](), x; while(!(x=it.next()).done) o.push(x.value.segment); return o; } return s.split(/(\s+|\.{2,})/).filter(Boolean); }
  function draw(canvas, page, f, dpi, logo){
    var k=(dpi||144)/72, c=canvas.getContext('2d');
    canvas.width=Math.round(PW*k); canvas.height=Math.round(PH*k);
    c.fillStyle='#fff'; c.fillRect(0,0,canvas.width,canvas.height); c.fillStyle='#000'; c.strokeStyle='#000'; c.textBaseline='alphabetic';
    function font(sz,b){ c.font=(b?'700 ':'400 ')+(sz*k)+'px "TH Sarabun New"'; }
    function T(s,x,top,o){ o=o||{}; var sz=o.sz||16; font(sz,o.b); c.textAlign=o.al||'left'; c.fillText(s, x*k, (top+sz*0.86)*k); }
    function W(s,sz,b){ font(sz||16,b); return c.measureText(s).width/k; }
    function line(x1,y1,x2,y2){ c.lineWidth=Math.max(1,0.6*k); c.beginPath(); c.moveTo(Math.round(x1*k)+.5,Math.round(y1*k)+.5); c.lineTo(Math.round(x2*k)+.5,Math.round(y2*k)+.5); c.stroke(); }
    function box(x,top,on){ var s=9.5, y=top+4.2; c.lineWidth=1.1*k; c.strokeRect(x*k,y*k,s*k,s*k);
      if(on){ c.lineWidth=1.6*k; c.lineJoin='round'; c.beginPath(); c.moveTo((x+1.8)*k,(y+4.9)*k); c.lineTo((x+4.2)*k,(y+7.6)*k); c.lineTo((x+9.8)*k,(y-1.2)*k); c.stroke(); } return x+s+3.5; }

    T('พพ. 1-1', R, 15, {sz:14, al:'right'});
    if(logo && logo.width){ var lh=46, lw=lh*logo.width/logo.height; c.drawImage(logo, (PW/2-lw/2+14)*k, 38.5*k, lw*k, lh*k); }
    T('แบบบันทึกการขอแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่', (L+R)/2, 96, {b:1, al:'center'});
    T(headLine(f), R, 114, {al:'right'});
    T('เรื่อง', L, 132); T('ขออนุญาตแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่', 121, 132);
    T('เรียน', L, 150); T('ผู้อำนวยการ'+SCHOOL, 121, 150);
    // body paragraph: first-line indent, greedy wrap on Thai word boundaries
    var y=168, x0=121, cur='', tk=tokens(bodyText(f, page.date, page.blank));
    for(var i=0;i<tk.length;i++){
      if(W(cur+tk[i]) > R-x0 && cur.trim()){ T(cur.replace(/\s+$/,''), x0, y); y+=LH; x0=L; cur=tk[i].replace(/^\s+/,''); }
      else cur+=tk[i];
    }
    if(cur) T(cur, x0, y);
    y+=LH+6;
    // 1. งานสอน
    var n=page.rows.length;
    T('1. งานสอน', 121, y, {b:1});
    var x=box(193, y, n===0); T('ไม่มีคาบสอน', x, y); x+=W('ไม่มีคาบสอน')+5;
    x=box(x, y, n>0); T('มีคาบสอน........'+(n||'....')+'..........คาบ แลกเปลี่ยนคาบดังนี้', x, y);
    y+=LH;
    var RH=14, top=y, rows=n?page.rows:[['1.'],['2.'],['3.']], bottom=top+RH*(2+rows.length), j, r;
    line(TX[0],top,TX[12],top); line(TX[1],top+RH,TX[12],top+RH);
    for(r=0;r<=rows.length;r++) line(TX[0],top+RH*(2+r),TX[12],top+RH*(2+r));
    [0,1,6,10,12].forEach(function(q){ line(TX[q],top,TX[q],bottom); });
    [2,3,4,5,7,8,9,11].forEach(function(q){ line(TX[q],top+RH,TX[q],bottom); });
    function C(s,a,b,t,bold){ T(s,(TX[a]+TX[b])/2,t+1.2,{sz:12,b:bold,al:'center'}); }
    C('ลำดับที่',0,1,top+RH/2,1); C('คาบสอนปกติ',1,6,top,1); C('คาบที่ขอแลก',6,10,top,1); C('ลงชื่อผู้รับแลก/ผู้สอนแทน',10,12,top,1);
    ['ว/ด/ป','คาบที่','ม...../.....','รหัสวิชา','สถานที่','ว/ด/ป','คาบที่','รหัสวิชา','สถานที่','ตัวบรรจง','ลายเซ็น'].forEach(function(h,q){ C(h,q+1,q+2,top+RH,1); });
    rows.forEach(function(row,ri){ for(j=0;j<row.length;j++) if(row[j]) C(row[j], j, j+1, top+RH*(2+ri)); });
    y=bottom+7;
    // 2. งานหน้าที่อื่น ๆ
    T('2. งานหน้าที่อื่น ๆ', 121, y, {b:1}); y+=LH;
    dutyLines(f).forEach(function(d){
      T(d.label, L, y); var xx=box(197, y, !d.has); T('ไม่มี', xx, y); xx+=W('ไม่มี')+7; xx=box(xx, y, d.has); T(d.text, xx, y); y+=LH+0.4; });
    y+=5.5; T('จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต', L, y); y+=LH;
    T('ลงชื่อ............................................ผู้ขออนุญาต', 265, y); y+=LH+0.5;
    T('(.....'+fill(f.signName||f.reqName,28)+'.......)', 349, y, {al:'center'}); y+=LH+6.5;
    // approvals
    var a0=y, a1=a0+127, a2=a1+110, cl=(AX[0]+AX[1])/2, cr=(AX[1]+AX[2])/2, dots='..................................................................................';
    [a0,a1,a2].forEach(function(yy){ line(AX[0],yy,AX[2],yy); }); AX.forEach(function(xx){ line(xx,a0,xx,a2); });
    function cut(s,w){ while(s.length>4 && W(s)>w) s=s.slice(0,-1); return s; }
    var wl=AX[1]-AX[0]-12, wr=AX[2]-AX[1]-12, t=a0+1;
    T('ความเห็นหัวหน้ากลุ่มสาระการเรียนรู้ฯ', 91, t); T(cut(dots,wl), 91, t+LH);
    T('ลงชื่อ............................................', cl, t+LH*3, {al:'center'});
    T('('+(f.headName?'..'+f.headName+'...':'............................................')+')', cl, t+LH*4, {al:'center'});
    T('หัวหน้ากลุ่มสาระการเรียนรู้'+(f.headDept||f.dept||''), cl, t+LH*5, {al:'center'});
    T(headDate(f), cl, t+LH*6, {al:'center'});
    T('ความเห็นผู้ช่วยผู้อำนวยการกลุ่มบริหารวิชาการ', 315, t); T(cut(dots,wr), 315, t+LH);
    T('ลงชื่อ............................................', cr, t+LH*3, {al:'center'});
    T('('+(f.asstName||'............................................')+')', cr, t+LH*4, {al:'center'});
    T('.........../....................../.............', cr, t+LH*5, {al:'center'});
    t=a1+1;
    T('ความเห็นรองผู้อำนวยการกลุ่มบริหารวิชาการ', 91, t); T(cut(dots,wl), 91, t+LH);
    T('('+(f.deputyName||'............................................')+')', cl, t+LH*3, {al:'center'});
    T('........../.........../............', cl, t+LH*4, {al:'center'});
    T('ความเห็นผู้อำนวยการโรงเรียน', 315, t);
    x=box(316, t+LH, false); T('อนุญาต', x, t+LH); x=box(x+W('อนุญาต')+34, t+LH, false); T('ไม่อนุญาต', x, t+LH);
    x=box(316, t+LH*2, false); T('อื่น ๆ .......................', x, t+LH*2);
    T('('+(f.dirName||'............................................')+')', cr, t+LH*4, {al:'center'});
    T('ผู้อำนวยการโรงเรียน'+SCHOOL, cr, t+LH*5, {al:'center'});
    return canvas;
  }

  /* ---------- PDF (one full-page image per page) ---------- */
  function enc(s){ var o=new Uint8Array(s.length); for(var i=0;i<s.length;i++) o[i]=s.charCodeAt(i)&255; return o; }
  function join(parts){ var n=0, i; for(i=0;i<parts.length;i++) n+=parts[i].length; var o=new Uint8Array(n), p=0; for(i=0;i<parts.length;i++){ o.set(parts[i],p); p+=parts[i].length; } return o; }
  function pageImage(cv){
    var w=cv.width, h=cv.height;
    if(typeof CompressionStream!=='undefined'){
      var d=cv.getContext('2d').getImageData(0,0,w,h).data, rgb=new Uint8Array(w*h*3);
      for(var i=0,j=0;i<d.length;i+=4){ rgb[j++]=d[i]; rgb[j++]=d[i+1]; rgb[j++]=d[i+2]; }
      var cs=new CompressionStream('deflate'), wr=cs.writable.getWriter(); wr.write(rgb); wr.close();
      return new Response(cs.readable).arrayBuffer().then(function(b){ return {w:w,h:h,filter:'FlateDecode',data:new Uint8Array(b)}; });
    }
    return new Promise(function(res){ cv.toBlob(function(b){ b.arrayBuffer().then(function(a){ res({w:w,h:h,filter:'DCTDecode',data:new Uint8Array(a)}); }); }, 'image/jpeg', 0.93); });
  }
  function pdf(canvases, title){
    return Promise.all(canvases.map(pageImage)).then(function(imgs){
      var parts=[], off=[], pos=0, n=imgs.length;
      function put(u){ parts.push(u); pos+=u.length; }
      function obj(id, head, stream){ off[id]=pos; put(enc(id+' 0 obj\n'+head)); if(stream){ put(enc('\nstream\n')); put(stream); put(enc('\nendstream')); } put(enc('\nendobj\n')); }
      function hex(s){ var o='FEFF'; for(var i=0;i<s.length;i++) o+=('000'+s.charCodeAt(i).toString(16)).slice(-4); return '<'+o.toUpperCase()+'>'; }
      put(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
      var kids=[]; for(var i=0;i<n;i++) kids.push((4+i*3)+' 0 R');
      obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
      obj(2,'<< /Type /Pages /Count '+n+' /Kids ['+kids.join(' ')+'] >>');
      obj(3,'<< /Title '+hex(title||'ใบแลกคาบ')+' /Producer (schedule-swap preview) >>');
      imgs.forEach(function(im,i){
        var pg=4+i*3, ct=pg+1, xo=pg+2, body=enc('q '+PW+' 0 0 '+PH+' 0 0 cm /Im0 Do Q');
        obj(pg,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Resources << /XObject << /Im0 '+xo+' 0 R >> >> /Contents '+ct+' 0 R >>');
        obj(ct,'<< /Length '+body.length+' >>', body);
        obj(xo,'<< /Type /XObject /Subtype /Image /Width '+im.w+' /Height '+im.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /'+im.filter+' /Length '+im.data.length+' >>', im.data);
      });
      var total=3+n*3, xref=pos, s='xref\n0 '+(total+1)+'\n0000000000 65535 f \n';
      for(var q=1;q<=total;q++) s+=('0000000000'+off[q]).slice(-10)+' 00000 n \n';
      put(enc(s+'trailer\n<< /Size '+(total+1)+' /Root 1 0 R /Info 3 0 R >>\nstartxref\n'+xref+'\n%%EOF\n'));
      return join(parts);
    });
  }

  /* ---------- DOCX ---------- */
  function utf8(s){ if(typeof TextEncoder!=='undefined') return new TextEncoder().encode(s); return new Uint8Array(Buffer.from(s,'utf8')); }
  var CRC=(function(){ var t=[], c, n, k; for(n=0;n<256;n++){ c=n; for(k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
  function crc32(u){ var c=0xFFFFFFFF; for(var i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
  function zip(files){   // store-only zip; names are ASCII
    var parts=[], cen=[], pos=0;
    function u16(v){ return [v&255,(v>>>8)&255]; } function u32(v){ return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]; }
    files.forEach(function(f){
      var name=enc(f.name), data=f.data, crc=crc32(data);
      var common=[].concat(u16(20),u16(0),u16(0),u16(0),u16(0x21),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0));
      var lh=new Uint8Array([0x50,0x4b,3,4].concat(common));
      cen.push(join([new Uint8Array([0x50,0x4b,1,2].concat(u16(20),common,u16(0),u16(0),u16(0),u32(0),u32(pos))), name]));
      parts.push(lh,name,data); pos+=lh.length+name.length+data.length;
    });
    var cd=join(cen);
    parts.push(cd, new Uint8Array([0x50,0x4b,5,6].concat(u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(pos),u16(0))));
    return join(parts);
  }
  function x(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var FONT='TH Sarabun New';
  function rpr(sz,b){ return '<w:rPr><w:rFonts w:ascii="'+FONT+'" w:hAnsi="'+FONT+'" w:cs="'+FONT+'" w:eastAsia="'+FONT+'"/>'+(b?'<w:b/><w:bCs/>':'')+'<w:sz w:val="'+sz*2+'"/><w:szCs w:val="'+sz*2+'"/><w:lang w:val="en-US" w:bidi="th-TH"/></w:rPr>'; }
  function run(t,o){ o=o||{}; return '<w:r>'+rpr(o.sz||16,o.b)+'<w:t xml:space="preserve">'+x(t)+'</w:t></w:r>'; }
  function tab(){ return '<w:r><w:tab/></w:r>'; }
  function chk(on){ return '<w:r><w:rPr><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr><w:sym w:font="Wingdings 2" w:char="'+(on?'F052':'F0A3')+'"/></w:r>'+run(' '); }
  function para(inner,o){ o=o||{};
    return '<w:p><w:pPr>'+(o.keep?'<w:keepNext/>':'')+(o.tabs?'<w:tabs>'+o.tabs.map(function(t){ return '<w:tab w:val="left" w:pos="'+Math.round(t*20)+'"/>'; }).join('')+'</w:tabs>':'')+
      '<w:spacing w:before="'+Math.round((o.before||0)*20)+'" w:after="0" '+(o.auto?'w:line="240" w:lineRule="auto"':'w:line="'+({12:270,14:320,6:120}[o.sz||16]||362)+'" w:lineRule="exact"')+'/>'+
      (o.ind?'<w:ind w:firstLine="'+Math.round(o.ind*20)+'"/>':'')+(o.left?'<w:ind w:left="'+Math.round(o.left*20)+'"/>':'')+
      '<w:jc w:val="'+(o.jc||'left')+'"/>'+rpr(o.sz||16)+'</w:pPr>'+inner+'</w:p>'; }
  function cell(inner,w,o){ o=o||{};
    return '<w:tc><w:tcPr><w:tcW w:w="'+Math.round(w*20)+'" w:type="dxa"/>'+(o.span?'<w:gridSpan w:val="'+o.span+'"/>':'')+(o.vm?'<w:vMerge'+(o.vm==='start'?' w:val="restart"':'')+'/>':'')+
      '<w:vAlign w:val="'+(o.va||'center')+'"/></w:tcPr>'+inner+'</w:tc>'; }
  function tblHead(widths, ind, pad){
    return '<w:tblPr><w:tblW w:w="'+Math.round(widths.reduce(function(a,b){return a+b;},0)*20)+'" w:type="dxa"/><w:tblInd w:w="'+Math.round(ind*20)+'" w:type="dxa"/>'+
      '<w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(function(s){ return '<w:'+s+' w:val="single" w:sz="4" w:space="0" w:color="000000"/>'; }).join('')+'</w:tblBorders>'+
      '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="'+pad+'" w:type="dxa"/><w:right w:w="'+pad+'" w:type="dxa"/></w:tblCellMar></w:tblPr>'+
      '<w:tblGrid>'+widths.map(function(w){ return '<w:gridCol w:w="'+Math.round(w*20)+'"/>'; }).join('')+'</w:tblGrid>';
  }
  function docx(m, logo){   // logo: {bytes:Uint8Array, w, h, ext:'png'|'jpeg'} or null
    var f=m.f, body='', W12=[], i;
    for(i=0;i<12;i++) W12.push(TX[i+1]-TX[i]);
    function c12(t,i2,b,o){ return cell(para(run(t,{sz:12,b:b}),{jc:'center',sz:12}), W12[i2], o); }
    m.pages.forEach(function(pg, pi){
      var n=pg.rows.length, rows=n?pg.rows:[['1.'],['2.'],['3.']];
      body+=para(run('พพ. 1-1',{sz:14}),{jc:'right',sz:14});
      if(logo){ var hh=46, ww=hh*logo.w/logo.h, cx=Math.round(ww*12700), cy=Math.round(hh*12700);
        body+=para('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+(pi+1)+'" name="crest'+(pi+1)+'"/>'+
          '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
          '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+(pi+1)+'" name="crest"/><pic:cNvPicPr/></pic:nvPicPr>'+
          '<pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm>'+
          '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>',{jc:'center', auto:1}); }
      else body+=para(run(' '))+para(run(' '));
      body+=para(run('แบบบันทึกการขอแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่',{b:1}),{jc:'center', before:logo?4:0});
      body+=para(run(headLine(f)),{jc:'right'});
      body+=para(run('เรื่อง')+tab()+run('ขออนุญาตแลกเปลี่ยนคาบสอน/มอบหมายหน้าที่'),{tabs:[36]});
      body+=para(run('เรียน')+tab()+run('ผู้อำนวยการ'+SCHOOL),{tabs:[36]});
      body+=para(run(bodyText(f, pg.date, pg.blank)),{ind:36, jc:'thaiDistribute'});
      body+=para(tab()+run('1. งานสอน',{b:1})+tab()+chk(n===0)+run('ไม่มีคาบสอน ')+chk(n>0)+run('มีคาบสอน........'+(n||'....')+'..........คาบ แลกเปลี่ยนคาบดังนี้'),{tabs:[36,108], before:6});
      var t='<w:tbl>'+tblHead(W12, TX[0]-L, 30);
      t+='<w:tr>'+c12('ลำดับที่',0,1,{vm:'start'})+cell(para(run('คาบสอนปกติ',{sz:12,b:1}),{jc:'center',sz:12}),TX[6]-TX[1],{span:5})+
         cell(para(run('คาบที่ขอแลก',{sz:12,b:1}),{jc:'center',sz:12}),TX[10]-TX[6],{span:4})+cell(para(run('ลงชื่อผู้รับแลก/ผู้สอนแทน',{sz:12,b:1}),{jc:'center',sz:12}),TX[12]-TX[10],{span:2})+'</w:tr>';
      t+='<w:tr>'+cell(para('',{sz:12}),W12[0],{vm:'cont'})+['ว/ด/ป','คาบที่','ม...../.....','รหัสวิชา','สถานที่','ว/ด/ป','คาบที่','รหัสวิชา','สถานที่','ตัวบรรจง','ลายเซ็น'].map(function(h2,q){ return c12(h2,q+1,1); }).join('')+'</w:tr>';
      rows.forEach(function(r){ t+='<w:tr>'; for(var q=0;q<12;q++) t+=c12(r[q]||'',q,0); t+='</w:tr>'; });
      body+=t+'</w:tbl>';
      body+=para(tab()+run('2. งานหน้าที่อื่น ๆ',{b:1}),{tabs:[36], before:5});
      dutyLines(f).forEach(function(d){ body+=para(run(d.label)+tab()+chk(!d.has)+run('ไม่มี  ')+chk(d.has)+run(d.text),{tabs:[112]}); });
      body+=para(run('จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต'),{before:5});
      body+=para(run('ลงชื่อ............................................ผู้ขออนุญาต'),{left:180});
      body+=para(run('(.....'+fill(f.signName||f.reqName,28)+'.......)'),{left:196});
      var wl=AX[1]-AX[0], wr=AX[2]-AX[1], dl=Array(79).join('.'), P=function(s,o){ return para(run(s),o); }, Cn={jc:'center'};
      var a='<w:tbl>'+tblHead([wl,wr], 0, 100);
      a+='<w:tr>'+cell(P('ความเห็นหัวหน้ากลุ่มสาระการเรียนรู้ฯ')+P(dl)+P(' ')+P('ลงชื่อ............................................',Cn)+
            P('('+(f.headName?'..'+f.headName+'...':'............................................')+')',Cn)+P('หัวหน้ากลุ่มสาระการเรียนรู้'+(f.headDept||f.dept||''),Cn)+P(headDate(f),Cn), wl,{va:'top'})+
          cell(P('ความเห็นผู้ช่วยผู้อำนวยการกลุ่มบริหารวิชาการ')+P(dl)+P(' ')+P('ลงชื่อ............................................',Cn)+
            P('('+(f.asstName||'............................................')+')',Cn)+P('.........../....................../.............',Cn), wr,{va:'top'})+'</w:tr>';
      a+='<w:tr>'+cell(P('ความเห็นรองผู้อำนวยการกลุ่มบริหารวิชาการ')+P(dl)+P(' ')+P('('+(f.deputyName||'............................................')+')',Cn)+P('........../.........../............',Cn)+P(' '), wl,{va:'top'})+
          cell(P('ความเห็นผู้อำนวยการโรงเรียน')+para(chk(false)+run('อนุญาต')+tab()+chk(false)+run('ไม่อนุญาต'),{tabs:[100]})+para(chk(false)+run('อื่น ๆ .......................'))+
            P(' ')+P('('+(f.dirName||'............................................')+')',Cn)+P('ผู้อำนวยการโรงเรียน'+SCHOOL,Cn), wr,{va:'top'})+'</w:tr>';
      body+=para('',{sz:6})+a+'</w:tbl>';
      if(pi<m.pages.length-1) body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    });
    var NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="300" w:right="'+Math.round((PW-R)*20)+'" w:bottom="400" w:left="'+L*20+'" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>';
    var files=[
      {name:'[Content_Types].xml', data:utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')},
      {name:'_rels/.rels', data:utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')},
      {name:'word/document.xml', data:utf8(doc)},
      {name:'word/_rels/document.xml.rels', data:utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+(logo?'<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.'+logo.ext+'"/>':'')+'</Relationships>')}
    ];
    if(logo) files.push({name:'word/media/logo.'+logo.ext, data:logo.bytes});
    return zip(files);
  }
  root.FORMDOC={model:model, draw:draw, pdf:pdf, docx:docx, dTag:dTag, MONTH:MONTH, PW:PW, PH:PH};
})(typeof window!=='undefined'?window:globalThis);
