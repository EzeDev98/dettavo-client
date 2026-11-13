import { useEffect, useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { clearInstallPrompt, getInstallState, subscribeInstall } from '@core/pwa/installPrompt.js';
import { isPWAInstalled, isRunningAsApp } from '@core/pwa/isPWAInstalled.js';
import FlowScreen from '@shared/components/layout/FlowScreen.jsx';
import Button from '@shared/components/ui/Button.jsx';
import FeatureCard, { FeatureList } from '@shared/components/ui/FeatureCard.jsx';
import InfoBanner from '@shared/components/ui/InfoBanner.jsx';
import { ROUTES } from '@app/router/routes.js';
import { INSTALL_COPY, MANUAL_STEPS } from './installContent.js';
import InstallHandoff from './InstallHandoff.jsx';
import LaptopFeed from './LaptopFeed.jsx';

// How long to wait for Chrome's install prompt before showing the manual steps.
const PROMPT_WAIT_MS = 10000;

// Route /install, from Ahorra (prototype 5f). Phases: waiting, ready, installing, manual, handoff.
// Install Dettavo opens Chrome's own install dialog; Dettavo never draws one. Cancel shows the manual steps.
export default function InstallScreen() {
  const navigate = useNavigate();
  const { prompt, installed } = useSyncExternalStore(subscribeInstall, getInstallState);

  const [waitedOut, setWaitedOut] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (prompt) return undefined;
    const timer = setTimeout(() => setWaitedOut(true), PROMPT_WAIT_MS);
    return () => clearTimeout(timer);
  }, [prompt]);

  // Catches an install finished through Chrome's own menu while this page is open, which fires no appinstalled event.
  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const onChange = (event) => {
      if (event.matches) setAccepted(true);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Checked on every render, as in Ahorra: when Chrome moves this tab into the new app window, the display-mode change
  // above re-renders this screen, and the app's own window goes Home instead of showing the hand-off.
  if (isRunningAsApp()) return <Navigate to={ROUTES.projects} replace />;

  let phase = 'waiting';
  if (installed || accepted || isPWAInstalled()) phase = 'handoff';
  else if (installing) phase = 'installing';
  else if (prompt) phase = 'ready';
  else if (cancelled || waitedOut) phase = 'manual';

  const install = async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setAccepted(true);
      else setCancelled(true);
    } catch {
      setCancelled(true);
    } finally {
      clearInstallPrompt(); // the browser allows one use of the prompt
      setInstalling(false);
    }
  };

  if (phase === 'handoff') return <InstallHandoff />;

  const manual = phase === 'manual';
  return (
    <FlowScreen
      card
      onBack={() => navigate(ROUTES.onboarding)}
      top={<LaptopFeed />}
      title={INSTALL_COPY.title}
      description={manual ? INSTALL_COPY.manualDescription : INSTALL_COPY.description}
      footer={
        manual ? undefined : (
          <Button block waiting={phase !== 'ready'} onClick={install}>
            {INSTALL_COPY.button}
          </Button>
        )
      }
    >
      {manual && (
        <>
          {cancelled && (
            <InfoBanner emoji={INSTALL_COPY.cancelledEmoji} role="status">
              {INSTALL_COPY.cancelled}
            </InfoBanner>
          )}
          <FeatureList ordered>
            {MANUAL_STEPS.map(({ emoji, text }, index) => (
              <FeatureCard key={text} emoji={emoji} label={`Step ${index + 1}`} description={text} strong index={index} />
            ))}
          </FeatureList>
        </>
      )}
    </FlowScreen>
  );
}
