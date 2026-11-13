import { env } from '@core/config/env.js';
import { cx } from '@shared/utils/classNames.js';
import { modelName, useSystemStatus } from '@features/setup/systemStatus.js';
import './StatusBar.css';

// "localhost:2060", from VITE_API_BASE_URL.
const serverAddress = new URL(env.apiBaseUrl).host;

// Guide 8.9. The dot is never the only signal: the words beside it say the same thing.
// hint: the editor's shortcuts, shown on the right.
export default function StatusBar({ hint }) {
  const { data: status, isError, isPending } = useSystemStatus();
  const connected = !isPending && !isError;
  const model = connected && status.model?.present ? modelName(status.model.path) : null;

  let label = 'Checking local service';
  if (isError) label = 'Local service not running';
  else if (connected) label = 'Local service connected';

  return (
    <footer className="status-bar">
      <span className="status-bar__connection" role="status">
        <i
          className={cx(
            'status-bar__dot',
            connected && 'status-bar__dot--connected',
            isError && 'status-bar__dot--down',
          )}
          aria-hidden="true"
        />
        {label}
      </span>
      <span>{serverAddress}</span>
      {model && <span>whisper.cpp · {model}</span>}
      {hint && (
        <>
          <span className="status-bar__spacer" />
          <span>{hint}</span>
        </>
      )}
    </footer>
  );
}
