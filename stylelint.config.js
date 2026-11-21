export default {
  rules: {
    // No raw colours: use a token.
    'color-no-hex': true,
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],

    // No raw pixel values: use a token. Media query widths are exempt.
    'unit-disallowed-list': [['px'], { ignoreMediaFeatureNames: { '/.*/': ['px'] } }],

    // Only the design's values for decoration, weight and radius.
    'declaration-property-value-allowed-list': {
      '/^text-decoration(-line)?$/': ['none'],
      'font-weight': ['/^var\\(--font-weight\\)$/', 'inherit'],
      '/^border(-[a-z]+)*-radius$/': ['/^var\\(--radius(-sm)?\\)$/', 'var(--menu-radius)', 'var(--panel-radius)', '0', '50%', 'inherit'],
    },

    // Only the shared layout positions a screen vertically.
    'declaration-property-value-disallowed-list': {
      '/^margin-(top|bottom|block|block-start|block-end)$/': ['/auto/'],
      '/^(min-)?height$/': ['/^100d?vh$/'],
    },
  },
  overrides: [
    {
      // The layout components and the page base may centre and size a screen.
      files: ['src/shared/components/layout/*.css', 'src/styles/base.css'],
      rules: { 'declaration-property-value-disallowed-list': null },
    },
    {
      // Raw values live here and only here.
      files: ['src/styles/tokens.css'],
      rules: { 'color-no-hex': null, 'function-disallowed-list': null, 'unit-disallowed-list': null },
    },
    {
      // @font-face must declare the real weight.
      files: ['src/styles/fonts.css'],
      rules: { 'declaration-property-value-allowed-list': null },
    },
  ],
};
