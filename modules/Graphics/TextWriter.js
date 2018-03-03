var fs = require('fs');

var fonts = {};
console.log('**********************************************');
console.log('looking for fonts in ' + __dirname + '/Fonts/');
console.log('**********************************************');
var fontFolder = __dirname + '/Fonts/';
fs.readdir(fontFolder, (err, files) => {
  if(err) {
    console.log(err);
  } else {
    files.forEach(file => {
      //console.log(file);
      fs.stat(fontFolder + file, (err, stats) => {
        if(!err) {
          if(!stats.isDirectory()) {
            console.log('reading font ' + file);
            fs.readFile(fontFolder + file, 'utf8', (err, data) => {
              if(err) {
                console.log(err);
              } else {
                var fontData = JSON.parse(data);
                console.log('Adding font "' + fontData.name + '"');
                fonts[fontData.name] = fontData;
              }
            });
          }
        }
      });
    });
  }
});

module.exports.DrawText = function(bitmapFrame, x, y, text, font, color) {
  //var charWidth = fonts[font].width;
  //var charHeight = fonts[font].height;
  var currentX = x;
  for(char of text) {
    var charWidth = drawCharacter(char, bitmapFrame, currentX, y, font, color);
    currentX += charWidth + 1;
  }
};

module.exports.DrawCharacter = function(bitmapFrame, x, y, text, font, color) {
  drawCharacter(text, bitmapFrame, x, y, font, color);
};

function drawCharacter(character, bitmapFrame, xPos, yPos, font, color) {
  if(fonts[font]) {
    var digit;
    character = character + '';
    if(character.length === 1) {
      // search for digit by character code
      digit = fonts[font].chars[(character).charCodeAt(0) + ''];
    }
    
    if(!digit) {
      // search for digit by character
      digit = fonts[font].chars[character];
    }

    if(!digit) {
      // we couldn't find the character!
      console.log("TextWriter WARNING: Couldn't find char '" + character + "' (" + character.charCodeAt(0) + ")");
      return 0;
    }
    
    if(Array.isArray(digit.data)) {
      var width = fonts[font].width;
      var height = fonts[font].height;
      var i = 0;
      //console.log('CHAR: ' + character + " (" + width + "x" + height + ")");
      for(var y = 0; y < height; y++) {
        //var textLine = '';
        for(var x = 0; x < width; x++) {
          //textLine += digit.data[i] + ' ';
          if(digit.data[i]) {
            bitmapFrame.SetPixel(x + xPos, y + yPos, color);
          }
          i++;
        }
        //console.log(textLine);
      }
      return width;
    }

    console.log("TextWriter WARNING: Couldn't find character '" + character + "' (" + character.charCodeAt(0) + ")");
    return 0;
  }

  console.log("TextWriter WARNING: Couldn't find font '" + font + "'");
  return 0;
};