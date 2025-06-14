/**
 * Jest configuration for RedBut web client
 */
module.exports = {
  // Use Node.js environment for tests
  testEnvironment: 'jsdom',
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Collect coverage information
  collectCoverage: true,
  
  // Directory where Jest should output coverage files
  coverageDirectory: 'coverage',
  
  // Coverage providers
  coverageProvider: 'v8',
  
  // Files to include in coverage
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // File extensions to test
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // Test regex pattern
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Module name mapper for CSS and other assets
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    
    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    
    // Handle image imports
    '^.+\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/__mocks__/fileMock.js',
    
    // Handle module aliases
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Ignore transformations for node_modules except for specific packages
  transformIgnorePatterns: [
    '/node_modules/(?!(@redbut|socket.io-client)/)',
  ],
  
  // Environment variables
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Verbose output
  verbose: true,
  
  // Don't watch for changes
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
  ],
};
