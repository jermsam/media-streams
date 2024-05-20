import "./styles.css";
import * as VIDEO from "./video.mjs";

document.getElementById("app").innerHTML = `

<div style="width: 500px; height: 500px; margin: 0 auto;">
<h1>Media Streams</h1>
<video height="100%" width="100%" id="outputVideo" autoplay muted controls></video>
<div>
  <button id="startButton">Start</button>
  <button id="stopButton">Stop</button>
</div>
</div>
`;
