/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      resourceQuery: /react/, // solo *.svg?react
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            icon: true,
            svgProps: {
              fill: "currentColor",
              "aria-hidden": "true",
              focusable: "false",
            },
            replaceAttrValues: { "#000": "currentColor", black: "currentColor" },
          },
        },
      ],
    });
    return config;
  },
};
