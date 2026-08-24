import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Permite câmera/microfone em iframes e contextos cross-origin
          { key: "Permissions-Policy", value: "camera=*, microphone=()" },
          // Necessário para getUserMedia funcionar corretamente em produção
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
