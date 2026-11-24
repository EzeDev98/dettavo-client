import { useNavigate } from 'react-router';
import FlowScreen, { FlowHero } from '@shared/components/layout/FlowScreen.jsx';
import Button from '@shared/components/ui/Button.jsx';
import CommandLine from '@shared/components/ui/CommandLine.jsx';
import FeatureCard, { FeatureList } from '@shared/components/ui/FeatureCard.jsx';
import { useToast } from '@shared/components/ui/toastContext.js';
import { ROUTES } from '@app/router/routes.js';
import { ENCODER_NAMES, INSTALL_TOOLS_COMMAND, SETUP_COPY, TOOLS } from './setupContent.js';
import { useRefreshSystemStatus } from './systemStatus.js';

const found = (...details) => [SETUP_COPY.found, ...details.filter(Boolean)].join(' · ');

// One card per tool, from GET /system/status. FFmpeg counts as found only when it is 7 or newer with every encoder
// Dettavo needs; otherwise its card says what it lacks.
function toolCards(status) {
  const encoders = Object.entries(status.encoders ?? {});
  const encoderName = (name) => ENCODER_NAMES[name] ?? name;
  const hasEncoders = encoders.filter(([, available]) => available).map(([name]) => encoderName(name));
  const lacksEncoders = encoders.filter(([, available]) => !available).map(([name]) => encoderName(name));

  const tool = (key, ok, statusText) => ({ key, ...TOOLS[key], ok, statusText });
  const program = (key, { available, version }) => tool(key, available, available ? found(version) : SETUP_COPY.notFound);

  const { ffmpeg } = status;
  let ffmpegText = SETUP_COPY.notFound;
  if (ffmpeg.available) {
    if (!status.ffmpegSevenOrNewer) ffmpegText = found(ffmpeg.version, 'needs FFmpeg 7 or newer');
    else if (lacksEncoders.length > 0) ffmpegText = found(ffmpeg.version, `missing ${lacksEncoders.join(', ')}`);
    else ffmpegText = found(ffmpeg.version, hasEncoders.join(', '));
  }
  const ffmpegReady = ffmpeg.available && status.ffmpegSevenOrNewer && lacksEncoders.length === 0;

  const modelFile = status.model.path?.split('/').pop();
  return [
    tool('ffmpeg', ffmpegReady, ffmpegText),
    program('ffprobe', status.ffprobe),
    program('whisperCli', status.whisperCli),
    tool('model', status.model.present, status.model.present ? found(modelFile) : SETUP_COPY.notFound),
  ];
}

export default function SetupScreen({ status }) {
  const navigate = useNavigate();
  const toast = useToast();
  const refresh = useRefreshSystemStatus();
  const cards = toolCards(status);
  const missingCount = cards.filter((card) => !card.ok).length;

  const checkAgain = () =>
    refresh.mutate(undefined, {
      onError: (error) => toast.show(error.message, { tone: 'error' }),
    });

  return (
    <FlowScreen
      card
      top={<FlowHero emoji={SETUP_COPY.emoji} />}
      title={status.ready ? SETUP_COPY.readyTitle : SETUP_COPY.title}
      description={status.ready ? SETUP_COPY.readyDescription : SETUP_COPY.description(missingCount)}
      footer={
        status.ready ? (
          <Button block onClick={() => navigate(ROUTES.projects, { replace: true })}>
            {SETUP_COPY.continue}
          </Button>
        ) : (
          <Button block waiting={refresh.isPending} onClick={checkAgain}>
            {refresh.isPending ? SETUP_COPY.checking : SETUP_COPY.checkAgain}
          </Button>
        )
      }
    >
      <FeatureList>
        {cards.map(({ key, emoji, name, description, ok, statusText }, index) => (
          <FeatureCard
            key={key}
            emoji={emoji}
            title={name}
            description={description}
            status={statusText}
            statusTone={ok ? 'ok' : 'missing'}
            index={index}
          />
        ))}
      </FeatureList>
      {!status.ready && <CommandLine label={SETUP_COPY.runLabel} command={INSTALL_TOOLS_COMMAND} />}
    </FlowScreen>
  );
}
