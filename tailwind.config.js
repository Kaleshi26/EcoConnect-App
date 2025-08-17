/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'custom-blue': '#1DA1F2',
        'custom-green': '#1DB954',
        'custom-red': '#FF0000',
        'custom-yellow': '#FFCC00',
        'custom-purple': '#A500B5',
        light:{
          100:'#F3F4F6',
          200:'#E5E7EB',
          300:'#D1D5DB',
          400:'#9CA3AF',
          500:'#6B7280',
        },
        dark:{
          100:'#374151',
          200:'#1F2937',
          300:'#111827',
          400:'#0F172A',
          500:'#0A0E15'
        },
      },
    },
  },
  plugins: [],
};
