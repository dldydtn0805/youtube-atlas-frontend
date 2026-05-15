import { describe, expect, it } from 'vitest';
import { DEFAULT_DOCUMENT_TITLE, getNowPlayingDocumentTitle } from './useNowPlayingDocumentTitle';

describe('getNowPlayingDocumentTitle', () => {
  it('formats the selected video title first', () => {
    expect(getNowPlayingDocumentTitle('  Live Clip  ')).toBe('Live Clip | YouTube Atlas');
  });

  it('falls back when no title is available', () => {
    expect(getNowPlayingDocumentTitle('')).toBe(DEFAULT_DOCUMENT_TITLE);
  });
});
