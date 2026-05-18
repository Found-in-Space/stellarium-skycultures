module.exports = {
  entry: './src/main.js',
  output: {
    filename: 'bundle.[contenthash].js',
    assetModuleFilename: 'assets/[name].[contenthash][ext]',
    clean: true,
  },
};
