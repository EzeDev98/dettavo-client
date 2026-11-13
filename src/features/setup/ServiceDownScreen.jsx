import FlowScreen, { FlowHero } from '@shared/components/layout/FlowScreen.jsx';
import CommandLine from '@shared/components/ui/CommandLine.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import { SERVICE_DOWN_COPY } from './setupContent.js';
import './setup.css';

// Shown for the whole app while GET /system/status cannot reach dettavo-server (prototype 5f). The status query keeps
// asking every 3 seconds, so the screen goes away on its own once the server answers.
export default function ServiceDownScreen() {
  return (
    <FlowScreen
      card
      top={<FlowHero emoji={SERVICE_DOWN_COPY.emoji} />}
      title={SERVICE_DOWN_COPY.title}
      description={SERVICE_DOWN_COPY.description}
    >
      <CommandLine label={SERVICE_DOWN_COPY.builtLabel} command={SERVICE_DOWN_COPY.builtCommand} />
      <CommandLine label={SERVICE_DOWN_COPY.developingLabel} command={SERVICE_DOWN_COPY.developingCommand} />
      <p className="setup__waiting">
        <Spinner size="sm" decorative />
        {SERVICE_DOWN_COPY.checking}
      </p>
    </FlowScreen>
  );
}
