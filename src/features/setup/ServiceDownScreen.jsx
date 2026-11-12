import { ServerOff } from 'lucide-react';
import Button from '@shared/components/ui/Button.jsx';
import EmptyState from '@shared/components/ui/EmptyState.jsx';
import './setup.css';

// Shown for the whole app while GET /system/status cannot reach dettavo-server. The status query keeps polling,
// so the app comes back on its own once the server starts; Try again only checks sooner.
export default function ServiceDownScreen({ onRetry, retrying = false }) {
  return (
    <div className="setup-screen">
      <div className="setup-screen__body">
        <EmptyState
          icon={ServerOff}
          title="Dettavo's local service isn't running"
          description="Start it in dettavo-server with one of these. This page checks again every 3 seconds."
        />
        <code className="setup-command">java -jar target/dettavo.jar</code>
        <code className="setup-command">./mvnw spring-boot:run</code>
        <div className="setup-screen__actions">
          <Button variant="secondary" busy={retrying} onClick={onRetry}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
