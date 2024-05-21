# media-streams
Explore the use of Webcodec to create MediaStream pipelines.
This Demo illustrates how you can:
1. Read MediaStreams from a webcam
2. Generate a video MediaStreamTrack out of them
3. Use the MediaStreamTrack MediaStreamTrackProcessor
4. That you add to a TransformStream
4. Which you post to a web worker that encodes and decodes it (as you'd wish) using Webcodec's VideoEncoder and VideoDecoder APIs
5. and then in the main thread, access the stream through that TransformStream, pipe it to a MediaStreamTrackGenerator
6. From which you can recreate a MediaStream to use as the source of your video Element

## References:
- https://webrtchacks.com/real-time-video-processing-with-webcodecs-and-streams-processing-pipelines-part-1/
- https://developer.chrome.com/docs/web-platform/best-practices/webcodecs
- https://developer.mozilla.org/en-US/docs/Web/API/TransformStream/TransformStream

