import React, {useEffect,useRef,useState} from 'react';
// Scanning only fills the booking code. Staff must still verify and confirm check-in.
export default function QrScanner({onCode}) {
 const video=useRef(null),stream=useRef(null),timer=useRef(null),generation=useRef(0);
 const [active,setActive]=useState(false),[starting,setStarting]=useState(false),[message,setMessage]=useState('Scan a guest’s QR pass, or enter their booking code above.');
 const cleanup=()=>{generation.current++;clearTimeout(timer.current);stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(video.current)video.current.srcObject=null;};
 const stop=()=>{cleanup();setActive(false);setStarting(false);};
 useEffect(()=>()=>cleanup(),[]);
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
 const start=async()=>{
  cleanup();const run=generation.current;setStarting(true);setMessage('Opening camera…');
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.BarcodeDetector)throw new Error('Camera scanning is unavailable here. Enter the booking code above.');
   const formats=await window.BarcodeDetector.getSupportedFormats();if(!formats.includes('qr_code'))throw new Error('This browser cannot scan QR codes. Use the booking code above.');
   const detector=new window.BarcodeDetector({formats:['qr_code']});
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
   if(run!==generation.current){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;video.current.srcObject=media;await video.current.play();if(run!==generation.current)return;setActive(true);setStarting(false);setMessage('Point the camera at the QR pass.');
   const scan=async()=>{
    if(run!==generation.current)return;
    try{
     const codes=video.current?.readyState>=2?await detector.detect(video.current):[];
     if(run!==generation.current)return;
     if(codes.length){
      let value=codes[0].rawValue.trim();
      if(/^https?:\/\//i.test(value)){const url=new URL(value);const match=url.pathname.match(/^\/check-in\/([^/]+)\/?$/);if(!match)throw new Error('Use a DineFor booking QR pass.');value=decodeURIComponent(match[1]);}
      if(!/^[a-z0-9-]{3,100}$/i.test(value))throw new Error('This QR code does not contain a booking code.');
      stop();onCode(value.toUpperCase());setMessage('Code captured. Select Verify to review the reservation.');return;
     }
    }catch(error){stop();setMessage(error.message||'Unable to read this QR. Enter the code manually.');return;}
    timer.current=setTimeout(scan,250);
   };scan();
  }catch(error){if(run!==generation.current)return;stop();setMessage(error.name==='NotAllowedError'?'Camera permission was not granted. You can still enter the booking code manually.':error.message||'Camera unavailable. Enter the booking code manually.');}
 };
 return <section className="df-qr-scanner"><div><span className="material-symbols-outlined" aria-hidden="true">qr_code_scanner</span><h4>Scan a reservation pass</h4><p role="status">{message}</p></div><video ref={video} muted playsInline hidden={!active} aria-label="QR camera preview"/><button type="button" className="btn-outline" onClick={active||starting?stop:start}>{active||starting?'Stop camera':'Open camera'}</button></section>;
}
