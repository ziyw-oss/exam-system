// File: src/pages/student/exam/dashboard.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import InProgressExams from "./InProgressExams";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
  exp: number;
}

interface RewardItem {
  reason: string;
  amount: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [totalReward, setTotalReward] = useState(0);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [showInProgress, setShowInProgress] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        router.push("/admin/login");
      } else {
        setUser(decoded);
      }
    } catch (err) {
      console.error("Invalid token");
      localStorage.removeItem("token");
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchRewardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/student/daily-reward", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { totalHours, totalReward, rewards } = res.data;
        setTotalHours(totalHours);
        setTotalReward(totalReward);
        setRewards(rewards);
      } catch (err) {
        console.error("Failed to fetch rewards:", err);
      }
    };

    if (user?.role === "student") {
      fetchRewardData();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  const handleStartExam = () => {
    router.push("/student/exam/setup?mode=exam");
  };

  const handleReviewWrong = () => {
    router.push("/student/exam/review");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-bold text-center">🎉 Welcome back, {user.name}</h1>
          <p className="text-center text-sm text-gray-600">
            Role: <span className="font-semibold text-blue-600">{user.role === "teacher" ? "Teacher 👩‍🏫" : "Student 👨‍🎓"}</span>
          </p>

          {user.role === "student" && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded space-y-2">
              <h2 className="text-lg font-semibold">💰 Today's Practice Rewards</h2>
              <p>Total Practice Time: <span className="font-bold">{totalHours} hours</span></p>
              <p>Total Reward: <span className="text-green-600 font-bold">¥{totalReward}</span></p>
              <ul className="list-disc list-inside text-sm mt-2">
                {rewards.map((r, i) => (
                  <li key={i}>{r.reason}: +¥{r.amount}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">📚 Practice Options</h2>
          <div className="flex flex-col sm:flex-row sm:justify-center gap-4">
            {user.role === "teacher" && (
              <a
                href="/admin/import-exam"
                className="text-center text-sm text-white bg-blue-600 py-2 px-4 rounded hover:bg-blue-700"
              >📤 Import Exam</a>
            )}

            {user.role === "student" && (
              <>
                <button
                  onClick={() => setShowInProgress(!showInProgress)}
                  className="w-full text-center bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 transition"
                >📌 Resume Previous Exam</button>

                <button
                  onClick={handleStartExam}
                  className="w-full text-center bg-black text-white py-2 rounded hover:bg-gray-800 transition"
                >🚀 Start New Exam</button>

                <button
                  onClick={handleReviewWrong}
                  className="w-full text-center bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition"
                >🔁 Review Incorrect Answers</button>
              </>
            )}
          </div>

          {showInProgress && (
            <div className="mt-6">
              <InProgressExams onBack={() => setShowInProgress(false)} />
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >🚪 Logout</button>
        </div>
      </div>
    </div>
  );
}
