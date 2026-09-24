import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../../app';
import { prisma } from '../../../lib/prisma';

describe('Quiz Management REST API', () => {
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Upsert two clean test users
    const user1 = await prisma.user.upsert({
      where: { email: 'api-test-user-1@quizora.local' },
      update: {},
      create: {
        name: 'API Test User 1',
        email: 'api-test-user-1@quizora.local',
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.upsert({
      where: { email: 'api-test-user-2@quizora.local' },
      update: {},
      create: {
        name: 'API Test User 2',
        email: 'api-test-user-2@quizora.local',
      },
    });
    user2Id = user2.id;

    // Clean up any old test quizzes
    await prisma.quiz.deleteMany({
      where: { ownerId: { in: [user1Id, user2Id] } },
    });
  });

  afterAll(async () => {
    // Clean up test quizzes
    await prisma.quiz.deleteMany({
      where: { ownerId: { in: [user1Id, user2Id] } },
    });
    await prisma.$disconnect();
  });

  // 1. Missing development user ID is rejected
  it('1. rejects request with missing X-Dev-User-Id header', async () => {
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 2. Invalid development user ID is rejected
  it('2. rejects request with non-UUID or non-existent X-Dev-User-Id header', async () => {
    const resInvalidFormat = await request(app)
      .get('/api/quizzes')
      .set('X-Dev-User-Id', 'not-a-uuid');
    expect(resInvalidFormat.status).toBe(401);
    expect(resInvalidFormat.body.error.code).toBe('UNAUTHORIZED');

    const resNonExistent = await request(app)
      .get('/api/quizzes')
      .set('X-Dev-User-Id', '00000000-0000-0000-0000-000000000000');
    expect(resNonExistent.status).toBe(401);
    expect(resNonExistent.body.error.code).toBe('UNAUTHORIZED');
  });

  // 3. Create quiz succeeds for valid user
  let user1QuizId: string;
  it('3. allows valid user to create a quiz', async () => {
    const res = await request(app).post('/api/quizzes').set('X-Dev-User-Id', user1Id).send({
      title: 'Science Trivia',
      description: 'Basic science questions',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Science Trivia');
    expect(res.body.ownerId).toBe(user1Id);
    user1QuizId = res.body.id;
  });

  // 4. List returns only quizzes owned by current user
  it('4. list returns only quizzes owned by current user', async () => {
    // Create a quiz for user2
    const res2 = await request(app)
      .post('/api/quizzes')
      .set('X-Dev-User-Id', user2Id)
      .send({ title: 'User 2 Quiz' });
    expect(res2.status).toBe(201);

    // Fetch user1 list
    const resUser1List = await request(app).get('/api/quizzes').set('X-Dev-User-Id', user1Id);
    expect(resUser1List.status).toBe(200);
    expect(Array.isArray(resUser1List.body)).toBe(true);
    expect(resUser1List.body.every((q: { ownerId: string }) => q.ownerId === user1Id)).toBe(true);
    expect(resUser1List.body.some((q: { id: string }) => q.id === user1QuizId)).toBe(true);

    // Fetch user2 list
    const resUser2List = await request(app).get('/api/quizzes').set('X-Dev-User-Id', user2Id);
    expect(resUser2List.status).toBe(200);
    expect(resUser2List.body.every((q: { ownerId: string }) => q.ownerId === user2Id)).toBe(true);
  });

  // 5. Get quiz succeeds for owner
  it('5. allows owner to get their quiz with questions and options', async () => {
    const res = await request(app).get(`/api/quizzes/${user1QuizId}`).set('X-Dev-User-Id', user1Id);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user1QuizId);
    expect(res.body.questions).toBeDefined();
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  // 6. Get another user's quiz is rejected
  it('6. rejects attempt by non-owner to get another users quiz', async () => {
    const res = await request(app).get(`/api/quizzes/${user1QuizId}`).set('X-Dev-User-Id', user2Id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 7. Update quiz succeeds for owner
  it('7. allows owner to update quiz title and description', async () => {
    const res = await request(app)
      .put(`/api/quizzes/${user1QuizId}`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        title: 'Updated Science Trivia',
        description: 'Updated description',
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Science Trivia');
    expect(res.body.description).toBe('Updated description');
  });

  // 8. Update another user's quiz is rejected
  it('8. rejects attempt by non-owner to update another users quiz', async () => {
    const res = await request(app)
      .put(`/api/quizzes/${user1QuizId}`)
      .set('X-Dev-User-Id', user2Id)
      .send({ title: 'Hacked Title' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // 10. Create question enforces quiz ownership
  let questionId: string;
  it('10. enforces quiz ownership when adding questions', async () => {
    // Non-owner cannot add question
    const resForbidden = await request(app)
      .post(`/api/quizzes/${user1QuizId}/questions`)
      .set('X-Dev-User-Id', user2Id)
      .send({
        text: 'What is H2O?',
        order: 1,
        timeLimitSeconds: 20,
        maxPoints: 1000,
      });
    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe('FORBIDDEN');

    // Owner can add question
    const resSuccess = await request(app)
      .post(`/api/quizzes/${user1QuizId}/questions`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'What is H2O?',
        order: 1,
        timeLimitSeconds: 20,
        maxPoints: 1000,
      });
    expect(resSuccess.status).toBe(201);
    expect(resSuccess.body.id).toBeDefined();
    expect(resSuccess.body.text).toBe('What is H2O?');
    expect(resSuccess.body.order).toBe(1);
    questionId = resSuccess.body.id;
  });

  // 13. Duplicate question order is handled correctly
  it('13. rejects duplicate question order with 409 conflict', async () => {
    const res = await request(app)
      .post(`/api/quizzes/${user1QuizId}/questions`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'What is CO2?',
        order: 1, // Order 1 already exists
        timeLimitSeconds: 15,
        maxPoints: 500,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // 11. Create option enforces question/quiz ownership
  let optionId: string;
  it('11. enforces question ownership when adding options', async () => {
    // Non-owner cannot add option
    const resForbidden = await request(app)
      .post(`/api/questions/${questionId}/options`)
      .set('X-Dev-User-Id', user2Id)
      .send({
        text: 'Water',
        order: 1,
        isCorrect: true,
      });
    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe('FORBIDDEN');

    // Owner can add option
    const resSuccess = await request(app)
      .post(`/api/questions/${questionId}/options`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'Water',
        order: 1,
        isCorrect: true,
      });
    expect(resSuccess.status).toBe(201);
    expect(resSuccess.body.id).toBeDefined();
    expect(resSuccess.body.text).toBe('Water');
    expect(resSuccess.body.isCorrect).toBe(true);
    optionId = resSuccess.body.id;
  });

  // 14. Duplicate option order is handled correctly
  it('14. rejects duplicate option order with 409 conflict', async () => {
    const res = await request(app)
      .post(`/api/questions/${questionId}/options`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'Gold',
        order: 1, // Order 1 already exists
        isCorrect: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // 12. Invalid request bodies are rejected with validation errors
  it('12. rejects invalid request bodies with validation errors', async () => {
    // Empty title
    const resEmptyTitle = await request(app)
      .post('/api/quizzes')
      .set('X-Dev-User-Id', user1Id)
      .send({ title: '' });
    expect(resEmptyTitle.status).toBe(400);
    expect(resEmptyTitle.body.error.code).toBe('VALIDATION_ERROR');

    // Unknown field in strict schema
    const resUnknownField = await request(app)
      .post('/api/quizzes')
      .set('X-Dev-User-Id', user1Id)
      .send({ title: 'Valid Title', unexpectedField: 'invalid' });
    expect(resUnknownField.status).toBe(400);
    expect(resUnknownField.body.error.code).toBe('VALIDATION_ERROR');

    // Negative question order
    const resNegativeOrder = await request(app)
      .post(`/api/quizzes/${user1QuizId}/questions`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'Question text',
        order: -1,
        timeLimitSeconds: 20,
        maxPoints: 1000,
      });
    expect(resNegativeOrder.status).toBe(400);
    expect(resNegativeOrder.body.error.code).toBe('VALIDATION_ERROR');

    // Invalid boolean for isCorrect
    const resInvalidBoolean = await request(app)
      .post(`/api/questions/${questionId}/options`)
      .set('X-Dev-User-Id', user1Id)
      .send({
        text: 'Option text',
        order: 2,
        isCorrect: 'not-a-boolean',
      });
    expect(resInvalidBoolean.status).toBe(400);
    expect(resInvalidBoolean.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Update and delete option
  it('allows owner to update and delete options', async () => {
    // Non-owner cannot update option
    const resForbidden = await request(app)
      .put(`/api/options/${optionId}`)
      .set('X-Dev-User-Id', user2Id)
      .send({ text: 'Updated Option' });
    expect(resForbidden.status).toBe(403);

    // Owner can update option
    const resUpdate = await request(app)
      .put(`/api/options/${optionId}`)
      .set('X-Dev-User-Id', user1Id)
      .send({ text: 'Updated Option Text' });
    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.text).toBe('Updated Option Text');

    // Owner can delete option
    const resDelete = await request(app)
      .delete(`/api/options/${optionId}`)
      .set('X-Dev-User-Id', user1Id);
    expect(resDelete.status).toBe(200);
  });

  // Update and delete question
  it('allows owner to update question', async () => {
    const resUpdate = await request(app)
      .put(`/api/questions/${questionId}`)
      .set('X-Dev-User-Id', user1Id)
      .send({ text: 'Updated Question Text', maxPoints: 1500 });
    expect(resUpdate.status).toBe(200);
    expect(resUpdate.body.text).toBe('Updated Question Text');
    expect(resUpdate.body.maxPoints).toBe(1500);
  });

  // 9. Delete quiz enforces ownership
  it('9. enforces ownership on quiz deletion', async () => {
    // Non-owner cannot delete
    const resForbidden = await request(app)
      .delete(`/api/quizzes/${user1QuizId}`)
      .set('X-Dev-User-Id', user2Id);
    expect(resForbidden.status).toBe(403);
    expect(resForbidden.body.error.code).toBe('FORBIDDEN');

    // Owner can delete
    const resSuccess = await request(app)
      .delete(`/api/quizzes/${user1QuizId}`)
      .set('X-Dev-User-Id', user1Id);
    expect(resSuccess.status).toBe(200);
    expect(resSuccess.body.message).toBeDefined();

    // Verify it is gone
    const resNotFound = await request(app)
      .get(`/api/quizzes/${user1QuizId}`)
      .set('X-Dev-User-Id', user1Id);
    expect(resNotFound.status).toBe(404);
  });

  // Health endpoint test
  it('keeps GET /api/health functioning', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.message).toBe('Quizora API is running');
  });
});
