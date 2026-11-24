import { Navigate, useNavigate } from 'react-router';
import { ArrowRight, Scissors } from 'lucide-react';
import { isPWAInstalled, isRunningAsApp } from '@core/pwa/isPWAInstalled.js';
import FlowScreen from '@shared/components/layout/FlowScreen.jsx';
import Button from '@shared/components/ui/Button.jsx';
import EmojiTile from '@shared/components/ui/EmojiTile.jsx';
import FeatureCard, { FeatureList } from '@shared/components/ui/FeatureCard.jsx';
import { ROUTES } from '@app/router/routes.js';
import { DEMO, ONBOARDING_COPY, ONBOARDING_FEATURES } from './installContent.js';
import './install.css';

function Logo() {
  return (
    <div className="onboarding__logo">
      <Scissors className="onboarding__mark" aria-hidden="true" />
      <span>Dettavo</span>
    </div>
  );
}

// Two filler words are selected and cut, the cut card drops in, and Export is pressed. Decorative: the title and the
// cards below say what Dettavo does.
function Demo() {
  return (
    <div className="onboarding__demo" aria-hidden="true">
      <p className="onboarding__line">
        {DEMO.before}
        <span className="onboarding__cut onboarding__cut--first">{DEMO.firstCut}</span>
        {DEMO.middle}
        <span className="onboarding__cut onboarding__cut--second">{DEMO.secondCut}</span>
        {DEMO.after}
      </p>
      <div className="onboarding__result">
        <EmojiTile emoji={DEMO.emoji} />
        <span className="onboarding__result-text">
          {DEMO.cuts}
          <span className="onboarding__result-words">{DEMO.words}</span>
        </span>
        <span className="onboarding__result-saved">{DEMO.saved}</span>
        <Button tabIndex={-1} className="onboarding__export">
          {DEMO.export}
        </Button>
      </div>
    </div>
  );
}

export default function OnboardingScreen() {
  const navigate = useNavigate();

  if (isRunningAsApp()) return <Navigate to={ROUTES.projects} replace />;
  if (isPWAInstalled()) return <Navigate to={ROUTES.install} replace />;

  return (
    <FlowScreen
      top={<Logo />}
      title={ONBOARDING_COPY.title}
      description={ONBOARDING_COPY.description}
      lead
      bare
      footer={
        <Button block onClick={() => navigate(ROUTES.install)}>
          {ONBOARDING_COPY.start}
          <ArrowRight className="onboarding__nudge" aria-hidden="true" />
        </Button>
      }
    >
      <Demo />
      <FeatureList>
        {ONBOARDING_FEATURES.map(({ emoji, title, description }, index) => (
          <FeatureCard key={title} emoji={emoji} title={title} description={description} index={index} />
        ))}
      </FeatureList>
    </FlowScreen>
  );
}
