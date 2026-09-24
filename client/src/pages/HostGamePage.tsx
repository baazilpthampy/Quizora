import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { getSocket } from "../lib/socket";
import type {
  QuestionStartedData,
  QuestionClosedData,
  LeaderboardData,
  QuizFinishedData,
  JoinedPlayer,
} from "../types/game";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Alert } from "../components/ui/Alert";

const OPTION_COLORS = [
  {
    bg: "bg-red-500",
    hover: "hover:bg-red-600",
    border: "border-red-600",
    text: "text-white",
    letter: "A",
  },
  {
    bg: "bg-blue-500",
    hover: "hover:bg-blue-600",
    border: "border-blue-600",
    text: "text-white",
    letter: "B",
  },
  {
    bg: "bg-amber-500",
    hover: "hover:bg-amber-600",
    border: "border-amber-600",
    text: "text-white",
    letter: "C",
  },
  {
    bg: "bg-emerald-500",
    hover: "hover:bg-emerald-600",
    border: "border-emerald-600",
    text: "text-white",
    letter: "D",
  },
  {
    bg: "bg-purple-500",
    hover: "hover:bg-purple-600",
    border: "border-purple-600",
    text: "text-white",
    letter: "E",
  },
  {
    bg: "bg-cyan-500",
    hover: "hover:bg-cyan-600",
    border: "border-cyan-600",
    text: "text-white",
    letter: "F",
  },
];

type HostState =
  | "INITIALIZING"
  | "LOBBY"
  | "QUESTION_ACTIVE"
  | "QUESTION_CLOSED"
  | "LEADERBOARD"
  | "FINISHED";

export const HostGamePage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const devUserId =
    import.meta.env.VITE_DEV_USER_ID || "51e8fa5e-ba31-4ccd-b9ea-f9c2ccbacfae";

  const [hostState, setHostState] = useState<HostState>("INITIALIZING");
  const [joinCode, setJoinCode] = useState<string>("");
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [players, setPlayers] = useState<JoinedPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Active question state
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionStartedData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [answersCount, setAnswersCount] = useState<number>(0);

  // Question closed state
  const [closedQuestionData, setClosedQuestionData] =
    useState<QuestionClosedData | null>(null);

  // Leaderboard / Finished state
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardData | null>(null);
  const [finishedData, setFinishedData] = useState<QuizFinishedData | null>(
    null,
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!quizId) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    // Initialize session
    socket.emit(
      "host:create_session",
      { quizId, hostUserId: devUserId },
      (res: {
        success: boolean;
        data?: {
          sessionId: string;
          joinCode: string;
          quizTitle: string;
          totalQuestions: number;
        };
        error?: string;
      }) => {
        if (res.success && res.data) {
          setJoinCode(res.data.joinCode);
          setQuizTitle(res.data.quizTitle);
          setTotalQuestions(res.data.totalQuestions);
          setHostState("LOBBY");
        } else {
          setError(res.error || "Failed to create live game session.");
        }
      },
    );

    // Event listeners
    socket.on(
      "session:player_joined",
      (data: {
        id: string;
        displayName: string;
        totalPlayers: number;
        players: JoinedPlayer[];
      }) => {
        setPlayers(data.players || []);
      },
    );

    socket.on(
      "session:player_left",
      (data: { id: string; displayName: string }) => {
        setPlayers((prev) => prev.filter((p) => p.id !== data.id));
      },
    );

    socket.on("host:answer_count_updated", (data: { answersCount: number }) => {
      setAnswersCount(data.answersCount);
    });

    socket.on("shared:question_started", (data: QuestionStartedData) => {
      setCurrentQuestion(data);
      setTimeRemaining(data.timeLimitSeconds);
      setAnswersCount(0);
      setClosedQuestionData(null);
      setHostState("QUESTION_ACTIVE");

      // Local countdown timer for visual smoothness
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on("shared:question_closed", (data: QuestionClosedData) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setClosedQuestionData(data);
      setHostState("QUESTION_CLOSED");
    });

    socket.on("shared:leaderboard_updated", (data: LeaderboardData) => {
      setLeaderboardData(data);
      setHostState("LEADERBOARD");
    });

    socket.on("shared:quiz_finished", (data: QuizFinishedData) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinishedData(data);
      setHostState("FINISHED");

      // Trigger celebratory confetti blast
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Confetti fallback
      }
    });

    socket.on("session:error", (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off("session:player_joined");
      socket.off("session:player_left");
      socket.off("host:answer_count_updated");
      socket.off("shared:question_started");
      socket.off("shared:question_closed");
      socket.off("shared:leaderboard_updated");
      socket.off("shared:quiz_finished");
      socket.off("session:error");
    };
  }, [quizId, devUserId]);

  const handleStartOrNextQuestion = () => {
    const socket = getSocket();
    socket.emit("host:next_question", { joinCode });
  };

  const handleEndQuestionEarly = () => {
    const socket = getSocket();
    socket.emit("host:end_question_early", { joinCode });
  };

  const handleShowLeaderboard = () => {
    const socket = getSocket();
    socket.emit("host:show_leaderboard", { joinCode });
  };

  const handleEndQuiz = () => {
    const socket = getSocket();
    socket.emit("host:end_quiz", { joinCode });
  };

  // ========================================================
  // RENDER: INITIALIZING
  // ========================================================
  if (hostState === "INITIALIZING") {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <h2 className="text-xl font-bold text-slate-800">
          Preparing Live Quiz Session...
        </h2>
        <p className="text-sm text-slate-500">
          Connecting to real-time engine and generating game PIN.
        </p>
        {error && <Alert type="error" message={error} className="mt-4" />}
      </div>
    );
  }

  // ========================================================
  // RENDER: LOBBY
  // ========================================================
  if (hostState === "LOBBY") {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{quizTitle}</h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Live Session Lobby • {totalQuestions} Questions
            </p>
          </div>
          <Link to="/quizzes">
            <Button variant="outline" size="sm">
              Exit Lobby
            </Button>
          </Link>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            onDismiss={() => setError(null)}
            className="mb-6"
          />
        )}

        {/* PIN Banner */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-indigo-200 block mb-2">
              Join at Quizora on your phone or laptop
            </span>
            <div className="text-5xl sm:text-7xl font-black tracking-widest font-mono text-amber-300 drop-shadow-sm py-2">
              {joinCode.slice(0, 3)} {joinCode.slice(3)}
            </div>
            <p className="text-xs sm:text-sm text-indigo-200 mt-2">
              Enter the 6-digit Game PIN and choose a nickname to enter.
            </p>
          </div>
        </div>

        {/* Participants Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <h2 className="text-base font-bold text-slate-900">
                Connected Students
              </h2>
            </div>
            <Badge variant={players.length > 0 ? "success" : "default"}>
              {players.length} {players.length === 1 ? "Player" : "Players"}
            </Badge>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-medium">
                Waiting for players to join...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Share the game PIN above with your classroom.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold px-4 py-2 rounded-xl text-sm shadow-2xs animate-fade-in flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {p.displayName}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start Game Action */}
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={handleStartOrNextQuestion}
            disabled={players.length === 0}
            className="w-full sm:w-auto px-8 py-3 text-base shadow-md font-bold"
          >
            Start Quiz ({players.length} Ready) →
          </Button>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: ACTIVE QUESTION
  // ========================================================
  if (hostState === "QUESTION_ACTIVE" && currentQuestion) {
    const totalTime = currentQuestion.timeLimitSeconds;
    const progressPercent = Math.max(
      0,
      Math.min(100, (timeRemaining / totalTime) * 100),
    );

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
              Question {currentQuestion.questionIndex + 1} of{" "}
              {currentQuestion.totalQuestions}
            </span>
            <span className="text-xs text-slate-400">
              {currentQuestion.maxPoints} pts max
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="info">
              Answers: {answersCount} / {players.length}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndQuestionEarly}
            >
              Skip / End Question
            </Button>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              timeRemaining <= 5
                ? "bg-rose-500"
                : timeRemaining <= 10
                  ? "bg-amber-500"
                  : "bg-indigo-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Question Text & Timer Center */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs mb-8 flex flex-col items-center justify-center min-h-[160px]">
          <span
            className={`text-2xl font-black mb-3 ${
              timeRemaining <= 5
                ? "text-rose-600 animate-pulse"
                : "text-indigo-600"
            }`}
          >
            ⏱️ {timeRemaining}s
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 max-w-3xl leading-snug">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentQuestion.options.map((opt, idx) => {
            const color = OPTION_COLORS[idx % OPTION_COLORS.length];
            return (
              <div
                key={opt.id}
                className={`${color.bg} text-white p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-transform`}
              >
                <span className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-black text-lg">
                  {color.letter}
                </span>
                <span className="text-base sm:text-lg font-bold">
                  {opt.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: QUESTION CLOSED / STATS
  // ========================================================
  if (
    hostState === "QUESTION_CLOSED" &&
    currentQuestion &&
    closedQuestionData
  ) {
    const totalAns = Math.max(1, closedQuestionData.totalAnswers);

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200">
          <Badge variant="success">Question Ended</Badge>
          <Button size="md" variant="primary" onClick={handleShowLeaderboard}>
            Show Leaderboard →
          </Button>
        </div>

        {/* Question Review Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Question {currentQuestion.questionIndex + 1}
          </span>
          <h2 className="text-2xl font-bold text-slate-900">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Option Distribution Bars */}
        <div className="space-y-4 mb-8">
          {currentQuestion.options.map((opt, idx) => {
            const isCorrect = opt.id === closedQuestionData.correctOptionId;
            const count = closedQuestionData.optionStats[opt.id] || 0;
            const percent = Math.round((count / totalAns) * 100);
            const color = OPTION_COLORS[idx % OPTION_COLORS.length];

            return (
              <div
                key={opt.id}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isCorrect
                    ? "bg-emerald-50 border-emerald-500 shadow-sm"
                    : "bg-white border-slate-200 opacity-75"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${color.bg} text-white`}
                    >
                      {color.letter}
                    </span>
                    <span
                      className={`font-bold text-base ${
                        isCorrect ? "text-emerald-900" : "text-slate-800"
                      }`}
                    >
                      {opt.text}
                    </span>
                    {isCorrect && (
                      <span className="bg-emerald-600 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-sm text-slate-700">
                    {count} {count === 1 ? "answer" : "answers"} ({percent}%)
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${
                      isCorrect ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button size="lg" variant="primary" onClick={handleShowLeaderboard}>
            Show Leaderboard →
          </Button>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: LEADERBOARD
  // ========================================================
  if (hostState === "LEADERBOARD" && leaderboardData) {
    const isLast = leaderboardData.isLastQuestion;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Current Rankings
            </h1>
            <p className="text-xs text-slate-500">
              After Question {leaderboardData.currentQuestionIndex + 1} of{" "}
              {leaderboardData.totalQuestions}
            </p>
          </div>

          {isLast ? (
            <Button size="lg" variant="primary" onClick={handleEndQuiz}>
              See Final Podium 🏆 →
            </Button>
          ) : (
            <Button
              size="lg"
              variant="primary"
              onClick={handleStartOrNextQuestion}
            >
              Next Question →
            </Button>
          )}
        </div>

        {/* Leaderboard list */}
        <div className="space-y-3 mb-8">
          {leaderboardData.leaderboard.map((entry, idx) => (
            <div
              key={entry.id}
              className={`p-4 rounded-2xl border flex items-center justify-between transition-transform ${
                idx === 0
                  ? "bg-amber-50 border-amber-300 shadow-sm"
                  : idx === 1
                    ? "bg-slate-50 border-slate-300"
                    : idx === 2
                      ? "bg-amber-900/5 border-amber-800/20"
                      : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
                    idx === 0
                      ? "bg-amber-400 text-amber-950"
                      : idx === 1
                        ? "bg-slate-300 text-slate-800"
                        : idx === 2
                          ? "bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {entry.rank}
                </span>
                <span className="font-bold text-base text-slate-900">
                  {entry.displayName}
                </span>
              </div>
              <span className="font-mono font-black text-lg text-indigo-600">
                {entry.totalScore.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: FINISHED / PODIUM
  // ========================================================
  if (hostState === "FINISHED" && finishedData) {
    const top3 = finishedData.finalLeaderboard.slice(0, 3);
    const winner = top3[0];
    const second = top3[1];
    const third = top3[2];

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-2">
          Quiz Completed! 🎉
        </h1>
        <p className="text-base text-slate-500 mb-12">
          Great effort by all {finishedData.totalParticipants} participants!
        </p>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 sm:gap-6 mb-16 max-w-xl mx-auto min-h-[260px]">
          {/* 2nd Place */}
          {second && (
            <div className="flex-1 flex flex-col items-center">
              <span className="font-bold text-sm text-slate-800 mb-2 truncate max-w-[120px]">
                {second.displayName}
              </span>
              <span className="text-xs font-semibold text-slate-400 mb-2">
                {second.totalScore.toLocaleString()} pts
              </span>
              <div className="w-full bg-slate-300 rounded-t-2xl h-36 flex items-center justify-center font-black text-2xl text-slate-700 shadow-md">
                2
              </div>
            </div>
          )}

          {/* 1st Place */}
          {winner && (
            <div className="flex-1 flex flex-col items-center">
              <span className="text-2xl mb-1">👑</span>
              <span className="font-black text-base text-amber-900 mb-2 truncate max-w-[140px]">
                {winner.displayName}
              </span>
              <span className="text-xs font-bold text-amber-600 mb-2">
                {winner.totalScore.toLocaleString()} pts
              </span>
              <div className="w-full bg-amber-400 rounded-t-2xl h-48 flex items-center justify-center font-black text-3xl text-amber-950 shadow-lg border-2 border-amber-300">
                1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {third && (
            <div className="flex-1 flex flex-col items-center">
              <span className="font-bold text-sm text-slate-800 mb-2 truncate max-w-[120px]">
                {third.displayName}
              </span>
              <span className="text-xs font-semibold text-slate-400 mb-2">
                {third.totalScore.toLocaleString()} pts
              </span>
              <div className="w-full bg-amber-700/60 rounded-t-2xl h-24 flex items-center justify-center font-black text-xl text-amber-950 shadow-md">
                3
              </div>
            </div>
          )}
        </div>

        {/* Back to dashboard action */}
        <Link to="/quizzes">
          <Button size="lg" variant="primary">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return null;
};
