const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProd ? "production" : "development",
  entry: path.join(__dirname, "src/index.tsx"),
  resolve: { extensions: [".tsx", ".ts", ".js"] },
  output: {
    path: isProd ? path.join(__dirname, "gas") : path.join(__dirname, "dist"),
    filename: "bundle.js",
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    open: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEPLOY_DATE__: JSON.stringify(
        process.env.DEPLOY_DATE || (isProd ? "" : "1970-01-01 00:00")
      ),
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      meta: {
        viewport:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
      },
      templateContent: () => `
<html>
  <head>
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; overscroll-behavior: none; }
      * { touch-action: manipulation; }
    </style>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    }),
  ],
  module: {
    rules: [
      { test: /\.tsx?$/, exclude: /node_modules/, use: ["babel-loader"] },
      { test: /\.txt$/, use: "raw-loader" },
      {
        // Always inlined as a base64 data URI, regardless of size - the
        // deployed app is a single HTML file (see gas/Code.js's doGet),
        // so there's no separate host to serve image files from.
        test: /\.(png|svg)$/,
        use: {
          loader: "url-loader",
          options: { limit: Number.MAX_SAFE_INTEGER },
        },
      },
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
