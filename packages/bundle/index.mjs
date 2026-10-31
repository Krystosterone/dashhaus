// The workspace's view of the package: the prebuilt bundle is written in `dist/` beside `dist/index.js`, which a
// packed install resolves instead. Both point at the one file the deploy CLI uploads.

/** The prebuilt Lovelace bundle as a file URL: both skins, one ES module, no second file. */
export const bundlePath = new URL("./dist/dashhaus.js", import.meta.url);
