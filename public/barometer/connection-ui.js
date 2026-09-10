setInterval(()=>{const s=(document.querySelector('#connectionStatus')?.textContent||'').toLowerCase(),p=document.querySelector('#connectionPill');if(!p)return;const loading=s.includes('loading')||s.includes('locating'),offline=s.includes('offline'),saved=s.includes('saved'),failed=s.includes('unavailable');p.dataset.mode=offline?'offline':saved?'saved':loading?'loading':failed?'error':'live';const x=p.querySelector('span');if(x)x.textContent=offline?'OFFLINE':saved?'SAVED • REFRESHING':loading?'CONNECTING':failed?'RETRY':'LIVE';},300);

// Load the recovery guard without changing the barometer page structure.
if(!document.querySelector('script[data-bl-live-recovery]')){
  const s=document.createElement('script');
  s.src='/barometer/live-data-recovery.js?v=1';
  s.defer=true;
  s.dataset.blLiveRecovery='1';
  document.head.appendChild(s);
}
