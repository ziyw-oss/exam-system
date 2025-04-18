import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";

export default function QuestionKeypointBinder() {
  type Question = { id: number; text: string };
  type Keypoint = { id: number; name: string };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [bindings, setBindings] = useState<Record<number, number[]>>({});
  const [aiBindings, setAiBindings] = useState<Record<number, number[]>>({});
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    axios.get("/api/admin/questions").then((res) => setQuestions(res.data));
    axios.get("/api/admin/keypoints").then((res) => setKeypoints(res.data));
    axios.get("/api/admin/question-keypoints").then((res) => {
      setBindings(res.data);
      setAiBindings(JSON.parse(JSON.stringify(res.data))); // 深拷贝保存初始 AI 推荐
    });
  }, []);

  const toggleBinding = (questionId: number, keypointId: number) => {
    setBindings((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(keypointId);
      const updated = exists
        ? current.filter((id) => id !== keypointId)
        : [...current, keypointId];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleResetToAI = (questionId: number) => {
    setBindings((prev) => ({
      ...prev,
      [questionId]: aiBindings[questionId] || []
    }));
  };

  const handleSave = async () => {
    try {
      await axios.post("/api/admin/question-keypoints", { bindings });
      alert("知识点绑定已保存 ✅");
    } catch (err) {
      console.error(err);
      alert("保存失败，请检查网络或接口");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-4 items-center">
        <Input
          placeholder="搜索题干..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md"
        />
        <Button onClick={handleSave}>保存绑定关系</Button>
      </div>

      {questions
        .filter((q) => q.text.toLowerCase().includes(search.toLowerCase()))
        .map((question) => (
          <Card key={question.id} className="p-4 shadow-md border border-gray-200 mt-4">
            <CardContent>
              <div className={`overflow-y-auto transition-all duration-200 ${
                expanded[question.id] ? "max-h-none" : "max-h-40"
              } whitespace-pre-wrap break-words`}>
                Q{question.id}: {question.text}
              </div>
              {question.text.length > 200 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 text-xs text-blue-600"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
                  }
                >
                  {expanded[question.id] ? "折叠" : "展开"}
                </Button>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                来自 AI 推荐的绑定将自动预选，您可以手动修改或
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 px-2 py-0 h-6 text-xs"
                  onClick={() => handleResetToAI(question.id)}
                >
                  重置为 AI 推荐
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {keypoints.map((kp) => {
                  const isAI = aiBindings[question.id]?.includes(kp.id);
                  const isChecked = bindings[question.id]?.includes(kp.id) || false;
                  return (
                    <label key={kp.id} className="flex items-center gap-2 text-sm leading-tight">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleBinding(question.id, kp.id)}
                      />
                      <span className="whitespace-pre-wrap">
                        {kp.name}
                        {isAI && isChecked ? " ✅" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
