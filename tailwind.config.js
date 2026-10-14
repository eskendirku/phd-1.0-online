// Used only to rebuild tailwind.css after changing classes: npm run build:css
module.exports = {
  content: ['./index.html', './experiment.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'sans-serif']
      }
    }
  }
};
