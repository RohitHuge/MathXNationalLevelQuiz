export const questions = [
    {
        id: 1,
        question: "Evaluate the integral: $\\int_0^1 x^2 \\, dx$",
        options: ["$\\frac{1}{2}$", "$\\frac{1}{3}$", "$\\frac{1}{4}$", "$1$"],
        correctOption: 1 // index 1 is 1/3
    },
    {
        id: 2,
        question: "Solve for $x$: $e^{2x} - 5e^x + 6 = 0$",
        options: ["$x = \\ln 2$ or $x = \\ln 3$", "$x = 2$ or $x = 3$", "$x = e^2$ or $x = e^3$", "$x = 0$"],
        correctOption: 0
    },
    {
        id: 3,
        question: "What is the determinant of the matrix $\\begin{pmatrix} 2 & 3 \\\\ 1 & 4 \\end{pmatrix}$?",
        options: ["$5$", "$8$", "$11$", "$2$"],
        correctOption: 0 // 2*4 - 3*1 = 5
    },
    {
        id: 4,
        question: "Find the derivative of $f(x) = \\sin(x^2)$",
        options: ["$\\cos(x^2)$", "$2x\\cos(x^2)$", "$2x\\sin(x^2)$", "$x\\cos(x^2)$"],
        correctOption: 1
    },
    {
        id: 5,
        question: "What is the sum of the infinite geometric series $1 + \\frac{1}{2} + \\frac{1}{4} + \\dots$?",
        options: ["$2$", "$\\infty$", "$1.5$", "$1$"],
        correctOption: 0
    }
];
