# ioBroker WLANThermo Nano Adapter

ioBroker WLANThermo Nano is a TypeScript-based ioBroker adapter that provides integration with WLANThermo Nano barbecue thermometer devices. It includes a React-based admin interface and follows ioBroker's standard adapter patterns.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

- Bootstrap, build, and test the repository:
  - Node.js 12.x, 14.x, or 16.x is supported (CI tests on all three versions)
  - `npm ci` -- installs dependencies. Takes ~50 seconds. NEVER CANCEL.
  - `npm run build` -- builds TypeScript and React components. Takes ~4 seconds.
  - `npm test` -- runs unit and package validation tests. Takes ~3 seconds.
  - `npm run test:integration` -- runs full adapter integration tests. Takes ~40 seconds. NEVER CANCEL.
  - `npm run lint` -- runs ESLint on TypeScript and React files. Takes ~4 seconds.
  - `npm run check` -- runs TypeScript type checking without compilation. Takes ~3 seconds.

## Build Commands and Timing

CRITICAL: All build commands are fast (<5 seconds) except npm install and integration tests.

- `npm ci`: 50 seconds (includes dependency installation) - NEVER CANCEL, set timeout to 120+ seconds
- `npm run build`: 4 seconds (builds both TS and React) 
- `npm run build:ts`: 2 seconds (builds only TypeScript backend)
- `npm run build:react`: 1 second (builds only React admin interface)
- `npm run lint`: 4 seconds
- `npm run check`: 3 seconds (TypeScript type checking)
- `npm test`: 3 seconds (unit + package tests)
- `npm run test:integration`: 40 seconds - NEVER CANCEL, set timeout to 120+ seconds
- `npm run coverage`: 3 seconds

## Development Workflow

- Always install dependencies first: `npm ci`
- For development, use watch modes:
  - `npm run watch` -- watches and rebuilds both TS and React on changes
  - `npm run watch:ts` -- watches only TypeScript files
  - `npm run watch:react` -- watches only React admin interface files
- Always run linting before committing: `npm run lint`
- Always run type checking: `npm run check`
- Test your changes: `npm test && npm run test:integration`

## Validation

- ALWAYS run through a complete build and test cycle after making changes:
  1. `npm ci` (if dependencies changed)
  2. `npm run build`
  3. `npm run lint`
  4. `npm run check` 
  5. `npm test`
  6. `npm run test:integration`
- The integration test actually starts the adapter and attempts to connect to a WLANThermo device
- Integration tests will show connection timeout warnings for 192.168.10.119 (default test IP) - this is expected
- NEVER CANCEL long-running commands. Integration tests take 40+ seconds.
- Always validate TypeScript compilation with `npm run check` before committing
- CI/CD pipeline runs on Node.js 12.x, 14.x, 16.x on Ubuntu, Windows, and macOS

## Common Tasks

The following are outputs from frequently run commands. Reference them instead of running bash commands to save time.

### Repository Structure
```
/home/runner/work/ioBroker.wlanthermo-nano/ioBroker.wlanthermo-nano/
├── admin/                 # React-based admin interface
│   ├── src/              # React TypeScript source
│   ├── build/            # Built React files (auto-generated)
│   ├── jsonConfig.json   # Admin UI configuration
│   └── tsconfig.json     # TypeScript config for admin
├── src/                  # Main adapter TypeScript source
│   ├── main.ts           # Main adapter implementation
│   ├── main.test.ts      # Unit tests
│   └── lib/              # Shared libraries and type definitions
├── test/                 # Test configuration and additional tests
├── build/                # Built TypeScript files (auto-generated)
├── package.json          # NPM configuration and scripts
├── tsconfig.json         # Main TypeScript configuration
├── tsconfig.build.json   # Build-specific TypeScript config
├── .eslintrc.js          # ESLint configuration
├── .prettierrc.js        # Prettier configuration
└── io-package.json       # ioBroker adapter configuration
```

### Key Configuration Files

#### package.json scripts:
- `build`: Builds both TypeScript and React components
- `watch`: Development mode with auto-rebuild
- `test`: Runs unit and package tests
- `lint`: ESLint validation
- `check`: TypeScript type checking
- `release`: Automated release process

#### TypeScript Configuration:
- Strict mode enabled
- ES2018 target
- CommonJS modules
- Source maps enabled
- React JSX support for admin interface

#### ESLint Configuration:
- TypeScript parser with React support
- Prettier integration
- Custom rules for ioBroker development

## Important Files to Check After Changes

- Always check `src/main.ts` after making changes to adapter logic
- Always check `admin/src/` after making changes to configuration interface
- Always check `src/lib/stateDefinitions.ts` after adding new device states
- Always check `io-package.json` after changing adapter metadata
- Always verify `package.json` version matches `io-package.json` version

## Adapter-Specific Information

- This adapter communicates with WLANThermo Nano BBQ thermometer devices over HTTP
- Supports multiple device configurations in adapter settings
- Uses polling to retrieve temperature data (configurable interval, default 30 seconds)
- Implements PitMaster control functionality for automated temperature regulation
- State definitions are centralized in `src/lib/stateDefinitions.ts`
- Device communication handled via Axios HTTP client
- Adapter configuration uses React-based admin interface with table for multiple devices

## Common Troubleshooting

- If build fails, ensure Node.js 12.x, 14.x, or 16.x is installed
- If TypeScript errors occur, run `npm run check` to see detailed type issues
- If tests fail, ensure no real WLANThermo devices are running on test IPs
- Integration test timeouts are expected when no real devices are available
- ESLint errors must be fixed before CI will pass
- React admin interface builds independently from main adapter code

## Testing Scenarios

After making changes, verify:
1. Adapter builds successfully (`npm run build`)
2. TypeScript compiles without errors (`npm run check`)
3. All linting rules pass (`npm run lint`)
4. Unit tests pass (`npm test`)
5. Integration test starts adapter successfully (`npm run test:integration`)
6. Admin interface builds without errors (included in `npm run build`)

## CI/CD Information

- GitHub Actions workflow: `.github/workflows/test-and-release.yml`
- Tests run on multiple Node.js versions (12.x, 14.x, 16.x)
- Tests run on Ubuntu, Windows, and macOS
- Automatic deployment to NPM on tagged releases
- ESLint and type checking are mandatory for CI success