module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/gas/"],
  // Lets component tests (e.g. Maze/index.test.tsx) actually import the real
  // component file, which pulls in binary assets/CSS Modules/map.txt that
  // Jest can't transform out of the box - see jest/*.js for what each stands
  // in for. Explicitly keeping the default babel-jest transform alongside
  // the new .txt one, since supplying `transform` at all stops Jest from
  // adding its own default automatically.
  moduleNameMapper: {
    "\\.(png|jpg|jpeg|svg)$": "<rootDir>/jest/fileMock.js",
    "\\.css$": "<rootDir>/jest/cssMock.js",
  },
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
    "\\.txt$": "<rootDir>/jest/rawTransform.js",
  },
};
