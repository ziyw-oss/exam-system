import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
}

interface Keypoint {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  name: string;
  keypoints: Keypoint[];
}

interface Section {
  id: number;
  name: string;
  chapters: Chapter[];
}

interface Exam {
  id: number;
  name: string;
}

export default function ExamSetup() {
  const router = useRouter();
  const { mode } = router.query;

  const [structure, setStructure] = useState<Section[]>([]);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedKeypoints, setSelectedKeypoints] = useState<number[]>([]);
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    if (mode === "keypoint") {
      axios.get("/api/student/keypoint-structure").then((res) => {
        setStructure(res.data);
      });
    } else if (mode === "exam") {
      axios.get("/api/student/setupexam").then((res) => {
        setExamList(res.data);
      });
    }
  }, [mode]);

  const handleStart = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("请先登录后再开始考试");
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      const userId = decoded.id;

      const payload: any = {
        userId,
        mode,
        duration,
      };

      if (mode === "exam") {
        if (!selectedExamId) {
          alert("请选择试卷后再开始考试");
          return;
        }
        payload.examId = selectedExamId;
      } else if (mode === "keypoint") {
        if (selectedKeypoints.length === 0) {
          alert("请至少选择一个知识点");
          return;
        }
        payload.keypointIds = selectedKeypoints;
      }

      const response = await axios.post("/api/student/start-exam", payload);
      const { examId, sessionId } = response.data;
      router.push(`/student/exam/doing?sessionId=${sessionId || examId}`);
    } catch (err) {
      alert("无法开始考试，请重试");
      console.error(err);
    }
  };

  const section = structure.find((s: Section) => s.id === selectedSection);
  const chapter = section?.chapters.find((c: Chapter) => c.id === selectedChapter);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🧪 考试设置</h1>

      {mode === "exam" && (
        <div>
          <label className="block font-medium mb-1">选择试卷</label>
          <select
            value={selectedExamId ?? ""}
            onChange={(e) => setSelectedExamId(parseInt(e.target.value))}
          >
            <option value="">请选择试卷</option>
            {examList.map((exam: Exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === "keypoint" && (
        <>
          <div>
            <label className="block font-medium">模块（Section）</label>
            <select
              value={selectedSection ?? ""}
              onChange={(e) => {
                setSelectedSection(parseInt(e.target.value));
                setSelectedChapter(null);
                setSelectedKeypoints([]);
              }}
            >
              <option value="">请选择模块</option>
              {structure.map((s: Section) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {section && (
            <div>
              <label className="block font-medium">章节（Chapter）</label>
              <select
                value={selectedChapter ?? ""}
                onChange={(e) => {
                  setSelectedChapter(parseInt(e.target.value));
                  setSelectedKeypoints([]);
                }}
              >
                <option value="">请选择章节</option>
                {section.chapters.map((c: Chapter) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {chapter && (
            <div>
              <label className="block font-medium">知识点（Keypoints）</label>
              <div className="grid grid-cols-2 gap-2">
                {chapter.keypoints.map((kp: Keypoint) => (
                  <label key={kp.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedKeypoints.includes(kp.id)}
                      onChange={() => {
                        setSelectedKeypoints((prev) =>
                          prev.includes(kp.id)
                            ? prev.filter((id) => id !== kp.id)
                            : [...prev, kp.id]
                        );
                      }}
                    />
                    {kp.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block font-medium">考试时长（分钟）</label>
        <input
          type="number"
          className="border p-1"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
        />
      </div>

      <button
        onClick={handleStart}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={mode === "keypoint" && selectedKeypoints.length === 0}
      >
        开始考试
      </button>
    </div>
  );
}
