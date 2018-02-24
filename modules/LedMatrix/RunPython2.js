const { spawn } = require('child_process')

module.exports = class Python {
  constructor () {
    const python = this.python = spawn('/usr/bin/python', ['-i'])
    python.stderr.on('data', (data) => {
      //console.log('PYTHON: ' + data);
    })
  }

  run (command) {
    this.python.stdin.write(command + '\n', 'utf8', () => {
      //console.log('PYTHON: done.');
    });
  }
}
