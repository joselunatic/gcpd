const synth = window.speechSynthesis;
let volume = 20;
const speechEnabled = false;

function say(text, pitch = 0.6, rate = 0.6) {
  if (!speechEnabled) return;
  if (volume === 0) return;
  if (synth.speaking) {
    synth.pause();
    synth.cancel();
  }
  let spokenText = text;
  if (Array.isArray(spokenText)) {
    spokenText = spokenText.join(".");
  }

  function setSpeech() {
    return new Promise(function (resolve) {
      let synth = window.speechSynthesis;
      let id;

      id = setInterval(() => {
        if (synth.getVoices().length !== 0) {
          resolve(synth.getVoices());
          clearInterval(id);
        }
      }, 10);
    });
  }
  const voices = setSpeech();
  voices.then((voices) => {
    let speech = new SpeechSynthesisUtterance(spokenText);

    const voiceindex = voices.findIndex((voice) => {
      return voice.name === "Zarvox";
    });

    // console.log("voice: ", voices[Math.max(0, voiceindex)]);
    speech.voice = voices[Math.max(0, voiceindex)];
    speech.pitch = pitch;
    speech.rate = rate;
    speech.volume = volume;
    speech.lang = "en-US";
    synth.speak(speech);
  });
}

function stopSpeaking() {
  if (!speechEnabled) return;
  if (synth) {
    synth.pause();
    synth.cancel();
  }
}

function setVolume(value) {
  volume = value;
}
export { stopSpeaking, setVolume };
export default say;
