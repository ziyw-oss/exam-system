import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

export default function Learn() {
  const [sections, setSections] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5001/api/learn/sections")
      .then(response => setSections(response.data))
      .catch(error => console.error("Error fetching sections:", error));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Select a Learning Section</h1>
      <ul className="space-y-3">
        {sections.map(section => (
          <li key={section.id} className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200">
            <Link href={`/learn/section?id=${section.id}`} className="text-lg font-medium">
              {section.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}