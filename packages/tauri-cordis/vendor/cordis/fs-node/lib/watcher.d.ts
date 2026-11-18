import { Watcher } from '../../fs/lib/index.js';
/** Serves `watcher` at `filename` through chokidar, and returns a function that stops it. */
export declare function watchPath(watcher: Watcher, filename: string): () => Promise<void>;
