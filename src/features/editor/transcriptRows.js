// The transcript as rows for the virtual list (guide 8.6): a divider with the clip's name before each timeline clip,
// then its paragraphs. A clip that is not READY shows its state in place of paragraphs; a ready clip with no words
// says so. Paragraph rows hold token index ranges, so a selection can run across rows and across clip joins.
// cutIds: the tokens of every REMOVE cut. Cut words are not shown (they are listed under Cuts), so a paragraph whose
// words are all cut has no row, and a clip whose words are all cut says so.
export function transcriptRows(tokens, spans, cutIds) {
  const rows = [];
  let index = 0;

  spans.forEach(({ clipId, ready }) => {
    rows.push({ key: `divider-${clipId}`, kind: 'divider', clipId });
    if (!ready) {
      rows.push({ key: `state-${clipId}`, kind: 'state', clipId });
      return;
    }

    const start = index;
    while (index < tokens.length && tokens[index].clipId === clipId) index += 1;
    const end = index - 1;
    let hasWords = false;
    for (let i = start; i <= end && !hasWords; i += 1) hasWords = tokens[i].kind === 'word';
    if (!hasWords) {
      rows.push({ key: `empty-${clipId}`, kind: 'noSpeech', clipId });
      return;
    }

    let shown = 0;
    let first = start;
    const pushParagraph = (last) => {
      const firstWord = tokens.slice(first, last + 1).find((token) => token.kind === 'word' && !cutIds.has(token.id));
      if (!firstWord) return;
      shown += 1;
      rows.push({
        key: `paragraph-${clipId}-${tokens[first].paragraphId ?? first}`,
        kind: 'paragraph',
        clipId,
        first,
        last,
        startMs: firstWord.timelineStartMs,
      });
    };
    for (let i = start + 1; i <= end; i += 1) {
      if (tokens[i].paragraphId !== tokens[i - 1].paragraphId) {
        pushParagraph(i - 1);
        first = i;
      }
    }
    pushParagraph(end);
    if (!shown) rows.push({ key: `all-cut-${clipId}`, kind: 'allCut', clipId });
  });

  return rows;
}
