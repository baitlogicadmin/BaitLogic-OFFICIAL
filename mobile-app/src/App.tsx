import { useEffect, useState } from "react";
import FeatureTools from "./FeatureTools";
import MobileDashboard from "./MobileDashboard";
import DesktopDashboard from "./DesktopDashboard";

function useDesktopMode(){
  const query="(min-width: 761px)";
  const [desktop,setDesktop]=useState(()=>window.matchMedia(query).matches);
  useEffect(()=>{
    const media=window.matchMedia(query);
    const onChange=()=>setDesktop(media.matches);
    media.addEventListener("change",onChange);
    return()=>media.removeEventListener("change",onChange);
  },[]);
  return desktop;
}

export default function App(){
  const desktop=useDesktopMode();
  return <><FeatureTools />{desktop?<DesktopDashboard/>:<MobileDashboard/>}</>;
}
