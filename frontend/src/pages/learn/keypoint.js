import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function KeyPoint() {
  const router = useRouter();
  const { id } = router.query;
  const [keyPoint, setKeyPoint] = useState(null);

  useEffect(() => {
    if (id) {
      axios.get(`http://localhost:5001/api/learn/keypoint/${id}`)
        .then(response => setKeyPoint(response.data))
        .catch(error => console.error("Error fetching key point:", error));
    }
  }, [id]);

  return (
    <div className="p-6">
      {keyPoint ? (
        <>
          <h1 className="text-2xl font-bold mb-4">{keyPoint.name}</h1>
          <p className="text-lg mb-6">{keyPoint.explanation}</p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}