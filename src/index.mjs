import "./styles.css";
import * as VIDEO from "./video.mjs";

document.getElementById("app").innerHTML = `

<div style="width: 500px; height: 500px; margin: 0 auto;">
<h1 style="text-align: center;">Media Streams</h1>

   <div>
        <video style="width: 500px; " height="100%" id="outputVideo" autoplay muted controls  />
   </div>
   <div id="params" style="width: 500px; margin: 10px;">
      <p>Video resolution:<br/>
        <em>(Your camera may not support all modes!)</em><br/>
        <select id="resolution">
          <option value="default">Full HD if from scratch, HD if from camera</option>
          <option value="360p">SD 360p - 640 x 360</option>
          <option value="480p">SD 480p - 640 x 480</option>
          <option value="720p">HD 720p - 1280 x 720</option>
          <option value="1080p">Full HD 1080p - 1920 x 1080</option>
          <option value="1440p">QHD 1440p - 2560 x 1440</option>
          <option value="2160p">4K 2160p - 3840 x 2160</option>
        </select>
      </p>
      <p>
        Number of video frames per second:<br/>
        <input type="text" id="framerate" value="25">
      </p>
      <p>
      Add overlay to track actual display time in <code>&lt;video&gt;</code> element?<br/>
      <div style="display: flex; flex-direction: column; align-items: start; row-gap: 10px; padding: 5px;">
        <div>
         <input type="radio" id="overlay1" name="overlay" value="none">
         <label for="overlay1">No overlay</label><br/>
        </div> 
        <div>
        <input type="radio" id="overlay2" name="overlay" value="timestamp" checked="checked">
        <label for="overlay2">Add timestamp overlay in bottom-right corner (<em>uses WebGPU</em>)</label>
        </div>
    </div>

</div>

  <div>
    <button id="startButton">Start</button>
    <button id="stopButton">Stop</button>
  </div>

</div>
`;
