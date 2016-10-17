'use strict';

const path      = require('path');
const fs        = require('fs');
const webpack   = require('webpack');
const pkg       = require('../../package.json');


// main config
module.exports = {
    entry: './main.js',
    output: {
        path: path.resolve(__dirname),
        publicPath: "/build/",
        library: 'PB',
        libraryTarget: 'umd',
        umdNamedDefine: true,
        filename: "bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.(glsl|frag|vert)$/,
                exclude: /node_modules/,
                loaders: ['raw', 'glslify'],
            },
        ],
        postLoaders: [
            {
                include: path.resolve(__dirname, 'node_modules/pixi.js'),
                loader: ['transform?brfs']
            }
        ],
    },
    plugins: [
        // don't emit output when there are errors
        new webpack.NoErrorsPlugin(),
    ],
};