// All Setup and Service-down copy (prototype 5f), so changing a word never means touching a screen.
// The emoji are decorative and hidden from screen readers.

export const INSTALL_TOOLS_COMMAND = './scripts/install-tools.sh';

export const SETUP_COPY = {
  emoji: '🧰',
  title: 'Finish setting up',
  readyTitle: 'Everything is installed',
  description: (missingCount) => {
    const intro = 'Dettavo needs these tools on this Mac.';
    if (missingCount === 0) return intro;
    return `${intro} ${missingCount === 1 ? 'One is' : `${missingCount} are`} missing.`;
  },
  readyDescription: 'Dettavo has every tool it needs on this Mac.',
  runLabel: 'Run this in Terminal, in the dettavo-server folder:',
  checkAgain: 'Check again',
  checking: 'Checking…',
  continue: 'Continue',
  found: 'Found',
  notFound: 'Not found',
};

// The four cards, in the prototype's order.
export const TOOLS = {
  ffmpeg: { emoji: '🎞️', name: 'FFmpeg', description: 'Cuts, joins and exports the video' },
  ffprobe: { emoji: '🔍', name: 'FFprobe', description: 'Reads each file’s length and format' },
  whisperCli: { emoji: '🎙️', name: 'whisper-cli', description: 'Turns speech into words with timings' },
  model: { emoji: '🧠', name: 'Speech model', description: 'small.en, about 466 MB' },
};

// The FFmpeg encoders Dettavo needs, as the Setup card names them.
export const ENCODER_NAMES = {
  h264_videotoolbox: 'VideoToolbox',
  libx264: 'libx264',
  libmp3lame: 'libmp3lame',
};

export const SERVICE_DOWN_COPY = {
  emoji: '🔌',
  title: 'Dettavo’s local service isn’t running',
  description: 'Start it in the dettavo-server folder. This screen goes away on its own once it answers.',
  builtLabel: 'To run the built app:',
  builtCommand: 'java -Xmx512m -jar target/dettavo.jar',
  developingLabel: 'While developing:',
  developingCommand: './mvnw spring-boot:run',
  checking: 'Checking again every 3 seconds',
};
