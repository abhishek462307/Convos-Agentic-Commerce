class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.wasmModule = null;
    this.denoiseState = null;
    this.pcmInput = null;
    this.initialized = false;
    this.frameSize = 480;
    
    this.port.onmessage = (event) => {
      if (event.data.type === 'init' && event.data.wasmBuffer) {
        this.initWasm(event.data.wasmBuffer);
      }
    };
  }

  async initWasm(wasmBuffer) {
    try {
      const wasmModule = await WebAssembly.instantiate(wasmBuffer, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256 }),
          emscripten_notify_memory_growth: () => {},
        }
      });
      
      this.wasmModule = wasmModule.instance.exports;
      this.denoiseState = this.wasmModule.rnnoise_create();
      this.pcmInput = new Float32Array(this.frameSize);
      this.initialized = true;
      this.port.postMessage({ type: 'initialized' });
    } catch (error) {
      console.error('RNNoise init error:', error);
      this.port.postMessage({ type: 'error', error: error.message });
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    if (!this.initialized || !this.wasmModule) {
      if (outputChannel) {
        outputChannel.set(inputChannel);
      }
      return true;
    }

    for (let i = 0; i < inputChannel.length; i += this.frameSize) {
      const chunkSize = Math.min(this.frameSize, inputChannel.length - i);
      
      for (let j = 0; j < chunkSize; j++) {
        this.pcmInput[j] = inputChannel[i + j] * 32768;
      }
      for (let j = chunkSize; j < this.frameSize; j++) {
        this.pcmInput[j] = 0;
      }

      try {
        this.wasmModule.rnnoise_process_frame(
          this.denoiseState,
          this.pcmInput.byteOffset,
          this.pcmInput.byteOffset
        );
      } catch {
        outputChannel.set(inputChannel);
        return true;
      }

      for (let j = 0; j < chunkSize; j++) {
        outputChannel[i + j] = this.pcmInput[j] / 32768;
      }
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
