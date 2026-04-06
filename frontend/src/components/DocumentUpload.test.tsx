import type { ChangeEvent } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentUpload } from './DocumentUpload';

const uploadMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  api: {
    upload: uploadMock,
  },
}));

vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (files: File[]) => void }) => ({
    getRootProps: () => ({}),
    getInputProps: () => ({
      type: 'file',
      onChange: (event: ChangeEvent<HTMLInputElement>) =>
        onDrop(Array.from(event.target.files ?? [])),
    }),
    isDragActive: false,
  }),
}));

describe('DocumentUpload', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({
      chunks_created: 3,
      language_detected: 'en',
    });
  });

  it('passes the active session id to uploads', async () => {
    const onUploadComplete = vi.fn();
    const { container } = render(
      <DocumentUpload onUploadComplete={onUploadComplete} sessionId="session-abc" />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(['policy'], 'policy.txt', { type: 'text/plain' })] },
    });

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(expect.any(File), 'public', 'session-abc'),
    );
    expect(onUploadComplete).toHaveBeenCalled();
  });

  it('allows uploads without an active session', async () => {
    const { container } = render(<DocumentUpload onUploadComplete={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [new File(['policy'], 'policy.txt', { type: 'text/plain' })] },
    });

    await waitFor(() =>
      expect(uploadMock).toHaveBeenCalledWith(expect.any(File), 'public', undefined),
    );
  });
});
