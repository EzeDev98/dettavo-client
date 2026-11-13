import { useEffect, useRef, useState } from 'react';
import FlowScreen, { FlowHero } from '@shared/components/layout/FlowScreen.jsx';
import Button from '@shared/components/ui/Button.jsx';
import InfoBanner from '@shared/components/ui/InfoBanner.jsx';
import { HANDOFF_COPY } from './installContent.js';
import LaptopFeed from './LaptopFeed.jsx';
import './install.css';

// How long to wait after window.close() before concluding the browser refused. Browsers ignore close() on tabs they
// did not open from a script, which is every tab a person opened themselves.
const CLOSE_FALLBACK_MS = 400;

// The install hand-off, from Ahorra (prototype 5f). First "Installing Dettavo…" with Continue. Continue tries to close
// the tab; when the browser refuses, the screen becomes "You're all set!" and asks the person to close the tab.
// Nothing here navigates: the point is to move the person off the browser and onto the installed app.
export default function InstallHandoff() {
  const [closeBlocked, setCloseBlocked] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleContinue = () => {
    window.close();
    timer.current = setTimeout(() => setCloseBlocked(true), CLOSE_FALLBACK_MS);
  };

  return (
    <FlowScreen
      card
      top={closeBlocked ? <FlowHero emoji={HANDOFF_COPY.doneEmoji} /> : <LaptopFeed />}
      title={closeBlocked ? HANDOFF_COPY.doneTitle : HANDOFF_COPY.installingTitle}
      description={HANDOFF_COPY.description}
      footer={
        closeBlocked ? undefined : (
          <Button block onClick={handleContinue}>
            {HANDOFF_COPY.continue}
          </Button>
        )
      }
    >
      <InfoBanner emoji={HANDOFF_COPY.bannerEmoji}>{HANDOFF_COPY.banner}</InfoBanner>
      {closeBlocked && <p className="install__note">{HANDOFF_COPY.closeNote}</p>}
    </FlowScreen>
  );
}
