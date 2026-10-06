// The self-hosted MediaPipe loader uses importScripts; use a classic worker.
importScripts('./vision_bundle.js');
const {FilesetResolver,PoseLandmarker,FaceLandmarker}=SGXVision;
const asset=p=>new URL(p,self.location.href).href;
let pose,face,busy=false,count=0,cachedSignals={},cachedFace=[];
self.onmessage=async({data})=>{
  if(data.type==='init'){
    try{
      postMessage({type:'progress',message:'Preparando tus movimientos…'});
      const files=await FilesetResolver.forVisionTasks(asset('./wasm'));
      pose=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:asset('./pose.task'),delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.45,minPosePresenceConfidence:.45,minTrackingConfidence:.5});
      postMessage({type:'progress',message:'Añadiendo sonrisas…'});
      try{face=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:asset('./face.task'),delegate:'CPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true});}
      catch{postMessage({type:'warning',message:'Tu cuerpo está listo. Las expresiones faciales no están disponibles en este dispositivo.'});}
      postMessage({type:'ready',expressions:!!face});
    }catch(e){postMessage({type:'error',message:e.message||String(e)});}return;
  }
  if(data.type!=='frame')return;
  const bitmap=data.bitmap;
  if(!pose||busy){bitmap?.close();postMessage({type:'skipped'});return;}
  busy=true;
  try{
    const t=performance.now(),p=pose.detectForVideo(bitmap,data.time);
    if(face&&count++%2===0){
      const f=face.detectForVideo(bitmap,data.time);
      cachedSignals=Object.fromEntries((f.faceBlendshapes?.[0]?.categories||[]).map(x=>[x.categoryName,x.score]));
      cachedFace=f.faceLandmarks?.[0]||[];
    }
    postMessage({type:'result',points:p.landmarks?.[0]||[],world:p.worldLandmarks?.[0]||[],signals:cachedSignals,face:cachedFace,aspect:bitmap.width/bitmap.height,time:data.time,inference:performance.now()-t});
  }catch(e){postMessage({type:'frame-error',message:e.message||String(e)});}
  finally{bitmap.close();busy=false;}
};
