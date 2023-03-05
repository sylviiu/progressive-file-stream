# progressive-file-stream
Takes a file that is actively being written, and produce a live-updated a readable stream.

## Usage:

```js
const ProgressiveStream = require(`progressive-file-stream`);
const fs = require('fs');

const file = new ProgressiveStream(`./file.mp3`, {
    checkIntervalTime: 500, // the amount of time (in ms) it should take between checking the file & updating the stream with new file updates (if any)
    failedCheckTime: 2000, // the amount of time to wait before checking after an attempt returned nothing new to pipe
    checkIntervalAmount: 22, // the amount of times the interval should check the file for updates before considering it complete. if there is more data to pipe, the check count will reset.
    logging: null // the function to use for verbose logging (will not log anything if not present or not a function.)
});

file.stream.pipe(fs.createWritableStream(`./file2.mp3`))
```