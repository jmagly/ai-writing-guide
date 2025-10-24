// Simulate what the test does
import { VoiceAnalyzer } from './src/writing/voice-analyzer.js';
import { ContentDiversifier } from './src/writing/content-diversifier.js';
import { VoiceCalibration } from './src/writing/voice-calibration.js';

const analyzer = new VoiceAnalyzer();
const diversifier = new ContentDiversifier();
const calibration = new VoiceCalibration(analyzer, diversifier);

const profile = calibration.getVoiceProfile('academic');
console.log('Profile voice:', profile.voice);
console.log('Markers count:', profile.markers.length);
if (profile.markers.length > 0) {
  console.log('First marker:', profile.markers[0]);
}
