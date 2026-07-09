/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "yahoo-finance2",
      "@langchain/google-genai",
      "@langchain/openai",
      "@langchain/anthropic",
      "@langchain/core",
      "@langchain/langgraph",
      "@google/generative-ai"
    ],
  },
};

module.exports = nextConfig;
