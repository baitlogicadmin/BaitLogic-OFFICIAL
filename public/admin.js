"use strict";

async function loadDashboard(){
  const key=document.getElementById('adminKey')?.value?.trim();
  const button=document.querySelector('button');
  if(!key){alert('Enter the admin key.');return;}
  if(button){button.disabled=true;button.textContent='Loading…';}
  try{
    const response=await fetch(`/api/admin/summary?key=${encodeURIComponent(key)}`,{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`Admin request failed (${response.status})`);
    const signups=document.getElementById('signups');
    const reports=document.getElementById('reports');
    const catches=document.getElementById('catches');
    if(signups)signups.textContent=data.signups??'Protected';
    if(reports)reports.textContent=String(data.reports??0);
    if(catches)catches.textContent=String(data.catches??0);
  }catch(error){
    alert(error.message||'Could not load the dashboard.');
  }finally{
    if(button){button.disabled=false;button.textContent='Load Dashboard';}
  }
}

window.loadDashboard=loadDashboard;
