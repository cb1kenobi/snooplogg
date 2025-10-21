# v6.1.0

 * Switch from Node.js EventEmitter to a lightweight browser-compatible version

# v6.0.3 (October 19, 2025)

 * chore: Replace rollup with rolldown (tsdown)

# v6.0.2 (October 14, 2025)

 * chore: Updated dependencies

# v6.0.1 (June 24, 2025)

 * chore: Updated dependencies

# v6.0.0 (July 16, 2024)

 * BREAKING CHANGE: Require Node.js 18.17.0 or newer
 * BREAKING CHANGE: Removed support for custom log methods
 * BREAKING CHANGE: Removed support for middleware
 * BREAKING CHANGE: Removed `console` creator
 * BREAKING CHANGE: Removed utility streams `StripColors`, `Format`,
   `StdioStream`, and `StdioDispatcher`
 * BREAKING CHANGE: Removed support for user-defined colors
 * BREAKING CHANGE: Removed support for inspect options
 * BREAKING CHANGE: Removed brightness settings
 * BREAKING CHANGE: Removed theme support; use new `format()`
 * BREAKING CHANGE: Removed `style()`; use new `elements`
 * BREAKING CHANGE: Removed the `.stdio` helper
 * BREAKING CHANGE: All logout is written to stderr
 * BREAKING CHANGE: Renamed `maxBufferSize` to `historySize`
 * BREAKING CHANGE: Removed `createInstanceWithDefaults()` helper
 * feat: Improved style and formatting system
 * feat: Reduced package size
 * feat: Support for stream specific formatting overrides
 * fix: Namespaces can no longer contain spaces, commas, or pipe characters

# v5.1.0 (July 14, 2022)

 * fix: Re-export original chalk instance instead of instance with forced
   colors.
 * chore: Updated dependencies.

# v5.0.0 (Mar 2, 2022)

 * BREAKING CHANGE: Require Node.js 14.15.0 LTS or newer.
 * fix: Always force colors even when not available. Use `StripColors`
   transform to remove color sequences when piping to files or non-TTY
   terminals.
 * chore: Updated dependencies.
 * chore: Replaced Travis with GitHub action.

# v4.0.0 (Feb 24, 2021)

 * BREAKING CHANGE: Changed package to a ES module.
 * BREAKING CHANGE: Require Node.js 12 or newer.

# 3.0.2 (Jan 5, 2021)

 * chore: Updated dependencies.

# 3.0.1 (Nov 30, 2020)

 * chore: Updated dependencies.
