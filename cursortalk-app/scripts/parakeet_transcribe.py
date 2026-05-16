import argparse
import json
import time
import wave

import numpy as np
import sherpa_onnx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()

    recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
        encoder=f"{args.model_dir}/encoder.int8.onnx",
        decoder=f"{args.model_dir}/decoder.int8.onnx",
        joiner=f"{args.model_dir}/joiner.int8.onnx",
        tokens=f"{args.model_dir}/tokens.txt",
        model_type="nemo_transducer",
        num_threads=4,
    )

    with wave.open(args.audio, "rb") as wav_file:
        sample_rate = wav_file.getframerate()
        num_samples = wav_file.getnframes()
        raw = wav_file.readframes(num_samples)
        samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

    stream = recognizer.create_stream()
    stream.accept_waveform(sample_rate, samples.tolist())

    start = time.time()
    recognizer.decode_stream(stream)
    latency_ms = int((time.time() - start) * 1000)

    print(
        json.dumps(
            {
                "transcript": stream.result.text.strip(),
                "latency_ms": latency_ms,
                "sample_rate": sample_rate,
            }
        )
    )


if __name__ == "__main__":
    main()
