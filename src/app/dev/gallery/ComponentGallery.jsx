import { useState } from 'react';
import { Download, Play, Redo2, Scissors, Undo2 } from 'lucide-react';
import './gallery.css';
import { Row, Sample, Section } from './Section.jsx';
import Bar from '@shared/components/ui/Bar.jsx';
import Button from '@shared/components/ui/Button.jsx';
import Checkbox from '@shared/components/ui/Checkbox.jsx';
import Dropdown from '@shared/components/ui/Dropdown.jsx';
import EmptyState from '@shared/components/ui/EmptyState.jsx';
import IconButton from '@shared/components/ui/IconButton.jsx';
import Modal from '@shared/components/ui/Modal.jsx';
import Radio from '@shared/components/ui/Radio.jsx';
import Spinner from '@shared/components/ui/Spinner.jsx';
import Tabs from '@shared/components/ui/Tabs.jsx';
import ToastProvider from '@shared/components/ui/ToastProvider.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const FORMATS = [
  { value: 'MP4', label: 'MP4 video', hint: 'H.264 + AAC' },
  { value: 'MP3', label: 'MP3 audio' },
  { value: 'WAV', label: 'WAV audio' },
];

function ButtonsSection() {
  const [busy, setBusy] = useState(false);

  const simulate = () => {
    setBusy(true);
    setTimeout(() => setBusy(false), 1500);
  };

  return (
    <Section title="Buttons" note="Hover with a mouse; press Tab for the focus ring. Buttons are 28 px; Export is 32 px.">
      <div className="gallery__grid">
        <Sample label="Default">
          <Row>{VARIANTS.map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}</Row>
        </Sample>
        <Sample label="Disabled">
          <Row>{VARIANTS.map((variant) => <Button key={variant} variant={variant} disabled>{variant}</Button>)}</Row>
        </Sample>
        <Sample label="Busy (width must not change)">
          <Row>{VARIANTS.map((variant) => <Button key={variant} variant={variant} busy>{variant}</Button>)}</Row>
        </Sample>
        <Sample label="Export size (32 px); click to simulate a request">
          <Row>
            <Button size="export" busy={busy} onClick={simulate}><Download aria-hidden="true" />Export</Button>
            <Button size="export" variant="secondary">Cancel</Button>
          </Row>
        </Sample>
        <Sample label="Icon buttons: default and disabled">
          <Row>
            <IconButton icon={Undo2} label="Undo" />
            <IconButton icon={Redo2} label="Redo" />
            <IconButton icon={Scissors} label="Cut" />
            <IconButton icon={Play} label="Play" disabled />
          </Row>
        </Sample>
      </div>
    </Section>
  );
}

function ChoicesSection() {
  const [format, setFormat] = useState('MP4');
  const [checked, setChecked] = useState(true);

  return (
    <Section title="Checkbox and radio" note="The whole row is the click target. Arrow keys move between radios.">
      <div className="gallery__grid">
        <Sample label="Radio group">
          <div className="gallery__stack" role="radiogroup" aria-label="Format">
            {FORMATS.map((option) => (
              <Radio
                key={option.value}
                name="gallery-format"
                label={option.label}
                hint={option.hint}
                checked={format === option.value}
                onChange={() => setFormat(option.value)}
              />
            ))}
          </div>
        </Sample>
        <Sample label="Checkbox: on, off, disabled">
          <div className="gallery__stack">
            <Checkbox label="Show pauses" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <Checkbox label="Disabled" disabled />
          </div>
        </Sample>
      </div>
    </Section>
  );
}

const SPEEDS = [
  { value: '0.75', label: '0.75×' },
  { value: '1', label: '1×' },
  { value: '1.25', label: '1.25×' },
  { value: '1.5', label: '1.5×' },
];
const PADDINGS = [
  { value: '0', label: 'Padding 0 ms' },
  { value: '30', label: 'Padding 30 ms' },
  { value: '60', label: 'Padding 60 ms' },
];

function DropdownTabsSection() {
  const [speed, setSpeed] = useState('1');
  const [padding, setPadding] = useState('30');
  const [tab, setTab] = useState('transcript');

  return (
    <Section
      title="Dropdown and tabs"
      note="Dropdown: arrows move, Enter picks, Escape closes, a click outside closes, and opening one closes the other. Tabs: Left and Right move."
    >
      <div className="gallery__grid">
        <Sample label="Dropdowns (the second opens upwards)">
          <Row>
            <Dropdown label="Playback speed" options={SPEEDS} value={speed} onChange={setSpeed} />
            <Dropdown label="Cut padding" options={PADDINGS} value={padding} onChange={setPadding} placement="up" />
          </Row>
        </Sample>
        <Sample label="Tabs with a count">
          <Tabs
            label="Transcript views"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'transcript', label: 'Transcript' },
              { value: 'cuts', label: 'Cuts', count: 3 },
            ]}
          />
        </Sample>
      </div>
    </Section>
  );
}

function FeedbackSection() {
  const toast = useToast();

  return (
    <Section title="Feedback" note="Toasts stack at the bottom; errors stay longer.">
      <div className="gallery__grid">
        <Sample label="Spinner: sm, md">
          <Row><Spinner size="sm" /><Spinner /></Row>
        </Sample>
        <Sample label="Toasts">
          <Row>
            <Button variant="secondary" onClick={() => toast.show('All edits saved')}>Neutral</Button>
            <Button variant="secondary" onClick={() => toast.show('Export finished', { tone: 'success' })}>Success</Button>
            <Button variant="secondary" onClick={() => toast.show('Not saved, retrying', { tone: 'error' })}>Error</Button>
            <Button
              variant="secondary"
              onClick={() => toast.show('3 words removed', { action: { label: 'Undo', onClick: () => toast.show('Restored') } })}
            >
              With action
            </Button>
          </Row>
        </Sample>
        <Sample label="Bar: brand, under, over, muted">
          <div className="gallery__stack">
            <Bar value={40} max={100} label="40%" />
            <Bar value={70} max={100} tone="under" label="70%" />
            <Bar value={90} max={100} tone="over" label="90%" />
            <Bar value={20} max={100} tone="muted" label="20%" />
          </div>
        </Sample>
        <Sample label="Empty state" wide>
          <div className="gallery__panel">
            <EmptyState
              icon={Scissors}
              title="No projects yet"
              description="Import a recording to start editing."
              action={<Button>New project</Button>}
            />
          </div>
        </Sample>
      </div>
    </Section>
  );
}

function OverlaysSection() {
  const [open, setOpen] = useState(false);

  return (
    <Section title="Modal" note="Escape or the scrim closes it; Tab stays inside; focus returns to the button.">
      <Row><Button variant="secondary" onClick={() => setOpen(true)}>Open modal</Button></Row>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Export edited recording"
        footer={(
          <>
            <Button size="export" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="export" onClick={() => setOpen(false)}>Export</Button>
          </>
        )}
      >
        <p className="gallery__note">12:04 of 15:30 kept · 23 cuts. The original recording is not changed.</p>
      </Modal>
    </Section>
  );
}

// Dev only (see App.jsx). Every shared component in every state, in the dark palette.
export default function ComponentGallery() {
  return (
    <ToastProvider>
      <main className="gallery">
        <header className="gallery__head">
          <h1 className="gallery__heading">Component gallery</h1>
          <p className="gallery__note">Dev only. Check each component with the mouse and with the keyboard.</p>
        </header>
        <ButtonsSection />
        <ChoicesSection />
        <DropdownTabsSection />
        <FeedbackSection />
        <OverlaysSection />
      </main>
    </ToastProvider>
  );
}
