const { spawn } = require('child_process')

module.exports = class Python {
  constructor () {
    const python = this.python = spawn('/usr/bin/python', ['-i'])
    python.stderr.on('data', (data) => {
      if (this.resolve) {
        if (data.toString() === '>>> ') {
          this.resolve()
        } else {
          this.reject()
        }
        this.resolve = undefined
        this.reject = undefined
      }
    })
  }

  run (command) {
    return new Promise((resolve, reject) => {
      if (this.resolve) {
        reject()
      } else {
        this.python.stdin.write(command + '\n', 'utf8', () => {
          this.resolve = resolve
          this.reject = reject
        })
      }
    })
  }
}
