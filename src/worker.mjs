import InstrumentedTransformStream from './InstrumentedTransformStream.js';

let encoder;
let decoder;

// TEMP: VideoFrames sent through a TransformStream are serialized (and thus
// cloned) and not transferred for now. This means that they need to be closed
// on both ends, in particular when TransformStream sits across workers.
// Unfortunately, they cannot be closed right away on the sender's end because
// the receiver may not yet have received them. Workaround is to close them at
// the end of the processing.
// For additional context, see https://github.com/whatwg/streams/issues/1187
const framesToClose = {};

onmessage = (event) => {

  switch (event.data.type) {
    case 'start': {
      InstrumentedTransformStream.resetStats();
      const inputStream = event.data.streams.input;
      const outputStream = event.data.streams.output;
      const config = event.data.config;
      const encodeConfig = config.encodeConfig;
      let intermediaryStream = inputStream;
      const encodedStreamTransformer = encodeVideoStream(encodeConfig);
      const decodedStreamTransformer = decodeVideoStream();
      intermediaryStream = intermediaryStream
        .pipeThrough(encodedStreamTransformer)
        .pipeThrough(decodedStreamTransformer)
        .pipeThrough(new TransformStream({
          transform(frame, controller) {
            framesToClose[frame.timestamp] = frame;
            controller.enqueue(frame);
          },
        }))
        .pipeTo(outputStream);

      break;
    }
    case 'stop': {

      if (encoder) {
        encoder.close();
        encoder = null;
      }
      if (decoder) {
        decoder.close();
        decoder = null;
      }

      break;
    }
    case 'closeframe': {
      const frame = framesToClose[event.data.timestamp];
      if (frame) {
        frame.close();
        delete framesToClose[event.data.timestamp];
      }
      break;
    }
  }
};

function encodeVideoStream(config) {
  return new InstrumentedTransformStream({
    name: 'encode',
    async start(controller) {
      this.encodedCallback = null;
      this.frameCounter = 0;
      this.seqNo = 0;
      this.keyframeIndex = 0;
      this.deltaframeIndex = 0;
      const encoderOutputHandler = (chunk, metadata) => {
        if (metadata.decoderConfig) {
          const decoderConfig = JSON.stringify(metadata.decoderConfig);
          const configChunk =
            {
              type: 'config',
              seqNo: this.seqNo,
              keyframeIndex: this.keyframeIndex,
              deltaframeIndex: this.deltaframeIndex,
              timestamp: 0,
              pt: 0,
              config: decoderConfig,
            };
          controller.enqueue(configChunk);
        }
        chunk.temporalLayerId = 0;
        this.seqNo++;
        if (chunk.type === 'key') {
          this.keyframeIndex++;
          this.deltaframeIndex = 0;
        } else {
          this.deltaframeIndex++;
        }
        chunk.seqNo = this.seqNo;
        chunk.keyframeIndex = this.keyframeIndex;
        chunk.deltaframeIndex = this.deltaframeIndex;
        if (this.encodedCallback) {
          this.encodedCallback();
          this.encodedCallback = null;
        }
        controller.enqueue(chunk);
      };

      const init = {
        output: encoderOutputHandler,
        error: e => {
          console.error(e);
        },
      };

      const {supported,config: thisConfig} = await VideoEncoder.isConfigSupported(config);

      if (supported) {
        this.encoder = encoder = new VideoEncoder(init);
        this.encoder.configure(thisConfig);
      } else {
        // Try another config.
        console.warn('encode config not supported');
      }
    },
    transform(frame) {
      if (this.encoder.state === 'closed') {
        frame.close();
        return;
      }

      return new Promise(resolve => {
        this.encodedCallback = resolve;
        const insert_keyframe = (this.frameCounter % config.keyInterval) === 0;
        this.frameCounter++;
        this.encoder.encode(frame, { keyFrame: insert_keyframe });
        frame.close();
      });
    }
  });
}

const decodeVideoStream = () => {
  return new InstrumentedTransformStream({
    name: 'decode',

    start(controller) {
      this.decodedCallback = null;
      this.decoder = decoder = new VideoDecoder({
        output: frame => {
          if (this.decodedCallback) {
            this.decodedCallback();
            this.decodedCallback = null;
          }
          controller.enqueue(frame);
        },
        error: e => {
          console.error(e);
        },
      });
    },
    transform(frame) {
      if (this.decoder.state === 'closed') {
        return;
      }
      if (frame.type === 'config') {
        let config = JSON.parse(frame.config);
        return VideoDecoder.isConfigSupported(config)
          .then(decoderSupport => {
            if (decoderSupport.supported) {
              this.decoder.configure(decoderSupport.config);
            } else {
              console.error('Decoder config not supported', decoderSupport.config);
            }
          });
      } else {
        return new Promise(resolve => {
          this.decodedCallback = resolve;
          this.decoder.decode(frame);
        });
      }
    },
  });
};
