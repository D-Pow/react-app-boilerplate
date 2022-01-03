/**
 * Add additional types to be interpreted globally that aren't automatically
 * included.
 *
 * For example, TypeScript plugins/packages that alter global objects (e.g. polyfills,
 * global lib enhancements, etc.) but don't have their typedefs defined in either
 * `node_modules/@types/pkg/` or `node_modules/pkg/@types/` directories will throw errors
 * in `tsc`, Jest, IDEs, etc.
 *
 * Thus, add global support for these (or any home-brewed types) here.
 *
 * Note: We would not want to add these libs to the tsconfig's [`types`]{@link https://www.typescriptlang.org/tsconfig#types}
 * or [`typeRoots`]{@link https://www.typescriptlang.org/tsconfig#typeRoots} arrays because
 * those override the ability to parse the default `node_modules(/pkg?)/@types/` dirs.
 *
 * @file
 */

import './augmentations';
import './assets';
