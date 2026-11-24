import { apiUrl } from '@core/http/apiUrl.js';
import { endpoints } from '@core/http/endpoints.js';
import { buildTokens, timelineSpans } from '@core/edit/tokens.js';
import { editPlan } from '@core/edit/editPlan.js';
import * as timeMap from '@core/edit/timeMap.js';

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), options);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${body?.detail ?? JSON.stringify(body)}`);
  return { body, etag: response.headers.get('ETag') };
}

const loadProject = (projectId) => request(endpoints.project(projectId));

const withChanges = (edits, changes = {}) => ({ ...edits, ...changes });

function browserPlan(project, edits) {
  const tokens = buildTokens(project.clips, edits.timeline);
  return editPlan(tokens, edits.timeline, project.clips, edits.removed, edits.trims, edits.padMs, edits.rangeCuts ?? []);
}

// The same JSON whatever order the keys came in.
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

window.dettavoEdit = {
  async tokens(projectId, timeline) {
    const { body: project } = await loadProject(projectId);
    return buildTokens(project.clips, timeline ?? project.edits.timeline);
  },

  async plan(projectId, changes) {
    const { body: project } = await loadProject(projectId);
    return browserPlan(project, withChanges(project.edits, changes));
  },

  async save(projectId, changes) {
    const { body: project, etag } = await loadProject(projectId);
    const { timeline, removed, trims, padMs } = withChanges(project.edits, changes);
    const { body } = await request(endpoints.projectEdits(projectId), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'If-Match': etag },
      body: JSON.stringify({ timeline, removed, trims, padMs }),
    });
    return body;
  },

  async compare(projectId) {
    const [{ body: project }, { body: server }] = await Promise.all([
      loadProject(projectId),
      request(endpoints.editPlan(projectId)),
    ]);
    const browser = browserPlan(project, project.edits);
    const same = JSON.stringify(stable(browser)) === JSON.stringify(stable(server));
    console.log(same ? 'Browser and server plans are identical' : 'Browser and server plans differ', { browser, server });
    return { same, browser, server };
  },

  async map(projectId, changes) {
    const { body: project } = await loadProject(projectId);
    const edits = withChanges(project.edits, changes);
    const plan = browserPlan(project, edits);
    const spans = timelineSpans(project.clips, edits.timeline);
    return { plan, spans, ...timeMap };
  },
};

console.info('dettavoEdit is ready: tokens, plan, save, compare, map');
