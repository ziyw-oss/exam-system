import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Question {
  id: number;
  text: string;
  section_id?: number;
  chapter_id?: number;
}

interface Keypoint {
  id: number;
  name: string;
}

export default function QuestionKeypointBrowser() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [bindings, setBindings] = useState<Record<number, number[]>>({});
  const [filterText, setFilterText] = useState("");
  const [viewMode, setViewMode] = useState("by-question");

  useEffect(() => {
    axios.get("/api/admin/questions").then((res) => setQuestions(res.data));
    axios.get("/api/admin/keypoints").then((res) => setKeypoints(res.data));
    axios.get("/api/admin/question-keypoints").then((res) => setBindings(res.data));
  }, []);

  const filteredQuestions = questions.filter(q =>
    q.text.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredKeypoints = keypoints.filter(kp =>
    kp.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="搜索题目或知识点..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} className="mt-4">
        <TabsList>
          <TabsTrigger value="by-question">按题目查看</TabsTrigger>
          <TabsTrigger value="by-keypoint">按知识点查看</TabsTrigger>
        </TabsList>

        <TabsContent value="by-question">
          <ScrollArea className="h-[600px] pr-2">
            {filteredQuestions.map((q) => (
              <Card key={q.id} className="mb-4">
                <CardContent className="p-4">
                  <div className="font-semibold text-base mb-2">Q{q.id}: {q.text}</div>
                  <div className="text-sm text-muted-foreground">
                    关联知识点：
                    <ul className="list-disc ml-5 mt-1">
                      {(bindings[q.id] || []).map((kpId) => {
                        const kp = keypoints.find(k => k.id === kpId);
                        return <li key={kpId}>{kp?.name}</li>;
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="by-keypoint">
          <ScrollArea className="h-[600px] pr-2">
            {filteredKeypoints.map((kp) => (
              <Card key={kp.id} className="mb-4">
                <CardContent className="p-4">
                  <div className="font-semibold text-base mb-2">{kp.name}</div>
                  <div className="text-sm text-muted-foreground">
                    涉及题目：
                    <ul className="list-disc ml-5 mt-1">
                      {Object.entries(bindings)
                        .filter(([_, kpIds]) => kpIds.includes(kp.id))
                        .map(([qid]) => {
                          const q = questions.find(q => q.id === Number(qid));
                          return <li key={qid}>Q{q?.id}: {q?.text.slice(0, 100)}...</li>;
                        })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
