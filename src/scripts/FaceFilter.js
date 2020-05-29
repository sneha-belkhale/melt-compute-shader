import * as FaceFilter from './JeelizFilter'

function init_faceFilter(meltCallback){
    let smoothEuler = new THREE.Euler();
    let smoothMouth = 0;
    JEEFACEFILTERAPI.init({
      canvasId: 'jeeFaceFilterCanvas',
      NNCpath: 'assets/NNC4Expr0.json', // This neural network model has learnt 4 expressions
      
      maxFacesDetected: 1,
      callbackReady: function(errCode, spec){
        if (errCode){
        console.log('AN ERROR HAPPENS. ERR =', errCode);
        return;
        }
        console.log('INFO: JEEFACEFILTERAPI IS READY');
      },
  
      // called at each render iteration (drawing loop):
      callbackTrack: function(detectState) {
        const expr = detectState.expressions;
        const mouthOpen = expr[0];
        const mouthSmile = expr[1];
        const eyebrowFrown = expr[2];
        const eyebrowRaised = expr[3];
        if(!detectState.detected) return;
        smoothEuler.x = 0.9 * smoothEuler.x + 0.1 * detectState.rx;
        smoothEuler.y = 0.9 * smoothEuler.y - 0.1 * detectState.ry;
        smoothMouth = 0.9 * smoothMouth +  0.1 * mouthOpen;
        meltCallback(smoothEuler, smoothMouth);
        // // set mouth according the expression:
        // MOUTHOPENMESH.scale.setX(mouthOpen).setZ(mouthOpen);
        // MOUTHSMILEMESH.scale.setX(mouthSmile).setZ(mouthSmile);
  
        // // set eyebrows:
        // const yEyeBrows = ( eyebrowFrown > eyebrowRaised ) ? -0.2 * eyebrowFrown : 0.7 * eyebrowRaised;
        // EYEBROWSMESH.position.setY(0.3 + yEyeBrows);
  
        // THREE.JeelizHelper.render(detectState, THREECAMERA);
      }
    }); //end JEEFACEFILTERAPI.init call
  }

  function InitFaceFilter(meltCallback)
  {
    let canvas = document.createElement("canvas");
    canvas.setAttribute("id", "jeeFaceFilterCanvas")
    canvas.style.height = 0;
    document.body.appendChild(canvas)
    // JeelizResizer.size_canvas({
    //     canvasId: 'jeeFaceFilterCanvas',
    //     callback: function(isError, bestVideoSettings){
    //       init_faceFilter(meltCallback);
    //     }
    //   })
    init_faceFilter(meltCallback);
  }

  export { InitFaceFilter };


