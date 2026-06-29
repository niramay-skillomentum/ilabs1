import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkstationComponent from '../src/app/workstation/page';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock the Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock the auth library
jest.mock('../src/lib/auth', () => ({
  loadUserId: jest.fn(() => 'user-123'),
  getToken: jest.fn(() => 'mock-token'),
  authHeaders: jest.fn(),
  clearSession: jest.fn(),
}));

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  return {
    io: jest.fn(() => ({
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    })),
  };
});

describe('WorkstationComponent', () => {
  beforeEach(() => {
    // Setup generic mock returns
    useRouter.mockReturnValue({
      push: jest.fn(),
    });
    
    // Simulate query param ?desk=MO
    useSearchParams.mockReturnValue({
      get: jest.fn((key) => {
        if (key === 'desk') return 'MO';
        return null;
      }),
    });
    
    // Mock fetch for the initial API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, trades: [] }),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the workstation header with correct desk', async () => {
    render(<WorkstationComponent />);
    
    // Wait for the UI to settle (since there are useEffect hooks)
    const header = await screen.findByText(/MO Desk Workstation/i);
    expect(header).toBeInTheDocument();
  });

  it('renders the generate queue button', async () => {
    render(<WorkstationComponent />);
    
    const generateBtn = await screen.findByRole('button', { name: /Generate Test Queue/i });
    expect(generateBtn).toBeInTheDocument();
  });
});
