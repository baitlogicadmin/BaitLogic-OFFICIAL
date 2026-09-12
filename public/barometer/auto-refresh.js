"use strict";

// Start the barometer with the user's current location instead of leaving the
// live-data screen parked at READY. The user can still switch to Highland, IL
// with the existing button when they prefer a fixed area.
function startBaitLogicLocation(){
  const begin=document.querySelector('#beginLocation');
  if(begin) begin.click();
}

if(document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded",()=>setTimeout(startBaitLogicLocation,300),{once:true});
} else {
  setTimeout(startBaitLogicLocation,300);
}

// Refresh live conditions every 15 minutes while the page is open.
setInterval(()=>{
  if(navigator.onLine && !document.hidden) document.querySelector('#refreshConditions')?.click();
},900000);