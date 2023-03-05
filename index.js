const stream = require(`stream`)

/**
 * Create a stream from a file that is being actively written to.
 * 
 * @constructor
 * @param {String} [location] location of the file
 * @param {Object} [options] stream options
 * @param {Number} [options.checkIntervalTime = 500] the amount of time (in ms) it should take between checking the file & updating the stream with new file updates (if any)
 * @param {Number} [options.failedCheckTime = 2000] the amount of time to wait before checking after an attempt returned nothing new to pipe
 * @param {Number} [options.checkIntervalAmount = 22] the amount of times the interval should check the file for updates before considering it complete. if there is more data to pipe, the check count will reset.
 * @param {Function} [options.logging] the function to use for verbose logging (will not log anything if not present or not a function.)
 */

module.exports = class ProgressiveStream {
    ended = false

    bytesRead = 0
    failedAttempts = -10;

    constructor(location, options) {
        if(location && fs.existsSync(location)) {
            this.location = location

            this.maximumFailedAttempts = options.checkIntervalAmount || 22
            this.intervalTime = options.checkIntervalTime || 500
            this.failedCheckTime = options.failedCheckTime || this.intervalTime > 2000 ? this.intervalTime : 2000

            this.logFunc = options.logging || null

            this.stream = new stream.Readable({ read(size) {} })

            this.pipe()
        } else if(location) {
            throw new Error(`No location was provided!`);
        } else if(!fs.existsSync(location)) {
            throw new Error(`Location does not exist!`)
        }
    }

    pipe = () => {
        if(this.logFunc) console.log(`Checking for new data...`)

        if(fs.existsSync(this.location) && !this.ended) {
            if(this.interval) {
                clearTimeout(this.interval);
                this.interval = null;
            }

            const stat = fs.statSync(this.location);

            const length = stat.size - this.bytesRead;

            if(length > 0) {
                if(this.logFunc) console.log(`Length to pipe: ${length}`)
                
                let buffer = Buffer.alloc(length);
                const offset = 0;
                const position = this.bytesRead;
                
                this.failedAttempts = 0;

                fs.read(fs.openSync(this.location, `r`), {
                    buffer, 
                    offset, 
                    length, 
                    position
                }, (err, bytesRead, buffer) => {
                    try {
                        this.stream.push(buffer)
                        this.bytesRead += buffer.length;
                        if(this.bytesRead == buffer.length) {
                            return this.interval = setTimeout(this.pipe, this.intervalTime)
                        } else return this.interval = setTimeout(this.pipe, this.failedCheckTime)
                    } catch(e) {
                        this.failedAttempts = this.maximumFailedAttempts
                    }
                })
            } else {
                this.failedAttempts++;
            }

            if(this.failedAttempts >= this.maximumFailedAttempts) {
                if(this.logFunc) this.logFunc(`There has been ${this.failedAttempts} / 22 attempts to pipe more output, but there has been none to send. Closing stream!`);
                this.stream.emit(`close`)
                this.stream.destroy()
                this.stream.emit(`end`)
            } else {
                this.interval = setTimeout(this.pipe, this.intervalTime)
            }
        } else if(!fs.existsSync(this.location)) {
            const error = new Error(`File cannot be found anymore! (data was already piped)`)
            this.stream.emit(`error`, error);
            this.stream.destroy(error)
        }
    }
}