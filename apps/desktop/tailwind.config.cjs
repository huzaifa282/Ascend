const preset = require('../../packages/ui/tailwind-preset.cjs');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './main.html',
    './widget.html',
    './strip.html',
    './command.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app/src/**/*.{ts,tsx}',
  ],
};
