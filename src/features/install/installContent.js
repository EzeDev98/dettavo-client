// All Onboarding, Install and hand-off copy (prototype 5f), so changing a word never means touching a screen.
// The emoji are decorative and hidden from screen readers.

export const ONBOARDING_COPY = {
  title: 'Edit a recording by editing its words.',
  description: 'Delete a word and it’s cut from the video.',
  start: 'Get started',
};

export const ONBOARDING_FEATURES = [
  {
    emoji: '🎬',
    title: 'Join your clips',
    description: 'Add every file of an episode and put them in order on the timeline. They become one transcript.',
  },
  {
    emoji: '✍️',
    title: 'Cut by deleting words',
    description: 'Select words or pauses and press Delete. The video follows, and Restore brings them back.',
  },
  {
    emoji: '⏸️',
    title: 'Shorten the long pauses',
    description: 'Trim every pause over a second down to a short beat, in one step.',
  },
  {
    emoji: '🔒',
    title: 'Stays on this Mac',
    description: 'Transcription and export run on this computer. Nothing is uploaded, and your original files are never changed.',
  },
];

// The Onboarding demo: "um," and "uh," are selected and cut, then the cut card drops in.
export const DEMO = {
  before: 'Hi everyone, ',
  firstCut: 'um,',
  middle: ' welcome back to the, ',
  secondCut: 'uh,',
  after: ' Ahorra series.',
  emoji: '✂️',
  cuts: '2 cuts',
  words: '“um,” · “uh,”',
  saved: '−1.8s',
  export: 'Export',
};

export const INSTALL_COPY = {
  title: 'Install Dettavo',
  description: 'Dettavo runs as an installed app. Install it to continue.',
  manualDescription: 'Dettavo runs as an installed app. Follow these steps to add it.',
  cancelled: 'Install was cancelled. You can still add Dettavo with the steps below.',
  cancelledEmoji: 'ℹ️',
  button: 'Install Dettavo',
};

// Chrome on the Mac, the browser Dettavo installs from.
export const MANUAL_STEPS = [
  { emoji: '🖥️', text: 'Look for the install icon at the right end of Chrome’s address bar, or open Chrome’s menu (the three dots).' },
  { emoji: '⬇️', text: 'Choose Install Dettavo. In newer versions of Chrome it is under Cast, save and share.' },
  { emoji: '✅', text: 'Click Install, then open Dettavo from your Dock or Launchpad.' },
];

// The hand-off, shown in the browser tab once Dettavo is installed. The tab's job is done: the installed app takes over.
export const HANDOFF_COPY = {
  installingTitle: 'Installing Dettavo…',
  doneTitle: 'You’re all set!',
  doneEmoji: '🎉',
  description:
    'Dettavo is being added to your Mac. Find the Dettavo icon in your Dock or Launchpad, open the app from there, and finish setting up in it.',
  bannerEmoji: '💻',
  banner: 'This browser tab is no longer needed. Use the Dettavo app from your Dock from now on, not this browser.',
  continue: 'Continue',
  closeNote: 'You can now close this browser tab.',
};

// The Install hero: the arrow flies into this.
export const LAPTOP_EMOJI = '💻';
