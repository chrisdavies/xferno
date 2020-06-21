module.exports = {
  exclude: ['node_modules/**'],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          safari: '9',
        },
      },
    ],
  ],
  plugins: [
    ['@babel/plugin-transform-runtime'],
    [
      'babel-plugin-inferno',
      {
        imports: process.env.NODE_ENV === 'test' ? './index' : '../../src/xferno',
      },
    ],
  ],
};
