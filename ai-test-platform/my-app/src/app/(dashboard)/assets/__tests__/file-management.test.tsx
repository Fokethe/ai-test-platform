import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AssetLibraryContent from '../AssetLibraryContent';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => key === 'type' ? 'file' : null,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Asset Library File Management', () => {
  const mockFiles = [
    { id: '1', name: '需求文档.pdf', size: 1024000, type: 'application/pdf', createdAt: '2026-03-01', status: 'parsed' },
    { id: '2', name: '测试规范.docx', size: 512000, type: 'application/docx', createdAt: '2026-03-02', status: 'pending' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/files/list')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { files: mockFiles, total: 2 } }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as unknown as typeof global.fetch;
  });

  it('renders file list', async () => {
    render(<AssetLibraryContent />);
    await waitFor(() => {
      expect(screen.getByText('需求文档.pdf')).toBeInTheDocument();
    });
  });
});
