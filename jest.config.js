// Pin the test timezone to UTC BEFORE worker processes fork (they inherit this
// env), so the UTC-anchored fixtures stay deterministic under the local-date
// logic on any machine/CI. Setting it here is reliable where setupFiles is not
// (some platforms cache TZ before setupFiles runs). setup.tz.js repeats it as a
// belt-and-suspenders for runners that honour runtime changes.
process.env.TZ = 'UTC';

// Two projects: 'logic' runs the pure TS/JS suites in a plain node
// environment via ts-jest; 'ui' renders React Native components through
// jest-expo (babel-preset-expo transforms, Expo/RN mocks) + RNTL.
module.exports = {
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/*.test.js'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.jest.json',
          isolatedModules: true,
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      clearMocks: true,
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/setup.tz.js'],
      moduleNameMapper: {
        '^../src/(.*)\\.js$': '<rootDir>/src/$1.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock',
      },
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/tests/ui/**/*.test.js'],
      clearMocks: true,
      // RN's Animated schedules real timers during teardown; fake timers
      // keep the worker exiting cleanly.
      fakeTimers: { enableGlobally: true },
      rootDir: '.',
      setupFiles: ['<rootDir>/tests/setup.tz.js'],
      moduleNameMapper: {
        '^@react-native-async-storage/async-storage$': '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock',
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-worklets))',
      ],
    },
  ],
};
