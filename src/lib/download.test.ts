import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupFilename, downloadJson } from './download';

afterEach(() => {
  vi.useRealTimers();
});

describe('downloadJson', () => {
  it('creates a blob URL and clicks an anchor carrying the given filename', () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson('backup.json', { hello: 'world' });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('backup.json');
    expect(anchor.href).toContain('blob:fake');
  });

  /**
   * Defect 21: the previous implementation revoked the object URL on the line
   * after `click()`. Some browsers cancel an in-flight download when the URL is
   * revoked synchronously, so revocation must be deferred.
   */
  it('does not revoke the object URL synchronously', () => {
    vi.useFakeTimers();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson('backup.json', {});
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('removes the temporary anchor from the document after clicking', () => {
    document.body.replaceChildren();
    vi.useFakeTimers();
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson('backup.json', {});
    expect(document.querySelectorAll('a[download]')).toHaveLength(1);

    vi.runAllTimers();
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('serialises the payload as indented JSON', () => {
    const blobs: BlobPart[][] = [];
    const OriginalBlob = globalThis.Blob;
    vi.stubGlobal(
      'Blob',
      class extends OriginalBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          blobs.push(parts);
          super(parts, options);
        }
      },
    );
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson('backup.json', { a: 1 });

    expect(blobs[0]?.[0]).toBe('{\n  "a": 1\n}');
  });
});

describe('backupFilename', () => {
  it('uses the local date, not UTC', () => {
    expect(backupFilename(new Date(2026, 0, 5))).toBe('huna-backup-2026-01-05.json');
  });

  it('zero-pads month and day', () => {
    expect(backupFilename(new Date(2026, 8, 9))).toBe('huna-backup-2026-09-09.json');
  });
});
