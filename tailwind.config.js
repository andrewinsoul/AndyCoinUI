module.exports = {
  content: ["./src/**/*.{html,js, jsx, tx}"],
  theme: {
    extend: {
      height: {
        1: "1px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
