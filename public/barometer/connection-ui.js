setInterval(()=>{const s=(document.querySelector('#connectionStatus')?.textContent||'').toLowerCase(),p=document.querySelector('#connectionPill');if(!p)return;const loading=s.includes('loading')||s.includes('locating'),offline=s.includes('offline'),saved=s.includes('saved'),failed=s.includes('unavailable');p.dataset.mode=offline?'offline':saved?'saved':loading?'loading':failed?'error':'live';const x=p.querySelector('span');if(x)x.textContent=offline?'OFFLINE':saved?'SAVED • REFRESHING':loading?'CONNECTING':failed?'RETRY':'LIVE';},300);

// Recovery guard: if the primary barometer request stalls or a stale client leaves
// the pressure placeholder visible, live-data-recovery.js retries the verified API.
