"use strict";

async function loadDashboard(){
  const key=document.getElementById('adminKey')?.value?.trim();
  const button=document.querySelector('button');
  if(!key){alert('Enter the admin key.');return;}
  if(button){button.disabled=true;button.textContent='Loading…';}
  try{
    const response=await fetch('/api/admin/summary',{cache:'no-store',headers:{'x-admin-key':key}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Admin request failed (${response.status})`);
    const fields=['signups','waitlistSignups','reports','catches','natureChecks','natureChecksPending'];
    for(const field of fields){
      const el=document.getElementById(field);
      if(el)el.textContent=String(data[field]??0);
    }
    const updated=document.getElementById('updatedAt');
    if(updated)updated.textContent=new Date().toLocaleString();
  }catch(error){
    alert(error.message||'Could not load the dashboard.');
  }finally{
    if(button){button.disabled=false;button.textContent='Refresh Live Stats';}
  }
}

window.loadDashboard=loadDashboard;
