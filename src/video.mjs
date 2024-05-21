import InstrumentedTransformStream from './InstrumentedTransformStream.js';
import {resolutions} from './settings.js';

const framesToClose = {};

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const outputVideo = document.getElementById("outputVideo");

  let running = false;

  const paramsSection = document.getElementById('params');
  const resolutionInput = document.getElementById('resolution');
  const frameRateInput = document.getElementById('framerate');
  const overlayModeEl = document.querySelector('input[name="overlay"]:checked');
  const memoryModeEl = document.querySelector('input[name="memory"]:checked');

  // initial
  startButton.disabled = false;
  stopButton.disabled = true;
  paramsSection.hidden = false;
  outputVideo.hidden = true;

  InstrumentedTransformStream.resetStats();
  // Get the requested frame rate
  const frameRate = parseInt(frameRateInput.value, 10);

  // Get the requested video frame resolution
  let resolution;
  const requestedResolution = resolutionInput.value;
  if (requestedResolution === 'default') {
    resolution = resolutions['720p'];
  } else {
    resolution = resolutions[requestedResolution];
  }
  resolution = JSON.parse(JSON.stringify(resolution));

  // Overly mode
  const overlayMode = overlayModeEl?.value || 'none';

  // Memory mode
  const memoryMode = memoryModeEl?.value || 'no';

  const  encodeConfig = {
    // alpha: 'discard',
    // latencyMode: 'realtime',
    // bitrateMode: 'variable',
    // codec: 'H264',
    // width: resolution.width,
    // height: resolution.height,
    // bitrate: 1000000,
    // framerate: frameRate,
    // keyInterval: 300,
    // // codec: 'avc1.42002A',
    // avc: { format: 'annexb' },
    // pt: 1
    codec: "vp8",
    width: 640,
    height: 480,
    bitrate: 2_000_000, // 2 Mbps
    framerate: 30,
  };

  const config = {
    streamMode: 'usermedia',
    transformModes: {
      encode: true
    },
    overlayMode,
    memoryMode,
    // colors,
    width: resolution.width,
    height: resolution.height,
    frameRate,
    encodeConfig,
  };

  startButton.addEventListener("click", () => {
    running = true;
    paramsSection.hidden = true;
    startButton.disabled = true;
    stopButton.disabled = false;
    outputVideo.hidden = false;
    start();
  });

  stopButton.addEventListener("click", () => {
    stopButton.disabled = true;
    startButton.disabled = false;
    running = false;
    paramsSection.hidden = false;
    outputVideo.hidden = true;
    stop();
  });

  const worker = new Worker(new URL("worker.mjs", import.meta.url),  {type: 'module'});

  const getUserMedia = (constraints) => {
    try{
      return  navigator.mediaDevices.getUserMedia({...constraints})
    } catch (e) {
      console.log(e);
    }
  }

  const setFrameToClose = () => new InstrumentedTransformStream({
    name: 'input',
    async transform(videoFrame, controller) {
      framesToClose[videoFrame.timestamp] = videoFrame;
      controller.enqueue(videoFrame);
    },
  });

  const changeFrameToClose = () => new TransformStream({
    async transform(videoFrame, controller) {
      // The transform creates another VideoFrame from the first one.
      // Chromium does not properly close the frame, so let's do that now
      // and track the new VideoFrame from now on.
      if (framesToClose[videoFrame.timestamp]) {
        framesToClose[videoFrame.timestamp].close();
      }

      framesToClose[videoFrame.timestamp] = videoFrame;
      controller.enqueue(videoFrame);
    },
  });

  const closeFrameToClose = () => new InstrumentedTransformStream({
    name: 'final',
    transform(frame, controller) {
        const inputFrame = framesToClose[frame.timestamp];
        if (inputFrame) {
          if (inputFrame !== frame) {
            inputFrame.close();
          }
          delete framesToClose[frame.timestamp];
        }

      controller.enqueue(frame);
    }
  });


  let videoTrack;
  async function start() {
    try {

      const mediaStream = await getUserMedia({ video: true });
      videoTrack = mediaStream.getVideoTracks()[0];
      const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });

      const inputTransformer = setFrameToClose();

      trackProcessor.readable.pipeTo(inputTransformer.writable)


      let input = inputTransformer.readable;

      const identityTransform = changeFrameToClose()
      let output = identityTransform.writable;

      worker.postMessage({
        type: 'start',
        config,
        streams: {
          input,
          output
        }
      }, [input, output]);

      input = identityTransform.readable;

      const finalTransformer = closeFrameToClose();

      input = input.pipeThrough(finalTransformer);

      const trackGenerator = new MediaStreamTrackGenerator({ kind: "video" });
      input
        .pipeTo(trackGenerator.writable);

      outputVideo.srcObject = new MediaStream([trackGenerator]);

    } catch (e) {
      console.log(e);
    }
  }

  async function stop() {
    if (videoTrack) {
      videoTrack.stop();
      videoTrack = null;
    }
    worker.postMessage({
      type: "stop",
    });
  }
});
