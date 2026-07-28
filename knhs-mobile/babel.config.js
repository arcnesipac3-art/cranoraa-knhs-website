module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@api': './src/api',
            '@api/*': './src/api/*',
            '@hooks': './src/hooks',
            '@hooks/*': './src/hooks/*',
            '@stores': './src/stores',
            '@stores/*': './src/stores/*',
            '@services': './src/services',
            '@services/*': './src/services/*',
            '@lib': './src/lib',
            '@lib/*': './src/lib/*',
            '@components': './src/components',
            '@components/*': './src/components/*',
            '@theme': './src/theme',
            '@theme/*': './src/theme/*',
            '@providers': './src/providers',
            '@providers/*': './src/providers/*',
            '@utils': './src/utils',
            '@utils/*': './src/utils/*',
            '@types': './src/types',
            '@types/*': './src/types/*',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};