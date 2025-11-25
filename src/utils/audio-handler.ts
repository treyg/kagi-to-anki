// Audio fetching and encoding utilities

export async function fetchAudioAsBase64(
  text: string,
  language: string,
  voice?: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Use provided voice or default to 'sage'
    const selectedVoice = voice || "sage";

    const params = new URLSearchParams({
      text: text,
      language: language,
      voice: selectedVoice,
      raw: "true",
    });

    const url = `https://translate.kagi.com/api/speech?${params}`;

    // Call fetch with explicit this context for Firefox
    const response = await fetch.call(window, url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    return {
      data: base64,
      mimeType: blob.type,
    };
  } catch (error) {
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  // If it's PCM data, we need to add a WAV header
  if (blob.type === "audio/pcm" || blob.type === "audio/x-pcm") {
    const arrayBuffer = await blob.arrayBuffer();
    const pcmData = new Uint8Array(arrayBuffer);
    const wavData = addWavHeader(pcmData);

    // Convert WAV data to base64
    return arrayBufferToBase64(wavData.buffer as ArrayBuffer);
  }

  // For other formats, convert directly
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/mpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function addWavHeader(pcmData: Uint8Array): Uint8Array {
  // PCM parameters (assuming 16-bit, mono, 24kHz based on Kagi's typical output)
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const dataSize = pcmData.length;
  const fileSize = 44 + dataSize;

  // Create WAV header (44 bytes)
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // File size
  view.setUint32(4, fileSize - 8, true);
  // WAVE identifier
  writeString(view, 8, "WAVE");
  // fmt chunk identifier
  writeString(view, 12, "fmt ");
  // fmt chunk size
  view.setUint32(16, 16, true);
  // Audio format (1 = PCM)
  view.setUint16(20, 1, true);
  // Number of channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate
  view.setUint32(28, byteRate, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  writeString(view, 36, "data");
  // data chunk size
  view.setUint32(40, dataSize, true);

  // Combine header and PCM data
  const wavData = new Uint8Array(fileSize);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);

  return wavData;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generateAudioFilename(
  sourceLang: string,
  targetLang: string,
  mimeType?: string
): string {
  const timestamp = Date.now();

  // Determine extension from MIME type
  let extension = "mp3"; // default
  if (mimeType) {
    if (mimeType.includes("wav") || mimeType.includes("pcm")) {
      extension = "wav";
    } else if (mimeType.includes("ogg")) {
      extension = "ogg";
    } else if (mimeType.includes("webm")) {
      extension = "webm";
    }
  }

  return `kagi_${sourceLang}_${targetLang}_${timestamp}.${extension}`;
}
