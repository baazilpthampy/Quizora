"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Starting seed...');
    // Upsert a demo user
    const demoUser = await prisma.user.upsert({
        where: { email: 'teacher@quizora.demo' },
        update: {},
        create: {
            name: 'Demo Teacher',
            email: 'teacher@quizora.demo',
        },
    });
    // Since we want this to be re-runnable, delete the demo quiz if it exists
    await prisma.quiz.deleteMany({
        where: { ownerId: demoUser.id, title: 'Demo General Knowledge Quiz' },
    });
    // Create demo quiz with questions and options
    const demoQuiz = await prisma.quiz.create({
        data: {
            title: 'Demo General Knowledge Quiz',
            description: 'A simple demo quiz with 3 questions.',
            ownerId: demoUser.id,
            questions: {
                create: [
                    {
                        text: 'What is the capital of France?',
                        order: 1,
                        timeLimitSeconds: 30,
                        maxPoints: 1000,
                        options: {
                            create: [
                                { text: 'Berlin', order: 1, isCorrect: false },
                                { text: 'Madrid', order: 2, isCorrect: false },
                                { text: 'Paris', order: 3, isCorrect: true },
                                { text: 'Rome', order: 4, isCorrect: false },
                            ],
                        },
                    },
                    {
                        text: 'Which planet is known as the Red Planet?',
                        order: 2,
                        timeLimitSeconds: 30,
                        maxPoints: 1000,
                        options: {
                            create: [
                                { text: 'Earth', order: 1, isCorrect: false },
                                { text: 'Mars', order: 2, isCorrect: true },
                                { text: 'Jupiter', order: 3, isCorrect: false },
                                { text: 'Saturn', order: 4, isCorrect: false },
                            ],
                        },
                    },
                    {
                        text: 'What is the largest ocean on Earth?',
                        order: 3,
                        timeLimitSeconds: 30,
                        maxPoints: 1000,
                        options: {
                            create: [
                                { text: 'Atlantic Ocean', order: 1, isCorrect: false },
                                { text: 'Indian Ocean', order: 2, isCorrect: false },
                                { text: 'Arctic Ocean', order: 3, isCorrect: false },
                                { text: 'Pacific Ocean', order: 4, isCorrect: true },
                            ],
                        },
                    },
                ],
            },
        },
    });
    console.log(`Seed completed successfully! Demo Quiz ID: ${demoQuiz.id}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
