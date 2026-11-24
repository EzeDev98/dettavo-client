import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import './CommandLine.css';
import FieldLabel from './FieldLabel.jsx';
import IconButton from './IconButton.jsx';

// How long the copy button shows its tick after copying.
const COPIED_MS = 1200;

export default function CommandLine({ label, command }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(command).catch(() => {});
    setCopied(true);
  };

  const line = (
    <div className="ui-command">
      <code className="ui-command__text">{command}</code>
      <IconButton icon={copied ? Check : Copy} label="Copy command" className="ui-command__copy" onClick={copy} />
    </div>
  );

  if (!label) return line;
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {line}
    </div>
  );
}
