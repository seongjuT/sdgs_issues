/* SDG 이슈랩 - 독립 웹사이트용 스크립트
 * 이슈 데이터: data/issues.js (window.SDG_DATA)
 * 학생 아이디어: 브라우저 localStorage (기기별 저장)
 */
(function(){
"use strict";

const GOALS=[
 [1,"빈곤 퇴치","#E5243B"],[2,"기아 종식","#DDA63A"],[3,"건강과 웰빙","#4C9F38"],[4,"양질의 교육","#C5192D"],
 [5,"성평등","#FF3A21"],[6,"깨끗한 물과 위생","#26BDE2"],[7,"깨끗한 에너지","#FCC30B"],[8,"일자리와 경제성장","#A21942"],
 [9,"산업·혁신·인프라","#FD6925"],[10,"불평등 감소","#DD1367"],[11,"지속가능한 도시","#FD9D24"],[12,"책임있는 소비·생산","#BF8B2E"],
 [13,"기후행동","#3F7E44"],[14,"해양생태계","#0A97D9"],[15,"육상생태계","#56C02B"],[16,"평화·정의·제도","#00689D"],[17,"파트너십","#19486A"]];
const DARK_INK={7:true,2:true,11:true};
const gStyle=n=>{const g=GOALS[n-1];return g?`--g:${g[2]};--gi:${DARK_INK[n]?'#1b1b1b':'#fff'}`:""};
const DOMAINS=["전체","환경·기후","사회·인구","디지털·기술","글로벌 개발"];
const STEPS=[["문제 정의","HMW 질문"],["이해관계자","누가 겪나"],["아이디어","발상·비교"],["서비스 컨셉","한 장 정리"]];
const CUES=[
  ["알림·리마인더","위험하거나 놓치기 쉬운 순간에 알려 주면?"],
  ["지도·위치","장소를 찾거나 보여 주면?"],
  ["공공데이터 시각화","흩어진 통계를 한눈에 보여 주면?"],
  ["체크리스트·가이드","해야 할 일을 단계별로 안내하면?"],
  ["게임화·포인트","참여하면 보상이나 기록이 쌓이게 하면?"],
  ["매칭·연결","도움이 필요한 사람과 도울 사람을 이어 주면?"],
  ["접근성","큰 글씨·음성·쉬운 말로 바꾸면?"],
  ["AI 분류·추천","사진이나 글을 AI가 분류·추천하면?"],
  ["기록·인증","행동을 사진·기록으로 남기고 공유하면?"]
];
const KEY_DRAFT="sdglab-site-draft", KEY_IDEAS="sdglab-site-ideas";

const DATA=(window.SDG_DATA&&Array.isArray(window.SDG_DATA.issues))?window.SDG_DATA:{issues:[],exportedAt:""};
const S={issues:[...DATA.issues].sort((a,b)=>String(b.addedAt||"").localeCompare(String(a.addedAt||""))),
  ideas:[],goal:0,domain:"전체",q:"",ideaGoal:0,pick:"",step:0,draft:{}};

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isNew=d=>{const t=Date.parse(d);return t&&Date.now()-t<3*864e5};
const fmtDate=d=>{const t=new Date(d);return isNaN(t)?"":`${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,"0")}.${String(t.getDate()).padStart(2,"0")}`};
const store={
  get(k,def){try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
};

/* ---------- 뷰 전환 ---------- */
function setView(v){
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.view===v)));
  document.querySelectorAll(".view").forEach(el=>el.hidden=el.id!=="view-"+v);
  try{history.replaceState(null,"","#"+v)}catch(e){}
}
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>setView(b.dataset.view));

/* ---------- 이슈 ---------- */
function filtered(){
  const q=S.q.trim().toLowerCase();
  return S.issues.filter(i=>(!S.goal||(i.goals||[]).includes(S.goal))&&(S.domain==="전체"||i.domain===S.domain)&&
    (!q||[i.title,i.summary,...(i.facts||[]),...(i.keywords||[])].join(" ").toLowerCase().includes(q)));
}
function renderGoals(){
  const counts={};S.issues.forEach(i=>(i.goals||[]).forEach(g=>counts[g]=(counts[g]||0)+1));
  const el=$("#goals");el.classList.toggle("filtering",!!S.goal);
  el.innerHTML=`<button class="goal all ${!S.goal?'on':''}" data-g="0" aria-pressed="${!S.goal}"><span class="n">ALL</span><span class="t">전체 목표</span><span class="c">${S.issues.length}<small>건</small></span></button>`+
    GOALS.map(([n,t])=>`<button class="goal ${S.goal===n?'on':''} ${counts[n]?'':'zero'}" style="${gStyle(n)}" data-g="${n}" aria-pressed="${S.goal===n}" title="SDG ${n} ${t}"><span class="n">${n}</span><span class="t">${t}</span><span class="c" aria-label="관련 이슈 ${counts[n]||0}건">${counts[n]||0}<small>건</small></span></button>`).join("");
  el.querySelectorAll(".goal").forEach(b=>b.onclick=()=>{const g=+b.dataset.g;S.goal=S.goal===g?0:g;renderIssues()});
}
function renderDomains(){
  $("#domains").innerHTML=DOMAINS.map(d=>`<button class="chip" aria-pressed="${S.domain===d}" data-d="${d}">${d}</button>`).join("");
  $("#domains").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{S.domain=b.dataset.d;renderIssues()});
}
function issueCard(i){
  const gs=i.goals||[];
  return `<button class="card" data-id="${esc(i.id)}">
    <div class="stripe">${gs.map(g=>`<span style="${gStyle(g)}"></span>`).join("")}</div>
    <div class="body">
      <h3>${esc(i.title)}</h3>
      <p class="fact">${esc(i.summary)}</p>
      <div class="foot">${gs.map(g=>`<span class="badge" style="${gStyle(g)}">SDG ${g}</span>`).join("")}
        <span class="tag">${esc(i.region||"")}</span>${isNew(i.addedAt)?'<span class="tag new">NEW</span>':''}
        <span class="date">${fmtDate(i.addedAt)}</span></div>
    </div></button>`;
}
function renderIssues(){
  renderGoals();renderDomains();
  const list=filtered();
  $("#count").textContent=`${list.length}건`;
  const el=$("#issues");
  if(!S.issues.length){el.innerHTML=`<div class="empty"><strong>이슈 데이터를 찾을 수 없습니다</strong>data 폴더의 issues.js 파일이 사이트와 함께 올라가 있는지 확인해 주세요.</div>`;return}
  if(!list.length){el.innerHTML=`<div class="empty"><strong>조건에 맞는 이슈가 없습니다</strong>목표 타일이나 분야 필터를 해제해 보세요.</div>`;return}
  el.innerHTML=list.map(issueCard).join("");
  el.querySelectorAll(".card").forEach(c=>c.onclick=()=>openIssue(c.dataset.id));
}
$("#q").addEventListener("input",e=>{S.q=e.target.value;renderIssues()});

function sortSrc(a){return [...(a||[])].sort((x,y)=>String(y.date||"").localeCompare(String(x.date||"")))}
function openIssue(id){
  const i=S.issues.find(x=>x.id===id);if(!i)return;
  const d=$("#drawer");
  d.innerHTML=`<button class="close" id="dClose" aria-label="닫기">×</button>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${(i.goals||[]).map(g=>`<span class="badge" style="${gStyle(g)}">SDG ${g} ${esc(GOALS[g-1]?GOALS[g-1][1]:"")}</span>`).join("")}</div>
    <h3 id="dTitle">${esc(i.title)}</h3>
    <p>${esc(i.summary)}</p>
    <h4>근거 수치</h4><ul>${(i.facts||[]).map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
    <h4>출처 <span style="font-weight:400">· 최신순</span></h4><ul class="srcs">${sortSrc(i.sources).map(s=>`<li><span class="sdate">${s.date?esc(String(s.date).replace(/-/g,".")):"날짜 미상"}</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join("")}</ul>
    ${i.question?`<div class="q"><p class="eyebrow">탐구 질문</p><p>${esc(i.question)}</p></div>`:""}
    <h4>정보</h4><p style="margin:0;color:var(--muted);font-size:13px">${esc(i.domain)} · ${esc(i.region)} · 이슈 시점 ${esc(i.period||"")} · 등록 ${fmtDate(i.addedAt)}</p>
    <div class="actions" style="justify-content:flex-start;margin-top:20px"><button class="btn" id="dIdea">이 이슈로 아이디어 만들기</button></div>`;
  d.hidden=false;$("#scrim").hidden=false;
  $("#dClose").onclick=closeIssue;$("#dClose").focus();
  $("#dIdea").onclick=()=>{closeIssue();S.pick=i.id;S.step=0;S.draft={};saveDraft();renderLab();setView("lab");window.scrollTo(0,0)};
}
function closeIssue(){$("#drawer").hidden=true;$("#scrim").hidden=true}
$("#scrim").onclick=closeIssue;
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeIssue()});

/* ---------- 아이디어 랩 ---------- */
function saveDraft(){store.set(KEY_DRAFT,{pick:S.pick,step:S.step,draft:S.draft})}
function loadDraft(){const o=store.get(KEY_DRAFT,null);if(o){S.pick=o.pick||"";S.step=o.step||0;S.draft=o.draft||{}}}
const cur=()=>S.issues.find(x=>x.id===S.pick);

function renderPick(){
  const sel=$("#pickIssue");
  sel.innerHTML=`<option value="">이슈를 선택하세요</option>`+S.issues.map(i=>`<option value="${esc(i.id)}" ${i.id===S.pick?'selected':''}>${esc(i.title)}</option>`).join("");
  const i=cur();
  $("#pickedInfo").innerHTML=i?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${(i.goals||[]).map(g=>`<span class="badge" style="${gStyle(g)}">SDG ${g}</span>`).join("")}</div>
    <p style="margin:0 0 8px;font-size:14px">${esc(i.summary)}</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--muted)">${(i.facts||[]).slice(0,3).map(f=>`<li>${esc(f)}</li>`).join("")}</ul>`
    :`<p class="hint">이슈 탐색에서 카드를 열고 "이 이슈로 아이디어 만들기"를 눌러도 됩니다.</p>`;
}
$("#pickIssue").onchange=e=>{S.pick=e.target.value;S.draft={};S.step=0;saveDraft();renderLab()};

const F=(k,label,ph,ta)=>`<div class="field"><label for="f-${k}">${label}</label>${ta?`<textarea id="f-${k}" data-k="${k}" placeholder="${esc(ph)}">${esc(S.draft[k]||"")}</textarea>`:`<input id="f-${k}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(S.draft[k]||"")}">`}</div>`;
function stepDone(n){const d=S.draft;return [d.hmw,d.users,d.idea,d.name][n]}
function renderSteps(){
  $("#steps").innerHTML=STEPS.map(([a],n)=>`<button role="tab" aria-selected="${S.step===n}" class="${stepDone(n)?'done':''}" data-s="${n}"><b>${n+1}단계</b>${a}</button>`).join("");
  $("#steps").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.step=+b.dataset.s;saveDraft();renderLab()});
}
function renderPanel(){
  const p=$("#stepPanel"),i=cur();
  if(!i){p.innerHTML=`<div class="empty"><strong>먼저 이슈를 고르세요</strong>왼쪽에서 다룰 이슈를 선택하면 단계별 입력이 열립니다.</div>`;return}
  const nav=`<div class="actions">${S.step>0?'<button class="btn ghost" id="prev">이전</button>':''}${S.step<3?'<button class="btn" id="next">다음 단계</button>':'<button class="btn" id="saveIdea">내 보드에 저장</button>'}</div><div class="status" id="st"></div>`;
  let h="";
  if(S.step===0) h=`<h3>문제 정의</h3><p class="hint">이슈의 수치를 보고 "우리는 어떻게 하면 ~할 수 있을까?(HMW)" 질문으로 바꿉니다. 너무 넓으면 대상이나 장소를 좁혀 보세요.</p>
    ${F("hmw","HMW 질문","예: 우리는 어떻게 하면 70대 어르신이 혼자서도 병원 키오스크로 접수할 수 있게 도울까?",true)}
    ${F("why","이 문제를 고른 이유","주변에서 본 사례, 근거 수치 등",true)}`;
  if(S.step===1) h=`<h3>이해관계자</h3><p class="hint">문제를 직접 겪는 사람, 해결에 영향을 주는 사람을 나눠 적습니다.</p>
    ${F("users","주 사용자 (문제를 겪는 사람)","예: 혼자 병원에 가는 70대 이상 어르신",true)}
    <div class="row2">${F("helpers","돕는 사람·기관","예: 병원 안내 직원, 가족, 주민센터")}${F("pain","가장 큰 불편 한 가지","예: 화면 단계가 많고 글씨가 작다")}</div>`;
  if(S.step===2) h=`<h3>아이디어</h3><p class="hint">아래 발상 카드를 눌러 질문을 받고, 떠오르는 아이디어를 여러 개 적어 보세요. 그중 "가장 큰 불편"을 가장 잘 줄이는 하나를 고릅니다.</p>
    <div class="cues">${CUES.map(([t],k)=>`<button class="cue" data-cue="${k}">${t}</button>`).join("")}</div>
    ${F("mine","떠오른 아이디어 (여러 개, 줄바꿈으로 구분)","예: 키오스크 화면을 그대로 본뜬 연습 앱",true)}
    ${F("idea","최종 선택한 아이디어","하나를 골라 어떻게 불편을 줄이는지 한두 문장으로",true)}`;
  if(S.step===3) h=`<h3>서비스 컨셉 카드</h3><p class="hint">한 장으로 정리합니다. 저장한 뒤 "파일로 저장"이나 "복사하기"로 제출할 수 있습니다.</p>
    <div class="row2">${F("name","서비스 이름","예: 천천히 접수")}${F("form","형태","예: 모바일 앱 / 웹 / 키오스크 보조 화면")}</div>
    ${F("features","핵심 기능 3가지","줄바꿈으로 구분",true)}
    <div class="row2">${F("tech","사용 기술","예: Java, 음성인식 API, 공공데이터")}${F("metric","성과 지표","예: 도움 없이 접수 완료율")}</div>
    ${F("author","작성자","예: 2학년 3반 1모둠 홍길동")}
    <h4 style="font-size:13px;color:var(--muted);margin:16px 0 8px">미리보기</h4>${canvas(S.draft,i)}`;
  p.innerHTML=h+nav;
  p.querySelectorAll("[data-k]").forEach(el=>el.addEventListener("input",()=>{S.draft[el.dataset.k]=el.value;saveDraft();renderSteps()}));
  p.querySelectorAll("[data-cue]").forEach(b=>b.onclick=()=>{
    const [t,qq]=CUES[+b.dataset.cue];const ta=$("#f-mine");
    const line=`[${t}] ${qq} → `;
    ta.value=(ta.value&&!ta.value.endsWith("\n")?ta.value+"\n":ta.value)+line;
    S.draft.mine=ta.value;saveDraft();ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  });
  if($("#prev"))$("#prev").onclick=()=>{S.step--;saveDraft();renderLab()};
  if($("#next"))$("#next").onclick=()=>{S.step++;saveDraft();renderLab()};
  if($("#saveIdea"))$("#saveIdea").onclick=saveIdea;
}
function canvas(d,i){
  const c=(t,v,w)=>`<div class="cell ${w?'wide':''}"><h5>${t}</h5><p>${esc(v||"—")}</p></div>`;
  return `<div class="canvas">${c("서비스 이름",d.name)}${c("형태",d.form)}${c("관련 SDG",(i.goals||[]).map(g=>"SDG "+g).join(", "))}
  ${c("문제 정의 (HMW)",d.hmw,1)}${c("주 사용자",d.users)}${c("가장 큰 불편",d.pain)}${c("돕는 사람·기관",d.helpers)}
  ${c("아이디어",d.idea,1)}${c("핵심 기능",d.features)}${c("사용 기술",d.tech)}${c("성과 지표",d.metric)}</div>`;
}
function saveIdea(){
  const st=$("#st"),i=cur(),d=S.draft;
  if(!d.hmw||!d.idea||!d.name){st.className="status err";st.textContent="문제 정의, 최종 아이디어, 서비스 이름은 꼭 채워 주세요.";return}
  const idea={id:"i"+Date.now().toString(36),issueId:i.id,issueTitle:i.title,goals:i.goals||[],
    hmw:d.hmw,why:d.why||"",users:d.users||"",helpers:d.helpers||"",pain:d.pain||"",mine:d.mine||"",idea:d.idea,
    name:d.name,form:d.form||"",features:d.features||"",tech:d.tech||"",metric:d.metric||"",author:d.author||"",createdAt:new Date().toISOString()};
  S.ideas.unshift(idea);
  if(!store.set(KEY_IDEAS,S.ideas)){st.className="status err";st.textContent="이 브라우저에서는 저장할 수 없습니다(사생활 보호 모드 등). 아래 미리보기 내용을 복사해 두세요.";S.ideas.shift();return}
  S.draft={};S.step=0;saveDraft();renderLab();
  $("#boardStatus").textContent=`"${idea.name}"을(를) 내 보드에 저장했습니다. 파일로 저장해 제출하세요.`;
  const el=document.querySelector(`[data-idea="${idea.id}"]`);if(el)el.scrollIntoView({behavior:"smooth",block:"center"});
}

/* ---------- 마크다운 내보내기 ---------- */
function ideaMd(x){
  const g=(x.goals||[]).map(n=>`SDG ${n} ${GOALS[n-1]?GOALS[n-1][1]:""}`).join(", ");
  const bl=s=>String(s||"").split(/\r?\n/).filter(Boolean).map(t=>`- ${t}`).join("\n")||"- (작성 안 함)";
  return `# ${x.name}

- 작성자: ${x.author||"(미기재)"}
- 작성일: ${fmtDate(x.createdAt)}
- 대상 이슈: ${x.issueTitle}
- 관련 목표: ${g}
- 형태: ${x.form||"(미기재)"}

## 1. 문제 정의 (HMW)
${x.hmw}

이 문제를 고른 이유: ${x.why||"(미기재)"}

## 2. 이해관계자
- 주 사용자: ${x.users||"(미기재)"}
- 돕는 사람·기관: ${x.helpers||"(미기재)"}
- 가장 큰 불편: ${x.pain||"(미기재)"}

## 3. 아이디어
떠오른 아이디어:
${bl(x.mine)}

최종 선택: ${x.idea}

## 4. 서비스 컨셉
핵심 기능:
${bl(x.features)}

- 사용 기술: ${x.tech||"(미기재)"}
- 성과 지표: ${x.metric||"(미기재)"}
`;
}
function safeName(s){return String(s||"아이디어").replace(/[\\/:*?"<>|\s]+/g,"_").slice(0,40)}
function downloadText(name,text){
  /* 윈도우 메모장에서도 한글이 깨지지 않도록 UTF-8 BOM을 붙인다 */
  const blob=new Blob(["﻿",text],{type:"text/markdown;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},500);
}
async function copyText(text,statusEl){
  try{await navigator.clipboard.writeText(text);statusEl.textContent="복사했습니다. 제출할 곳에 붙여 넣으세요.";}
  catch(e){
    const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
    let ok=false;try{ok=document.execCommand("copy")}catch(_){}
    ta.remove();statusEl.textContent=ok?"복사했습니다. 제출할 곳에 붙여 넣으세요.":"복사하지 못했습니다. 파일로 저장을 이용해 주세요.";
  }
}

function renderBoard(){
  const goalsUsed=[...new Set(S.ideas.flatMap(x=>x.goals||[]))].sort((a,b)=>a-b);
  $("#ideaGoalFilter").innerHTML=[0,...goalsUsed].map(g=>`<button class="chip" aria-pressed="${S.ideaGoal===g}" data-g="${g}">${g?'SDG '+g:'전체'}</button>`).join("");
  $("#ideaGoalFilter").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{S.ideaGoal=+b.dataset.g;renderBoard()});
  const list=S.ideas.filter(x=>!S.ideaGoal||(x.goals||[]).includes(S.ideaGoal));
  $("#ideaCount").textContent=`${list.length}건`;
  $("#exportAll").hidden=S.ideas.length<2;
  $("#ideas").innerHTML=list.length?list.map(x=>`<div class="ideacard" data-idea="${esc(x.id)}">
    <div style="display:flex;gap:4px;flex-wrap:wrap">${(x.goals||[]).map(g=>`<span class="badge" style="${gStyle(g)}">SDG ${g}</span>`).join("")}</div>
    <h4>${esc(x.name)}</h4><p>${esc(x.hmw)}</p><p><b style="color:var(--fg)">아이디어</b> ${esc(x.idea)}</p>
    <div class="stage">${esc(x.issueTitle)}${x.author?' · '+esc(x.author):''} · ${fmtDate(x.createdAt)}</div>
    <div class="acts"><button class="chip" data-act="file">파일로 저장</button><button class="chip" data-act="copy">복사하기</button><button class="chip" data-act="edit">다시 편집</button><button class="chip danger" data-act="del">삭제</button></div></div>`).join("")
    :`<div class="empty"><strong>아직 저장된 아이디어가 없습니다</strong>위에서 4단계를 마치고 "내 보드에 저장"을 누르면 이곳에 카드가 생깁니다.</div>`;
  $("#ideas").querySelectorAll(".ideacard").forEach(card=>{
    const x=S.ideas.find(v=>v.id===card.dataset.idea);
    card.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
      const act=b.dataset.act,st=$("#boardStatus");
      if(act==="file"){downloadText(`${safeName(x.name)}.md`,ideaMd(x));st.textContent=`"${x.name}" 파일을 저장했습니다.`}
      if(act==="copy")copyText(ideaMd(x),st);
      if(act==="edit"){
        S.pick=x.issueId;S.step=3;S.draft={hmw:x.hmw,why:x.why,users:x.users,helpers:x.helpers,pain:x.pain,mine:x.mine,idea:x.idea,name:x.name,form:x.form,features:x.features,tech:x.tech,metric:x.metric,author:x.author};
        saveDraft();renderLab();document.querySelector(".lab").scrollIntoView({behavior:"smooth"});
        st.textContent="편집 중인 내용을 저장하면 새 카드로 추가됩니다. 이전 카드는 필요 없으면 삭제하세요.";
      }
      if(act==="del"){
        if(b.dataset.armed!=="true"){b.dataset.armed="true";b.textContent="한 번 더 누르면 삭제";setTimeout(()=>{if(b.isConnected){b.dataset.armed="false";b.textContent="삭제"}},4000);return}
        S.ideas=S.ideas.filter(v=>v.id!==x.id);store.set(KEY_IDEAS,S.ideas);renderBoard();st.textContent=`"${x.name}"을(를) 삭제했습니다.`;
      }
    });
  });
}
$("#exportAll").onclick=()=>{
  const md=S.ideas.map(ideaMd).join("\n---\n\n");
  const stamp=fmtDate(new Date().toISOString()).replace(/\./g,"");
  downloadText(`SDG_아이디어_${stamp}.md`,md);$("#boardStatus").textContent=`아이디어 ${S.ideas.length}건을 한 파일로 저장했습니다.`;
};
function renderLab(){renderPick();renderSteps();renderPanel();renderBoard()}

/* ---------- 시작 ---------- */
function renderMeta(){
  const nNew=S.issues.filter(i=>isNew(i.addedAt)).length;
  const base=DATA.exportedAt?fmtDate(DATA.exportedAt):"";
  $("#meta").textContent=S.issues.length?`이슈 ${S.issues.length}건${base?` · 데이터 기준 ${base}`:''}${nNew?` · 새 이슈 ${nNew}`:''}`:"이슈 없음";
  if(base)$("#footer").textContent=`SDG 이슈랩 · 이슈 데이터 기준일 ${base} · 이슈 출처는 각 이슈 상세에서 확인할 수 있습니다.`;
}
loadDraft();
S.ideas=store.get(KEY_IDEAS,[]);if(!Array.isArray(S.ideas))S.ideas=[];
if(S.pick&&!cur()){S.pick="";S.step=0;S.draft={}}
renderMeta();renderIssues();renderLab();
const h=(location.hash||"").slice(1);if(["issues","lab","design"].includes(h))setView(h);
})();
