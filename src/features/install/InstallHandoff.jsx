import { useEffect, useRef, useState } from 'react';
import FlowScreen, { FlowHero } from '@shared/components/layout/FlowScreen.jsx';
import Button from '@shared/components/ui/Button.jsx';
import InfoBanner from '@shared/components/ui/InfoBanner.jsx';
import { HANDOFF_COPY } from './installContent.js';
import LaptopFeed from './LaptopFeed.jsx';
import './install.css';


const CLOSE_FALLBACK_MS = 400;

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
