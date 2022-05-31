module.exports = {
	collectCoverageFrom: ['**/*/*.{js,jsx}', '!**/node_modules/**', '!**/coverage/**'],
	coverageDirectory: 'coverage',
	coveragePathIgnorePatterns: ['/node_modules/', 'package.json', 'package-lock.json'],
	coverageProvider: 'v8',
	testMatch: ['**/specs/**/*.[jt]s?(x)', '**/?(*.)+(test).[tj]s?(x)']
};
