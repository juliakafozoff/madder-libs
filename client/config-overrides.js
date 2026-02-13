module.exports = function override(config, env) {
  // CRA 5 automatically picks up postcss.config.js for PostCSS/Tailwind
  // This file is required by react-app-rewired but can be minimal
  // if we're only using PostCSS config
  return config;
};

