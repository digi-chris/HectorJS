var HectorCore = require(process.cwd() + '/HectorCore.js');
const TextWriter = require('./TextWriter.js');
const uuidv1 = require('uuid/v1');
//const bitmapManipulation = require('bitmap-manipulation');

class GraphicsObjectProperties {
  constructor(x, y, scale_x, scale_y, opacity) {
    if(!arguments.Length) {
      this.X = 0;
      this.Y = 0;
      this.ScaleX = 1;
      this.ScaleY = 1;
      this.Opacity = 1;
      this.Rotation = 0;
    } else {
      this.X = x;
      this.Y = y;
      this.ScaleX = scale_x;
      this.ScaleY = scale_y;
      this.Opacity = opacity;
    }
  }

  Clone() {
    let props = new GraphicsObjectProperties(this.X, this.Y, this.ScaleX, this.ScaleY, this.Opacity);
    props.Rotation = this.Rotation;
    return props;
  }

  GetRotationRadians() {
    return (this.Rotation * Math.PI) / 180;
  }
}

module.exports.GraphicsObjectProperties = GraphicsObjectProperties;

class GraphicsObject {
  constructor(guid) {
    if(arguments.length) {
      this.guid = guid;
    } else {
       this.guid = uuidv1();
    }
    this.Properties = new GraphicsObjectProperties();
    this.Type = "";
    this.Name = "";
  }

  Update(newObject, animate) {
    if(this.Type === newObject.Type) {
      var groupObject = false;
      if(this.Type === "group") {
        groupObject = true;
      }
      // TODO: Implement animation
      this.Properties = newObject.Properties;
      for(var obj in this) {
        this[obj] = newObject[obj];
      }
    }
  }

  Render(transitionPos) {
    // TODO
  }
}

class GraphicsText extends GraphicsObject {
  constructor(text) {
    super();
    this.Type = "text";
    this.Text = text;
    this.Font = "pixel5x8";
    this.ForeColor = new Color(255, 255, 255);
    this.Output = null;
  }

  Draw() {
    // TODO: Shouldn't be hard-coded
    var textWidth = 6 * this.Text.length;
    let bitmapFrame = new HectorCore.BitmapFrame(textWidth, 8);
    TextWriter.DrawText(bitmapFrame, 0, 0, this.Text, this.Font, 0xffffff);

    var gFrame = new GraphicsFrame();
    //console.log('Cloning properties (X = ' + this.Properties.X + ')');
    //gFrame.Properties = this.Properties.Clone();
    gFrame.Properties = Object.assign(new GraphicsObjectProperties, this.Properties);
    gFrame.BackgroundImage = bitmapFrame;
    //console.log(gFrame.Properties.X);

    // TODO: We should be caching to Output, but in C# we use jsonIgnore to stop the Output property getting passed to the end user
    //console.log('GraphicsText.Draw "' + this.Text + '" complete.');
    return gFrame;
  }
}

class GraphicsCharacter extends GraphicsObject {
  constructor(text) {
    super();
    this.Type = "character";
    this.Char = text;
    this.Font = "weather8x8";
    this.ForeColor = new Color(255, 255, 255);
    this.Output = null;
  }

  Draw() {
    // TODO: Shouldn't be hard-coded
    //var textWidth = 8 * this.Text.length;
    let bitmapFrame = new HectorCore.BitmapFrame(8, 8);
    //console.log('CHAR DRAWING: ' + this.Char);
    TextWriter.DrawCharacter(bitmapFrame, 0, 0, this.Char, this.Font, 0xffffff);

    var gFrame = new GraphicsFrame();
    //console.log('Cloning properties (X = ' + this.Properties.X + ')');
    //gFrame.Properties = this.Properties.Clone();
    gFrame.Properties = Object.assign(new GraphicsObjectProperties, this.Properties);
    gFrame.BackgroundImage = bitmapFrame;
    //console.log(gFrame.Properties.X);

    // TODO: We should be caching to Output, but in C# we use jsonIgnore to stop the Output property getting passed to the end user
    //console.log('GraphicsCharacter.Draw "' + this.Char + '" complete.');
    return gFrame;
  }
}

class Color {
  constructor(red, green, blue) {
    this.Red = red;
    this.Green = green;
    this.Blue = blue;
  }
}

module.exports.GraphicsText = GraphicsText;
module.exports.GraphicsCharacter = GraphicsCharacter;

class GraphicsFrame {
  constructor() {
    this.Properties = new GraphicsObjectProperties(0, 0, 1, 1, 1);
    this.Children = [];
    this.BackgroundImage = null;
  }
}

module.exports.GraphicsFrame = GraphicsFrame;
