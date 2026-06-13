const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProd ? "production" : "development",
  entry: path.join(__dirname, "src/index.js"),
  output: {
    path: isProd ? path.join(__dirname, "gas") : path.join(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    open: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "index.html",
      meta: {
        viewport: "width=device-width, initial-scale=1.0",
      },
      templateContent: () => `
<html>
  <head></head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    }),
  ],
  module: {
    rules: [
      { test: /.js$/, exclude: /node_modules/, use: ["babel-loader"] },
      {
        test: /.css$/,
        use: [
          "style-loader",
          { loader: "css-loader", options: { modules: true } },
          "sass-loader",
        ],
      },
    ],
  },
};
