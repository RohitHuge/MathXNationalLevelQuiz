import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.answer.deleteMany({});
    await prisma.question.deleteMany({});

    console.log("Seeding 10 numerical questions...");

    const questions = [
        { text: "Evaluate the definite integral:", mathText: "\\int_{0}^{2} 3x^2 dx", correctAnswer: 8, isActive: false },
        { text: "Find the limit as x approaches 0:", mathText: "\\lim_{x \\to 0} \\frac{\\sin(x)}{x}", correctAnswer: 1, isActive: false },
        { text: "Compute the derivative at x=2:", mathText: "f(x) = x^3 - 4x \\text{, find } f'(2)", correctAnswer: 8, isActive: false },
        { text: "Solve for x:", mathText: "\\log_{2}(x) = 5", correctAnswer: 32, isActive: false },
        { text: "Evaluate the sum:", mathText: "\\sum_{n=1}^{5} 2n", correctAnswer: 30, isActive: false },
        { text: "Find the larger positive root:", mathText: "x^2 - 5x + 6 = 0", correctAnswer: 3, isActive: false },
        { text: "Compute the dot product:", mathText: "\\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix} \\cdot \\begin{pmatrix} -1 \\\\ 4 \\end{pmatrix}", correctAnswer: 10, isActive: false },
        { text: "Evaluate:", mathText: "5!", correctAnswer: 120, isActive: false },
        { text: "What is the determinant?", mathText: "\\det \\begin{pmatrix} 3 & 4 \\\\ 1 & 2 \\end{pmatrix}", correctAnswer: 2, isActive: false },
        { text: "Find the value of:", mathText: "2^4 \\times 3^2", correctAnswer: 144, isActive: false },
    ];

    for (const [index, q] of questions.entries()) {
        await prisma.question.create({
            data: {
                id: `mathx-q${index + 1}`,
                ...q
            }
        });
    }

    console.log("Seeded successfully.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
