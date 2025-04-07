import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

export default function Section() {
  const router = useRouter();
  const { id } = router.query;
  const [chapters, setChapters] = useState([]);

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:5001/api/learn/section/${id}`)
        .then(response => setChapters(response.data))
        .catch(error => console.error("Error fetching chapters:", error));
    }
  }, [id]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Select a Chapter</h1>
      <ul className="space-y-3">
        {chapters.map(chapter => (
          <li key={chapter.id} className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Link href={`/learn/chapter?id=${chapter.id}`} className="text-lg font-medium">
              {chapter.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}