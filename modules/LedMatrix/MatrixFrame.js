module.exports = function(width, height) {
  this.Width = width;
  this.Height = height;
  this.Data = new Array(width * height).fill(0);

  this.SetPixel = function(x, y, value) {
    this.Data[(y * this.Width) + x] = value;
  };

  this.GetPixel = function(x, y) {
    return this.Data[(y * this.Width) + x];
  };
};
