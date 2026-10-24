export class RoyalCamera{
  constructor(video,{status,frame,error,warning}){this.video=video;this.onStatus=status;this.onFrame=frame;this.onError=error;this.onWarning=warning;this.generation=0;this.active=false;}
  async start(){
    this.stop();const token=this.generation;this.active=true;
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Abre Tiny Royals en una pestaña HTTPS para usar tu cámara.');
      const policy=document.permissionsPolicy||document.featurePolicy;
      if(policy&&!policy.allowsFeature('camera'))throw new Error('Esta vista bloquea la cámara. Abre el teatro en una pestaña nueva.');
      this.onStatus('starting','Permite la cámara en el aviso del navegador.');
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'user'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
      if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.video.srcObject=stream;
      await this.waitForVideo();if(token!==this.generation)return;
      stream.getVideoTracks()[0].onended=()=>{if(token===this.generation){this.stop();this.onError('Se desconectó la cámara. Conéctala y vuelve a intentarlo.');}};
      this.onStatus('loading','Preparando tus movimientos…');
      const worker=this.worker=new Worker('/tracking/worker.js');
      this.loadingTimeout=setTimeout(()=>this.fail('La magia tardó demasiado en cargar. Vuelve a encender la cámara.'),60000);
      worker.onmessage=({data})=>{
        if(this.worker!==worker)return;
        if(data.type==='progress')this.onStatus('loading',data.message);
        if(data.type==='ready'){clearTimeout(this.loadingTimeout);this.ready=true;this.onStatus('on','¡Tu royal te sigue!');}
        if(data.type==='result'){this.pending=false;this.errors=0;this.onFrame(data);}
        if(data.type==='skipped')this.pending=false;
        if(data.type==='warning')this.onWarning(data.message);
        if(data.type==='error')this.fail('No pudimos preparar los movimientos. Intenta de nuevo o juega sin cámara.');
        if(data.type==='frame-error'){this.pending=false;if(++this.errors>=3)this.fail('La cámara necesita un descanso. Vuelve a encenderla o juega con los botones.');}
      };
      worker.onerror=()=>this.fail('El tracking no pudo cargar. Recarga el teatro e intenta de nuevo.');
      worker.postMessage({type:'init'});this.timer=setInterval(()=>this.sendFrame(),67);
    }catch(e){if(token!==this.generation)return;this.stop();this.onError(this.friendlyError(e));}
  }
  waitForVideo(){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const finish=e=>{if(settled)return;settled=true;clearTimeout(timeout);this.video.removeEventListener('loadeddata',loaded);this.video.removeEventListener('error',failed);this.cancelVideo=null;e?reject(e):resolve();};
      const loaded=()=>{if(this.video.readyState>=2&&this.video.videoWidth>0)finish();};
      const failed=()=>finish(new Error('La cámara abrió, pero no llegó vídeo. Cierra otras apps que la estén usando.'));
      const timeout=setTimeout(failed,15000);this.cancelVideo=()=>finish(new DOMException('Cancelled','AbortError'));
      this.video.addEventListener('loadeddata',loaded);this.video.addEventListener('error',failed);
      this.video.play().then(loaded).catch(finish);loaded();
    });
  }
  async sendFrame(){
    if(document.hidden)return;
    if(this.pending&&performance.now()-this.lastSent>12000){this.fail('La cámara dejó de responder. Intenta encenderla otra vez.');return;}
    if(!this.ready||this.pending||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;
    this.pending=true;this.lastSent=performance.now();this.lastVideoTime=this.video.currentTime;
    const worker=this.worker,token=this.generation;
    try{
      const w=Math.min(480,this.video.videoWidth),h=Math.max(1,Math.round(w*this.video.videoHeight/this.video.videoWidth));
      const bitmap=await createImageBitmap(this.video,{resizeWidth:w,resizeHeight:h});
      if(token!==this.generation||worker!==this.worker){bitmap.close();return;}
      worker.postMessage({type:'frame',bitmap,time:this.lastSent},[bitmap]);
    }catch{if(worker!==this.worker)return;this.pending=false;if(++this.errors>=3)this.fail('Tu navegador no pudo leer los movimientos. Prueba en una pestaña nueva o juega sin cámara.');}
  }
  fail(message){this.stop();this.onError(message);}
  stop(){
    this.generation++;this.active=false;this.cancelVideo?.();clearInterval(this.timer);clearTimeout(this.loadingTimeout);
    this.worker?.terminate();this.worker=null;this.stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});this.stream=null;
    this.video.srcObject=null;this.ready=false;this.pending=false;this.lastVideoTime=-1;this.errors=0;this.onStatus('off','');
  }
  friendlyError(e){
    if(['NotAllowedError','PermissionDeniedError','SecurityError'].includes(e.name))return 'La cámara necesita permiso. Pide ayuda a un adulto para permitirla en los ajustes de este sitio y vuelve a intentarlo.';
    if(['NotFoundError','DevicesNotFoundError'].includes(e.name))return 'No encontramos una cámara. Puedes seguir jugando con los botones y arrastrando tu royal.';
    if(['NotReadableError','TrackStartError','AbortError'].includes(e.name))return 'Otra app podría estar usando la cámara. Ciérrala y vuelve a intentarlo.';
    return e.message||'La cámara no pudo abrir. Puedes jugar sin cámara.';
  }
}
