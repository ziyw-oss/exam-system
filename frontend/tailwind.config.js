// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}",
            "./pages/**/*.{js,ts,jsx,tsx}",
            "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [
    "text-red-600",
    "text-green-800",
    "bg-green-100",
    "bg-red-100",
    "text-red-700",
    "text-xs",
    // 你还可以根据需要加更多
  ],
  theme: {
    fontFamily: {
      sans: [
        'Roboto',
        'sans-serif',
      ],
    },
    extend: {
      colors: {
        primary: "#006666",
        "primary-dark": "#004d4d",
        "theme-blue": "#1e3a8a",
        softbg: "#e9f5ff",
      },
    },
  },
  plugins: [],
};  