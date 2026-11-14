import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@core/data/queryKeys.js';
import { apiUrl } from '@core/http/apiUrl.js';
import { httpClient } from '@core/http/httpClient.js';
import { endpoints } from '@core/http/endpoints.js';

// While the server makes a filmstrip, its layout is asked for again this often.
const FILMSTRIP_POLL_MS = 2000;

// Which version of a clip's cache the media belong to: a rebuilt cache has new files, so they are fetched again.
const versionOf = (clip) => `${clip.artifacts?.audio16k ?? ''}|${clip.artifacts?.proxy ?? ''}|${clip.source?.durationMs ?? 0}`;

async function fetchLevels(projectId, clipId) {
  const response = await fetch(apiUrl(endpoints.clipLevels(projectId, clipId)));
  if (!response.ok) throw new Error(`The audio level of clip ${clipId} could not be loaded (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`${url} could not be loaded`));
    image.src = url;
  });
}

// What the timeline draws inside each clip on it: Map of clipId to { durationMs, video, levels, filmstrip, image }.
// levels: Uint8Array, one byte per frame (0 is -60 dB, 255 is 0 dB), spread evenly over durationMs; filmstrip: the
// server's layout ({ intervalMs, count, columns, tileWidth, tileHeight }) once READY; image: the loaded filmstrip.
// Each is null until it arrives. Cached for the session; a clip whose cache is rebuilt fetches them again.
export default function useTimelineMedia(projectId, clips, timeline) {
  const onTimeline = new Set(timeline);
  const timelineClips = clips.filter((clip) => onTimeline.has(clip.id));

  const levels = useQueries({
    queries: timelineClips.map((clip) => ({
      queryKey: queryKeys.media.levels(projectId, clip.id, versionOf(clip)),
      queryFn: () => fetchLevels(projectId, clip.id),
      enabled: Boolean(clip.artifacts?.audio16k),
      staleTime: Infinity,
      retry: 1,
    })),
  });

  const video = (clip) => clip.source?.hasVideo === true && Boolean(clip.artifacts?.proxy);

  const filmstrips = useQueries({
    queries: timelineClips.map((clip) => ({
      queryKey: queryKeys.media.filmstrip(projectId, clip.id, versionOf(clip)),
      queryFn: () => httpClient.get(endpoints.clipFilmstrip(projectId, clip.id)),
      enabled: video(clip),
      staleTime: Infinity,
      refetchInterval: (query) => (query.state.data?.status === 'BUILDING' ? FILMSTRIP_POLL_MS : false),
      retry: 1,
    })),
  });

  const images = useQueries({
    queries: timelineClips.map((clip, index) => ({
      queryKey: queryKeys.media.filmstripImage(projectId, clip.id, versionOf(clip)),
      queryFn: () => loadImage(apiUrl(endpoints.clipFilmstripImage(projectId, clip.id))),
      enabled: filmstrips[index]?.data?.status === 'READY',
      staleTime: Infinity,
      retry: 1,
    })),
  });

  return new Map(timelineClips.map((clip, index) => {
    const filmstrip = filmstrips[index]?.data;
    return [clip.id, {
      durationMs: clip.source?.durationMs ?? 0,
      video: video(clip),
      levels: levels[index]?.data ?? null,
      filmstrip: filmstrip?.status === 'READY' ? filmstrip : null,
      image: images[index]?.data ?? null,
    }];
  }));
}
