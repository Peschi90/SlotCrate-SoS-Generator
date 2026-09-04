/** @type {import("tailwindcss").Config} */
export default {
    content: ["./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                crate: {
                    plate: "#e6e2d3",
                    box: "#4c8cff",
                    invalid: "#e2483b",
                    valid: "#3ea86a"
                }
            }
        }
    },
    plugins: []
};