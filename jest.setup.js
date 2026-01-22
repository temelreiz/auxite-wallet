import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
  usePathname: () => '/',
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} />,
}));

// Mock wagmi - virtual true for optional dependencies
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x7bb286a8C876aC6283Dd0B95d8ec853bbDb20378',
    isConnected: true,
  }),
  useBalance: () => ({ data: { formatted: '1.5' }, isLoading: false }),
  useContractRead: () => ({ data: null, isLoading: false }),
  useContractWrite: () => ({ write: jest.fn(), isLoading: false }),
}), { virtual: true });

// Mock connectkit - virtual true because it may not be installed
jest.mock('connectkit', () => ({
  ConnectKitButton: () => null,
  ConnectKitProvider: ({ children }) => children,
}), { virtual: true });

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});
