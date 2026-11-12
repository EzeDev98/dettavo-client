import { Link } from 'react-router';
import { CircleCheck, Wrench } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import EmptyState from '@shared/components/ui/EmptyState.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import { ROUTES } from '@app/router/routes.js';
import { useRefreshSystemStatus } from './systemStatus.js';
import './setup.css';

// Every missing tool, encoder or model, each with the command that installs it. Check again asks the server to
// look for the tools again (GET /system/status?refresh=true).
export default function SetupScreen({ status }) {
  const toast = useToast();
  const refresh = useRefreshSystemStatus();
  const missing = status?.missing ?? [];

  const checkAgain = () =>
    refresh.mutate(undefined, {
      onError: (error) => toast.show(error.message, { tone: 'error' }),
    });

  if (missing.length === 0) {
    return (
      <div className="setup-screen">
        <EmptyState
          icon={CircleCheck}
          title="Everything is installed"
          description="FFmpeg, ffprobe, whisper-cli and the model were all found."
          action={<Link to={ROUTES.projects} className="ui-button ui-button--primary">Continue</Link>}
        />
      </div>
    );
  }

  return (
    <div className="setup-screen">
      <div className="setup-screen__body">
        <EmptyState
          icon={Wrench}
          title="A few things are missing"
          description="Dettavo needs these on this Mac. Run the command in dettavo-server, then check again."
        />
        <ul className="setup-list">
          {missing.map(({ item, fix }) => (
            <li key={item} className="setup-list__item">
              <span className="setup-list__name">{item}</span>
              <code className="setup-command">{fix}</code>
            </li>
          ))}
        </ul>
        <div className="setup-screen__actions">
          <Button busy={refresh.isPending} onClick={checkAgain}>Check again</Button>
        </div>
      </div>
    </div>
  );
}
EOFcat > src/features/setup/SetupScreen.jsx <<'EOF'
import { Link } from 'react-router';
import { CircleCheck, Wrench } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import EmptyState from '@shared/components/ui/EmptyState.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import { ROUTES } from '@app/router/routes.js';
import { useRefreshSystemStatus } from './systemStatus.js';
import './setup.css';

// Every missing tool, encoder or model, each with the command that installs it. Check again asks the server to
// look for the tools again (GET /system/status?refresh=true).
export default function SetupScreen({ status }) {
  const toast = useToast();
  const refresh = useRefreshSystemStatus();
  const missing = status?.missing ?? [];

  const checkAgain = () =>
    refresh.mutate(undefined, {
      onError: (error) => toast.show(error.message, { tone: 'error' }),
    });

  if (missing.length === 0) {
    return (
      <div className="setup-screen">
        <EmptyState
          icon={CircleCheck}
          title="Everything is installed"
          description="FFmpeg, ffprobe, whisper-cli and the model were all found."
          action={<Link to={ROUTES.projects} className="ui-button ui-button--primary">Continue</Link>}
        />
      </div>
    );
  }

  return (
    <div className="setup-screen">
      <div className="setup-screen__body">
        <EmptyState
          icon={Wrench}
          title="A few things are missing"
          description="Dettavo needs these on this Mac. Run the command in dettavo-server, then check again."
        />
        <ul className="setup-list">
          {missing.map(({ item, fix }) => (
            <li key={item} className="setup-list__item">
              <span className="setup-list__name">{item}</span>
              <code className="setup-command">{fix}</code>
            </li>
          ))}
        </ul>
        <div className="setup-screen__actions">
          <Button busy={refresh.isPending} onClick={checkAgain}>Check again</Button>
        </div>
      </div>
    </div>
  );
}
