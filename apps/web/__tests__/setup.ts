import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch API
global.fetch = jest.fn((url, options) => {
  if (url.includes('/api/v1/auth/anon')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        userId: 'test-user-id',
        tableNumber: 42,
        sessionId: 'test-session-id',
        token: 'mock-jwt-token',
      }),
    });
  }
  // Default fallback for other fetch calls if needed
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
}) as jest.Mock;

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  const mSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    auth: {},
    data: {},
  };
  return {
    io: jest.fn(() => mSocket),
  };
});

// Mock window.prompt
global.prompt = jest.fn(() => '42'); // Default table number for tests

// Mock matchMedia for libraries like Framer Motion that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
