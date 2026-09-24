import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { getSocket } from "../lib/socket";
import type {
  QuestionStartedData,
  QuestionClosedData,
  PersonalResultData,
  LeaderboardData,
  QuizFinishedData,
} from "../types/game";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";

const OPTION_COLORS = [
  {
    bg: "bg-red-500",
    hover: "hover:bg-red-600",
    active: "active:bg-red-700",
    border: "border-red-600",
    ring: "ring-red-400",
    letter: "A",
  },
  {
    bg: "bg-blue-500",
    hover: "hover:bg-blue-600",
    active: "active:bg-blue-700",
    border: "border-blue-600",
    ring: "ring-blue-400",
    letter: "B",
  },
  {
    bg: "bg-amber-500",
    hover: "hover:bg-amber-600",
    active: "active:bg-amber-700",
    border: "border-amber-600",
    ring: "ring-amber-400",
    letter: "C",
  },
  {
    bg: "bg-emerald-500",
    hover: "hover:bg-emerald-600",
    active: "active:bg-emerald-700",
    border: "border-emerald-600",
    ring: "ring-emerald-400",
    letter: "D",
  },
  {
    bg: "bg-purple-500",
    hover: "hover:bg-purple-600",
    active: "active:bg-purple-700",
    border: "border-purple-600",
    ring: "ring-purple-400",
    letter: "E",
  },
  {
    bg: "bg-cyan-500",
    hover: "hover:bg-cyan-600",
    active: "active:bg-cyan-700",
    border: "border-cyan-600",
    ring: "ring-cyan-400",
    letter: "F",
  },
];

type PlayerStage =
  | "JOIN"
  | "LOBBY"
  | "QUESTION_ACTIVE"
  | "ANSWER_SUBMITTED"
  | "QUESTION_RESULT"
  | "LEADERBOARD"
  | "FINISHED";

export const PlayGamePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  // Join form state
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Active player state
  const [stage, setStage] = useState<PlayerStage>("JOIN");
  const [participantId, setParticipantId] = useState<string>("");
  const [joinedPin, setJoinedPin] = useState<string>("");
  const [playerNickname, setPlayerNickname] = useState<string>("");
  const [quizTitle, setQuizTitle] = useState<string>("");
  const [totalScore, setTotalScore] = useState<number>(0);

  // Active Question
  const [currentQuestion, setCurrentQuestion] =
    useState<QuestionStartedData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Results
  const [personalResult, setPersonalResult] =
    useState<PersonalResultData | null>(null);
  const [closedQuestionData, setClosedQuestionData] =
    useState<QuestionClosedData | null>(null);
  const [leaderboardData, setLeaderboardData] =
    useState<LeaderboardData | null>(null);
  const [finishedData, setFinishedData] = useState<QuizFinishedData | null>(
    null,
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("shared:question_started", (data: QuestionStartedData) => {
      setCurrentQuestion(data);
      setTimeRemaining(data.timeLimitSeconds);
      setSelectedOptionId(null);
      setPersonalResult(null);
      setClosedQuestionData(null);
      setStage("QUESTION_ACTIVE");

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
    });

    socket.on("player:personal_result", (data: PersonalResultData) => {
      setPersonalResult(data);
      setTotalScore(data.totalScore);
      setStage("QUESTION_RESULT");

      if (data.isCorrect) {
        try {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {
          // fallback
        }
      }
    });

    socket.on("shared:leaderboard_updated", (data: LeaderboardData) => {
      setLeaderboardData(data);
      setStage("LEADERBOARD");
    });

    socket.on("shared:quiz_finished", (data: QuizFinishedData) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setFinishedData(data);
      setStage("FINISHED");

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // fallback
      }
    });

    socket.on("session:error", (data: { message: string }) => {
      setJoinError(data.message);
      setIsJoining(false);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off("shared:question_started");
      socket.off("shared:question_closed");
      socket.off("player:personal_result");
      socket.off("shared:leaderboard_updated");
      socket.off("shared:quiz_finished");
      socket.off("session:error");
    };
  }, []);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    const cleanPin = pin.replace(/\s+/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      setJoinError("Please enter a valid 6-digit game PIN.");
      return;
    }
    if (!nickname.trim()) {
      setJoinError("Please choose a nickname.");
      return;
    }
    if (nickname.trim().length > 20) {
      setJoinError("Nickname cannot exceed 20 characters.");
      return;
    }

    setIsJoining(true);
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "player:join_session",
      { joinCode: cleanPin, displayName: nickname.trim() },
      (res: {
        success: boolean;
        data?: {
          participantId: string;
          displayName: string;
          joinCode: string;
          quizTitle: string;
          totalScore: number;
        };
        message?: string;
      }) => {
        setIsJoining(false);
        if (res.success && res.data) {
          setParticipantId(res.data.participantId);
          setJoinedPin(res.data.joinCode);
          setPlayerNickname(res.data.displayName);
          setQuizTitle(res.data.quizTitle);
          setTotalScore(res.data.totalScore || 0);
          setStage("LOBBY");
        } else {
          setJoinError(res.message || "Failed to join game session.");
        }
      },
    );
  };

  const handleAnswerClick = (optionId: string) => {
    if (stage !== "QUESTION_ACTIVE" || selectedOptionId || !currentQuestion) {
      return;
    }

    setSelectedOptionId(optionId);
    setStage("ANSWER_SUBMITTED");

    const socket = getSocket();
    socket.emit("player:submit_answer", {
      joinCode: joinedPin,
      participantId,
      questionId: currentQuestion.questionId,
      optionId,
    });
  };

  // ========================================================
  // RENDER: JOIN SCREEN
  // ========================================================
  if (stage === "JOIN") {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-md">
            Q
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-1">
            Join a Live Quiz
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Enter the 6-digit game PIN shown on the teacher's screen.
          </p>

          {joinError && (
            <Alert
              type="error"
              message={joinError}
              onDismiss={() => setJoinError(null)}
              className="mb-6 text-left"
            />
          )}

          <form onSubmit={handleJoinSubmit} className="space-y-4 text-left">
            <Input
              label="Game PIN"
              value={pin}
              maxLength={6}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. 384912"
              className="text-center font-mono text-2xl tracking-widest font-black"
              autoFocus
              required
            />

            <Input
              label="Nickname"
              value={nickname}
              maxLength={20}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Alex"
              helperText="Visible on the live scoreboard"
              required
            />

            <Button
              type="submit"
              size="lg"
              variant="primary"
              isLoading={isJoining}
              className="w-full font-bold text-base py-3 mt-2"
            >
              Enter Game →
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: PLAYER LOBBY
  // ========================================================
  if (stage === "LOBBY") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 sm:p-10 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
            ✓
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">You're in!</h1>
            <p className="text-sm text-slate-500 mt-1">
              See your name on the classroom screen?
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
              Playing as
            </span>
            <span className="text-xl font-black text-indigo-900">
              {playerNickname}
            </span>
          </div>

          <div className="pt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            Waiting for teacher to start {quizTitle}...
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: QUESTION ACTIVE / ANSWER SUBMITTED
  // ========================================================
  if (
    (stage === "QUESTION_ACTIVE" || stage === "ANSWER_SUBMITTED") &&
    currentQuestion
  ) {
    const isSubmitted = stage === "ANSWER_SUBMITTED";

    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 text-sm">
          <span className="font-bold text-slate-800">
            Q{currentQuestion.questionIndex + 1} of{" "}
            {currentQuestion.totalQuestions}
          </span>
          <span className="font-mono font-bold text-indigo-600">
            Score: {totalScore.toLocaleString()}
          </span>
          <span
            className={`font-mono font-black ${
              timeRemaining <= 5
                ? "text-rose-600 animate-pulse"
                : "text-slate-700"
            }`}
          >
            ⏱️ {timeRemaining}s
          </span>
        </div>

        {/* Question Text */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs mb-6">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Submission notification */}
        {isSubmitted && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl p-3 mb-4 text-center text-sm font-bold flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            Answer submitted! Waiting for question timer...
          </div>
        )}

        {/* Option Choice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((opt, idx) => {
            const color = OPTION_COLORS[idx % OPTION_COLORS.length];
            const isSelected = selectedOptionId === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAnswerClick(opt.id)}
                disabled={isSubmitted}
                className={`w-full text-left p-5 rounded-2xl border-2 font-bold text-white transition-all transform flex items-center gap-3 cursor-pointer ${
                  color.bg
                } ${!isSubmitted ? color.hover : ""} ${
                  isSelected
                    ? "ring-4 ring-offset-2 ring-indigo-500 scale-98"
                    : isSubmitted
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-[1.02] active:scale-95"
                }`}
              >
                <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center font-black text-base shrink-0">
                  {color.letter}
                </span>
                <span className="text-base sm:text-lg break-words leading-tight">
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: PERSONAL QUESTION RESULT
  // ========================================================
  if (stage === "QUESTION_RESULT" && personalResult) {
    const isCorrect = personalResult.isCorrect;

    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div
          className={`rounded-3xl border-2 p-8 shadow-md space-y-6 ${
            isCorrect
              ? "bg-emerald-50 border-emerald-400 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner ${
              isCorrect ? "bg-emerald-200" : "bg-rose-200"
            }`}
          >
            {isCorrect ? "✓" : "✕"}
          </div>

          <div>
            <h1 className="text-3xl font-black mb-1">
              {isCorrect ? "Correct!" : "Incorrect"}
            </h1>
            <p className="text-sm font-semibold opacity-80">
              {isCorrect
                ? `+${personalResult.pointsAwarded.toLocaleString()} points awarded`
                : "No points awarded for this question"}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="bg-white/80 rounded-2xl p-4 flex items-center justify-around border border-black/5 shadow-2xs">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Score
              </span>
              <span className="text-xl font-black text-slate-900">
                {personalResult.totalScore.toLocaleString()}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Current Rank
              </span>
              <span className="text-xl font-black text-indigo-600">
                #{personalResult.rank}
              </span>
            </div>
          </div>

          {/* If incorrect, display correct answer */}
          {!isCorrect && closedQuestionData && currentQuestion && (
            <div className="bg-white/80 rounded-2xl p-3 border border-rose-200 text-xs">
              <span className="font-bold text-slate-500 block mb-0.5">
                Correct Answer:
              </span>
              <span className="font-extrabold text-emerald-700 text-sm">
                {currentQuestion.options.find(
                  (o) => o.id === closedQuestionData.correctOptionId,
                )?.text || "Answer revealed on host screen"}
              </span>
            </div>
          )}

          <p className="text-xs opacity-75">
            Waiting for teacher to show next question or scoreboard...
          </p>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER: LEADERBOARD SCREEN
  // ========================================================
  if (stage === "LEADERBOARD" && leaderboardData) {
    const myRank = leaderboardData.leaderboard.findIndex(
      (entry) => entry.id === participantId,
    );

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-slate-900">Leaderboard</h1>
          <p className="text-xs text-slate-500">
            {myRank !== -1
              ? `You are currently in #${myRank + 1} place!`
              : "Scoreboard update"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 mb-6">
          {leaderboardData.leaderboard.slice(0, 5).map((entry, idx) => {
            const isMe = entry.id === participantId;
            return (
              <div
                key={entry.id}
                className={`p-3 rounded-xl flex items-center justify-between text-sm ${
                  isMe
                    ? "bg-indigo-50 border border-indigo-200 font-black text-indigo-900"
                    : "bg-slate-50 text-slate-800 font-semibold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <span>
                    {entry.displayName} {isMe ? "(You)" : ""}
                  </span>
                </div>
                <span className="font-mono font-bold">
                  {entry.totalScore.toLocaleString()} pts
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-slate-400">
          Get ready for the next question!
        </p>
      </div>
    );
  }

  // ========================================================
  // RENDER: FINISHED / GAME OVER
  // ========================================================
  if (stage === "FINISHED" && finishedData) {
    const myEntry = finishedData.finalLeaderboard.find(
      (e) => e.id === participantId,
    );
    const myRank = myEntry?.rank || 1;
    const isWinner = myRank === 1;

    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 space-y-6">
          <div className="text-5xl mb-2">{isWinner ? "🏆" : "🎉"}</div>

          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {isWinner ? "Champion!" : "Quiz Finished!"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              You finished in{" "}
              <strong className="text-slate-900">#{myRank} place</strong> out of{" "}
              {finishedData.totalParticipants} players!
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block mb-1">
              Final Score
            </span>
            <span className="text-3xl font-black text-indigo-900 font-mono">
              {totalScore.toLocaleString()} pts
            </span>
          </div>

          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              setStage("JOIN");
              setPin("");
              setNickname("");
              setSelectedOptionId(null);
            }}
            className="w-full font-bold"
          >
            Play Another Quiz
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
