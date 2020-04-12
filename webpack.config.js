const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: path.join(__dirname, "src/index.js"),
  output: { path: path.join(__dirname, "dist") },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    open: true,
  },
  plugins: [new HtmlWebpackPlugin()],
};
