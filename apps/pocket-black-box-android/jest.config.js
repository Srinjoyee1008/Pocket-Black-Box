module.exports = {
  preset: 'react-native',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {tsconfig: 'tsconfig.json'}],
  },
};
