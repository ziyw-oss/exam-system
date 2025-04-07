import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

export default function Chapter() {
  const router = useRouter();
  const { id } = router.query;
  const [chapter, setChapter] = useState(null);
  const [keyPoints, setKeyPoints] = useState([]);

  useEffect(() => {
    if (id) {
      
      // 获取章节内容
      axios.get(`http://localhost:5001/api/learn/chapter/${id}`)
        .then(response => setChapter(response.data))
        .catch(error => console.error("Error fetching chapter:", error));

      // 获取该章节的知识点
      console.log("Fetching key points from:", `http://localhost:5001/api/learn/chapter/${id}/keypoints`);
      axios.get(`http://localhost:5001/api/learn/chapter/${id}/keypoints`)
        .then(response => setKeyPoints(response.data))
        .catch(error => console.error("Error fetching key points:", error));
    }
  }, [id]);

  return (
    <div className="p-6">
      {chapter ? (
        <>
          <h1 className="text-2xl font-bold mb-4">{chapter.name}</h1>
          <p className="text-lg mb-6">{chapter.content}</p>

          <h2 className="text-xl font-semibold mb-3">Key Points</h2>
          <ul className="space-y-3">
            {keyPoints.map((keyPoint) => (
              <li key={keyPoint.id} className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200">
                <Link href={`/learn/keypoint?id=${keyPoint.id}`} className="text-lg font-medium">
                  {keyPoint.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}