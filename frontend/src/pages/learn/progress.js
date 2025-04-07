import { useState, useEffect } from "react";
import axios from "axios";
import ProgressChart from "../../components/ProgressChart"; // ✅ 这里一定要用相对路径

export default function Progress() {
  const [progressData, setProgressData] = useState([]);
  const userId = 1; // 🔍 这里用测试 ID，确保 API 可用

  useEffect(() => {
    console.log("Fetching progress data...");
    axios.get(`http://localhost:5001/api/progress/${userId}`)
      .then(response => {
        console.log("API Response:", response.data);
        setProgressData(response.data);
      })
      .catch(error => console.error("Error fetching progress:", error));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Learning Progress</h1>
      {progressData.length > 0 ? (
        <ProgressChart data={progressData} />
      ) : (
        <p>No progress data found.</p>
      )}
    </div>
  );
}